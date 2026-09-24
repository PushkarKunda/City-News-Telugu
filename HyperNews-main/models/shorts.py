# models/shorts.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class YouTubeShort(Base):
    """YouTube shorts stored in database"""
    __tablename__ = "youtube_shorts"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    channel_title = Column(String(200), nullable=True)
    video_url = Column(String(500), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    language = Column(String(10), nullable=False, index=True)  # en, te, hi
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_shorts_language_published', 'language', 'published_at'),
    )


class UserShort(Base):
    """Shorts uploaded by users/publishers"""
    __tablename__ = "user_shorts"
    
    id = Column(Integer, primary_key=True, index=True)
    short_uid = Column(String(10), unique=True, nullable=False, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=False)  # Could be YouTube URL or hosted video
    thumbnail_url = Column(String(500), nullable=True)
    
    # YouTube video ID (if from YouTube)
    youtube_video_id = Column(String(20), nullable=True)
    
    # Metadata
    duration_seconds = Column(Integer, default=0)
    language = Column(String(10), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    # Engagement
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    
    # Status
    is_approved = Column(Integer, default=0, index=True)  # 0=pending, 1=approved, 2=rejected
    is_active = Column(Boolean, default=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(8), ForeignKey("users.user_uid"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_uid])
    approver = relationship("User", foreign_keys=[approved_by])
    category = relationship("Category")
    
    __table_args__ = (
        Index('idx_user_shorts_language', 'language', 'created_at'),
        Index('idx_user_shorts_approved', 'is_approved', 'created_at'),
    )


class ShortEngagement(Base):
    """Track user engagement with shorts"""
    __tablename__ = "short_engagements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    short_type = Column(String(10), nullable=False)  # youtube, user
    short_id = Column(Integer, nullable=False)
    engagement_type = Column(String(20), nullable=False)  # view, like, share, comment
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_engagement_short', 'short_type', 'short_id', 'engagement_type'),
        Index('idx_engagement_user', 'user_uid', 'created_at'),
    )