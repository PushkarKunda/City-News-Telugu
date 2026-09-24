# routes/shorts_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from auth.dependencies import get_current_user, admin_required, require_roles
from database import get_db
from models.user import User
from models.shorts import UserShort
from services.short_service import ShortsService
from schemas import (
    UserShortCreate, UserShortUpdate, UserShortOut,
    YouTubeShortOut, ShortFeedResponse, UserRole
)

router = APIRouter(prefix="/shorts", tags=["Shorts"])


# =========================================================
# PUBLIC SHORTS FEED
# =========================================================

@router.get("/feed")
def get_shorts_feed(
    request: Request,
    language: str = Query("en", description="Language code: en, te, hi"),
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get combined shorts feed (YouTube + User shorts)"""
    service = ShortsService(db)
    shorts, has_more, next_cursor = service.get_shorts_feed(language, limit, cursor)
    
    return {
        "items": shorts,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "total": len(shorts)
    }


@router.get("/youtube")
def get_youtube_shorts(
    language: str = Query("en", description="Language code: en, te, hi"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get YouTube shorts only"""
    service = ShortsService(db)
    shorts = service.get_youtube_shorts(language, limit)
    return {"items": shorts, "count": len(shorts)}


@router.get("/user")
def get_user_shorts(
    user_uid: Optional[str] = Query(None, description="Filter by user"),
    language: str = Query("en", description="Language code"),
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user shorts"""
    service = ShortsService(db)
    shorts, has_more, next_cursor = service.get_user_shorts(user_uid, language, limit, cursor)
    
    return {
        "items": shorts,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "total": len(shorts)
    }


# =========================================================
# CREATE USER SHORT
# =========================================================

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user_short(
    short_data: UserShortCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a user short (publisher can post YouTube URLs)"""
    service = ShortsService(db)
    
    # Check if user has permission
    if current_user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
        raise HTTPException(403, "Only publishers and above can post shorts")
    
    # If it's a YouTube URL, extract video ID
    youtube_video_id = short_data.youtube_video_id
    if not youtube_video_id and "youtube.com" in short_data.video_url:
        # Extract video ID from URL
        import re
        match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)', str(short_data.video_url))
        if match:
            youtube_video_id = match.group(1)
    
    short = service.create_user_short(
        user_uid=current_user.user_uid,
        title=short_data.title,
        video_url=str(short_data.video_url),
        language=short_data.language,
        description=short_data.description,
        thumbnail_url=str(short_data.thumbnail_url) if short_data.thumbnail_url else None,
        youtube_video_id=youtube_video_id,
        category_id=short_data.category_id
    )
    
    return {
        "success": True,
        "message": "Short created successfully",
        "short_uid": short.short_uid,
        "is_approved": short.is_approved == 1,
        "approval_status": "approved" if short.is_approved == 1 else "pending_review"
    }


# =========================================================
# ADMIN: FETCH YOUTUBE SHORTS
# =========================================================

@router.post("/admin/fetch/youtube", tags=["Admin"])
def fetch_youtube_shorts(
    language: str = Query("en", description="en, te, hi"),
    query: Optional[str] = Query(None, description="Custom search query"),
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Fetch YouTube shorts and store in database (Admin only)"""
    service = ShortsService(db)
    
    # Default queries by language
    default_queries = {
        "en": "news shorts latest",
        "te": "telugu news shorts",
        "hi": "hindi news shorts"
    }
    
    search_query = query or default_queries.get(language, "news shorts")
    
    shorts = service.fetch_youtube_shorts(search_query, language, limit)
    
    return {
        "success": True,
        "message": f"Fetched {len(shorts)} YouTube shorts",
        "items": shorts,
        "count": len(shorts)
    }


# =========================================================
# ADMIN: APPROVE/REJECT USER SHORTS
# =========================================================

@router.patch("/admin/{short_uid}/approve", tags=["Admin"])
def approve_user_short(
    short_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Approve a user short (Moderator+)"""
    short = db.query(UserShort).filter(UserShort.short_uid == short_uid).first()
    if not short:
        raise HTTPException(404, "Short not found")
    
    short.is_approved = 1
    short.approved_at = datetime.now(timezone.utc)
    short.approved_by = current_user.user_uid
    db.commit()
    
    return {"message": "Short approved successfully"}


@router.patch("/admin/{short_uid}/reject", tags=["Admin"])
def reject_user_short(
    short_uid: str,
    reason: str = Query(..., description="Rejection reason"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Reject a user short (Moderator+)"""
    short = db.query(UserShort).filter(UserShort.short_uid == short_uid).first()
    if not short:
        raise HTTPException(404, "Short not found")
    
    short.is_approved = 2
    short.rejection_reason = reason
    db.commit()
    
    return {"message": "Short rejected", "reason": reason}


# =========================================================
# ENGAGEMENT
# =========================================================

@router.post("/{short_type}/{short_id}/view")
def track_short_view(
    short_type: str,
    short_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track a view on a short"""
    if short_type not in ["youtube", "user"]:
        raise HTTPException(400, "Invalid short type")
    
    service = ShortsService(db)
    result = service.track_view(short_type, short_id, current_user.user_uid)
    
    return {"viewed": result}


@router.post("/{short_type}/{short_id}/like")
def toggle_short_like(
    short_type: str,
    short_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Like or unlike a short"""
    if short_type not in ["youtube", "user"]:
        raise HTTPException(400, "Invalid short type")
    
    service = ShortsService(db)
    result = service.toggle_like(short_type, short_id, current_user.user_uid)
    
    return result
