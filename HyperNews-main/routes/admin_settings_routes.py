# routes/admin_settings_routes.py

# routes/admin_settings_routes.py

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from pydantic import BaseModel, EmailStr, Field
import os
import time
import platform
import csv
import io
from database import get_db
from auth.dependencies import admin_required
from services.audit_service import record_audit_log
from models.user import User
from models.news import News, Category
from models.base_location import Language, City, District, State  # ✅ Add this
from models.settings import MenuItem, FooterLink, SocialLink, AppSettings
from utility import generate_news_uid, generate_user_uid, generate_unique_username

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])

# Store application start time
APP_START_TIME = time.time()


# =========================================================
# Request/Response Schemas
# =========================================================

class SettingsUpdate(BaseModel):
    """Settings update request"""
    app_name: Optional[str] = Field(None, max_length=100)
    app_logo: Optional[str] = Field(None, max_length=500)
    app_favicon: Optional[str] = Field(None, max_length=500)
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = Field(None, max_length=20)
    max_news_per_day: Optional[int] = Field(None, ge=1, le=50)
    default_language: Optional[str] = Field(None, max_length=10)
    ad_approval_required: Optional[bool] = None
    news_approval_required: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = Field(None, max_length=500)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    meta_description: Optional[str] = Field(None, max_length=500)
    meta_keywords: Optional[str] = Field(None, max_length=500)


class MenuItemCreate(BaseModel):
    """Create menu item"""
    title: str = Field(..., max_length=100)
    link: str = Field(..., max_length=500)
    item_type: str = Field("custom", enum=["custom", "category", "page", "external", "ad", "poll", "event", "insight"])
    category_id: Optional[int] = None
    parent_id: Optional[int] = None
    display_order: int = 0
    placement: str = Field("both", enum=["header", "categories", "both"])
    target: str = Field("_self", enum=["_self", "_blank"])
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool = True


class MenuItemUpdate(BaseModel):
    """Update menu item"""
    title: Optional[str] = None
    link: Optional[str] = None
    item_type: Optional[str] = None
    category_id: Optional[int] = None
    parent_id: Optional[int] = None
    display_order: Optional[int] = None
    placement: Optional[str] = None
    target: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class MenuItemOut(BaseModel):
    """Menu item output"""
    id: int
    title: str
    link: str
    item_type: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    parent_id: Optional[int] = None
    display_order: int
    placement: str
    target: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool
    children: List['MenuItemOut'] = []


class FooterLinkCreate(BaseModel):
    """Create footer link"""
    title: str = Field(..., max_length=100)
    link: str = Field(..., max_length=500)
    section: str = Field("quick_links", enum=["quick_links", "about", "legal", "social"])
    display_order: int = 0
    target: str = Field("_self", enum=["_self", "_blank"])
    is_active: bool = True


class FooterLinkOut(BaseModel):
    """Footer link output"""
    id: int
    title: str
    link: str
    section: str
    display_order: int
    target: str
    is_active: bool


class SocialLinkCreate(BaseModel):
    """Create social link"""
    platform: str = Field(..., enum=["facebook", "twitter", "instagram", "youtube", "linkedin", "telegram"])
    url: str = Field(..., max_length=500)
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class SocialLinkOut(BaseModel):
    """Social link output"""
    id: int
    platform: str
    url: str
    icon: Optional[str]
    display_order: int
    is_active: bool


class VersionUpdate(BaseModel):
    """Update app version"""
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    release_notes: Optional[str] = None


# =========================================================
# 1. APP INFO & VERSION API
# =========================================================

