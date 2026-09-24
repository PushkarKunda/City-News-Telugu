# =============================================================================
# Insights Models
# =============================================================================

from sqlalchemy import Column
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey,
    Text, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Insight(Base):
    __tablename__ = "insights"
    id = Column(Integer, primary_key=True, index=True)
    insight_uid = Column(String(8), unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    cover_image_url = Column(String, nullable=True)
    category_name = Column(String, nullable=False)  # sports, horror, jokes, quotes, sensex, etc.
    created_at = Column(DateTime, server_default=func.now())
    pages = relationship("InsightPage", back_populates="insight", cascade="all, delete-orphan")


class InsightPage(Base):
    __tablename__ = "insight_pages"
    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    insight = relationship("Insight", back_populates="pages")


class InsightShare(Base):
    __tablename__ = "insight_shares"
    id = Column(Integer, primary_key=True, index=True)
    insight_uid = Column(String(8), ForeignKey("insights.insight_uid", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    shared_at = Column(DateTime, server_default=func.now())