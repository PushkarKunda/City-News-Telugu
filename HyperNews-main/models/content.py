# from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, ARRAY
# from sqlalchemy.orm import relationship
# from sqlalchemy.sql import func
# from database import Base

# class Advertisement(Base):
#     __tablename__ = "advertisements"
#     id = Column(Integer, primary_key=True, index=True)
#     title = Column(String, nullable=False)
#     image_url = Column(String, nullable=False)
#     redirect_url = Column(String, nullable=True)
#     placement = Column(String, nullable=False)
#     start_date = Column(DateTime, nullable=False)
#     end_date = Column(DateTime, nullable=False)
#     state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
#     district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
#     city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
#     is_active = Column(Boolean, default=True)
#     state = relationship("State")
#     district = relationship("District")
#     city = relationship("City")
#     created_at = Column(DateTime(timezone=True), server_default=func.now())

# class SponsoredPost(Base):
#     __tablename__ = "sponsored_posts"
#     id = Column(Integer, primary_key=True)
#     title = Column(String, nullable=False)
#     content = Column(Text, nullable=False)
#     image_url = Column(String)
#     cta_text = Column(String)
#     cta_url = Column(String)
#     start_date = Column(DateTime, nullable=False)
#     end_date = Column(DateTime, nullable=False)
#     state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
#     district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
#     city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
#     language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
#     created_at = Column(DateTime, server_default=func.now())
#     is_approved = Column(Boolean, default=False)

# class Event(Base):
#     __tablename__ = "events"
#     id = Column(Integer, primary_key=True, index=True)
#     event_uid = Column(String(7), unique=True, index=True, nullable=False)
#     title = Column(String, nullable=False)
#     description = Column(Text, nullable=False)
#     image_url = Column(String, nullable=True)
#     event_date = Column(DateTime, nullable=False)
#     start_time = Column(String, nullable=True)
#     end_time = Column(String, nullable=True)
#     location = Column(String, nullable=False)
#     is_online = Column(Boolean, default=False)
#     event_url = Column(String, nullable=True)
#     state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
#     district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
#     city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
#     is_approved = Column(Boolean, default=False)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     state = relationship("State")
#     district = relationship("District")
#     city = relationship("City")

# class Poll(Base):
#     __tablename__ = "polls"
#     id = Column(Integer, primary_key=True, index=True)
#     poll_uid = Column(String(7), unique=True, index=True, nullable=False)
#     question = Column(String, nullable=False)
#     options = Column(ARRAY(String), nullable=False)
#     votes = Column(ARRAY(Integer), default=[0, 0])
#     user_uids_voted = Column(ARRAY(String), default=[])
#     is_approved = Column(Boolean, default=False)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     expires_at = Column(DateTime, nullable=True)

# class YouTubeShort(Base):
#     __tablename__ = "youtube_shorts"
#     video_id = Column(String, primary_key=True, index=True)
#     title = Column(String)
#     thumbnail_url = Column(String)
#     channel_title = Column(String)
#     published_at = Column(DateTime)
#     video_url = Column(String)
#     language = Column(String, nullable=False, default="te")
# the above code is working good!

# models/content.py - COMPLETE READY-TO-USE VERSION

# models/content.py - Add language support to Advertisement

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, ARRAY, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

# =============================
# Existing Models
# =============================



