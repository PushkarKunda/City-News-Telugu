import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import APIRouter, Depends, HTTPException, status, Form, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, text
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import json
import logging

from database import get_db
from models.insorts import Insight, InsightPage, InsightShare
from models.user import User
from schemas import (
    InsightStoryCreate,
    InsightStoryOut,
    InsightCoverOut,
    InsightShareCreate,
    InsightUpdate,
    InsightListResponse,
    UserRole
)
from auth.dependencies import (
    get_current_user, 
    require_roles, 
    admin_required,
    moderator_required
)

# =====================================================
# Logging Setup
# =====================================================
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["Insights"])

# =====================================================
# Constants
# =====================================================
MAX_TITLE_LENGTH = 200
MAX_CATEGORY_LENGTH = 100
MAX_PAGE_TITLE_LENGTH = 200
MAX_PAGE_CONTENT_LENGTH = 5000
MAX_PAGES_PER_INSIGHT = 50
MAX_INSIGHTS_PER_REQUEST = 100


# =====================================================
# Helper Functions
# =====================================================

def generate_insight_uid() -> str:
    """Generate a unique 8-character insight UID."""
    return str(uuid.uuid4())[:8].upper()


def validate_insight_data(title: str, category_name: str, pages: List) -> None:
    """Validate insight data before creation/update."""
    if not title or len(title.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title must be at least 3 characters"
        )
    if len(title) > MAX_TITLE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Title cannot exceed {MAX_TITLE_LENGTH} characters"
        )
    
    if not category_name or len(category_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name must be at least 2 characters"
        )
    if len(category_name) > MAX_CATEGORY_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category name cannot exceed {MAX_CATEGORY_LENGTH} characters"
        )
    
    if not pages or len(pages) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one page is required"
        )
    
    if len(pages) > MAX_PAGES_PER_INSIGHT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot exceed {MAX_PAGES_PER_INSIGHT} pages per insight"
        )
    
    # Validate each page
    for idx, page in enumerate(pages):
        page_title = page.get('title') if isinstance(page, dict) else getattr(page, 'title', None)
        page_content = page.get('content') if isinstance(page, dict) else getattr(page, 'content', None)
        
        if page_title and len(page_title) > MAX_PAGE_TITLE_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Page {idx + 1} title exceeds {MAX_PAGE_TITLE_LENGTH} characters"
            )
        
        if page_content and len(page_content) > MAX_PAGE_CONTENT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Page {idx + 1} content exceeds {MAX_PAGE_CONTENT_LENGTH} characters"
            )


