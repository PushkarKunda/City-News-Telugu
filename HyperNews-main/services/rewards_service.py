# services/rewards_service.py
import json
import random
import string
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
import logging

from models.user import User
from models.rewards import (
    UserRewards, UserTransaction, UserBadge, Referral, ReferralMilestone,
    AdReward, SuspiciousActivity
)
from config.rewards_config import RewardsConfig
from middleware.ip_whitelist import get_client_ip
from services.fraud_detection import FraudDetectionService

logger = logging.getLogger(__name__)


class RewardsService:
    """Complete rewards service with fraud detection"""
    
    def __init__(self, db: Session, request=None):
        self.db = db
        self.request = request
        self.fraud_detection = FraudDetectionService(db)
        self._init_referral_milestones()
    
    def _get_client_info(self) -> dict:
        """Get client IP and user agent from request"""
        if not self.request:
            return {"ip": None, "user_agent": None}
        
        return {
            "ip": get_client_ip(self.request),
            "user_agent": self.request.headers.get("User-Agent", "")
        }
    
    def _init_referral_milestones(self):
        """Initialize referral milestones if not exists"""
        for count, config in RewardsConfig.REFERRAL_MILESTONES.items():
            existing = self.db.query(ReferralMilestone).filter(
                ReferralMilestone.milestone_count == count
            ).first()
            if not existing:
                milestone = ReferralMilestone(
                    milestone_count=count,
                    bonus_coins=config["coins"],
                    bonus_points=config["points"],
                    badge_id=config["badge"],
                    description=config["description"]
                )
                self.db.add(milestone)
        self.db.commit()
    
    def get_or_create_user_rewards(self, user_uid: str) -> UserRewards:
        """Get or create user rewards record"""
        rewards = self.db.query(UserRewards).filter(
            UserRewards.user_uid == user_uid
        ).first()
        
        if not rewards:
            # Check if user is flagged before creating
            if self.fraud_detection.is_user_flagged(user_uid):
                raise ValueError("Account is flagged for suspicious activity")
            
            # Generate unique referral code
            referral_code = self._generate_referral_code()
            
            rewards = UserRewards(
                user_uid=user_uid,
                referral_code=referral_code,
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(rewards)
            self.db.commit()
            self.db.refresh(rewards)
            
            # Award welcome bonus
            self.add_points(user_uid, 100, "Welcome to HyperNews!", metadata={"type": "welcome"})
            self.add_coins(user_uid, 25, "Welcome bonus coins")
            self.award_badge(user_uid, "first_article")
        
        return rewards
    
    def _generate_referral_code(self) -> str:
        """Generate unique referral code"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            existing = self.db.query(UserRewards).filter(
                UserRewards.referral_code == code
            ).first()
            if not existing:
                return code
    
    def _record_transaction(self, user_uid: str, transaction_type: str,
                           currency_type: str, amount: int, 
                           balance_before: int, balance_after: int,
                           description: str, reference_id: str = None,
                           metadata: dict = None):
        """Record transaction for audit trail"""
        client_info = self._get_client_info()
        
        transaction = UserTransaction(
            user_uid=user_uid,
            transaction_type=transaction_type,
            currency_type=currency_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            description=description,
            reference_id=reference_id,
            metadata_json=json.dumps(metadata) if metadata else None,
            ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(transaction)
    
    def add_points(self, user_uid: str, points: int, description: str,
                   reference_id: str = None, metadata: dict = None) -> UserRewards:
        """Add points to user with fraud detection"""
        # Check if user is flagged
        if self.fraud_detection.is_user_flagged(user_uid):
            raise ValueError("Account is flagged. Cannot earn points.")
        
        # Detect suspicious activity
        client_info = self._get_client_info()
        if self.fraud_detection.detect_abnormal_activity(user_uid, "earn_points", client_info["ip"]):
            logger.warning(f"Suspicious activity detected for user {user_uid}")
        
        rewards = self.get_or_create_user_rewards(user_uid)
        
        old_points = rewards.points
        rewards.points += points
        rewards.total_points_earned += points
        rewards.updated_at = datetime.now(timezone.utc)
        
        # Check daily limits
        if metadata and metadata.get("action_type"):
            self._check_daily_limit(user_uid, metadata["action_type"], points)
        
        # Level up check
        old_level = rewards.level
        new_level = self._calculate_level(rewards.points)
        
        if new_level > old_level:
            rewards.level = new_level
            level_reward_coins = RewardsConfig.LEVEL_COIN_REWARDS.get(new_level, 0)
            
            if level_reward_coins > 0:
                self.add_coins(user_uid, level_reward_coins, f"Level up to Level {new_level} reward!")
            
            badge_id = RewardsConfig.LEVEL_BADGES.get(new_level)
            if badge_id:
                self.award_badge(user_uid, badge_id)
        else:
            # Calculate progress to next level
            current_threshold = RewardsConfig.LEVEL_THRESHOLDS.get(rewards.level, 0)
            next_threshold = RewardsConfig.LEVEL_THRESHOLDS.get(rewards.level + 1, current_threshold + 10000)
            progress = int((rewards.points - current_threshold) / (next_threshold - current_threshold) * 100)
            rewards.level_progress = min(progress, 100)
        
        self._record_transaction(
            user_uid, "earn", "points", points,
            old_points, rewards.points, description, reference_id, metadata
        )
        
        self.db.commit()
        return rewards
    
    def add_coins(self, user_uid: str, coins: int, description: str,
                  reference_id: str = None, metadata: dict = None) -> UserRewards:
        """Add coins to user with fraud detection"""
        if self.fraud_detection.is_user_flagged(user_uid):
            raise ValueError("Account is flagged. Cannot earn coins.")
        
        rewards = self.get_or_create_user_rewards(user_uid)
        
        old_coins = rewards.coins
        rewards.coins += coins
        rewards.total_coins_earned += coins
        rewards.updated_at = datetime.now(timezone.utc)
        
        self._record_transaction(
            user_uid, "earn", "coins", coins,
            old_coins, rewards.coins, description, reference_id, metadata
        )
        
        self.db.commit()
        return rewards
    
    def spend_points(self, user_uid: str, points: int, description: str,
                     reference_id: str = None) -> bool:
        """Spend points for redemption"""
        if self.fraud_detection.is_user_flagged(user_uid):
            raise ValueError("Account is flagged. Cannot spend points.")
        
        rewards = self.get_or_create_user_rewards(user_uid)
        
        if rewards.points < points:
            return False
        
        old_points = rewards.points
        rewards.points -= points
        rewards.total_points_spent += points
        rewards.updated_at = datetime.now(timezone.utc)
        
        self._record_transaction(
            user_uid, "spend", "points", points,
            old_points, rewards.points, description, reference_id
        )
        
        self.db.commit()
        return True
    
    def spend_coins(self, user_uid: str, coins: int, description: str,
                    reference_id: str = None) -> bool:
        """Spend coins for redemption"""
        if self.fraud_detection.is_user_flagged(user_uid):
            raise ValueError("Account is flagged. Cannot spend coins.")
        
        rewards = self.get_or_create_user_rewards(user_uid)
        
        if rewards.coins < coins:
            return False
        
        old_coins = rewards.coins
        rewards.coins -= coins
        rewards.total_coins_spent += coins
        rewards.updated_at = datetime.now(timezone.utc)
        
        self._record_transaction(
            user_uid, "spend", "coins", coins,
            old_coins, rewards.coins, description, reference_id
        )
        
        self.db.commit()
        return True
    
    def _calculate_level(self, points: int) -> int:
        """Calculate level based on points"""
        for level, threshold in sorted(RewardsConfig.LEVEL_THRESHOLDS.items(), reverse=True):
            if points >= threshold:
                return level
        return 1
    
    def _check_daily_limit(self, user_uid: str, action_type: str, points: int):
        """Check and enforce daily limits"""
        today = date.today()
        
        limits = {
            "read": RewardsConfig.READ_ARTICLE_DAILY_LIMIT,
            "share": RewardsConfig.SHARE_DAILY_LIMIT,
            "comment": RewardsConfig.COMMENT_DAILY_LIMIT,
            "like": RewardsConfig.LIKE_DAILY_LIMIT,
        }
        
        if action_type not in limits:
            return
        
        daily_total = self.db.query(func.sum(UserTransaction.amount)).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.transaction_type == "earn",
            UserTransaction.currency_type == "points",
            func.date(UserTransaction.created_at) == today
        ).scalar() or 0
        
        if daily_total >= limits[action_type]:
            raise ValueError(f"Daily limit reached for {action_type}")
    
    def update_daily_streak(self, user_uid: str) -> int:
        """Update user's daily reading streak"""
        rewards = self.get_or_create_user_rewards(user_uid)
        
        today = date.today()
        
        if rewards.last_activity_date == today:
            return rewards.current_streak
        
        if rewards.last_activity_date == today - timedelta(days=1):
            rewards.current_streak += 1
        else:
            rewards.current_streak = 1
        
        rewards.last_activity_date = today
        
        # Award streak bonuses
        if rewards.current_streak == 7:
            self.add_points(user_uid, RewardsConfig.STREAK_BONUS_7_DAYS, "7-day reading streak bonus!")
            self.add_coins(user_uid, RewardsConfig.STREAK_BONUS_7_COINS, "7-day streak coin bonus")
            self.award_badge(user_uid, "streak_7")
        elif rewards.current_streak == 30:
            self.add_points(user_uid, RewardsConfig.STREAK_BONUS_30_DAYS, "30-day reading streak bonus!")
            self.add_coins(user_uid, RewardsConfig.STREAK_BONUS_30_COINS, "30-day streak coin bonus")
            self.award_badge(user_uid, "streak_30")
        elif rewards.current_streak == 100:
            self.add_points(user_uid, RewardsConfig.STREAK_BONUS_100_DAYS, "100-day reading streak bonus!")
            self.add_coins(user_uid, RewardsConfig.STREAK_BONUS_100_COINS, "100-day streak coin bonus")
            self.award_badge(user_uid, "streak_100")
        
        if rewards.current_streak > rewards.longest_streak:
            rewards.longest_streak = rewards.current_streak
        
        self.db.commit()
        return rewards.current_streak
    
    def claim_daily_login(self, user_uid: str) -> dict:
        """Claim daily login reward"""
        self.update_daily_streak(user_uid)
        
        points_earned = RewardsConfig.DAILY_LOGIN_POINTS
        coins_earned = RewardsConfig.DAILY_LOGIN_COINS
        
        rewards = self.get_or_create_user_rewards(user_uid)
        
        # Bonus for longer streaks
        if rewards.current_streak >= 7:
            points_earned += 50
            coins_earned += 10
        elif rewards.current_streak >= 30:
            points_earned += 100
            coins_earned += 20
        
        self.add_points(user_uid, points_earned, "Daily login reward")
        self.add_coins(user_uid, coins_earned, "Daily login coin reward")
        
        return {
            "claimed": True,
            "points_earned": points_earned,
            "coins_earned": coins_earned,
            "current_streak": rewards.current_streak,
            "longest_streak": rewards.longest_streak
        }
    
    def award_badge(self, user_uid: str, badge_id: str) -> bool:
        """Award a badge to user"""
        existing = self.db.query(UserBadge).filter(
            UserBadge.user_uid == user_uid,
            UserBadge.badge_id == badge_id
        ).first()
        
        if existing:
            return False
        
        badge_config = RewardsConfig.BADGES.get(badge_id)
        if not badge_config:
            return False
        
        badge = UserBadge(
            user_uid=user_uid,
            badge_id=badge_id,
            badge_name=badge_config["name"],
            badge_icon=badge_config.get("icon", "🎖️"),
            badge_color=badge_config.get("color", "#4CAF50"),
            badge_description=badge_config.get("description", ""),
            rarity=badge_config.get("rarity", "common"),
            points_bonus=badge_config.get("points_bonus", 0),
            earned_at=datetime.now(timezone.utc)
        )
        self.db.add(badge)
        
        if badge_config.get("points_bonus", 0) > 0:
            self.add_points(user_uid, badge_config["points_bonus"], f"Earned badge: {badge_config['name']}")
        
        self.db.commit()
        return True
    
    def check_and_award_milestone_badges(self, user_uid: str, action: str, count: int):
        """Check and award milestone-based badges"""
        badge_checks = {
            "read": [
                (100, "news_junkie"),
                (1000, "news_master"),
                (10000, "news_guru"),
            ],
            "share": [
                (100, "influencer"),
            ],
            "referral": [
                (5, "bronze_referrer"),
                (25, "silver_referrer"),
                (100, "gold_referrer"),
            ],
            "ad_watch": [
                (100, "ad_viewer"),
                (1000, "ad_master"),
            ],
        }
        
        for threshold, badge_id in badge_checks.get(action, []):
            if count >= threshold:
                self.award_badge(user_uid, badge_id)
    
    def get_user_summary(self, user_uid: str) -> dict:
        """Get complete user rewards summary"""
        rewards = self.get_or_create_user_rewards(user_uid)
        
        # Check if user is flagged
        is_flagged = self.fraud_detection.is_user_flagged(user_uid)
        
        recent_badges = self.db.query(UserBadge).filter(
            UserBadge.user_uid == user_uid
        ).order_by(UserBadge.earned_at.desc()).limit(5).all()
        
        # Calculate rank
        rank = self.db.query(func.count(UserRewards.user_uid)).filter(
            UserRewards.points > rewards.points
        ).scalar() or 0
        
        return {
            "points": rewards.points,
            "coins": rewards.coins,
            "level": rewards.level,
            "level_progress": rewards.level_progress,
            "current_streak": rewards.current_streak,
            "longest_streak": rewards.longest_streak,
            "referral_code": rewards.referral_code,
            "referral_count": rewards.referral_count,
            "total_points_earned": rewards.total_points_earned,
            "total_coins_earned": rewards.total_coins_earned,
            "total_ads_watched": rewards.total_ads_watched,
            "coins_from_ads": rewards.coins_from_ads,
            "is_premium": rewards.is_premium,
            "premium_expires_at": rewards.premium_expires_at,
            "is_flagged": is_flagged,
            "rank": rank + 1,
            "recent_badges": [
                {
                    "badge_id": b.badge_id,
                    "badge_name": b.badge_name,
                    "badge_icon": b.badge_icon,
                    "badge_color": b.badge_color,
                    "badge_description": b.badge_description,
                    "rarity": b.rarity,
                    "earned_at": b.earned_at.isoformat()
                }
                for b in recent_badges
            ],
            "next_level": {
                "level": rewards.level + 1,
                "points_needed": RewardsConfig.LEVEL_THRESHOLDS.get(rewards.level + 1, 0) - rewards.points
            } if rewards.level < 8 else None
        }
    
    def get_transactions(self, user_uid: str, limit: int = 50, offset: int = 0, 
                         transaction_type: str = None) -> dict:
        """Get user's transaction history"""
        query = self.db.query(UserTransaction).filter(
            UserTransaction.user_uid == user_uid
        )
        
        if transaction_type:
            query = query.filter(UserTransaction.transaction_type == transaction_type)
        
        total = query.count()
        transactions = query.order_by(
            UserTransaction.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < total,
            "items": [
                {
                    "id": t.id,
                    "transaction_type": t.transaction_type,
                    "currency_type": t.currency_type,
                    "amount": t.amount,
                    "description": t.description,
                    "reference_id": t.reference_id,
                    "metadata": json.loads(t.metadata_json) if t.metadata_json else None,
                    "created_at": t.created_at.isoformat()
                }
                for t in transactions
            ]
        }
    
    def get_leaderboard(self, period: str = "weekly", limit: int = 100) -> list:
        """Get leaderboard for specified period"""
        now = datetime.now(timezone.utc)
        
        if period == "daily":
            start_date = now - timedelta(days=1)
        elif period == "weekly":
            start_date = now - timedelta(days=7)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        else:
            start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
        
        from models.user import User
        
        # Exclude flagged users from leaderboard
        top_users = self.db.query(
            User.user_uid,
            User.user_name,
            User.name,
            User.profile_picture,
            func.sum(UserTransaction.amount).label('points_earned')
        ).join(
            UserTransaction, User.user_uid == UserTransaction.user_uid
        ).outerjoin(
            UserRewards, User.user_uid == UserRewards.user_uid
        ).filter(
            UserTransaction.transaction_type == "earn",
            UserTransaction.currency_type == "points",
            UserTransaction.created_at >= start_date,
            (UserRewards.is_flagged == False) | (UserRewards.is_flagged == None)
        ).group_by(
            User.user_uid, User.user_name, User.name, User.profile_picture
        ).order_by(
            func.sum(UserTransaction.amount).desc()
        ).limit(limit).all()
        
        leaderboard = []
        for idx, user in enumerate(top_users):
            leaderboard.append({
                "rank": idx + 1,
                "user_uid": user.user_uid,
                "user_name": user.user_name,
                "name": user.name,
                "profile_picture": user.profile_picture,
                "points_earned": user.points_earned or 0
            })
        
        return leaderboard
