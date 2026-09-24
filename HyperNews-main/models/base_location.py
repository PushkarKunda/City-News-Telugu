# models/base_location.py

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Language(Base):
    __tablename__ = "languages"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, unique=True, nullable=False)
    # native = Column(String, nullable=True)
    
    # ✅ ADD THESE FIELDS
    is_active = Column(Boolean, default=True, index=True)  # For enabling/disabling languages
    display_order = Column(Integer, default=0, index=True)  # For sorting in UI
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    states = relationship("State", back_populates="language")
    news = relationship("News", back_populates="language")


class State(Base):
    __tablename__ = "states"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=True)
    
    # ✅ ADD THESE FIELDS
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    language = relationship("Language", back_populates="states")
    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"))
    
    # ✅ ADD THESE FIELDS
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    state = relationship("State", back_populates="districts")
    cities = relationship("City", back_populates="district")


class City(Base):
    __tablename__ = "cities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"))
    
    # ✅ ADD THESE FIELDS
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    district = relationship("District", back_populates="cities")
    news = relationship("News", back_populates="city")