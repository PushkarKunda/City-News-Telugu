# services/fraud_detection.py
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import logging

from models.rewards import Referral, UserRewards, UserTransaction, SuspiciousActivity, AdReward
from config.rewards_config import RewardsConfig

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """Detect and prevent fraudulent activities"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_abnormal_activity(self, user_uid: str, action: str, ip_address: str = None) -> bool:
        """Detect potential cheating patterns"""
        
        is_suspicious = False
        reasons = []
        
        # Check 1: Unusually high activity in short time
        last_hour_actions = self.db.query(UserTransaction).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
        ).count()
        
        if last_hour_actions > 100:
            is_suspicious = True
            reasons.append(f"High activity: {last_hour_actions} actions in last hour")
        
        # Check 2: Same IP with multiple accounts (implement with Redis)
        if ip_address:
            same_ip_accounts = self.db.query(UserTransaction).filter(
                UserTransaction.ip_address == ip_address,
                UserTransaction.created_at >= datetime.now(timezone.utc) - timedelta(minutes=30)
            ).distinct(UserTransaction.user_uid).count()
            
            if same_ip_accounts > 5:
                is_suspicious = True
                reasons.append(f"Multiple accounts ({same_ip_accounts}) from same IP")
        
        # Check 3: Abnormal points earning rate
        today = date.today()
        today_points = self.db.query(func.sum(UserTransaction.amount)).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.transaction_type == "earn",
            UserTransaction.currency_type == "points",
            func.date(UserTransaction.created_at) == today
        ).scalar() or 0
        
        if today_points > RewardsConfig.READ_ARTICLE_DAILY_LIMIT * 2:
            is_suspicious = True
            reasons.append(f"Abnormal points earning: {today_points} points today")
        
        # Check 4: Ad fraud detection
        today_ads = self.db.query(AdReward).filter(
            AdReward.user_uid == user_uid,
            func.date(AdReward.watched_at) == today
        ).count()
        
        if today_ads > RewardsConfig.REWARDED_AD_DAILY_LIMIT:
            is_suspicious = True
            reasons.append(f"Excessive ad views: {today_ads} ads today")
        
        # Check 5: Rapid consecutive actions (bot detection)
        recent_timestamps = self.db.query(UserTransaction.created_at).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.created_at >= datetime.now(timezone.utc) - timedelta(minutes=5)
        ).order_by(UserTransaction.created_at.desc()).limit(20).all()
        
        if len(recent_timestamps) >= 10:
            # Check if actions are too uniform (bot pattern)
            timestamps = [t[0].timestamp() for t in recent_timestamps]
            diffs = [timestamps[i] - timestamps[i+1] for i in range(len(timestamps)-1)]
            
            if diffs and all(abs(d - diffs[0]) < 0.5 for d in diffs[:5]):
                is_suspicious = True
                reasons.append("Bot-like activity pattern detected")
        
        if is_suspicious:
            self.flag_user_for_review(user_uid, reasons, ip_address)
        
        return is_suspicious
    
    def flag_user_for_review(self, user_uid: str, reasons: list, ip_address: str = None):
        """Flag user for manual review"""
        
        # Update user rewards
        rewards = self.db.query(UserRewards).filter(UserRewards.user_uid == user_uid).first()
        if rewards:
            rewards.is_flagged = True
            rewards.flag_reason = " | ".join(reasons)
            rewards.flagged_at = datetime.now(timezone.utc)
        
        # Log suspicious activity
        activity = SuspiciousActivity(
            user_uid=user_uid,
            activity_type="abnormal_activity",
            description=" | ".join(reasons),
            ip_address=ip_address,
            severity="high" if len(reasons) > 2 else "medium",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(activity)
        self.db.commit()
        
        logger.warning(f"User {user_uid} flagged for suspicious activity: {reasons}")
    
    def is_user_flagged(self, user_uid: str) -> bool:
        """Check if user is flagged for suspicious activity"""
        rewards = self.db.query(UserRewards).filter(UserRewards.user_uid == user_uid).first()
        return rewards.is_flagged if rewards else False
    
    def validate_referral(self, referrer_uid: str, referred_uid: str, referrer_ip: str, referred_ip: str) -> dict:
        """Validate referral for fraud prevention"""
        
        # Check 1: Self referral
        if referrer_uid == referred_uid:
            return {"valid": False, "reason": "Self referral not allowed"}
        
        # Check 2: Same IP address (likely same person)
        if referrer_ip and referred_ip and referrer_ip == referred_ip:
            return {"valid": False, "reason": "Referral from same IP address detected"}
        
        # Check 3: Referrer already referred this user
        existing = self.db.query(Referral).filter(
            Referral.referred_uid == referred_uid
        ).first()
        
        if existing:
            return {"valid": False, "reason": "User already referred by someone"}
        
        # Check 4: Check for referral farming (multiple accounts from same IP)
        if referrer_ip:
            recent_referrals = self.db.query(Referral).filter(
                Referral.referrer_uid == referrer_uid,
                Referral.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
            ).count()
            
            if recent_referrals > 10:
                return {"valid": False, "reason": "Excessive referrals detected"}
        
        # Check 5: Referrer is not flagged
        if self.is_user_flagged(referrer_uid):
            return {"valid": False, "reason": "Referrer account is under review"}
        
        return {"valid": True, "reason": None}
    
    def get_flagged_users(self, limit: int = 50) -> list:
        """Get list of flagged users for admin review"""
        flagged = self.db.query(UserRewards).filter(
            UserRewards.is_flagged == True
        ).order_by(UserRewards.flagged_at.desc()).limit(limit).all()
        
        return [
            {
                "user_uid": u.user_uid,
                "flag_reason": u.flag_reason,
                "flagged_at": u.flagged_at,
                "points": u.points,
                "coins": u.coins
            }
            for u in flagged
        ]
    
    def clear_flag(self, user_uid: str, admin_uid: str) -> bool:
        """Clear fraud flag for a user (admin only)"""
        rewards = self.db.query(UserRewards).filter(UserRewards.user_uid == user_uid).first()
        if not rewards:
            return False
        
        rewards.is_flagged = False
        rewards.flag_reason = None
        rewards.flagged_at = None
        
        # Log clearance
        activity = SuspiciousActivity(
            user_uid=user_uid,
            activity_type="flag_cleared",
            description=f"Flag cleared by admin {admin_uid}",
            severity="low",
            resolved=True,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(activity)
        self.db.commit()
        
        logger.info(f"Flag cleared for user {user_uid} by admin {admin_uid}")
        return True