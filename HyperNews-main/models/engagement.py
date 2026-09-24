# models/engagement.py - COMPLETE UPDATED VERSION

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Bookmark(Base):
    """User bookmarks for content"""
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    content_type = Column(String, nullable=False)  # news, event, poll, post
    content_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="bookmarks")
    
    __table_args__ = (
        UniqueConstraint("user_uid", "content_type", "content_id", name="unique_bookmark"),
        Index("ix_bookmarks_user", "user_uid", "created_at"),
        Index("ix_bookmarks_content", "content_type", "content_id"),
    )


class Notification(Base):
    """In-app notifications for users"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    actor_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=True)
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(500), nullable=True)
    notification_type = Column(String(30), default="system")  # follow, like, comment, share, system, admin
    
    is_read = Column(Boolean, default=False)
    action_required = Column(Boolean, default=False)
    action_data = Column(Text, nullable=True)  # JSON data for actions
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_uid], backref="notifications")
    actor = relationship("User", foreign_keys=[actor_uid], backref="sent_notifications")
    
    __table_args__ = (
        Index("ix_notifications_user_created", "user_uid", "created_at"),
        Index("ix_notifications_actor", "actor_uid"),
        Index("ix_notifications_unread", "user_uid", "is_read"),
        Index("ix_notifications_type", "notification_type", "created_at"),
    )


class UserActivityLog(Base):
    """Audit log for user activities"""
    __tablename__ = "user_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)  # create, update, delete, like, comment, share, view, bookmark
    entity_type = Column(String(50), nullable=True, index=True)  # news, post, comment, event, poll
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")

    __table_args__ = (
        Index("ix_user_activity_user_created", "user_uid", "created_at"),
        Index("ix_user_activity_entity", "entity_type", "entity_id"),
        Index("ix_user_activity_action", "action", "created_at"),
    )


class Reaction(Base):
    """Reactions on content (like, love, laugh, etc.)"""
    __tablename__ = "reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    content_type = Column(String(30), nullable=False)  # news, post, comment, status
    content_id = Column(Integer, nullable=False)
    reaction_type = Column(String(20), nullable=False)  # like, love, laugh, shock, sad, angry
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint("user_uid", "content_type", "content_id", name="unique_reaction"),
        Index("ix_reactions_content", "content_type", "content_id", "reaction_type"),
        Index("ix_reactions_user", "user_uid", "created_at"),
    )


class Share(Base):
    """Share tracking for content"""
    __tablename__ = "shares"
    
    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    content_type = Column(String(30), nullable=False)  # news, post, status
    content_id = Column(Integer, nullable=False)
    platform = Column(String(30), nullable=True)  # whatsapp, twitter, facebook, instagram
    share_count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        Index("ix_shares_content", "content_type", "content_id"),
        Index("ix_shares_user", "user_uid", "created_at"),
        Index("ix_shares_platform", "platform"),
    )


class CommentLike(Base):
    """Likes on comments"""
    __tablename__ = "comment_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String, ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint("comment_id", "user_uid", name="unique_comment_like"),
        Index("ix_comment_likes_user", "user_uid"),
    )