# models/settings.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    link = Column(String(500), nullable=False)
    
    # ✅ FIX: 'type' is reserved word, use 'item_type'
    item_type = Column(String(20), default="custom")  # custom, category, page, external, ad, poll, event, insight
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    parent_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    
    # ✅ ADD THESE MISSING FIELDS
    display_order = Column(Integer, default=0, index=True)  # For ordering (was 'order')
    placement = Column(String(20), default="both")  # header, categories, both
    
    target = Column(String(10), default="_self")  # _self, _blank
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color code
    
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("MenuItem", remote_side=[id], backref="children")
    category = relationship("Category")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_menu_items_placement', 'placement'),
        Index('idx_menu_items_display_order', 'display_order'),
        Index('idx_menu_items_is_active', 'is_active'),
    )


class FooterLink(Base):
    __tablename__ = "footer_links"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    link = Column(String(500), nullable=False)
    section = Column(String(50), default="quick_links")  # quick_links, about, legal, social
    display_order = Column(Integer, default=0)
    target = Column(String(10), default="_self")
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_footer_links_section', 'section'),
        Index('idx_footer_links_display_order', 'display_order'),
    )


class SocialLink(Base):
    __tablename__ = "social_links"
    
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(50), unique=True, nullable=False)  # facebook, twitter, instagram, youtube, linkedin, telegram
    url = Column(String(500), nullable=False)
    icon = Column(String(50), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_social_links_platform', 'platform'),
        Index('idx_social_links_display_order', 'display_order'),
    )


class AppSettings(Base):
    __tablename__ = "app_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(20), default="string")  # string, int, bool, json
    description = Column(String(500), nullable=True)
    group = Column(String(50), default="general")  # general, email, social, seo
    is_public = Column(Boolean, default=False)  # Can be accessed by public API
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class HomepageSection(Base):
    __tablename__ = "homepage_sections"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    section_type = Column(String(30), nullable=False)  # trending, latest, category, featured, custom
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    limit = Column(Integer, default=10)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("Category")
    
    __table_args__ = (
        Index('idx_homepage_sections_type', 'section_type'),
        Index('idx_homepage_sections_display_order', 'display_order'),
    )