def _create_insight_with_pages(
    db: Session,
    insight_uid: str,
    title: str,
    category_name: str,
    cover_image_url: Optional[str],
    pages: List,
    created_by: str = None
):
    """Create Insight and its pages in a single transaction."""
    db_insight = Insight(
        insight_uid=insight_uid,
        title=title.strip(),
        cover_image_url=cover_image_url,
        category_name=category_name.strip(),
        created_by=created_by,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(db_insight)
    db.flush()

    for idx, page in enumerate(pages):
        if hasattr(page, 'page_number'):
            page_number = page.page_number or idx + 1
            title_val = page.title
            content_val = page.content
            image_url_val = page.image_url
            video_url_val = page.video_url
        else:
            page_number = page.get('page_number', idx + 1)
            title_val = page.get('title')
            content_val = page.get('content')
            image_url_val = page.get('image_url')
            video_url_val = page.get('video_url')

        db_page = InsightPage(
            insight_id=db_insight.id,
            page_number=page_number,
            title=title_val.strip() if title_val else None,
            content=content_val.strip() if content_val else None,
            image_url=image_url_val,
            video_url=video_url_val
        )
        db.add(db_page)

    db.commit()
    db.refresh(db_insight)
    return db_insight


# =====================================================
# PUBLIC ENDPOINTS (Read-only, no auth required)
# =====================================================

@router.get("/", response_model=InsightListResponse)
def list_insights(
    limit: int = Query(20, ge=1, le=MAX_INSIGHTS_PER_REQUEST, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, min_length=2, max_length=100, description="Search by title"),
    sort_by: str = Query("created_at", enum=["created_at", "title", "views_count", "shares_count"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    db: Session = Depends(get_db)
):
    """
    Get all insights with pagination and filtering (Public)
    """
    query = db.query(Insight)
    
    # Apply filters
    if category:
        query = query.filter(Insight.category_name == category)
    
    if search:
        query = query.filter(Insight.title.ilike(f"%{search}%"))
    
    # Apply sorting
    sort_column = getattr(Insight, sort_by, Insight.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    total = query.count()
    insights = query.offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total,
        "items": insights
    }


@router.get("/categories", response_model=List[str])
def get_categories(
    db: Session = Depends(get_db)
):
    """Get all unique insight categories (Public)"""
    categories = db.query(Insight.category_name).distinct().all()
    return [c[0] for c in categories if c[0]]


@router.get("/health", tags=["Health"])
def insights_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for insights service"""
    try:
        db.execute(text("SELECT 1"))
        insight_count = db.query(Insight).count()
        return {
            "status": "healthy",
            "service": "insights_router",
            "services": {
                "api": "running",
                "database": "connected"
            },
            "total_insights_count": insight_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )


@router.get("/{category_name}", response_model=InsightListResponse)
def get_insights_by_category(
    category_name: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get all insights in a given category (Public)
    """
    query = db.query(Insight).filter(Insight.category_name == category_name)
    total = query.count()
    insights = query.order_by(desc(Insight.created_at)).offset(offset).limit(limit).all()
    
    return {
        "category": category_name,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total,
        "items": insights
    }


@router.get("/uid/{insight_uid}", response_model=InsightStoryOut)
def get_insight_story_by_uid(
    insight_uid: str,
    db: Session = Depends(get_db)
):
    """
    Get a single insight story by insight_uid with its pages (Public)
    """
    insight = db.query(Insight).filter(
        Insight.insight_uid == insight_uid
    ).first()
    
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )
    
    # Increment view count
    insight.views_count = (insight.views_count or 0) + 1
    db.commit()
    
    # Get pages sorted by page_number
    pages = db.query(InsightPage).filter(
        InsightPage.insight_id == insight.id
    ).order_by(InsightPage.page_number).all()
    
    insight.pages = pages
    
    return insight


@router.get("/stats/popular", response_model=List[InsightCoverOut])
def get_popular_insights(
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("week", enum=["day", "week", "month", "all"]),
    db: Session = Depends(get_db)
):
    """
    Get most viewed insights (Public)
    """
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
    
    insights = db.query(Insight).filter(
        Insight.created_at >= start_date
    ).order_by(desc(Insight.views_count)).limit(limit).all()
    
    return insights


# =====================================================
# AUTHENTICATED ENDPOINTS (USER+)
# =====================================================

@router.post("/share", response_model=dict)
def share_insight(
    share_data: InsightShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new record in the insight_shares table (Authenticated)
    """
    # Verify that the insight exists
    insight = db.query(Insight).filter(
        Insight.insight_uid == share_data.insight_uid
    ).first()
    
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )
    
    # Check if user already shared this insight
    existing_share = db.query(InsightShare).filter(
        InsightShare.insight_uid == share_data.insight_uid,
        InsightShare.user_uid == current_user.user_uid
    ).first()
    
    if existing_share:
        return {"message": "Already shared", "share_count": insight.shares_count}
    
    # Create the share record
    db_share = InsightShare(
        insight_uid=share_data.insight_uid,
        user_uid=current_user.user_uid,
        platform=share_data.platform,
        created_at=datetime.now(timezone.utc)
    )
    
    # Increment share count
    insight.shares_count = (insight.shares_count or 0) + 1
    
    db.add(db_share)
    db.commit()
    
    return {
        "message": "Insight shared successfully",
        "share_count": insight.shares_count
    }


@router.post("/share/{insight_id}", response_model=dict)
def share_insight_by_id(
    insight_id: int,
    platform: str = Form(..., description="Platform name (facebook, twitter, whatsapp, etc.)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new record in the insight_shares table using insight ID (Authenticated)
    """
    # Verify that the insight exists
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )
    
    # Check if user already shared this insight
    existing_share = db.query(InsightShare).filter(
        InsightShare.insight_uid == insight.insight_uid,
        InsightShare.user_uid == current_user.user_uid
    ).first()
    
    if existing_share:
        return {"message": "Already shared", "share_count": insight.shares_count}
    
    # Create the share record
    db_share = InsightShare(
        insight_uid=insight.insight_uid,
        user_uid=current_user.user_uid,
        platform=platform,
        created_at=datetime.now(timezone.utc)
    )
    
    # Increment share count
    insight.shares_count = (insight.shares_count or 0) + 1
    
    db.add(db_share)
    db.commit()
    
    return {
        "message": "Insight shared successfully",
        "share_count": insight.shares_count
    }


# =====================================================
# ADMIN/MODERATOR ENDPOINTS (Create, Update, Delete)
# =====================================================

@router.post("/", response_model=InsightStoryOut, status_code=status.HTTP_201_CREATED)
def create_insight_story(
    insight_data: InsightStoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """
    Create a new insight story with its pages (Moderator and Admin only)
    """
    # Validate input
    validate_insight_data(
        insight_data.title,
        insight_data.category_name,
        insight_data.pages
    )
    
    # Determine final UID
    final_insight_uid = insight_data.insight_uid or generate_insight_uid()

    # Check for duplicate
    if insight_data.insight_uid:
        exists = db.query(Insight).filter(Insight.insight_uid == final_insight_uid).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insight with this UID already exists"
            )
    else:
        exists = db.query(Insight).filter(
            Insight.title == insight_data.title,
            Insight.category_name == insight_data.category_name
        ).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Insight with this title and category already exists"
            )

    # Create using helper
    return _create_insight_with_pages(
        db=db,
        insight_uid=final_insight_uid,
        title=insight_data.title,
        category_name=insight_data.category_name,
        cover_image_url=insight_data.cover_image_url,
        pages=insight_data.pages,
        created_by=current_user.user_uid
    )


@router.post("/create", response_model=InsightStoryOut, status_code=status.HTTP_201_CREATED)
async def create_insight_story_with_urls(
    insight_uid: Optional[str] = Form(None),
    title: str = Form(...),
    category_name: str = Form(...),
    cover_image_url: Optional[str] = Form(None),
    pages_json: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """
    Create a new insight story with image URLs only (Moderator and Admin only)
    """
    # Validate input
    validate_insight_data(title, category_name, [])
    
    try:
        # Determine final UID
        final_insight_uid = insight_uid or generate_insight_uid()
        
        # Check for duplicate
        if insight_uid:
            existing_insight = db.query(Insight).filter(Insight.insight_uid == final_insight_uid).first()
            if existing_insight:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Insight with this UID already exists"
                )
        else:
            existing_insight = db.query(Insight).filter(
                Insight.title == title,
                Insight.category_name == category_name
            ).first()
            if existing_insight:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Insight with this title and category already exists"
                )
        
        # Parse pages JSON
        try:
            pages_data = json.loads(pages_json)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format for pages"
            )
        
        # Validate pages
        if len(pages_data) > MAX_PAGES_PER_INSIGHT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot exceed {MAX_PAGES_PER_INSIGHT} pages per insight"
            )
        
        prepared_pages = []
        for idx, page_data in enumerate(pages_data):
            if not page_data.get('image_url'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Page {idx + 1} must have an image_url"
                )
            prepared_pages.append(page_data)

        # Create using helper
        return _create_insight_with_pages(
            db=db,
            insight_uid=final_insight_uid,
            title=title,
            category_name=category_name,
            cover_image_url=cover_image_url,
            pages=prepared_pages,
            created_by=current_user.user_uid
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create insight: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create insight: {str(e)}"
        )


