# routes/category_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, asc, text
from typing import List, Optional
from datetime import datetime, timezone
import logging

from database import get_db
from models.news import Category, News
from models.user import User
from auth.dependencies import admin_required, require_roles, get_optional_user, get_current_user
from schemas import CategoryCreate, CategoryUpdate, CategoryOut, CategoryAdminOut, CategoryReorder, UserRole

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["Categories"])

# =========================================================
# CONSTANTS
# =========================================================
MAX_CATEGORY_NAME_LENGTH = 50
MAX_CATEGORY_DESCRIPTION_LENGTH = 500
MAX_CATEGORY_COLOR_LENGTH = 7  # Hex color like #FF5722


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def validate_category_name(name: str) -> str:
    """Validate and sanitize category name"""
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Category name is required")
    
    name = name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Category name must be at least 2 characters")
    if len(name) > MAX_CATEGORY_NAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"Category name cannot exceed {MAX_CATEGORY_NAME_LENGTH} characters")
    
    return name


def validate_color(color: Optional[str]) -> Optional[str]:
    """Validate hex color code"""
    if color is None:
        return None
    
    import re
    if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', color):
        raise HTTPException(status_code=400, detail="Invalid color format. Use hex color like #FF5722")
    
    return color.upper()


def get_category_news_count(db: Session, category_id: int) -> int:
    """Get news count for a category"""
    return db.query(func.count(News.id)).filter(
        News.categories.any(id=category_id),
        News.is_approved == 1
    ).scalar() or 0


# =========================================================
# PUBLIC APIs (For Mobile App)
# =========================================================

