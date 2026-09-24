# models/user.py
"""
User and Authentication Data Models for HyperNews.
Includes:
- OTPStore (OTP management)
- User (Core user profile, roles, suspension, password hash)
- UserPreference (Language and location preferences)
- DeviceToken (Push notification tokens)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import (
    Column, String, Integer, ForeignKey, Date, DateTime, Boolean,
    UniqueConstraint, Table, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from schemas import UserRole


class OTPStore(Base):
    __tablename__ = "otp_store"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(10), nullable=False)  # "mobile" or "email"
    value = Column(String(100), nullable=False, index=True)
    otp = Column(String(100), nullable=False)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc) + timedelta(minutes=5))

    __table_args__ = (
        Index("ix_otp_value_type", "value", "type"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(8), unique=True, index=True, nullable=False)
    phone = Column(String(15), unique=True, nullable=True)
    name = Column(String(100), nullable=True)
    gender = Column(String(10), nullable=True)
    role = Column(Integer, default=1, index=True)  # Legacy role integer (1=USER)
    hashed_password = Column(String(255), nullable=True)  # Secure password hash
    profile_picture = Column(String(500), nullable=True)
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)

    language = Column(String(10), nullable=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    email = Column(String(100), unique=True, nullable=True)
    user_name = Column(String(30), unique=True, nullable=True)
    email_verified = Column(Boolean, default=False)
    mobile_verified = Column(Boolean, default=False)
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    token_version = Column(Integer, default=0)

    # Suspension & Moderation
    is_suspended = Column(Boolean, default=False, index=True)
    suspension_reason = Column(String(500), nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_until = Column(DateTime(timezone=True), nullable=True)
    suspended_by = Column(String(8), ForeignKey("users.user_uid"), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Role switch tracking
    switched_by = Column(String(8), ForeignKey("users.user_uid"), nullable=True)
    switched_at = Column(DateTime(timezone=True), nullable=True)

    def __init__(self, **kwargs):
        if "password_hash" in kwargs and "hashed_password" not in kwargs:
            kwargs["hashed_password"] = kwargs.pop("password_hash")
        super().__init__(**kwargs)

    @property
    def password_hash(self):
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, value):
        self.hashed_password = value

    # Location relationships
    state = relationship("State", foreign_keys=[state_id])
    district = relationship("District", foreign_keys=[district_id])
    city = relationship("City", foreign_keys=[city_id])

    # News relationships
    news = relationship("News", back_populates="user", foreign_keys="[News.user_uid]")
    approved_news = relationship("News", back_populates="approver", foreign_keys="[News.approved_by_uid]")
    rejected_news = relationship("News", back_populates="rejector", foreign_keys="[News.rejected_by_uid]")

    # Preferences & Sessions
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")

    # Self-referential relationships
    suspended_by_user = relationship("User", foreign_keys=[suspended_by], remote_side=[user_uid])
    switched_by_user = relationship("User", foreign_keys=[switched_by], remote_side=[user_uid])


user_preference_categories = Table(
    "user_preference_categories",
    Base.metadata,
    Column("preference_id", Integer, ForeignKey("user_preferences.id", ondelete="CASCADE")),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"))
)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    categories = relationship("Category", secondary=user_preference_categories, backref="user_preferences")
    language = relationship("Language")
    state = relationship("State")
    district = relationship("District")
    city = relationship("City")
    user = relationship("User", back_populates="preferences")


class DeviceToken(Base):
    """Store FCM tokens for user devices"""
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    fcm_token = Column(String(255), nullable=False, unique=True, index=True)
    device_type = Column(String(20), nullable=False)  # android, ios, web
    device_name = Column(String(100), nullable=True)
    app_version = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="device_tokens")