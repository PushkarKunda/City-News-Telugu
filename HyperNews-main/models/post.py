# models/post.py - COMPLETE UPDATED VERSION

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Table, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

# Association table for post hashtags
post_hashtags = Table(
    "post_hashtags",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id", ondelete="CASCADE")),
    Column("hashtag_id", Integer, ForeignKey("hashtags.id", ondelete="CASCADE"))
)


class PostHashtag(Base):
    """Hashtag model for posts"""
    __tablename__ = "hashtags"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), server_default=func.now())  # ✅ NEW
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_hashtag_usage', 'usage_count', 'last_used_at'),
    )


class Post(Base):
    """Post model - like Facebook/Instagram feed posts"""
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    post_uid = Column(String(10), unique=True, nullable=False, index=True)
    
    # Content
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    
    # User info
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    
    # Engagement counters
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    
    # ✅ NEW: Edit tracking
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    edited_by_uid = Column(String(8), ForeignKey("users.user_uid"), nullable=True)
    hashtag_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_uid], backref="posts")
    edited_by = relationship("User", foreign_keys=[edited_by_uid])
    hashtags = relationship("PostHashtag", secondary=post_hashtags, backref="posts")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    shares = relationship("PostShare", back_populates="post", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_post_user', 'user_uid', 'created_at'),
        Index('idx_post_created', 'created_at'),
    )


class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="likes")
    user = relationship("User")


class PostComment(Base):
    __tablename__ = "post_comments"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    comment_text = Column(Text, nullable=False)
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="comments")
    user = relationship("User")


class PostShare(Base):
    __tablename__ = "post_shares"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="shares")
    user = relationship("User")