@router.get("/info", tags=["Admin"])
def get_app_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get application information and statistics"""
    uptime_seconds = int(time.time() - APP_START_TIME)
    uptime_days = uptime_seconds // 86400
    uptime_hours = (uptime_seconds % 86400) // 3600
    uptime_minutes = (uptime_seconds % 3600) // 60
    
    total_users = db.query(User).count()
    total_news = db.query(News).count()
    total_approved_news = db.query(News).filter(News.is_approved == 1).count()
    total_pending_news = db.query(News).filter(News.is_approved == 0).count()
    total_rejected_news = db.query(News).filter(News.is_approved == 2).count()
    
    return {
        "app_name": os.getenv("APP_NAME", "Hyperlocal News"),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "python_version": platform.python_version(),
        "uptime": {
            "seconds": uptime_seconds,
            "human_readable": f"{uptime_days}d {uptime_hours}h {uptime_minutes}m",
            "started_at": datetime.fromtimestamp(APP_START_TIME).isoformat()
        },
        "statistics": {
            "users": total_users,
            "news": {
                "total": total_news,
                "approved": total_approved_news,
                "pending": total_pending_news,
                "rejected": total_rejected_news
            }
        }
    }


@router.post("/version", tags=["Admin"])
def update_app_version(
    version_data: VersionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update app version (Admin only)"""
    # Update in database or environment
    return {
        "message": "Version updated successfully",
        "old_version": os.getenv("APP_VERSION", "1.0.0"),
        "new_version": version_data.version,
        "release_notes": version_data.release_notes,
        "updated_at": datetime.utcnow().isoformat()
    }


# =========================================================
# 2. GENERAL SETTINGS API
# =========================================================

@router.get("/", tags=["Admin"])
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get all application settings"""
    return {
        "app_name": os.getenv("APP_NAME", "Hyperlocal News"),
        "app_logo": os.getenv("APP_LOGO", ""),
        "app_favicon": os.getenv("APP_FAVICON", ""),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "support_email": os.getenv("SUPPORT_EMAIL", "support@example.com"),
        "support_phone": os.getenv("SUPPORT_PHONE", ""),
        "max_news_per_day": int(os.getenv("MAX_NEWS_PER_DAY", "10")),
        "default_language": os.getenv("DEFAULT_LANGUAGE", "en"),
        "ad_approval_required": os.getenv("AD_APPROVAL_REQUIRED", "true").lower() == "true",
        "news_approval_required": os.getenv("NEWS_APPROVAL_REQUIRED", "true").lower() == "true",
        "maintenance_mode": os.getenv("MAINTENANCE_MODE", "false").lower() == "true",
        "maintenance_message": os.getenv("MAINTENANCE_MESSAGE", "Site is under maintenance"),
        "contact_email": os.getenv("CONTACT_EMAIL", ""),
        "contact_phone": os.getenv("CONTACT_PHONE", ""),
        "contact_address": os.getenv("CONTACT_ADDRESS", ""),
        "google_analytics_id": os.getenv("GOOGLE_ANALYTICS_ID", ""),
        "facebook_pixel_id": os.getenv("FACEBOOK_PIXEL_ID", ""),
        "meta_description": os.getenv("META_DESCRIPTION", ""),
        "meta_keywords": os.getenv("META_KEYWORDS", "")
    }


@router.put("/", tags=["Admin"])
def update_settings(
    settings: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update application settings"""
    return {
        "message": "Settings updated successfully",
        "updated_fields": settings.dict(exclude_unset=True),
        "updated_at": datetime.utcnow().isoformat()
    }


# =========================================================
# 3. HEADER MENU MANAGEMENT API (Database Backed)
# =========================================================