@router.get("/menu", response_model=List[CategoryOut])
def get_category_menu(
    db: Session = Depends(get_db),
):
    """
    Get categories for mobile menu.
    Returns active categories ordered by display_order.
    Frontend uses this to show category tabs.
    """
    try:
        categories = db.query(Category).filter(
            Category.is_active == True
        ).order_by(asc(Category.display_order)).all()
        
        result = []
        for cat in categories:
            news_count = get_category_news_count(db, cat.id)
            
            result.append({
                "id": cat.id,
                "name": cat.name,
                "image_url": cat.image_url,
                "color": cat.color,
                "display_order": cat.display_order,
                "is_active": cat.is_active,
                "news_count": news_count
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching category menu: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


@router.get("/all", response_model=List[CategoryOut])
def get_all_categories(
    db: Session = Depends(get_db),
):
    """
    Get all active categories for categories page.
    Shows full list with news counts.
    """
    try:
        categories = db.query(Category).filter(
            Category.is_active == True
        ).order_by(asc(Category.display_order)).all()
        
        result = []
        for cat in categories:
            news_count = get_category_news_count(db, cat.id)
            
            result.append({
                "id": cat.id,
                "name": cat.name,
                "image_url": cat.image_url,
                "color": cat.color,
                "display_order": cat.display_order,
                "is_active": cat.is_active,
                "news_count": news_count
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching all categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


@router.get("/{category_id}/news", response_model=dict)
def get_category_news(
    category_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Get news articles for a specific category.
    """
    try:
        # Check if category exists
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Get news in this category with eager loading
        offset = (page - 1) * limit
        news_list = db.query(News).options(
            joinedload(News.categories),
            joinedload(News.language)
        ).filter(
            News.categories.any(id=category_id),
            News.is_approved == 1
        ).order_by(desc(News.created_at)).offset(offset).limit(limit).all()
        
        total = db.query(News).filter(
            News.categories.any(id=category_id),
            News.is_approved == 1
        ).count()
        
        total_pages = (total + limit - 1) // limit
        
        return {
            "category": {
                "id": category.id,
                "name": category.name,
                "image_url": category.image_url,
                "color": category.color,
                "description": category.description
            },
            "news": [
                {
                    "news_uid": n.news_uid,
                    "title": n.title,
                    "summary": n.summary[:200] if n.summary else None,
                    "image_url": n.image_url,
                    "created_at": n.created_at,
                    "views": n.views_count,
                    "likes": n.likes_count,
                    "comments": n.comments_count,
                    "is_breaking": n.is_breaking
                }
                for n in news_list
            ],
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category news: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.get("/", response_model=List[CategoryOut])
def get_categories_list(
    include_inactive: bool = Query(False, description="Include inactive categories (admin only)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get all categories with optional inactive (admin only for inactive)
    """
    try:
        query = db.query(Category)
        
        # Only show inactive if user is admin and requested
        if include_inactive:
            if not current_user or current_user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Admin access required to see inactive categories")
        else:
            query = query.filter(Category.is_active == True)
        
        categories = query.order_by(asc(Category.display_order)).all()
        
        result = []
        for cat in categories:
            news_count = get_category_news_count(db, cat.id)
            
            result.append({
                "id": cat.id,
                "name": cat.name,
                "image_url": cat.image_url,
                "color": cat.color,
                "display_order": cat.display_order,
                "is_active": cat.is_active,
                "description": cat.description,
                "news_count": news_count
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


# =========================================================
# ADMIN APIs (Category Management)
# =========================================================

@router.get("/admin/all", response_model=List[CategoryAdminOut])
def get_all_categories_admin(
    include_inactive: bool = Query(True, description="Include inactive categories"),
    search: Optional[str] = Query(None, min_length=2, max_length=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get all categories for admin panel (with timestamps)"""
    try:
        query = db.query(Category)
        
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        if search:
            query = query.filter(Category.name.ilike(f"%{search}%"))
        
        categories = query.order_by(asc(Category.display_order)).all()
        
        result = []
        for cat in categories:
            news_count = db.query(func.count(News.id)).filter(
                News.categories.any(id=cat.id)
            ).scalar() or 0
            
            result.append({
                "id": cat.id,
                "name": cat.name,
                "image_url": cat.image_url,
                "color": cat.color,
                "display_order": cat.display_order,
                "is_active": cat.is_active,
                "description": cat.description,
                "news_count": news_count,
                "created_at": cat.created_at,
                "updated_at": cat.updated_at
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching admin categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


@router.post("/admin/create", response_model=CategoryAdminOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Create a new category (Admin only)"""
    try:
        # Validate name
        category_name = validate_category_name(category.name)
        
        # Check if category name exists
        existing = db.query(Category).filter(Category.name == category_name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
        
        # Validate color if provided
        color = validate_color(category.color) if category.color else None
        
        # Get max display order for new category
        max_order = db.query(func.max(Category.display_order)).scalar() or 0
        
        new_category = Category(
            name=category_name,
            image_url=category.image_url,
            display_order=max_order + 1,
            is_active=category.is_active if category.is_active is not None else True,
            color=color,
            description=category.description[:MAX_CATEGORY_DESCRIPTION_LENGTH] if category.description else None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        
        logger.info(f"Category created: {new_category.name} by {current_user.user_uid}")
        
        return new_category
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create category")


@router.put("/admin/{category_id}", response_model=CategoryAdminOut)
def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Update a category (Admin only)"""
    try:
        db_category = db.query(Category).filter(Category.id == category_id).first()
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Update fields with validation
        if category.name is not None:
            category_name = validate_category_name(category.name)
            # Check if name already exists (excluding current category)
            existing = db.query(Category).filter(
                Category.name == category_name,
                Category.id != category_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Category name already exists")
            db_category.name = category_name
        
        if category.image_url is not None:
            db_category.image_url = category.image_url
        
        if category.display_order is not None:
            if category.display_order < 0:
                raise HTTPException(status_code=400, detail="Display order must be non-negative")
            db_category.display_order = category.display_order
        
        if category.is_active is not None:
            db_category.is_active = category.is_active
        
        if category.color is not None:
            db_category.color = validate_color(category.color)
        
        if category.description is not None:
            if category.description and len(category.description) > MAX_CATEGORY_DESCRIPTION_LENGTH:
                raise HTTPException(status_code=400, detail=f"Description cannot exceed {MAX_CATEGORY_DESCRIPTION_LENGTH} characters")
            db_category.description = category.description
        
        db_category.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(db_category)
        
        logger.info(f"Category updated: {db_category.name} by {current_user.user_uid}")
        
        return db_category
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update category")


@router.delete("/admin/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Delete a category (Admin only)"""
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if category has news
        news_count = db.query(func.count(News.id)).filter(
            News.categories.any(id=category.id)
        ).scalar() or 0
        
        if news_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category with {news_count} news articles. Remove news from category first."
            )
        
        category_name = category.name
        db.delete(category)
        db.commit()
        
        logger.info(f"Category deleted: {category_name} by {current_user.user_uid}")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete category")


@router.put("/admin/reorder", response_model=dict)
def reorder_categories(
    reorder_data: CategoryReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Reorder categories by display order (Admin only)"""
    try:
        # Validate all category IDs exist
        existing_ids = set(c[0] for c in db.query(Category.id).all())
        for cat_id in reorder_data.category_ids:
            if cat_id not in existing_ids:
                raise HTTPException(status_code=400, detail=f"Category ID {cat_id} not found")
        
        # Update display orders
        for idx, category_id in enumerate(reorder_data.category_ids):
            db.query(Category).filter(Category.id == category_id).update({
                "display_order": idx,
                "updated_at": datetime.now(timezone.utc)
            })
        
        db.commit()
        
        logger.info(f"Categories reordered by {current_user.user_uid}")
        
        return {
            "message": "Categories reordered successfully",
            "new_order": reorder_data.category_ids
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reordering categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reorder categories")


@router.post("/admin/{category_id}/toggle-active", response_model=dict)
def toggle_category_active(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Toggle category active status (Admin only)"""
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category.is_active = not category.is_active
        category.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Category '{category.name}' {'activated' if category.is_active else 'deactivated'} by {current_user.user_uid}")
        
        return {
            "message": f"Category '{category.name}' {'activated' if category.is_active else 'deactivated'}",
            "is_active": category.is_active,
            "category_id": category.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling category status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle category status")


@router.get("/admin/stats", response_model=dict)
def get_category_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Get category statistics (Admin only)"""
    try:
        total_categories = db.query(Category).count()
        active_categories = db.query(Category).filter(Category.is_active == True).count()
        inactive_categories = total_categories - active_categories
        
        # Top categories by news count
        top_categories = db.query(
            Category.id,
            Category.name,
            func.count(News.id).label('news_count'),
            func.sum(News.views_count).label('total_views')
        ).join(News.categories).filter(
            News.is_approved == 1
        ).group_by(Category.id).order_by(desc('news_count')).limit(10).all()
        
        # Categories with no news
        empty_categories = db.query(Category).outerjoin(
            News.categories
        ).group_by(Category.id).having(
            func.count(News.id) == 0
        ).count()
        
        # Category with most views
        most_viewed_category = db.query(
            Category.id,
            Category.name,
            func.sum(News.views_count).label('total_views')
        ).join(News.categories).filter(
            News.is_approved == 1
        ).group_by(Category.id).order_by(desc('total_views')).first()
        
        return {
            "summary": {
                "total_categories": total_categories,
                "active_categories": active_categories,
                "inactive_categories": inactive_categories,
                "empty_categories": empty_categories,
                "active_percentage": round(active_categories / total_categories * 100, 2) if total_categories > 0 else 0
            },
            "top_categories": [
                {"id": c.id, "name": c.name, "news_count": c.news_count, "total_views": c.total_views or 0}
                for c in top_categories
            ],
            "most_viewed_category": {
                "id": most_viewed_category.id,
                "name": most_viewed_category.name,
                "total_views": most_viewed_category.total_views
            } if most_viewed_category else None
        }
        
    except Exception as e:
        logger.error(f"Error fetching category stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch category statistics")


@router.post("/admin/bulk-delete", response_model=dict)
def bulk_delete_categories(
    category_ids: List[int] = Query(..., description="List of category IDs to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    """Bulk delete categories (Admin only)"""
    results = {"successful": [], "failed": [], "total": len(category_ids)}
    
    for category_id in category_ids:
        try:
            category = db.query(Category).filter(Category.id == category_id).first()
            if not category:
                results["failed"].append({"id": category_id, "reason": "Not found"})
                continue
            
            # Check if category has news
            news_count = db.query(func.count(News.id)).filter(
                News.categories.any(id=category.id)
            ).scalar() or 0
            
            if news_count > 0:
                results["failed"].append({"id": category_id, "reason": f"Has {news_count} news articles"})
                continue
            
            category_name = category.name
            db.delete(category)
            results["successful"].append({"id": category_id, "name": category_name})
            
        except Exception as e:
            results["failed"].append({"id": category_id, "reason": str(e)})
    
    db.commit()
    
    logger.info(f"Bulk delete categories: {len(results['successful'])} successful, {len(results['failed'])} failed by {current_user.user_uid}")
    
    return {
        "message": "Bulk deletion completed",
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "results": results
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health", tags=["Health"])
def categories_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for categories service"""
    try:
        db.execute(text("SELECT 1"))
        category_count = db.query(Category).count()
        
        return {
            "status": "healthy",
            "service": "categories_router",
            "services": {
                "api": "running",
                "database": "connected"
            },
            "total_categories": category_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )
