# routes/admin_routes.py
"""
Admin Routes for Hyperlocal News API.
Provides endpoints for:
- News moderation (approve/reject)
- Category, user, and content management
- Dashboard stats and reports
"""
from datetime import datetime, timedelta, timezone
import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
import requests
from sqlalchemy import desc, func, or_, text

from auth.dependencies import admin_required, get_current_user, require_role, require_permission
from auth.rbac import Permission
from services.audit_service import record_audit_log
from auth.jwt_handler import create_access_token, pwd_context
from database import get_db
from gemini_ai import call_gemini_api_english, call_gemini_api_telugu
from models.base_location import City, District, Language, State
from models.news import Category, News
from models.user import OTPStore, User, UserPreference
from models.content import AdImpression, Advertisement, Event, Poll, SponsoredPost
from models.shorts import YouTubeShort
from models.engagement import Notification
from schemas import (
    AdminDashboardOut,
    AdminEngagementOut,
    AdminLoginRequest,
    AdminNewsAnalyticsOut,
    AdminNewsDetailsOut,
    AdminNewsItemOut,
    AdminNotificationRequest,
    AutoNewsCreate,
    RoleAssignRequest,
    UserRole,
    VideoItem,
    user_role_label,
)
import schemas
from schemas import SponsoredPostOut, AdvertisementOut

from sqlalchemy.orm import Session, joinedload
from celery_worker import send_news_notification

from utility import YOUTUBE_API_KEY, YOUTUBE_SEARCH_URL, extract_source_name, fetch_article_text_and_image, generate_news_uid, generate_unique_username, generate_user_uid

router = APIRouter(prefix="/admin", tags=["Admins"])

