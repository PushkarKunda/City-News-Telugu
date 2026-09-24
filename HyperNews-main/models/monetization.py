# models/monetization.py
"""
Monetization Data Models for HyperNews.
Implements:
1. Advertiser (Direct ad accounts)
2. Campaign (Budget, pacing, lifecycle, targeting)
3. AdUnitConfig (Google AdMob, Google Ad Manager, AdSense, and House Ad units)
4. AdEvent (Server-side tracking for fraud-protected impressions & clicks)
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class CampaignStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class AdNetwork(str, Enum):
    ADMOB = "admob"
    AD_MANAGER = "ad_manager"
    ADSENSE = "adsense"
    DIRECT = "direct"
    HOUSE = "house"


class AdType(str, Enum):
    BANNER = "banner"
    NATIVE = "native"
    INTERSTITIAL = "interstitial"
    REWARDED = "rewarded"


class Advertiser(Base):
    __tablename__ = "advertisers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    company = Column(String(200), nullable=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campaigns = relationship("Campaign", back_populates="advertiser", cascade="all, delete-orphan")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_id = Column(Integer, ForeignKey("advertisers.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)

    # Budgets & Limits
    total_budget = Column(Float, default=0.0)
    daily_budget = Column(Float, default=0.0)
    spent_amount = Column(Float, default=0.0)

    max_impressions = Column(Integer, default=0)  # 0 = unlimited
    max_clicks = Column(Integer, default=0)
    current_impressions = Column(Integer, default=0)
    current_clicks = Column(Integer, default=0)

    # Lifecycle & Pacing
    status = Column(String(20), default=CampaignStatus.DRAFT.value, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Frequency Cap (Max impressions per user per 24 hours)
    user_frequency_cap = Column(Integer, default=3)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    advertiser = relationship("Advertiser", back_populates="campaigns")

    __table_args__ = (
        Index("ix_campaigns_status_dates", "status", "start_date", "end_date"),
    )


class AdUnitConfig(Base):
    """
    Configuration for Network Ads (Google AdMob for Mobile, AdSense / Ad Manager for Web).
    Directs clients on which ad unit IDs and formats to render at which feed positions.
    """
    __tablename__ = "ad_unit_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    network = Column(String(20), default=AdNetwork.ADMOB.value, index=True)  # admob, ad_manager, adsense, direct, house
    ad_type = Column(String(20), default=AdType.NATIVE.value, index=True)    # native, banner, interstitial, rewarded
    platform = Column(String(10), default="all", index=True)               # android, ios, web, all

    ad_unit_id = Column(String(200), nullable=False)  # e.g., ca-app-pub-xxx/yyy or /network_code/ad_unit
    placement = Column(String(50), default="feed", index=True)  # feed, article_bottom, inter_card, rewarded_screen

    frequency_interval = Column(Integer, default=5)  # Render 1 ad every N news items
    priority = Column(Integer, default=1)           # Higher priority served first
    is_active = Column(Boolean, default=True, index=True)

    # Targeting constraints
    target_language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    target_state_id = Column(Integer, ForeignKey("states.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_ad_units_lookup", "platform", "placement", "is_active"),
    )


class AdEvent(Base):
    """
    Server-side recorded impression and click events with anti-fraud metadata.
    """
    __tablename__ = "ad_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(20), nullable=False, index=True)  # "impression" or "click"
    ad_type = Column(String(30), nullable=False)                 # "network_ad", "sponsored_post", "direct_ad"
    target_id = Column(String(50), nullable=False, index=True)   # Ad unit ID or SponsoredPost ID

    user_uid = Column(String(8), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)

    is_valid = Column(Boolean, default=True, index=True)  # False if flagged as fraudulent/spam
    flag_reason = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_ad_events_analytics", "target_id", "event_type", "created_at"),
        Index("ix_ad_events_fraud_check", "target_id", "user_uid", "event_type", "created_at"),
    )