@router.patch("/story/{insight_uid}", response_model=InsightStoryOut)
def update_insight_story(
    insight_uid: str,
    insight_data: InsightStoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """
    Update an existing insight story (Moderator and Admin only)
    """
    # Validate input
    validate_insight_data(
        insight_data.title,
        insight_data.category_name,
        insight_data.pages
    )
    
    # Find the existing insight
    db_insight = db.query(Insight).filter(
        Insight.insight_uid == insight_uid
    ).first()
    
    if not db_insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )
    
    # Update insight details
    db_insight.title = insight_data.title.strip()
    db_insight.cover_image_url = insight_data.cover_image_url
    db_insight.category_name = insight_data.category_name.strip()
    db_insight.updated_at = datetime.now(timezone.utc)
    
    # Only update insight_uid if provided and different
    if insight_data.insight_uid and insight_data.insight_uid != db_insight.insight_uid:
        existing_insight = db.query(Insight).filter(
            Insight.insight_uid == insight_data.insight_uid
        ).first()
        
        if existing_insight:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insight with this UID already exists"
            )
        
        db_insight.insight_uid = insight_data.insight_uid
    
    # Delete existing pages
    db.query(InsightPage).filter(
        InsightPage.insight_id == db_insight.id
    ).delete()
    
    # Create new pages
    for idx, page_data in enumerate(insight_data.pages):
        db_page = InsightPage(
            insight_id=db_insight.id,
            page_number=page_data.page_number or idx + 1,
            title=page_data.title.strip() if page_data.title else None,
            content=page_data.content.strip() if page_data.content else None,
            image_url=page_data.image_url,
            video_url=page_data.video_url
        )
        db.add(db_page)
    
    db.commit()
    db.refresh(db_insight)
    
    # Get the updated pages for response
    pages = db.query(InsightPage).filter(
        InsightPage.insight_id == db_insight.id
    ).order_by(InsightPage.page_number).all()
    
    db_insight.pages = pages
    
    return db_insight


