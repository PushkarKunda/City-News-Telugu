# routes/discovery_routes.py - OPTIMIZED VERSION

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from services.discovery_service import DiscoveryService
from services.cache_service import cache

router = APIRouter(prefix="/discovery", tags=["Discovery"])


# =========================================================
# TIER 1: HOME FEED (Main Discovery Page)
# =========================================================

@router.get("/home")
def get_home_feed(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ⭐ MAIN DISCOVERY API
    Returns everything for the discovery tab in ONE call
    """
    service = DiscoveryService(db)
    data = service.get_home_feed(current_user.user_uid, limit)
    return {
        "success": True,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }


# =========================================================
# TIER 2: CATEGORY EXPLORE
# =========================================================

@router.get("/category/{category_id}")
def get_category_explore(
    category_id: int,
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Explore content by category with pagination"""
    service = DiscoveryService(db)
    data = service.get_category_explore(category_id, limit, cursor)
    
    if data.get("error"):
        raise HTTPException(404, data["error"])
    
    return data


# =========================================================
# TIER 3: RELATED CONTENT
# =========================================================

@router.get("/related")
def get_related_content(
    content_uid: str = Query(..., description="News UID"),
    content_type: str = Query("news", description="Content type"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Related content for detail pages"""
    service = DiscoveryService(db)
    data = service.get_related_content(content_uid, content_type, limit)
    return data


# =========================================================
# EXTRA: Trending (For Quick Refresh)
# =========================================================

@router.get("/trending")
def get_trending(
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quick trending refresh (separate for performance)"""
    service = DiscoveryService(db)
    return {
        "trending": service._get_trending_content(limit)
    }