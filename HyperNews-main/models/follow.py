# models/follow.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Follow(Base):
    """Simple follow relationship for public platform"""
    __tablename__ = "follows"
    __table_args__ = (
        UniqueConstraint('follower_uid', 'following_uid', name='unique_follow'),
        Index('idx_follow_follower', 'follower_uid'),
        Index('idx_follow_following', 'following_uid'),
        Index('idx_follow_status', 'is_active', 'created_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    follower_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    following_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_uid], backref="following_relations")
    following = relationship("User", foreign_keys=[following_uid], backref="follower_relations")