@router.delete("/uid/{insight_uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_insight_story_by_uid(
    insight_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """
    Delete an insight by insight_uid (Moderator and Admin only)
    """
    insight = db.query(Insight).filter(
        Insight.insight_uid == insight_uid
    ).first()
    
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )
    
    db.delete(insight)
    db.commit()
    
    return None


@router.delete("/bulk", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_insights(
    insight_uids: List[str] = Query(..., description="List of insight UIDs to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Bulk delete insights (Admin only)
    """
    results = {"successful": [], "failed": [], "total": len(insight_uids)}
    
    for insight_uid in insight_uids:
        try:
            insight = db.query(Insight).filter(Insight.insight_uid == insight_uid).first()
            if not insight:
                results["failed"].append({"insight_uid": insight_uid, "reason": "Not found"})
                continue
            
            title = insight.title
            db.delete(insight)
            results["successful"].append({"insight_uid": insight_uid, "title": title})
            
        except Exception as e:
            results["failed"].append({"insight_uid": insight_uid, "reason": str(e)})
    
    db.commit()
    
    return {
        "message": "Bulk deletion completed",
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "results": results
    }


# =====================================================
# ADMIN ONLY ENDPOINTS
# =====================================================

@router.get("/admin/stats", response_model=dict)
def get_admin_insight_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Get comprehensive insight statistics for admin dashboard (Admin only)
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    total_insights = db.query(Insight).count()
    total_views = db.query(func.sum(Insight.views_count)).scalar() or 0
    total_shares = db.query(func.sum(Insight.shares_count)).scalar() or 0
    
    insights_created = db.query(Insight).filter(
        Insight.created_at >= start_date
    ).count()
    
    # Category distribution
    category_stats = db.query(
        Insight.category_name,
        func.count(Insight.id).label('count')
    ).group_by(Insight.category_name).order_by(desc('count')).all()
    
    # Top insights
    top_insights = db.query(Insight).order_by(
        desc(Insight.views_count)
    ).limit(10).all()
    
    return {
        "period_days": days,
        "summary": {
            "total_insights": total_insights,
            "total_views": total_views,
            "total_shares": total_shares,
            "avg_views_per_insight": total_views / total_insights if total_insights > 0 else 0,
            "insights_created_in_period": insights_created
        },
        "category_distribution": [
            {"category": c.category_name, "count": c.count}
            for c in category_stats
        ],
        "top_insights": [
            {
                "insight_uid": i.insight_uid,
                "title": i.title,
                "views": i.views_count,
                "shares": i.shares_count
            }
            for i in top_insights
        ]
    }


@router.get("/admin/export", response_model=dict)
def export_insights(
    format: str = Query("json", enum=["json", "csv"]),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Export insights data (Admin only)
    """
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    query = db.query(Insight)
    
    if start_date:
        query = query.filter(Insight.created_at >= start_date)
    if end_date:
        query = query.filter(Insight.created_at <= end_date)
    
    insights = query.order_by(desc(Insight.created_at)).all()
    
    if format == "json":
        return {
            "total": len(insights),
            "items": [
                {
                    "insight_uid": i.insight_uid,
                    "title": i.title,
                    "category_name": i.category_name,
                    "views_count": i.views_count,
                    "shares_count": i.shares_count,
                    "created_at": i.created_at.isoformat() if i.created_at else None
                }
                for i in insights
            ]
        }
    
    # CSV Export
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Insight UID", "Title", "Category", "Views", "Shares", "Created At"])
    
    for i in insights:
        writer.writerow([
            i.insight_uid,
            i.title,
            i.category_name,
            i.views_count or 0,
            i.shares_count or 0,
            i.created_at.isoformat() if i.created_at else ""
        ])
    
    output.seek(0)
    filename = f"insights_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