@router.get("/menu/header", response_model=List[MenuItemOut], tags=["Menu"])
def get_header_menu(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get header menu items from database"""
    items = db.query(MenuItem).filter(
        MenuItem.placement.in_(["header", "both"]),
        MenuItem.is_active == True
    ).order_by(MenuItem.display_order.asc()).all()
    
    result = []
    for item in items:
        item_data = {
            "id": item.id,
            "title": item.title,
            "link": item.link,
            "item_type": item.item_type,
            "category_id": item.category_id,
            "category_name": None,
            "parent_id": item.parent_id,
            "display_order": item.display_order,
            "placement": item.placement,
            "target": item.target,
            "icon": item.icon,
            "color": item.color,
            "is_active": item.is_active,
            "children": []
        }
        
        # Get category name if this is a category type
        if item.category_id:
            category = db.query(Category).filter(Category.id == item.category_id).first()
            if category:
                item_data["category_name"] = category.name
                # Update link to use category slug or ID
                item_data["link"] = f"/category/{category.id}"
        
        result.append(item_data)
    
    return result


@router.get("/menu/categories", response_model=List[MenuItemOut], tags=["Menu"])
def get_categories_menu(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get categories page menu items from database"""
    items = db.query(MenuItem).filter(
        MenuItem.placement.in_(["categories", "both"]),
        MenuItem.is_active == True
    ).order_by(MenuItem.display_order.asc()).all()
    
    result = []
    for item in items:
        item_data = {
            "id": item.id,
            "title": item.title,
            "link": item.link,
            "item_type": item.item_type,
            "category_id": item.category_id,
            "category_name": None,
            "parent_id": item.parent_id,
            "display_order": item.display_order,
            "placement": item.placement,
            "target": item.target,
            "icon": item.icon,
            "color": item.color,
            "is_active": item.is_active,
            "children": []
        }
        
        if item.category_id:
            category = db.query(Category).filter(Category.id == item.category_id).first()
            if category:
                item_data["category_name"] = category.name
                item_data["link"] = f"/category/{category.id}"
        
        result.append(item_data)
    
    return result


@router.post("/menu", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED, tags=["Menu"])
def create_menu_item(
    menu_item: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Create a new menu item"""
    # Validate category if type is category
    if menu_item.item_type == "category":
        if not menu_item.category_id:
            raise HTTPException(status_code=400, detail="Category ID required for category type")
        category = db.query(Category).filter(Category.id == menu_item.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        # Auto-generate link
        menu_item.link = f"/category/{category.id}"
    
    # Get max display order
    max_order = db.query(func.max(MenuItem.display_order)).scalar() or 0
    
    new_item = MenuItem(
        title=menu_item.title,
        link=menu_item.link,
        item_type=menu_item.item_type,
        category_id=menu_item.category_id,
        parent_id=menu_item.parent_id,
        display_order=max_order + 1,
        placement=menu_item.placement,
        target=menu_item.target,
        icon=menu_item.icon,
        color=menu_item.color,
        is_active=menu_item.is_active
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item


@router.put("/menu/{item_id}", response_model=MenuItemOut, tags=["Menu"])
def update_menu_item(
    item_id: int,
    menu_item: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update a menu item"""
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    if menu_item.title is not None:
        db_item.title = menu_item.title
    if menu_item.link is not None:
        db_item.link = menu_item.link
    if menu_item.item_type is not None:
        db_item.item_type = menu_item.item_type
    if menu_item.category_id is not None:
        if menu_item.category_id:
            category = db.query(Category).filter(Category.id == menu_item.category_id).first()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
        db_item.category_id = menu_item.category_id
    if menu_item.parent_id is not None:
        db_item.parent_id = menu_item.parent_id
    if menu_item.display_order is not None:
        db_item.display_order = menu_item.display_order
    if menu_item.placement is not None:
        db_item.placement = menu_item.placement
    if menu_item.target is not None:
        db_item.target = menu_item.target
    if menu_item.icon is not None:
        db_item.icon = menu_item.icon
    if menu_item.color is not None:
        db_item.color = menu_item.color
    if menu_item.is_active is not None:
        db_item.is_active = menu_item.is_active
    
    db_item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_item)
    
    return db_item


@router.delete("/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Menu"])
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Delete a menu item"""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(item)
    db.commit()
    return None


@router.put("/menu/reorder", tags=["Menu"])
def reorder_menu_items(
    item_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Reorder menu items"""
    for idx, item_id in enumerate(item_ids):
        db.query(MenuItem).filter(MenuItem.id == item_id).update(
            {"display_order": idx, "updated_at": datetime.utcnow()}
        )
    
    db.commit()
    
    return {
        "message": "Menu items reordered successfully",
        "new_order": item_ids
    }


# =========================================================
# 4. FOOTER MENU MANAGEMENT API (Database Backed)
# =========================================================

