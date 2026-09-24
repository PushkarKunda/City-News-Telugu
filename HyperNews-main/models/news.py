# models/news.py
"""
News and Editorial Data Models for HyperNews.
Includes:
- Category (Categories for classification)
- News (Core news stories with duplicate detection, quality, and ranking fields)
- Comment (User comments on news)
- NewsView (Views tracking)
- NewsFlag (User/editorial flag for moderation)
- ScheduledNews (Content scheduled for future publishing)
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey,
    Text, Table, UniqueConstraint, Float, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ==============================
# Category Association Table
# ==============================

news_categories = Table(
    "news_categories",
    Base.metadata,
    Column("news_id", Integer, ForeignKey("news.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
    Index("ix_news_categories_pair", "news_id", "category_id")
)


# ==============================
# Category Model
# ==============================

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(120), unique=True, nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True, index=True)
    color = Column(String(7), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    news = relationship(
        "News",
        secondary=news_categories,
        back_populates="categories"
    )


# ==============================
# News Model
# ==============================

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    news_uid = Column(String(8), unique=True, nullable=False, index=True)

    title = Column(String(255), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)

    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False, index=True)

    # Workflow & Moderation
    is_approved = Column(Integer, default=0, index=True)  # 0=pending, 1=approved, 2=rejected
    status = Column(String(20), default="published", index=True)  # draft, submitted, approved, published, rejected, archived
    is_auto_generated = Column(Boolean, default=False)
    rejection_reason = Column(Text, nullable=True)

    source_url = Column(String(500), nullable=True, index=True)
    source_name = Column(String(100), nullable=True)
    source_id = Column(Integer, nullable=True, index=True)

    # Duplicate Detection & Clustering
    cluster_id = Column(String(32), nullable=True, index=True)
    canonical_story_id = Column(Integer, ForeignKey("news.id", ondelete="SET NULL"), nullable=True, index=True)
    is_duplicate = Column(Boolean, default=False, index=True)
    duplicate_score = Column(Float, default=0.0)

    # Ranking & Quality Scores
    quality_score = Column(Float, default=1.0)
    ranking_score = Column(Float, default=0.0, index=True)

    # User & Editorial Attribution
    user_uid = Column(String(8), ForeignKey("users.user_uid"), nullable=False, index=True)
    approved_by_uid = Column(String(8), ForeignKey("users.user_uid"), nullable=True)
    rejected_by_uid = Column(String(8), ForeignKey("users.user_uid"), nullable=True)

    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)

    # Breaking & Trending News
    is_breaking = Column(Boolean, default=False, index=True)
    breaking_priority = Column(Integer, default=0)
    breaking_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_trending = Column(Boolean, default=False, index=True)

    # Engagement Counters (Optimized for feed reads)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="news", foreign_keys=[user_uid])
    approver = relationship("User", back_populates="approved_news", foreign_keys=[approved_by_uid])
    rejector = relationship("User", back_populates="rejected_news", foreign_keys=[rejected_by_uid])

    city = relationship("City", back_populates="news")
    language = relationship("Language", back_populates="news")

    categories = relationship("Category", secondary=news_categories, back_populates="news")
    comments = relationship("Comment", backref="news", cascade="all, delete-orphan", passive_deletes=True)
    views = relationship("NewsView", backref="news", cascade="all, delete-orphan", passive_deletes=True)

    # Self-referential duplicate relationship
    canonical_story = relationship("News", remote_side=[id], foreign_keys=[canonical_story_id], backref="duplicates")

    __table_args__ = (
        Index("ix_news_feed_active", "is_approved", "is_duplicate", "language_id", "created_at"),
        Index("ix_news_ranking_feed", "is_approved", "is_duplicate", "language_id", "ranking_score"),
        Index("ix_news_breaking", "is_breaking", "breaking_expires_at"),
    )


# ==============================
# Comment Model
# ==============================

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(8), nullable=False, index=True)
    news_uid = Column(String(8), ForeignKey("news.news_uid", ondelete="CASCADE"), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==============================
# News Views Model
# ==============================

class NewsView(Base):
    __tablename__ = "news_views"

    id = Column(Integer, primary_key=True, index=True)
    news_uid = Column(String(8), ForeignKey("news.news_uid", ondelete="CASCADE"), nullable=False, index=True)
    user_uid = Column(String(8), nullable=True, index=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_news_views_news_user", "news_uid", "user_uid"),
    )


# ==============================
# News Flag Model (Moderation)
# ==============================

class NewsFlag(Base):
    __tablename__ = "news_flags"

    id = Column(Integer, primary_key=True, index=True)
    news_uid = Column(String(8), ForeignKey("news.news_uid", ondelete="CASCADE"), nullable=False, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending", index=True)  # pending, reviewed, dismissed
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(8), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    news = relationship("News", backref="flags")
    user = relationship("User", backref="flags")

    __table_args__ = (
        UniqueConstraint("news_uid", "user_uid", name="unique_user_news_flag"),
    )


# ==============================
# Scheduled News Model
# ==============================

class ScheduledNews(Base):
    __tablename__ = "scheduled_news"

    id = Column(Integer, primary_key=True, index=True)
    news_uid = Column(String(8), unique=True, nullable=False, index=True)

    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)

    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)
    user_uid = Column(String(8), ForeignKey("users.user_uid"), nullable=False)
    scheduled_by = Column(String(8), ForeignKey("users.user_uid"), nullable=False)

    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True, index=True)
    source_url = Column(String(500), nullable=True)
    source_name = Column(String(100), nullable=True)

    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending", index=True)  # pending, published, failed, cancelled

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_uid])
    scheduler = relationship("User", foreign_keys=[scheduled_by])
    language = relationship("Language")
    city = relationship("City")
    categories = relationship(
        "Category",
        secondary="scheduled_news_categories",
        backref="scheduled_news"
    )


scheduled_news_categories = Table(
    "scheduled_news_categories",
    Base.metadata,
    Column("scheduled_news_id", Integer, ForeignKey("scheduled_news.id", ondelete="CASCADE")),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE")),
)