# =====================================================================
# Admin Dashboard Overview
# =====================================================================


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def fetch_and_store_shorts_by_language(query: str, lang: str, db: Session) -> List[VideoItem]:
    """Fetch YouTube shorts with error handling"""
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=500, detail="YouTube API key not configured")
    
    params = {
        "key": YOUTUBE_API_KEY,
        "part": "snippet",
        "q": query,
        "maxResults": 5,
        "type": "video",
        "videoDuration": "short",
        "order": "date",
        "videoEmbeddable": "true"
    }

    try:
        response = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="YouTube API timeout")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {str(e)}")
    
    result = []
    for item in data.get("items", []):
        if item["id"]["kind"] == "youtube#video":
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]

            existing = db.query(YouTubeShort).filter_by(video_id=video_id).first()
            if existing:
                continue

            short = YouTubeShort(
                video_id=video_id,
                title=snippet["title"],
                thumbnail_url=snippet["thumbnails"]["high"]["url"],
                channel_title=snippet["channelTitle"],
                published_at=datetime.fromisoformat(snippet["publishedAt"].replace('Z', '+00:00')),
                video_url=f"https://www.youtube.com/watch?v={video_id}",
                language=lang,
                created_at=datetime.now(timezone.utc)
            )
            db.add(short)
            db.commit()

            result.append(VideoItem(
                title=short.title,
                video_id=short.video_id,
                thumbnail_url=short.thumbnail_url,
                channel_title=short.channel_title,
                published_at=short.published_at.isoformat() if short.published_at else None
            ))

    return result


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@router.get("/dashboard", response_model=AdminDashboardOut, tags=["Admin Dashboard"])
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get admin dashboard overview"""
    today = datetime.now(timezone.utc).date()
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # NEWS STATS
    total_news = db.query(func.count(News.id)).scalar() or 0
    news_today = db.query(func.count(News.id)).filter(
        News.created_at >= start_of_day
    ).scalar() or 0

    pending_news = db.query(func.count(News.id)).filter(
        News.is_approved == 0
    ).scalar() or 0

    rejected_news = db.query(func.count(News.id)).filter(
        News.is_approved == 2
    ).scalar() or 0

    # USER STATS
    total_users = db.query(func.count(User.id)).scalar() or 0
    users_today = db.query(func.count(User.id)).filter(
        User.created_at >= start_of_day
    ).scalar() or 0

    # CONTENT STATS
    total_ads = db.query(func.count(Advertisement.id)).scalar() or 0
    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_polls = db.query(func.count(Poll.id)).scalar() or 0

    # ENGAGEMENT STATS
    total_views = db.query(func.sum(News.views_count)).scalar() or 0
    total_likes = db.query(func.sum(News.likes_count)).scalar() or 0
    total_comments = db.query(func.sum(News.comments_count)).scalar() or 0
    total_shares = db.query(func.sum(News.shares_count)).scalar() or 0

    # TOP REPORTERS
    reporters = (
        db.query(
            User.user_uid,
            User.name,
            func.count(News.id).label("news_count")
        )
        .join(News, News.user_uid == User.user_uid)
        .filter(News.is_approved == 1)
        .group_by(User.user_uid, User.name)
        .order_by(func.count(News.id).desc())
        .limit(5)
        .all()
    )

    top_reporters = [
        {"user_uid": r.user_uid, "name": r.name, "news_count": r.news_count}
        for r in reporters
    ]

    # TRENDING NEWS
    trending = (
        db.query(News.news_uid, News.title, News.views_count)
        .filter(News.is_approved == 1)
        .order_by(News.views_count.desc())
        .limit(5)
        .all()
    )

    trending_news = [
        {"news_uid": t.news_uid, "title": t.title, "views": t.views_count}
        for t in trending
    ]

    return AdminDashboardOut(
        news={"total": total_news, "today": news_today},
        users={"total": total_users, "today": users_today},
        ads={"total": total_ads},
        events={"total": total_events},
        polls={"total": total_polls},
        engagement={
            "views": total_views,
            "likes": total_likes,
            "comments": total_comments,
            "shares": total_shares
        },
        pending_news=pending_news,
        rejected_news=rejected_news,
        top_reporters=top_reporters,
        trending_news=trending_news
    )


# =========================================================
# ADMIN LOGIN
# =========================================================

@router.post("/token/admin-login", tags=["Auth"])
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    user = db.query(User).filter(
        (User.email == payload.identifier) | (User.phone == payload.identifier)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has admin or employee role
    if user.role not in [UserRole.ADMIN, UserRole.EMPLOYEE]:
        raise HTTPException(status_code=403, detail="Access denied. Admin or Employee role required.")

    if str(user.role) != str(payload.role):
        raise HTTPException(status_code=403, detail="Role mismatch")

    if not payload.otp:
        raise HTTPException(status_code=400, detail="OTP is required for admin login")

    otp_type = "email" if "@" in payload.identifier else "mobile"
    otp_entries = db.query(OTPStore).filter(
        OTPStore.type == otp_type,
        OTPStore.value == payload.identifier,
        OTPStore.expires_at >= datetime.utcnow(),
        OTPStore.verified == False,
    ).all()

    verified_entry = None
    for entry in otp_entries:
        if pwd_context.verify(payload.otp, entry.otp):
            verified_entry = entry
            break

    if not verified_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    verified_entry.verified = True
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token_data = {"sub": user.user_uid, "role": user.role}
    access_token = create_access_token(data=token_data, token_version=user.token_version)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_uid": user.user_uid
    }


# =========================================================
# DETAILED STATS
# =========================================================

@router.get("/stats/detailed", tags=["Admin Stats"])
def get_detailed_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get detailed admin statistics"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    # User statistics
    new_users = db.query(User).filter(User.created_at >= week_ago).count()
    active_users = db.query(func.count(func.distinct(News.user_uid))).filter(
        News.created_at >= week_ago,
        News.is_approved == 1
    ).scalar() or 0
    
    # Content trends
    news_by_language = db.query(
        Language.name,
        func.count(News.id).label('count')
    ).join(News, News.language_id == Language.id).filter(
        News.created_at >= week_ago,
        News.is_approved == 1
    ).group_by(Language.name).all()
    
    # Ad performance
    ad_performance = []
    try:
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if 'ad_impressions' in inspector.get_table_names():
            ad_performance = db.query(
                Advertisement.placement,
                func.count(AdImpression.id).label('impressions')
            ).join(AdImpression, AdImpression.ad_id == Advertisement.id).filter(
                AdImpression.impression_at >= week_ago
            ).group_by(Advertisement.placement).all()
            ad_performance = [{"placement": p.placement, "impressions": p.impressions} for p in ad_performance]
    except Exception as e:
        print(f"Ad performance query error: {e}")
    
    # Engagement summary
    total_views = db.query(func.sum(News.views_count)).filter(
        News.created_at >= week_ago
    ).scalar() or 0
    total_likes = db.query(func.sum(News.likes_count)).filter(
        News.created_at >= week_ago
    ).scalar() or 0
    
    return {
        "period": "last_7_days",
        "user_stats": {
            "new_users": new_users,
            "active_users": active_users,
            "total_users": db.query(User).count()
        },
        "content_stats": {
            "news_by_language": [{"language": l.name, "count": l.count} for l in news_by_language],
            "total_views": total_views,
            "total_likes": total_likes
        },
        "ad_performance": ad_performance
    }


# =========================================================
# EXPORT NEWS
# =========================================================

@router.get("/export/news", tags=["Admin Exports"])
def export_news(
    format: str = Query("csv", enum=["csv", "json"]),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(5000, ge=1, le=50000, description="Max records to export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Export news data as CSV or JSON"""
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    query = db.query(News).order_by(desc(News.created_at))
    
    if date_from:
        query = query.filter(News.created_at >= date_from)
    if date_to:
        query = query.filter(News.created_at <= date_to)
    
    news = query.limit(limit).all()
    
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["News UID", "Title", "Created At", "Views", "Likes", "Status"])
        
        for n in news:
            status = "Approved" if n.is_approved == 1 else ("Rejected" if n.is_approved == 2 else "Pending")
            writer.writerow([
                n.news_uid, n.title, n.created_at.isoformat() if n.created_at else "",
                n.views_count or 0, n.likes_count or 0, status
            ])
        
        output.seek(0)
        filename = f"news_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    return {"count": len(news), "news": news}


