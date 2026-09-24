# models/rewards.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Date, Float, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class UserRewards(Base):
    """Core rewards tracking for each user"""
    __tablename__ = "user_rewards"
    __table_args__ = (
        Index('idx_user_rewards_points', 'points'),
        Index('idx_user_rewards_streak', 'current_streak'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Points (Gamification - Status)
    points = Column(Integer, default=0, server_default='0')
    total_points_earned = Column(Integer, default=0, server_default='0')
    total_points_spent = Column(Integer, default=0, server_default='0')
    
    # Coins (Real value - 100 coins = ₹1)
    coins = Column(Integer, default=0, server_default='0')
    total_coins_earned = Column(Integer, default=0, server_default='0')
    total_coins_spent = Column(Integer, default=0, server_default='0')
    
    # Level System (1-100)
    level = Column(Integer, default=1, server_default='1')
    level_progress = Column(Integer, default=0, server_default='0')
    
    # Streak Tracking
    current_streak = Column(Integer, default=0, server_default='0')
    longest_streak = Column(Integer, default=0, server_default='0')
    last_activity_date = Column(Date, nullable=True)
    
    # Referral System
    referral_code = Column(String(20), unique=True, nullable=True, index=True)
    referral_count = Column(Integer, default=0, server_default='0')
    referral_coins_earned = Column(Integer, default=0, server_default='0')
    
    # Ad Revenue Sharing
    total_ads_watched = Column(Integer, default=0, server_default='0')
    coins_from_ads = Column(Integer, default=0, server_default='0')
    
    # Fraud Detection
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(500), nullable=True)
    flagged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Premium Status
    is_premium = Column(Boolean, default=False)
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="rewards")
    transactions = relationship(
        "UserTransaction",
        primaryjoin="UserRewards.user_uid == foreign(UserTransaction.user_uid)",
        backref="user_rewards",
        cascade="all, delete-orphan",
    )
    badges = relationship(
        "UserBadge",
        primaryjoin="UserRewards.user_uid == foreign(UserBadge.user_uid)",
        backref="user_rewards",
        cascade="all, delete-orphan",
    )


class UserTransaction(Base):
    """Audit log for all point/coin transactions"""
    __tablename__ = "user_transactions"
    __table_args__ = (
        Index('idx_transactions_user_date', 'user_uid', 'created_at'),
        Index('idx_transactions_type', 'transaction_type'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    
    transaction_type = Column(String(50), nullable=False)  # earn, spend, bonus, referral, ad_reward
    currency_type = Column(String(10), nullable=False)     # points, coins
    amount = Column(Integer, nullable=False)
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    
    description = Column(String(500), nullable=False)
    reference_id = Column(String(100), nullable=True)
    metadata_json = Column("metadata", Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserBadge(Base):
    """Achievement badges earned by users"""
    __tablename__ = "user_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(String(50), nullable=False, index=True)
    badge_name = Column(String(100), nullable=False)
    badge_icon = Column(String(100), nullable=True)
    badge_color = Column(String(10), nullable=True)
    badge_description = Column(String(255), nullable=True)
    rarity = Column(String(20), default="common")  # common, rare, epic, legendary
    points_bonus = Column(Integer, default=0)
    
    earned_at = Column(DateTime(timezone=True), server_default=func.now())


class Referral(Base):
    """Track user referrals"""
    __tablename__ = "referrals"
    
    id = Column(Integer, primary_key=True, index=True)
    referrer_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    referred_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    status = Column(String(20), default="pending")  # pending, completed, rewarded
    
    # Milestones
    signup_completed = Column(Boolean, default=False)
    articles_read_10 = Column(Boolean, default=False)
    week_active = Column(Boolean, default=False)
    
    referrer_ip = Column(String(45), nullable=True)
    referred_ip = Column(String(45), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class ReferralMilestone(Base):
    """Referral milestones and bonuses"""
    __tablename__ = "referral_milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    milestone_count = Column(Integer, unique=True, nullable=False)  # 5, 10, 25, 50, 100
    bonus_coins = Column(Integer, nullable=False)
    bonus_points = Column(Integer, nullable=False)
    badge_id = Column(String(50), nullable=True)
    description = Column(String(255), nullable=False)


class DailyChallenge(Base):
    """Daily challenges for users"""
    __tablename__ = "daily_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    challenge_date = Column(Date, unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    action_type = Column(String(50), nullable=False)
    target_count = Column(Integer, nullable=False)
    reward_points = Column(Integer, nullable=False)
    reward_coins = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserChallengeProgress(Base):
    """Track user progress on daily challenges"""
    __tablename__ = "user_challenge_progress"
    __table_args__ = (
        Index('idx_challenge_user', 'user_uid', 'challenge_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    claimed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BingoCard(Base):
    """Weekly bingo card for users"""
    __tablename__ = "bingo_cards"
    __table_args__ = (
        Index('idx_bingo_user_week', 'user_uid', 'week_start_date'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    week_start_date = Column(Date, nullable=False, index=True)
    
    card_data = Column(Text, nullable=False)  # JSON string
    completed_cells = Column(Text, default="[]")
    completed_lines = Column(Text, default="[]")
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    reward_claimed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AdReward(Base):
    """Track ad views and rewards"""
    __tablename__ = "ad_rewards"
    __table_args__ = (
        Index('idx_ad_user_date', 'user_uid', 'watched_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    ad_id = Column(Integer, nullable=True)
    ad_type = Column(String(50), nullable=False)
    coins_earned = Column(Integer, default=0)
    ip_address = Column(String(45), nullable=True)
    watched_at = Column(DateTime(timezone=True), server_default=func.now())


class Voucher(Base):
    """Vouchers for redemption"""
    __tablename__ = "vouchers"
    
    id = Column(Integer, primary_key=True, index=True)
    voucher_uid = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    voucher_type = Column(String(20), nullable=False)
    points_cost = Column(Integer, default=0)
    coins_cost = Column(Integer, default=0)
    discount_type = Column(String(20), nullable=True)
    discount_value = Column(Float, nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    total_quantity = Column(Integer, default=0)
    remaining_quantity = Column(Integer, default=0)
    user_limit = Column(Integer, default=1)
    sponsor_name = Column(String(200), nullable=True)
    sponsor_logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    redemption_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String, ForeignKey("users.user_uid"), nullable=True)


class UserVoucher(Base):
    """Track vouchers purchased by users"""
    __tablename__ = "user_vouchers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_code = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(20), default="active")
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    user = relationship("User", backref="user_vouchers")
    voucher = relationship("Voucher", backref="user_vouchers")


class SuspiciousActivity(Base):
    """Track suspicious activities for fraud detection"""
    __tablename__ = "suspicious_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)
    description = Column(String(500), nullable=False)
    ip_address = Column(String(45), nullable=True)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