# models/content.py - Complete with all relationships

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Advertisement(Base):
    __tablename__ = "advertisements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    image_url = Column(String(500), nullable=False)
    redirect_url = Column(String(500), nullable=True)
    placement = Column(String(50), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Location targeting
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    
    # Language targeting
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    
    # Demographic targeting
    target_gender = Column(String(10), nullable=True)
    target_age_min = Column(Integer, nullable=True)
    target_age_max = Column(Integer, nullable=True)
    
    # Status flags
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False, index=True)
    premium_priority = Column(Integer, default=0)
    
    # Approval tracking
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(50), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(String(50), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Creator tracking
    created_by = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    state = relationship("State", foreign_keys=[state_id])
    district = relationship("District", foreign_keys=[district_id])
    city = relationship("City", foreign_keys=[city_id])
    language = relationship("Language", foreign_keys=[language_id])
    
    __table_args__ = (
        Index('ix_advertisements_placement', 'placement'),
        Index('ix_advertisements_state_id', 'state_id'),
        Index('ix_advertisements_district_id', 'district_id'),
        Index('ix_advertisements_city_id', 'city_id'),
        Index('ix_advertisements_language_id', 'language_id'),
        Index('ix_advertisements_is_active', 'is_active'),
        Index('ix_advertisements_is_approved', 'is_approved'),
        Index('ix_advertisements_start_date', 'start_date'),
        Index('ix_advertisements_end_date', 'end_date'),
        # Composite indexes
        Index('ix_advertisements_active_approved', 'is_active', 'is_approved'),
        Index('ix_advertisements_date_range', 'start_date', 'end_date'),
        Index('ix_advertisements_premium_active', 'is_premium', 'is_active', 'is_approved'),
        Index('ix_advertisements_city_status', 'city_id', 'is_active', 'is_approved'),
    )


class SponsoredPost(Base):
    __tablename__ = "sponsored_posts"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    cta_text = Column(String(50), nullable=True)
    cta_url = Column(String(500), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Location targeting
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    
    # Language targeting
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    
    # Demographic targeting
    target_gender = Column(String(10), nullable=True)
    target_age_min = Column(Integer, nullable=True)
    target_age_max = Column(Integer, nullable=True)
    
    # Status flags
    is_approved = Column(Boolean, default=False)
    
    # Approval tracking
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(50), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(String(50), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Creator tracking
    created_by = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    state = relationship("State", foreign_keys=[state_id])
    district = relationship("District", foreign_keys=[district_id])
    city = relationship("City", foreign_keys=[city_id])
    language = relationship("Language", foreign_keys=[language_id])
    
    __table_args__ = (
        Index('ix_sponsored_posts_state_id', 'state_id'),
        Index('ix_sponsored_posts_district_id', 'district_id'),
        Index('ix_sponsored_posts_city_id', 'city_id'),
        Index('ix_sponsored_posts_language_id', 'language_id'),
        Index('ix_sponsored_posts_is_approved', 'is_approved'),
        Index('ix_sponsored_posts_start_date', 'start_date'),
        Index('ix_sponsored_posts_end_date', 'end_date'),
        Index('ix_sponsored_posts_active', 'is_approved', 'start_date', 'end_date'),
    )


class AdImpression(Base):
    __tablename__ = "ad_impressions"
    
    id = Column(Integer, primary_key=True, index=True)
    ad_id = Column(Integer, ForeignKey("advertisements.id", ondelete="CASCADE"), nullable=False)
    user_uid = Column(String(8), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    impression_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ad = relationship("Advertisement", backref="impressions")
    
    __table_args__ = (
        Index('ix_ad_impressions_ad_session', 'ad_id', 'session_id'),
        Index('ix_ad_impressions_user_session', 'user_uid', 'session_id'),
        UniqueConstraint('ad_id', 'session_id', 'user_uid', name='unique_ad_impression'),
    )


class SponsoredImpression(Base):
    __tablename__ = "sponsored_impressions"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("sponsored_posts.id", ondelete="CASCADE"))
    user_uid = Column(String, nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    impression_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("SponsoredPost", backref="impressions")
    
    __table_args__ = (
        Index('ix_sponsored_impressions_post_session', 'post_id', 'session_id'),
        Index('ix_sponsored_impressions_user_session', 'user_uid', 'session_id'),
    )

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    event_uid = Column(String(7), unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    event_date = Column(DateTime, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    location = Column(String, nullable=False)
    is_online = Column(Boolean, default=False)
    event_url = Column(String, nullable=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)  # ✅ NEW
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # ✅ NEW
    
    state = relationship("State")
    district = relationship("District")
    city = relationship("City")
    language = relationship("Language")  # ✅ NEW


class Poll(Base):
    __tablename__ = "polls"
    id = Column(Integer, primary_key=True, index=True)
    poll_uid = Column(String(7), unique=True, index=True, nullable=False)
    question = Column(String, nullable=False)
    options = Column(JSON, nullable=False)
    votes = Column(JSON, default=list)
    user_uids_voted = Column(JSON, default=list)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime, nullable=True)
    
    language = relationship("Language")



# =============================
# NEW MODELS (Keep as is)
# =============================

class ContentSchedule(Base):
    __tablename__ = "content_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50))
    content_id = Column(Integer)
    scheduled_at = Column(DateTime, nullable=False)
    published_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_content_schedules_content', 'content_type', 'content_id'),
        Index('ix_content_schedules_status', 'status'),
        Index('ix_content_schedules_scheduled_at', 'scheduled_at'),
    )


class FlaggedContent(Base):
    __tablename__ = "flagged_contents"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50))
    content_id = Column(Integer)
    flagged_by = Column(String(50))
    reason = Column(String(500))
    status = Column(String(20), default="pending")
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(50), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_flagged_contents_status', 'status'),
        Index('ix_flagged_contents_content', 'content_type', 'content_id'),
    )


class ContentVersion(Base):
    __tablename__ = "content_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50))
    content_id = Column(Integer)
    version_number = Column(Integer)
    data = Column(JSON)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_content_versions_content', 'content_type', 'content_id'),
    )


class ContentTag(Base):
    __tablename__ = "content_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContentTagMapping(Base):
    __tablename__ = "content_tag_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50))
    content_id = Column(Integer)
    tag_id = Column(Integer, ForeignKey("content_tags.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tag = relationship("ContentTag", backref="mappings")
    
    __table_args__ = (
        Index('ix_content_tag_mappings_content', 'content_type', 'content_id'),
        Index('ix_content_tag_mappings_tag_id', 'tag_id'),
    )