# =========================================================
# NEWS ANALYTICS
# =========================================================

@router.get("/news/analytics", response_model=AdminNewsAnalyticsOut, tags=["Admin Analytics"])
def get_news_analytics(
    days: int = Query(7, ge=1, le=90, description="Analytics window (7 or 30 days)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get news analytics for dashboard"""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Daily news + engagement
    metrics = (
        db.query(
            func.date(News.created_at).label("date"),
            func.count(News.id).label("news_posted"),
            func.sum(News.views_count).label("views"),
            func.sum(News.likes_count).label("likes"),
            func.sum(News.comments_count).label("comments"),
            func.sum(News.shares_count).label("shares"),
        )
        .filter(News.created_at >= start_date)
        .group_by(func.date(News.created_at))
        .order_by(func.date(News.created_at))
        .all()
    )

    daily_metrics = [
        {
            "date": str(m.date),
            "news_posted": m.news_posted or 0,
            "views": m.views or 0,
            "likes": m.likes or 0,
            "comments": m.comments or 0,
            "shares": m.shares or 0,
        }
        for m in metrics
    ]

    # User growth
    users = (
        db.query(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("new_users")
        )
        .filter(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    user_growth = [
        {"date": str(u.date), "new_users": u.new_users}
        for u in users
    ]

    return {
        "daily_metrics": daily_metrics,
        "user_growth": user_growth
    }


# =========================================================
# PENDING NEWS (Paginated)
# =========================================================

@router.get("/news/pending", response_model=dict, tags=["News Moderation"])
def get_pending_news(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    language_id: Optional[int] = Query(None),
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, min_length=2, max_length=100),
    sort_by: str = Query("created_at", enum=["created_at", "title"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get pending news with pagination and filters"""
    query = db.query(News).filter(News.is_approved == 0)
    
    # Apply filters
    if language_id:
        query = query.filter(News.language_id == language_id)
    
    if city_id:
        query = query.filter(News.city_id == city_id)
    elif district_id:
        query = query.join(City, News.city_id == City.id).filter(City.district_id == district_id)
    elif state_id:
        query = query.join(City, News.city_id == City.id).join(District, City.district_id == District.id).filter(District.state_id == state_id)
    
    if category_id:
        query = query.join(News.categories).filter(Category.id == category_id)
    
    if search:
        query = query.filter(
            or_(
                News.title.ilike(f"%{search}%"),
                News.summary.ilike(f"%{search}%")
            )
        )
    
    # Apply sorting
    if sort_order == "desc":
        query = query.order_by(desc(getattr(News, sort_by)))
    else:
        query = query.order_by(getattr(News, sort_by))
    
    # Pagination
    total = query.count()
    offset = (page - 1) * limit
    pending_news = query.offset(offset).limit(limit).all()
    
    # Build response
    items = []
    for news in pending_news:
        reporter = db.query(User).filter(User.user_uid == news.user_uid).first()
        
        items.append({
            "news_uid": news.news_uid,
            "title": news.title,
            "summary": news.summary[:200] if news.summary else None,
            "image_url": news.image_url,
            "created_at": news.created_at.isoformat() if news.created_at else None,
            "reporter_name": reporter.name if reporter else None,
            "language_id": news.language_id,
            "city_id": news.city_id
        })
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }


# =========================================================
# ASSIGN ROLE
# =========================================================

@router.post("/assign-role", tags=["User Management"])
def assign_role(
    payload: RoleAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Assign role to a user (Admin only)"""
    # Target user
    user = db.query(User).filter(User.user_uid == payload.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update role
    try:
        new_role = UserRole(payload.new_role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    if user.user_uid == current_user.user_uid:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user.role = new_role
    user.token_version += 1  # Invalidate old tokens
    db.commit()

    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="ROLE_ASSIGNED",
        resource_type="user",
        resource_id=user.user_uid,
        status="SUCCESS",
        details={"new_role": new_role.name, "target_user": user.user_uid}
    )

    return {"message": f"Role of user {user.user_uid} updated to {new_role.name}"}


# =========================================================
# AUTO-GENERATE NEWS (Admin only)
# =========================================================

@router.post("/news/auto-generate/te", response_model=schemas.NewsOut, tags=["Auto Generate"])
def auto_generate_news_telugu(
    data: AutoNewsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Auto-generate Telugu news from URL"""
    user_uid = current_user.user_uid

    user = db.query(User).filter_by(user_uid=user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    city = None
    if data.city_id:
        city = db.query(City).filter_by(id=data.city_id).first()
        if not city:
            raise HTTPException(status_code=404, detail="City not found")

    article_data = fetch_article_text_and_image(data.source_url)
    article_text = article_data.get("text")
    image_url = article_data.get("image_url")

    if not article_text:
        raise HTTPException(status_code=400, detail="Could not extract article text")

    ai_result = call_gemini_api_telugu(article_text)
    if not ai_result.get("title") or not ai_result.get("summary"):
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate content")

    telugu_language = db.query(Language).filter_by(code="te").first()
    if not telugu_language:
        raise HTTPException(status_code=500, detail="Telugu language not found")

    news_uid = generate_news_uid()
    new_news = News(
        news_uid=news_uid,
        title=ai_result["title"],
        summary=ai_result["summary"],
        image_url=image_url,
        language_id=telugu_language.id,
        user_uid=user_uid,
        city_id=city.id if city else None,
        is_auto_generated=True,
        source_url=data.source_url,
        source_name=extract_source_name(data.source_url),
        created_at=datetime.now(timezone.utc)
    )

    db.add(new_news)
    db.flush()

    if data.category_ids:
        categories = db.query(Category).filter(Category.id.in_(data.category_ids)).all()
        new_news.categories = categories

    db.commit()
    db.refresh(new_news)

    return schemas.NewsOut.model_validate(new_news, from_attributes=True)


@router.post("/news/auto-generate/en", response_model=schemas.NewsOut, tags=["Auto Generate"])
def auto_generate_news_english(
    data: AutoNewsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Auto-generate English news from URL"""
    user_uid = current_user.user_uid

    user = db.query(User).filter_by(user_uid=user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    city = None
    if data.city_id:
        city = db.query(City).filter_by(id=data.city_id).first()
        if not city:
            raise HTTPException(status_code=404, detail="City not found")

    article_data = fetch_article_text_and_image(data.source_url)
    article_text = article_data.get("text")
    image_url = article_data.get("image_url")

    if not article_text:
        raise HTTPException(status_code=400, detail="Could not extract article text")

    ai_result = call_gemini_api_english(article_text)
    if not ai_result.get("title") or not ai_result.get("summary"):
        raise HTTPException(status_code=500, detail="Gemini AI failed to generate content")

    english_language = db.query(Language).filter_by(code="en").first()
    if not english_language:
        raise HTTPException(status_code=500, detail="English language not found")

    news_uid = generate_news_uid()
    new_news = News(
        news_uid=news_uid,
        title=ai_result["title"],
        summary=ai_result["summary"],
        image_url=image_url,
        language_id=english_language.id,
        user_uid=user_uid,
        city_id=city.id if city else None,
        is_auto_generated=True,
        source_url=data.source_url,
        source_name=extract_source_name(data.source_url),
        created_at=datetime.now(timezone.utc)
    )

    db.add(new_news)
    db.flush()

    if data.category_ids:
        categories = db.query(Category).filter(Category.id.in_(data.category_ids)).all()
        new_news.categories = categories

    db.commit()
    db.refresh(new_news)

    return schemas.NewsOut.model_validate(new_news, from_attributes=True)


# =========================================================
# YOUTUBE SHORTS (Admin only)
# =========================================================

@router.get("/news-shorts/telugu", response_model=List[VideoItem], tags=["YouTube Shorts"])
def fetch_telugu_shorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Fetch and store Telugu news shorts"""
    return fetch_and_store_shorts_by_language("telugu news", "te", db)


@router.get("/news-shorts/english", response_model=List[VideoItem], tags=["YouTube Shorts"])
def fetch_english_shorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Fetch and store English news shorts"""
    return fetch_and_store_shorts_by_language("english news", "en", db)


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health", tags=["Health"])
def admin_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for admin service"""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "admin_router",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# =====================================================================
# Approve / Reject News
# =====================================================================
@router.get("/news/{news_uid}", response_model=dict, tags=["Admin"])
def get_news_by_id(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get detailed news information by news_uid"""
    
    news = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.user),
        joinedload(News.approver),
        joinedload(News.language),
        joinedload(News.city).joinedload(City.district).joinedload(District.state)
    ).filter(News.news_uid == news_uid).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    # =========================================================
    # GET LOCATION HIERARCHY
    # =========================================================
    
    city = news.city
    district = city.district if city else None
    state = district.state if district else None
    
    # =========================================================
    # GET REPORTER INFO
    # =========================================================
    
    reporter = news.user
    reporter_info = {
        "user_uid": reporter.user_uid if reporter else None,
        "name": reporter.name if reporter else None,
        "user_name": reporter.user_name if reporter else None,
        "email": reporter.email if reporter else None,
        "phone": reporter.phone if reporter else None,
        "mobile": reporter.phone if reporter else None,
        "role": reporter.role if reporter else None,
        "role_name": user_role_label(reporter.role) if reporter else None,
        "created_at": reporter.created_at.isoformat() if reporter and reporter.created_at else None
    } if reporter else None
    
    # =========================================================
    # GET APPROVER INFO
    # =========================================================
    
    approver_info = None
    if news.approved_by_uid:
        approver = news.approver
        if approver:
            approver_info = {
                "user_uid": approver.user_uid,
                "name": approver.name,
                "user_name": approver.user_name,
                "email": approver.email,
                "phone": approver.phone,
                "mobile": approver.phone,
                "role": approver.role,
                "role_name": user_role_label(approver.role),
                "approved_at": news.approved_at.isoformat() if hasattr(news, 'approved_at') and news.approved_at else None
            }
    
    # =========================================================
    # GET CATEGORIES
    # =========================================================
    
    categories = [
        {"id": c.id, "name": c.name}
        for c in news.categories
    ] if news.categories else []
    
    # =========================================================
    # GET LANGUAGE
    # =========================================================
    
    language_info = {
        "id": news.language.id if news.language else None,
        "name": news.language.name if news.language else None,
        "code": news.language.code if news.language else None
    } if news.language else None
    
    # =========================================================
    # GET STATUS
    # =========================================================
    
    status = "pending"
    if news.is_approved == 1:
        status = "approved"
    elif news.is_approved == 2:
        status = "rejected"
    
    # =========================================================
    # BUILD RESPONSE
    # =========================================================
    
    return {
        "news_uid": news.news_uid,
        "title": news.title,
        "summary": news.summary,
        "image_url": news.image_url,
        "created_at": news.created_at.isoformat() if news.created_at else None,
        "status": status,
        "is_approved": news.is_approved,
        "is_breaking": news.is_breaking,
        
        "language": language_info,
        
        "location": {
            "city": city.name if city else None,
            "district": district.name if district else None,
            "state": state.name if state else None
        },
        
        "source": {
            "name": news.source_name,
            "url": news.source_url
        },
        
        "categories": categories,
        
        "reporter": reporter_info,
        "approver": approver_info,
        
        "engagement": {
            "views": news.views_count or 0,
            "likes": news.likes_count or 0,
            "comments": news.comments_count or 0,
            "shares": news.shares_count or 0
        },
        
        "timestamps": {
            "created_at": news.created_at.isoformat() if news.created_at else None,
            "approved_at": news.approved_at.isoformat() if hasattr(news, 'approved_at') and news.approved_at else None,
            "rejected_at": news.rejected_at.isoformat() if news.rejected_at else None
        }
    }


@router.get("/news/{news_uid}/details", response_model=AdminNewsDetailsOut)
def get_admin_news_details(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    news = db.query(News).filter(News.news_uid == news_uid).first()

    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    posted_user = db.query(User).filter(User.user_uid == news.user_uid).first()

    approver = None
    if news.approved_by_uid:
        approver = db.query(User).filter(User.user_uid == news.approved_by_uid).first()

    language_obj = None
    if news.language:
        language_obj = {
            "id": news.language.id,
            "code": news.language.code,
            "name": news.language.name
        }

    category_names = [c.name for c in news.categories] if news.categories else []

    city_name = news.city.name if news.city else None
    district_name = news.city.district.name if news.city and news.city.district else None
    state_name = news.city.district.state.name if news.city and news.city.district and news.city.district.state else None

    response = {
        "news_uid": news.news_uid,
        "title": news.title,
        "summary": news.summary,
        "image_url": news.image_url,
        "language": language_obj,
        "is_approved": news.is_approved,
        "source_url": news.source_url,
        "source_name": news.source_name,
        "created_at": news.created_at,
        "category_names": category_names,
        "state": state_name,
        "district": district_name,
        "city": city_name,
        "user_name": posted_user.name if posted_user else None,
        "posted_by": {
            "user_uid": posted_user.user_uid,
            "name": posted_user.name,
            "phone": posted_user.phone
        } if posted_user else None,
        "approved_by": {
            "user_uid": approver.user_uid,
            "name": approver.name,
            "phone": approver.phone
        } if approver else None,

        # IMPORTANT: engagement must always exist
        "engagement": {
            "likes": news.likes_count or 0,
            "comments": news.comments_count or 0,
            "shares": news.shares_count or 0,
            "views": news.views_count or 0
        }
    }

    return response
    
    
def send_reject_notification(user: User, news: News, reason: str = None):
    """
    Legacy hook for SMS/push; in-app rejection notices are created in
    ``reject_news_simple`` via the ``Notification`` model.
    """
    message = f"Your news '{news.title}' was rejected."
    if reason:
        message += f" Reason: {reason}"
    print(f"📢 (optional push) {user.phone}: {message}")



@router.put("/news/{news_uid}/reject", status_code=status.HTTP_200_OK, tags=["Admin"])
def reject_news_simple(
    news_uid: str,
    reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Simplified reject news API"""
    
    news = db.query(News).filter(News.news_uid == news_uid).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    if news.is_approved == 1:
        raise HTTPException(status_code=400, detail="Cannot reject approved news")
    
    if news.is_approved == 2:
        return {"message": "News already rejected"}
    
    # Update news
    news.is_approved = 2
    news.rejected_at = datetime.now(timezone.utc)
    
    if reason:
        news.rejection_reason = reason

    db.add(
        Notification(
            user_uid=news.user_uid,
            title="News rejected",
            message=(
                f'Your news "{news.title}" was rejected.'
                + (f" Reason: {reason}" if reason else "")
            ),
            link_url=f"/news/{news.news_uid}",
            notification_type="rejection",
        )
    )

    db.commit()

    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="NEWS_REJECTED",
        resource_type="news",
        resource_id=news.news_uid,
        status="SUCCESS",
        details={"reason": reason}
    )

    return {
        "message": "News rejected successfully",
        "news_uid": news.news_uid,
        "rejected_at": news.rejected_at.isoformat(),
        "rejection_reason": news.rejection_reason
    }
@router.get("/news/rejected", response_model=dict, tags=["Admin"])
def get_rejected_news(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get all rejected news with pagination."""
    
    offset = (page - 1) * limit
    
    rejected_news = db.query(News).filter(
        News.is_approved == 2
    ).order_by(desc(News.created_at)).offset(offset).limit(limit).all()
    
    total = db.query(News).filter(News.is_approved == 2).count()
    
    items = []
    for news in rejected_news:
        # Get reporter
        reporter = db.query(User).filter(User.user_uid == news.user_uid).first()
        
        # Get rejector (if you have this info stored elsewhere)
        # For now, we'll just show that it was rejected
        rejector_info = {
            "user_uid": None,
            "name": "Admin",
            "role_name": "Admin"
        }
        
        items.append({
            "news_uid": news.news_uid,
            "title": news.title,
            "summary": news.summary[:150] if news.summary else None,
            "image_url": news.image_url,
            "created_at": news.created_at.isoformat() if news.created_at else None,
            "rejected_at": None,
            "rejection_reason": None,
            "reporter": {
                "user_uid": reporter.user_uid if reporter else None,
                "name": reporter.name if reporter else None
            },
            "rejected_by": rejector_info,
            "location": {
                "city": news.city.name if news.city else None,
                "district": news.city.district.name if news.city and news.city.district else None,
                "state": news.city.district.state.name if news.city and news.city.district and news.city.district.state else None
            },
            "language": news.language.name if news.language else None
        })
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "items": items,
        "metadata": {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
    }
@router.post("/news/bulk-reject", status_code=status.HTTP_200_OK, tags=["Admin"])
def bulk_reject_news(
    news_uids: List[str] = Query(..., description="List of news UIDs to reject"),
    reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """
    Bulk reject multiple news items.
    Admin only access.
    """
    
    results = {
        "successful": [],
        "failed": [],
        "total": len(news_uids)
    }
    
    for news_uid in news_uids:
        try:
            news = db.query(News).filter(News.news_uid == news_uid).first()
            
            if not news:
                results["failed"].append({
                    "news_uid": news_uid,
                    "reason": "News not found"
                })
                continue
            
            if news.is_approved == 1:
                results["failed"].append({
                    "news_uid": news_uid,
                    "reason": "Already approved"
                })
                continue
            
            if news.is_approved == 2:
                results["failed"].append({
                    "news_uid": news_uid,
                    "reason": "Already rejected"
                })
                continue
            
            # Reject the news
            news.is_approved = 2
            news.rejected_at = datetime.utcnow()
            news.updated_at = datetime.utcnow()
            
            if reason:
                news.rejection_reason = reason
            
            # Track who rejected
            if hasattr(news, 'rejected_by_uid'):
                news.rejected_by_uid = current_user.user_uid
            
            results["successful"].append({
                "news_uid": news_uid,
                "title": news.title
            })
            
        except Exception as e:
            results["failed"].append({
                "news_uid": news_uid,
                "reason": str(e)
            })
    
    db.commit()
    
    return {
        "message": f"Bulk reject completed: {len(results['successful'])} successful, {len(results['failed'])} failed",
        "results": results
    }

@router.put("/news/{news_uid}/approve", status_code=status.HTTP_200_OK, tags=["Admin", "Editorial"])
def approve_news(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NEWS_PUBLISH)),
):
    """
    Approve a news item identified by news_uid.
    Requires NEWS_PUBLISH permission (Moderator, Editor, or Admin).
    """

    # 1️⃣ Fetch news
    news = db.query(News).filter(News.news_uid == news_uid).first()

    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    if news.is_approved == 1:
        return {"message": "News already approved"}

    # 2️⃣ Approve news
    news.is_approved = 1
    news.approved_by_uid = current_user.user_uid
    news.approved_at = datetime.now(timezone.utc)
    news.status = "published"

    db.commit()
    db.refresh(news)

    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="NEWS_APPROVED",
        resource_type="news",
        resource_id=news.news_uid,
        status="SUCCESS",
        details={"title": news.title}
    )

    # 3️⃣ Fetch approver info
    approver = db.query(User).filter(User.user_uid == news.approved_by_uid).first()

    approver_info = {
        "user_uid": approver.user_uid if approver else current_user.user_uid,
        "name": approver.name if approver else getattr(current_user, "name", "Unknown"),
        "phone": approver.phone if approver else getattr(current_user, "phone", None),
        "message": "You approved this post"
    }

    # 4️⃣ Send notification task to Celery
    send_news_notification.delay(news.news_uid, news.title)

    # 5️⃣ Return response immediately
    return {
        "message": "News approved. Notifications will be sent in background.",
        "news_uid": news.news_uid,
        "approved_by": approver_info,
    }
    
# =====================================================================
# Admin Notifications
# =====================================================================
@router.post("/send", response_model=dict,tags=["Admin"])
def send_admin_notification(
    data: AdminNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),  # Only admins allowed
):
    query = db.query(User)

    # Filter users based on target
    if data.target_type == "all":
        users = query.all()
    elif data.target_type == "state":
        users = query.filter(User.state == data.target_value).all()
    elif data.target_type == "district":
        users = query.filter(User.district == data.target_value).all()
    elif data.target_type == "city":
        users = query.filter(User.city == data.target_value).all()
    elif data.target_type == "user":
        users = query.filter(User.user_uid == data.target_value).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid target_type")

    if not users:
        return {"status": "No users found for target"}

    for user in users:
        notification = Notification(
            user_uid=user.user_uid,
            title=data.title,
            message=data.message,
            link_url=data.link_url,
            notification_type="custom"
        )
        db.add(notification)

    db.commit()
    return {"status": f"Sent to {len(users)} user(s)"}


# =====================================================================
# Admin Users Management
# =====================================================================
@router.get("/users", summary="List all registered users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Retrieve all registered users."""
    return db.query(User).all()

@router.delete("/users/{user_uid}", summary="Delete a user")
def delete_user(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Delete a user by UID (Admin privilege)."""
    if user_uid == current_user.user_uid:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()

    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="USER_DELETED",
        resource_type="user",
        resource_id=user_uid,
        status="SUCCESS",
        details={"deleted_user": user_uid}
    )

    return {"message": f"User {user_uid} deleted successfully"}
#__-----------------------------------------------------------------FEEDS ADMIN _------------------

@router.get("/feedsAdmin", response_model=List[dict], tags=["Admin"])
def get_feed(
    language: Optional[str] = Query(None),
    city_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EMPLOYEE)),  # Admin & Employee only
):
    now = datetime.utcnow()

    # Query approved news with eager loading
    news_query = (
        db.query(News)
        .options(
            joinedload(News.approver),
            joinedload(News.user),
            joinedload(News.city).joinedload(City.district).joinedload(District.state),
            joinedload(News.categories),
        )
        .filter(News.is_approved == 1)
    )

    if language:
        news_query = news_query.join(Language).filter(Language.code == language)
    if city_id:
        news_query = news_query.filter(News.city_id == city_id)

    news_list = news_query.order_by(News.created_at.desc()).limit(30).all()

    # Active sponsored posts
    sponsored_posts = db.query(SponsoredPost).filter(
        SponsoredPost.is_approved == True,
        SponsoredPost.start_date <= now,
        SponsoredPost.end_date >= now
    ).all()
    random.shuffle(sponsored_posts)

    # Active ads
    ads = db.query(Advertisement).filter(
        Advertisement.is_active == True,
        Advertisement.start_date <= now,
        Advertisement.end_date >= now
    ).all()
    random.shuffle(ads)

    feed = []
    sponsor_idx = 0
    ad_idx = 0

    for i, news in enumerate(news_list):
        posted_by = news.user
        posted_by_info = {
            "user_uid": posted_by.user_uid,
            "name": posted_by.name,
            "phone": posted_by.phone
        } if posted_by else None

        approved_by = news.approver
        approved_by_info = {
            "user_uid": approved_by.user_uid,
            "name": approved_by.name,
            "phone": approved_by.phone
        } if approved_by else None

        state_name = news.city.district.state.name if (news.city and news.city.district and news.city.district.state) else None
        district_name = news.city.district.name if (news.city and news.city.district) else None
        city_name = news.city.name if news.city else None
        category_names = [c.name for c in news.categories] if news.categories else []

        news_data = {
            "news_uid": news.news_uid,
            "title": news.title,
            "summary": news.summary,
            "image_url": news.image_url,
            "language": news.language.name if news.language else None,
            "is_approved": news.is_approved,
            "source_url": news.source_url,
            "source_name": news.source_name,
            "created_at": news.created_at.isoformat() if news.created_at else None,
            "category_names": category_names,
            "state": state_name,
            "district": district_name,
            "city": city_name,
            "user_name": posted_by.name if posted_by else None,
            "posted_by": posted_by_info,
            "approved_by": approved_by_info,
        }

        feed.append({"type": "news", "data": news_data})

        # Inject sponsored posts every 4 news items
        if (i + 1) % 4 == 0 and sponsor_idx < len(sponsored_posts):
            feed.append({"type": "sponsored", "data": schemas.SponsoredItem.from_orm(sponsored_posts[sponsor_idx]).dict()})
            sponsor_idx += 1

        # Inject ads every 6 news items
        if (i + 1) % 6 == 0 and ad_idx < len(ads):
            feed.append({"type": "ad", "data": schemas.AdItem.from_orm(ads[ad_idx]).dict()})
            ad_idx += 1

    return feed

# =====================================================
# ADMIN USER CREATION API
# =====================================================

@router.post("/users", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED, tags=["Admin"])
def create_user_by_admin(
    user_data: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Create a new user (Admin only)
    - No OTP verification required
    - Admin can set all user details directly
    - Username max length: 18 characters
    """
    try:
        # Check if phone already exists
        if user_data.phone:
            existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Phone number already registered")
        
        # Check if email already exists
        if user_data.email:
            existing_email = db.query(User).filter(User.email == user_data.email).first()
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Validate and check username
        user_name = user_data.user_name
        
        if user_name:
            # Check username length
            if len(user_name) > 18:
                raise HTTPException(status_code=400, detail="Username must be 18 characters or less")
            
            # Check if username already exists
            existing_username = db.query(User).filter(User.user_name == user_name).first()
            if existing_username:
                raise HTTPException(status_code=400, detail="Username already taken")
        else:
            # Generate unique username with max 18 chars
            user_name = generate_unique_username(db)
            # Double-check length
            if len(user_name) > 18:
                user_name = user_name[:18]
        
        # Generate unique user_uid (8 chars)
        user_uid = generate_user_uid(db)
        
        # Create new user
        new_user = User(
            user_uid=user_uid,
            user_name=user_name,
            name=user_data.name,
            phone=user_data.phone,
            email=user_data.email,
            gender=user_data.gender,
            date_of_birth=user_data.date_of_birth,
            language=user_data.language,
            state_id=user_data.state_id,
            district_id=user_data.district_id,
            city_id=user_data.city_id,
            role=user_data.role,
            email_verified=user_data.email_verified if user_data.email_verified is not None else bool(user_data.email),
            mobile_verified=user_data.mobile_verified if user_data.mobile_verified is not None else bool(user_data.phone),
            created_at=datetime.utcnow(),
            token_version=0,
            is_suspended=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # If user has preferences, create them
        if user_data.preferences:
            pref = user_data.preferences
            # Validate language
            language = db.query(Language).filter(Language.id == pref.language_id).first()
            if not language:
                raise HTTPException(status_code=400, detail="Invalid language ID")
            
            # Create preferences
            user_pref = UserPreference(
                user_uid=new_user.user_uid,
                language_id=pref.language_id,
                state_id=pref.state_id,
                district_id=pref.district_id,
                city_id=pref.city_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Add categories if provided
            if pref.category_ids:
                categories = db.query(Category).filter(Category.id.in_(pref.category_ids)).all()
                if len(categories) != len(pref.category_ids):
                    raise HTTPException(status_code=400, detail="Invalid category IDs")
                user_pref.categories = categories
            
            db.add(user_pref)
            db.commit()
        
        # Return user data
        return {
            "user_uid": new_user.user_uid,
            "user_name": new_user.user_name,
            "name": new_user.name,
            "phone": new_user.phone,
            "email": new_user.email,
            "gender": new_user.gender,
            "date_of_birth": new_user.date_of_birth,
            "language": new_user.language,
            "state_id": new_user.state_id,
            "district_id": new_user.district_id,
            "city_id": new_user.city_id,
            "role": new_user.role,
            "email_verified": new_user.email_verified,
            "mobile_verified": new_user.mobile_verified,
            "created_at": new_user.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

