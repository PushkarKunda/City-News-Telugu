# services/referral_service.py
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging

from models.rewards import Referral, ReferralMilestone, UserRewards
from services.rewards_service import RewardsService
from services.fraud_detection import FraudDetectionService
from config.rewards_config import RewardsConfig

logger = logging.getLogger(__name__)


class ReferralService:
    """Complete referral service with fraud detection"""
    
    def __init__(self, db: Session, request=None):
        self.db = db
        self.request = request
        self.rewards_service = RewardsService(db, request)
        self.fraud_detection = FraudDetectionService(db)
    
    def _get_client_ip(self) -> str:
        """Get client IP from request"""
        if not self.request:
            return None
        forwarded = self.request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.request.client.host if self.request.client else None
    
    def process_referral_signup(self, referrer_code: str, new_user_uid: str) -> dict:
        """Process referral when new user signs up with code"""
        
        # Find referrer
        referrer_rewards = self.db.query(UserRewards).filter(
            UserRewards.referral_code == referrer_code
        ).first()
        
        if not referrer_rewards:
            return {"success": False, "message": "Invalid referral code"}
        
        if referrer_rewards.user_uid == new_user_uid:
            return {"success": False, "message": "Cannot refer yourself"}
        
        # Check if already referred
        existing = self.db.query(Referral).filter(
            Referral.referred_uid == new_user_uid
        ).first()
        
        if existing:
            return {"success": False, "message": "User already referred by someone"}
        
        # Get IP addresses for fraud detection
        referrer_ip = self._get_client_ip() if self.request else None
        referred_ip = None  # This would come from new user's signup request
        
        # Validate referral for fraud
        validation = self.fraud_detection.validate_referral(
            referrer_rewards.user_uid, new_user_uid, referrer_ip, referred_ip
        )
        
        if not validation["valid"]:
            logger.warning(f"Fraudulent referral attempt: {validation['reason']}")
            return {"success": False, "message": validation["reason"]}
        
        # Create referral record
        referral = Referral(
            referrer_uid=referrer_rewards.user_uid,
            referred_uid=new_user_uid,
            status="pending",
            referrer_ip=referrer_ip,
            referred_ip=referred_ip,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(referral)
        
        # Award referral bonuses
        self.rewards_service.add_points(
            referrer_rewards.user_uid,
            RewardsConfig.REFERRAL_SIGNUP_POINTS,
            f"Referral signup bonus",
            reference_id=new_user_uid,
            metadata={"referral": True, "type": "signup"}
        )
        self.rewards_service.add_coins(
            referrer_rewards.user_uid,
            RewardsConfig.REFERRAL_SIGNUP_COINS,
            f"Referral signup coin bonus",
            reference_id=new_user_uid,
            metadata={"referral": True, "type": "signup"}
        )
        
        self.rewards_service.add_points(
            new_user_uid,
            RewardsConfig.REFERRED_USER_BONUS_POINTS,
            "Welcome bonus from referral",
            metadata={"referral": True, "type": "welcome"}
        )
        self.rewards_service.add_coins(
            new_user_uid,
            RewardsConfig.REFERRED_USER_BONUS_COINS,
            "Welcome coin bonus from referral",
            metadata={"referral": True, "type": "welcome"}
        )
        
        # Update referral count
        referrer_rewards.referral_count += 1
        referrer_rewards.referral_coins_earned += RewardsConfig.REFERRAL_SIGNUP_COINS
        referrer_rewards.updated_at = datetime.now(timezone.utc)
        
        # Check milestone bonuses
        milestone = RewardsConfig.REFERRAL_MILESTONES.get(referrer_rewards.referral_count)
        if milestone:
            self.rewards_service.add_points(
                referrer_rewards.user_uid,
                milestone["points"],
                f"Milestone: {referrer_rewards.referral_count} referrals!",
                metadata={"milestone": referrer_rewards.referral_count, "type": "milestone"}
            )
            self.rewards_service.add_coins(
                referrer_rewards.user_uid,
                milestone["coins"],
                f"Milestone coin bonus: {referrer_rewards.referral_count} referrals",
                metadata={"milestone": referrer_rewards.referral_count, "type": "milestone"}
            )
            self.rewards_service.award_badge(referrer_rewards.user_uid, milestone["badge"])
        
        # Check for referral milestone badge
        self.rewards_service.check_and_award_milestone_badges(
            referrer_rewards.user_uid, "referral", referrer_rewards.referral_count
        )
        
        self.db.commit()
        
        return {
            "success": True,
            "message": "Referral code applied successfully",
            "referrer_earned": {
                "points": RewardsConfig.REFERRAL_SIGNUP_POINTS,
                "coins": RewardsConfig.REFERRAL_SIGNUP_COINS
            },
            "new_user_earned": {
                "points": RewardsConfig.REFERRED_USER_BONUS_POINTS,
                "coins": RewardsConfig.REFERRED_USER_BONUS_COINS
            }
        }
    
    def get_referral_info(self, user_uid: str) -> dict:
        """Get user's referral information"""
        rewards = self.rewards_service.get_or_create_user_rewards(user_uid)
        
        # Get referrals count by status
        total_referrals = self.db.query(Referral).filter(
            Referral.referrer_uid == user_uid
        ).count()
        
        pending_referrals = self.db.query(Referral).filter(
            Referral.referrer_uid == user_uid,
            Referral.status == "pending"
        ).count()
        
        completed_referrals = self.db.query(Referral).filter(
            Referral.referrer_uid == user_uid,
            Referral.status == "completed"
        ).count()
        
        # Get list of recent referrals
        recent_referrals = self.db.query(Referral).filter(
            Referral.referrer_uid == user_uid
        ).order_by(Referral.created_at.desc()).limit(10).all()
        
        # Calculate next milestone
        current_count = rewards.referral_count
        next_milestone = None
        
        for count in sorted(RewardsConfig.REFERRAL_MILESTONES.keys()):
            if count > current_count:
                milestone = RewardsConfig.REFERRAL_MILESTONES[count]
                next_milestone = {
                    "count": count,
                    "remaining": count - current_count,
                    "reward_coins": milestone["coins"],
                    "reward_points": milestone["points"],
                    "badge": milestone["badge"],
                    "description": milestone["description"]
                }
                break
        
        # Calculate total earnings
        total_points_earned = current_count * RewardsConfig.REFERRAL_SIGNUP_POINTS
        total_coins_earned = rewards.referral_coins_earned
        
        share_text = f"Join HyperNews and get rewards! Use my referral code: {rewards.referral_code}\nDownload: https://hypernews.app/download"
        
        return {
            "referral_code": rewards.referral_code,
            "referral_count": rewards.referral_count,
            "total_referrals": total_referrals,
            "pending_referrals": pending_referrals,
            "completed_referrals": completed_referrals,
            "total_earned": {
                "points": total_points_earned,
                "coins": total_coins_earned
            },
            "next_milestone": next_milestone,
            "recent_referrals": [
                {
                    "user_uid": r.referred_uid,
                    "status": r.status,
                    "created_at": r.created_at.isoformat(),
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None
                }
                for r in recent_referrals
            ],
            "share_text": share_text,
            "share_links": {
                "whatsapp": f"https://wa.me/?text={share_text.replace(' ', '%20')}",
                "telegram": f"https://t.me/share/url?url={share_text}",
                "twitter": f"https://twitter.com/intent/tweet?text={share_text.replace(' ', '%20')}",
                "facebook": f"https://www.facebook.com/sharer/sharer.php?u={share_text}"
            }
        }
    
    def mark_referral_completed(self, referred_uid: str, milestone: str = "signup") -> bool:
        """Mark a referral milestone as completed"""
        referral = self.db.query(Referral).filter(
            Referral.referred_uid == referred_uid
        ).first()
        
        if not referral:
            return False
        
        updated = False
        
        if milestone == "signup" and not referral.signup_completed:
            referral.signup_completed = True
            updated = True
        elif milestone == "articles_10" and not referral.articles_read_10:
            referral.articles_read_10 = True
            updated = True
        elif milestone == "week_active" and not referral.week_active:
            referral.week_active = True
            updated = True
        
        # Check if all milestones are completed
        if referral.signup_completed and referral.articles_read_10 and referral.week_active:
            if referral.status == "pending":
                referral.status = "completed"
                referral.completed_at = datetime.now(timezone.utc)
                
                # Award bonus for completed referral
                self.rewards_service.add_points(
                    referral.referrer_uid,
                    200,
                    f"Referral completed all milestones!",
                    reference_id=referred_uid,
                    metadata={"type": "referral_complete"}
                )
                self.rewards_service.add_coins(
                    referral.referrer_uid,
                    100,
                    f"Referral completion bonus",
                    reference_id=referred_uid,
                    metadata={"type": "referral_complete"}
                )
                updated = True
        
        if updated:
            self.db.commit()
        
        return updated