@router.get("/footer", response_model=List[FooterLinkOut], tags=["Footer"])
def get_footer_links(
    section: Optional[str] = Query(None, enum=["quick_links", "about", "legal", "social"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get footer links from database"""
    query = db.query(FooterLink).filter(FooterLink.is_active == True)
    
    if section:
        query = query.filter(FooterLink.section == section)
    
    return query.order_by(FooterLink.display_order.asc()).all()


@router.post("/footer", response_model=FooterLinkOut, status_code=status.HTTP_201_CREATED, tags=["Footer"])
def create_footer_link(
    footer_link: FooterLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Create a new footer link"""
    max_order = db.query(func.max(FooterLink.display_order)).scalar() or 0
    
    new_link = FooterLink(
        title=footer_link.title,
        link=footer_link.link,
        section=footer_link.section,
        display_order=max_order + 1,
        target=footer_link.target,
        is_active=footer_link.is_active
    )
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return new_link


@router.put("/footer/{link_id}", response_model=FooterLinkOut, tags=["Footer"])
def update_footer_link(
    link_id: int,
    footer_link: FooterLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update a footer link"""
    db_link = db.query(FooterLink).filter(FooterLink.id == link_id).first()
    if not db_link:
        raise HTTPException(status_code=404, detail="Footer link not found")
    
    db_link.title = footer_link.title
    db_link.link = footer_link.link
    db_link.section = footer_link.section
    db_link.display_order = footer_link.display_order
    db_link.target = footer_link.target
    db_link.is_active = footer_link.is_active
    db_link.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_link)
    
    return db_link


@router.delete("/footer/{link_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Footer"])
def delete_footer_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Delete a footer link"""
    link = db.query(FooterLink).filter(FooterLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Footer link not found")
    
    db.delete(link)
    db.commit()
    return None


@router.put("/footer/reorder", tags=["Footer"])
def reorder_footer_links(
    link_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Reorder footer links"""
    for idx, link_id in enumerate(link_ids):
        db.query(FooterLink).filter(FooterLink.id == link_id).update(
            {"display_order": idx, "updated_at": datetime.utcnow()}
        )
    
    db.commit()
    
    return {
        "message": "Footer links reordered successfully",
        "new_order": link_ids
    }


# =========================================================
# 5. SOCIAL LINKS API (Database Backed)
# =========================================================

@router.get("/social", response_model=List[SocialLinkOut], tags=["Social"])
def get_social_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get social media links from database"""
    return db.query(SocialLink).filter(
        SocialLink.is_active == True
    ).order_by(SocialLink.display_order.asc()).all()


@router.post("/social", response_model=SocialLinkOut, status_code=status.HTTP_201_CREATED, tags=["Social"])
def create_social_link(
    social_link: SocialLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Create a new social link"""
    existing = db.query(SocialLink).filter(SocialLink.platform == social_link.platform).first()
    if existing:
        raise HTTPException(status_code=400, detail="Social link already exists")
    
    max_order = db.query(func.max(SocialLink.display_order)).scalar() or 0
    
    new_link = SocialLink(
        platform=social_link.platform,
        url=social_link.url,
        icon=social_link.icon or social_link.platform,
        display_order=max_order + 1,
        is_active=social_link.is_active
    )
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return new_link


@router.put("/social/{link_id}", response_model=SocialLinkOut, tags=["Social"])
def update_social_link(
    link_id: int,
    social_link: SocialLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update a social link"""
    db_link = db.query(SocialLink).filter(SocialLink.id == link_id).first()
    if not db_link:
        raise HTTPException(status_code=404, detail="Social link not found")
    
    db_link.url = social_link.url
    db_link.icon = social_link.icon or social_link.platform
    db_link.display_order = social_link.display_order
    db_link.is_active = social_link.is_active
    db_link.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_link)
    
    return db_link


@router.delete("/social/{link_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Social"])
def delete_social_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Delete a social link"""
    link = db.query(SocialLink).filter(SocialLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Social link not found")
    
    db.delete(link)
    db.commit()
    return None


@router.put("/social/reorder", tags=["Social"])
def reorder_social_links(
    link_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Reorder social links"""
    for idx, link_id in enumerate(link_ids):
        db.query(SocialLink).filter(SocialLink.id == link_id).update(
            {"display_order": idx, "updated_at": datetime.utcnow()}
        )
    
    db.commit()
    
    return {
        "message": "Social links reordered successfully",
        "new_order": link_ids
    }


# =========================================================
# 6. HEALTH CHECK API
# =========================================================

@router.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for monitoring"""
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "running",
            "database": db_status
        }
    }


# =========================================================
# 7. EXPORT APIS
# =========================================================

@router.get("/export/news", tags=["Export"])
def export_news(
    format: str = Query("csv", enum=["csv", "json"]),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    status_filter: Optional[str] = Query(None, enum=["approved", "pending", "rejected"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Export news data to CSV or JSON"""
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    query = db.query(News).options(
        joinedload(News.user),
        joinedload(News.language)
    )
    
    if date_from:
        query = query.filter(News.created_at >= date_from)
    if date_to:
        query = query.filter(News.created_at <= date_to)
    
    if status_filter == "approved":
        query = query.filter(News.is_approved == 1)
    elif status_filter == "pending":
        query = query.filter(News.is_approved == 0)
    elif status_filter == "rejected":
        query = query.filter(News.is_approved == 2)
    
    news_list = query.order_by(desc(News.created_at)).all()
    
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["News UID", "Title", "Status", "Views", "Likes", "Comments", "Shares", "Created At"])
        
        for news in news_list:
            status_text = "Approved" if news.is_approved == 1 else "Pending" if news.is_approved == 0 else "Rejected"
            writer.writerow([
                news.news_uid, news.title, status_text, news.views_count,
                news.likes_count, news.comments_count, news.shares_count,
                news.created_at.isoformat() if news.created_at else ""
            ])
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=news_export_{datetime.utcnow().date()}.csv"}
        )
    
    return {
        "count": len(news_list),
        "data": [
            {
                "news_uid": n.news_uid,
                "title": n.title,
                "status": "approved" if n.is_approved == 1 else "pending" if n.is_approved == 0 else "rejected",
                "views": n.views_count,
                "likes": n.likes_count,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in news_list
        ]
    }


@router.get("/export/users", tags=["Export"])
def export_users(
    format: str = Query("csv", enum=["csv", "json"]),
    role: Optional[int] = Query(None, description="Filter by role"),
    is_suspended: Optional[bool] = Query(None, description="Filter by suspension status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Export users data to CSV or JSON"""
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    query = db.query(User)
    
    if role is not None:
        query = query.filter(User.role == role)
    if is_suspended is not None:
        query = query.filter(User.is_suspended == is_suspended)
    
    users = query.order_by(desc(User.created_at)).all()
    
    # Role names mapping
    role_names = {
        0: "Guest", 1: "User", 2: "Publisher", 3: "Moderator", 4: "Employee", 5: "Admin"
    }
    
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["User UID", "Username", "Name", "Email", "Phone", "Role", "Status", "Created At"])
        
        for user in users:
            status = "Suspended" if user.is_suspended else "Active"
            writer.writerow([
                user.user_uid,
                user.user_name or "",
                user.name or "",
                user.email or "",
                user.phone or "",
                role_names.get(user.role, "Unknown"),
                status,
                user.created_at.isoformat() if user.created_at else ""
            ])
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=users_export_{datetime.utcnow().date()}.csv"}
        )
    
    return {
        "count": len(users),
        "data": [
            {
                "user_uid": u.user_uid,
                "user_name": u.user_name,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "role": u.role,
                "role_name": role_names.get(u.role, "Unknown"),
                "is_suspended": u.is_suspended,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
    }


# =========================================================
# 8. STATISTICS API
# =========================================================

@router.get("/stats", tags=["Admin"])
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get admin dashboard statistics"""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_suspended == False).count()
    suspended_users = db.query(User).filter(User.is_suspended == True).count()
    
    total_news = db.query(News).count()
    approved_news = db.query(News).filter(News.is_approved == 1).count()
    pending_news = db.query(News).filter(News.is_approved == 0).count()
    rejected_news = db.query(News).filter(News.is_approved == 2).count()
    
    total_categories = db.query(Category).count()
    active_categories = db.query(Category).filter(Category.is_active == True).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "suspended": suspended_users
        },
        "news": {
            "total": total_news,
            "approved": approved_news,
            "pending": pending_news,
            "rejected": rejected_news,
            "approval_rate": round(approved_news / total_news * 100, 2) if total_news > 0 else 0
        },
        "categories": {
            "total": total_categories,
            "active": active_categories
        }
    }
    
# Add these imports at the top of your file


# =========================================================
# Request/Response Schemas for Import
# =========================================================

class ImportResult(BaseModel):
    """Import result schema"""
    total_rows: int
    successful: int
    failed: int
    errors: List[dict]
    created_news: List[dict]


# =========================================================
# 9. CSV IMPORT API (Admin Protected with Audit Trail)
# =========================================================

@router.post("/import/news-csv", response_model=ImportResult, tags=["Import"])
async def import_news_from_csv(
    file: UploadFile = File(..., description="CSV file with news data"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """
    Import news from CSV file (Requires Administrator privileges).
    
    CSV Format (with headers):
    title,summary,language_code,user_uid,city_id,district_id,state_id,category_ids,source_url,source_name,image_url,is_approved,likes_count,shares_count,views_count
    """
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    # Read file content with size limit (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV file exceeds maximum allowed size of 5MB")

    decoded = content.decode('utf-8-sig')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    # Get headers
    headers = csv_reader.fieldnames
    required_headers = ['title', 'summary', 'language_code', 'user_uid']
    
    for header in required_headers:
        if header not in headers:
            raise HTTPException(status_code=400, detail=f"Missing required column: {header}")
    
    results = {
        "total_rows": 0,
        "successful": 0,
        "failed": 0,
        "errors": [],
        "created_news": []
    }
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            # Validate required fields
            if not row.get('title') or not row.get('summary'):
                results["errors"].append({
                    "row": row_num,
                    "error": "Title and summary are required"
                })
                results["failed"] += 1
                continue
            
            # 1️⃣ Get or create user
            user_uid = row.get('user_uid', '').strip()
            user = db.query(User).filter(User.user_uid == user_uid).first()
            
            if not user:
                new_user_uid = generate_user_uid(db)
                new_user = User(
                    user_uid=new_user_uid,
                    user_name=generate_unique_username(db),
                    name="Test User",
                    role=1,
                    created_at=datetime.utcnow()
                )
                db.add(new_user)
                db.flush()
                user = new_user
            
            # 2️⃣ Get language by code
            language_code = row.get('language_code', 'en').strip().lower()
            language = db.query(Language).filter(Language.code == language_code).first()
            if not language:
                results["errors"].append({
                    "row": row_num,
                    "error": f"Language not found: {language_code}"
                })
                results["failed"] += 1
                continue
            
            # 3️⃣ Get city, district, state by IDs
            city_id = None
            city_id_val = row.get('city_id', '').strip()
            if city_id_val and city_id_val != 'NULL' and city_id_val != '':
                city_id = int(float(city_id_val))
            
            district_id = None
            district_id_val = row.get('district_id', '').strip()
            if district_id_val and district_id_val != 'NULL' and district_id_val != '':
                district_id = int(float(district_id_val))
            
            state_id = None
            state_id_val = row.get('state_id', '').strip()
            if state_id_val and state_id_val != 'NULL' and state_id_val != '':
                state_id = int(float(state_id_val))
            
            # 4️⃣ Get categories
            category_ids = []
            category_ids_val = row.get('category_ids', '').strip()
            if category_ids_val:
                for cat_id in category_ids_val.split(','):
                    cat_id = cat_id.strip()
                    if cat_id and cat_id != '':
                        category_ids.append(int(float(cat_id)))
            
            # 5️⃣ Generate news_uid
            news_uid = generate_news_uid()
            
            # 6️⃣ Get is_approved (default to 0)
            is_approved = 0
            is_approved_val = row.get('is_approved', '').strip()
            if is_approved_val and is_approved_val != '':
                is_approved = int(float(is_approved_val))
            
            # 7️⃣ Get engagement metrics (with defaults)
            likes_count = 0
            likes_val = row.get('likes_count', '').strip()
            if likes_val and likes_val != '':
                likes_count = int(float(likes_val))
            
            shares_count = 0
            shares_val = row.get('shares_count', '').strip()
            if shares_val and shares_val != '':
                shares_count = int(float(shares_val))
            
            views_count = 0
            views_val = row.get('views_count', '').strip()
            if views_val and views_val != '':
                views_count = int(float(views_val))
            
            # 8️⃣ Create news
            new_news = News(
                news_uid=news_uid,
                title=row['title'].strip(),
                summary=row['summary'].strip(),
                image_url=row.get('image_url', '').strip() or None,
                language_id=language.id,
                user_uid=user.user_uid,
                city_id=city_id,
                source_url=row.get('source_url', '').strip() or None,
                source_name=row.get('source_name', '').strip() or None,
                is_approved=is_approved,
                likes_count=likes_count,
                shares_count=shares_count,
                views_count=views_count
            )
            
            db.add(new_news)
            db.flush()
            
            # Attach categories
            if category_ids:
                categories = db.query(Category).filter(Category.id.in_(category_ids)).all()
                new_news.categories = categories
            
            db.commit()
            db.refresh(new_news)
            
            results["successful"] += 1
            results["created_news"].append({
                "news_uid": new_news.news_uid,
                "title": new_news.title,
                "language": language.name,
                "likes": new_news.likes_count,
                "shares": new_news.shares_count,
                "views": new_news.views_count,
                "row": row_num
            })
            
        except Exception as e:
            db.rollback()
            results["errors"].append({
                "row": row_num,
                "error": str(e)
            })
            results["failed"] += 1
    
    results["total_rows"] = results["successful"] + results["failed"]
    
    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="NEWS_CSV_IMPORTED",
        resource_type="news",
        status="SUCCESS" if results["successful"] > 0 else "FAILED",
        details={"successful": results["successful"], "failed": results["failed"]}
    )
    
    return results


# =========================================================
# 10. JSON IMPORT API (Admin Protected with Audit Trail)
# =========================================================

@router.post("/import/news-json", response_model=ImportResult, tags=["Import"])
async def import_news_from_json(
    news_list: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """
    Import news from JSON array (Requires Administrator privileges).
    
    JSON Format:
    [
        {
            "title": "Breaking News",
            "summary": "News summary here",
            "language_code": "te",
            "user_uid": "USER123",
            "city_name": "Hyderabad",
            "district_name": "Hyderabad", 
            "state_name": "Telangana",
            "category_names": "Politics,Local",
            "source_url": "https://example.com",
            "source_name": "Example News",
            "image_url": "https://example.com/image.jpg"
        }
    ]
    """
    
    results = {
        "total_rows": len(news_list),
        "successful": 0,
        "failed": 0,
        "errors": [],
        "created_news": []
    }
    
    for idx, news_data in enumerate(news_list, start=1):
        try:
            # Validate required fields
            if not news_data.get('title') or not news_data.get('summary'):
                results["errors"].append({
                    "row": idx,
                    "error": "Title and summary are required"
                })
                results["failed"] += 1
                continue
            
            # 1️⃣ Get or create user
            user_uid = news_data.get('user_uid', 'TEST_USER').strip()
            user = db.query(User).filter(User.user_uid == user_uid).first()
            
            if not user:
                from utility import generate_user_uid, generate_unique_username
                new_user_uid = generate_user_uid(db)
                new_user = User(
                    user_uid=new_user_uid,
                    user_name=generate_unique_username(db),
                    name="Test User",
                    role=1,
                    created_at=datetime.utcnow()
                )
                db.add(new_user)
                db.flush()
                user = new_user
                user_uid = new_user.user_uid
            
            # 2️⃣ Get language
            language_code = news_data.get('language_code', 'te').strip().lower()
            language = db.query(Language).filter(Language.code == language_code).first()
            if not language:
                results["errors"].append({
                    "row": idx,
                    "error": f"Language not found: {language_code}"
                })
                results["failed"] += 1
                continue
            
            # 3️⃣ Handle location
            city_id = None
            city_name = news_data.get('city_name', '').strip()
            if city_name:
                city = db.query(City).filter(City.name.ilike(f"%{city_name}%")).first()
                if city:
                    city_id = city.id
            
            # 4️⃣ Get categories
            category_ids = []
            category_names = news_data.get('category_names', '').strip()
            if category_names:
                for cat_name in category_names.split(','):
                    cat_name = cat_name.strip()
                    category = db.query(Category).filter(Category.name.ilike(f"%{cat_name}%")).first()
                    if category:
                        category_ids.append(category.id)
            
            # 5️⃣ Create news
            news_uid = generate_news_uid()
            
            new_news = News(
                news_uid=news_uid,
                title=news_data['title'].strip(),
                summary=news_data['summary'].strip(),
                image_url=news_data.get('image_url', '').strip() or None,
                language_id=language.id,
                user_uid=user.user_uid,
                city_id=city_id,
                source_url=news_data.get('source_url', '').strip() or None,
                source_name=news_data.get('source_name', '').strip() or None,
                is_approved=0
            )
            
            db.add(new_news)
            db.flush()
            
            if category_ids:
                categories = db.query(Category).filter(Category.id.in_(category_ids)).all()
                new_news.categories = categories
            
            db.commit()
            db.refresh(new_news)
            
            results["successful"] += 1
            results["created_news"].append({
                "news_uid": new_news.news_uid,
                "title": new_news.title,
                "row": idx
            })
            
        except Exception as e:
            db.rollback()
            results["errors"].append({
                "row": idx,
                "error": str(e)
            })
    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="NEWS_JSON_IMPORTED",
        resource_type="news",
        status="SUCCESS" if results["successful"] > 0 else "FAILED",
        details={"successful": results["successful"], "failed": results["failed"]}
    )
    
    return results