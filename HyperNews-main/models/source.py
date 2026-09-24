# models/source.py
"""
News Source & Publisher Feed Model for Automated Ingestion.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class NewsSource(Base):
    __tablename__ = "news_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    website_url = Column(String(500), nullable=True)
    feed_url = Column(String(500), nullable=False)
    feed_type = Column(String(20), default="rss")  # "rss", "atom", "json_api"

    # Quality & Reliability (0.0 to 1.0)
    reliability_score = Column(Float, default=0.85)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, index=True)

    # Defaults
    default_language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)
    default_category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    auto_publish = Column(Boolean, default=False)  # If True, approved=1 directly; else approved=0 for review

    # Ingestion health
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    fetch_status = Column(String(20), default="idle")  # "idle", "success", "error"
    last_error = Column(Text, nullable=True)
    articles_ingested_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    language = relationship("Language")
    default_category = relationship("Category")

    __table_args__ = (
        Index("ix_news_sources_active", "is_active", "last_fetched_at"),
    )
