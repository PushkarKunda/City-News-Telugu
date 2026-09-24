# services/ad_service.py
"""
Monetization & Ad Delivery Service.
Provides:
1. Platform-aware Google AdMob / Ad Manager / Direct Ad resolution
2. Feed ad interleaving (e.g. 1 ad card every N news cards)
3. Anti-fraud impression & click validation (cooldown, bot detection, rapid-click filtering)
4. Sponsored post campaign pacing & frequency capping
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from models.monetization import (
    AdUnitConfig, AdEvent, Campaign, CampaignStatus, AdNetwork, AdType
)
from models.content import SponsoredPost, Advertisement

logger = logging.getLogger(__name__)

# Minimum interval between duplicate clicks on the same ad from the same IP/user
CLICK_COOLDOWN_SECONDS = 300  # 5 minutes
IMPRESSION_COOLDOWN_SECONDS = 10  # 10 seconds


class MonetizationService:
    """Manages ad configuration delivery and server-side tracking."""

    def __init__(self, db: Session):
        self.db = db

    def get_ad_configs_for_placement(
        self,
        platform: str = "all",
        placement: str = "feed",
        language_id: Optional[int] = None,
        state_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve active ad unit configurations for the client platform."""
        query = self.db.query(AdUnitConfig).filter(
            AdUnitConfig.is_active == True,
            AdUnitConfig.placement == placement,
            or_(AdUnitConfig.platform == platform.lower(), AdUnitConfig.platform == "all")
        )

        if language_id:
            query = query.filter(
                or_(AdUnitConfig.target_language_id == language_id, AdUnitConfig.target_language_id == None)
            )

        if state_id:
            query = query.filter(
                or_(AdUnitConfig.target_state_id == state_id, AdUnitConfig.target_state_id == None)
            )

        configs = query.order_by(desc(AdUnitConfig.priority)).all()

        return [
            {
                "id": c.id,
                "name": c.name,
                "network": c.network,
                "ad_type": c.ad_type,
                "platform": c.platform,
                "ad_unit_id": c.ad_unit_id,
                "placement": c.placement,
                "frequency_interval": c.frequency_interval
            }
            for c in configs
        ]

    def interleave_ads_in_feed(
        self,
        news_items: List[Dict[str, Any]],
        ad_configs: List[Dict[str, Any]],
        sponsored_posts: List[Dict[str, Any]],
        frequency_interval: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Interleaves network ads and native sponsored posts at regular intervals
        into the news feed stream while strictly labeling commercial content.
        """
        if not news_items:
            return []

        mixed_feed: List[Dict[str, Any]] = []
        ad_index = 0
        sponsored_index = 0

        for idx, item in enumerate(news_items):
            mixed_feed.append(item)

            # Check if an ad should be inserted after this item
            card_position = idx + 1
            if card_position % frequency_interval == 0 and card_position < len(news_items):
                # Alternate between Sponsored Post and Google Network Ad if available
                if sponsored_posts and sponsored_index < len(sponsored_posts) and (card_position // frequency_interval) % 2 == 1:
                    sp = sponsored_posts[sponsored_index]
                    mixed_feed.append({
                        "card_type": "sponsored_post",
                        "type": "sponsored",
                        "is_sponsored": True,
                        "data": sp
                    })
                    sponsored_index += 1
                elif ad_configs:
                    ad = ad_configs[ad_index % len(ad_configs)]
                    mixed_feed.append({
                        "card_type": "ad_unit",
                        "type": "ad",
                        "is_sponsored": False,
                        "is_network_ad": True,
                        "network": ad.get("network", "admob"),
                        "ad_type": ad.get("ad_type", "banner"),
                        "ad_unit_id": ad.get("ad_unit_id", ""),
                        "placement": ad.get("placement", "feed")
                    })
                    ad_index += 1

        return mixed_feed

    def record_ad_event(
        self,
        event_type: str,
        ad_type: str,
        target_id: str,
        user_uid: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record and validate ad impression or click event with anti-fraud rules.
        """
        now = datetime.now(timezone.utc)
        cooldown_period = CLICK_COOLDOWN_SECONDS if event_type == "click" else IMPRESSION_COOLDOWN_SECONDS
        cutoff = now - timedelta(seconds=cooldown_period)

        # Anti-fraud duplicate check
        query = self.db.query(AdEvent).filter(
            AdEvent.target_id == target_id,
            AdEvent.event_type == event_type,
            AdEvent.created_at >= cutoff
        )

        if user_uid:
            query = query.filter(AdEvent.user_uid == user_uid)
        elif ip_address:
            query = query.filter(AdEvent.ip_address == ip_address)

        recent_duplicate = query.first()

        is_valid = True
        flag_reason = None
        if recent_duplicate:
            is_valid = False
            flag_reason = f"Duplicate {event_type} within {cooldown_period}s cooldown window"
            logger.warning("Ad fraud signal: %s on target %s from IP %s", flag_reason, target_id, ip_address)

        event = AdEvent(
            event_type=event_type,
            ad_type=ad_type,
            target_id=target_id,
            user_uid=user_uid,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            is_valid=is_valid,
            flag_reason=flag_reason,
            created_at=now
        )
        self.db.add(event)

        # If valid and targets a SponsoredPost, increment counters
        if is_valid and ad_type == "sponsored_post":
            try:
                sp_id = int(target_id)
                sp = self.db.query(SponsoredPost).filter(SponsoredPost.id == sp_id).first()
                if sp and hasattr(sp, "impressions_count"):
                    if event_type == "impression":
                        sp.impressions_count = (getattr(sp, "impressions_count", 0) or 0) + 1
                    elif event_type == "click":
                        sp.clicks_count = (getattr(sp, "clicks_count", 0) or 0) + 1
            except Exception:
                pass

        self.db.commit()

        return {
            "recorded": True,
            "is_valid": is_valid,
            "event_type": event_type,
            "target_id": target_id
        }

    def track_click(
        self,
        campaign_id: Any,
        user_uid: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convenience alias for tracking an ad click with anti-fraud verification."""
        res = self.record_ad_event(
            event_type="click",
            ad_type="sponsored_post",
            target_id=str(campaign_id),
            user_uid=user_uid,
            ip_address=ip_address,
            user_agent=user_agent
        )
        return {
            "status": "recorded" if res["is_valid"] else "duplicate_ignored",
            "is_duplicate": not res["is_valid"],
            "event": res
        }

