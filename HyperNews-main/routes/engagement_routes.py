# routes/engagement_routes.py - COMPLETE UPDATED VERSION

from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, and_, text
from datetime import datetime, timedelta, timezone
import json

from auth.dependencies import (
    get_current_user, 
    admin_required, 
    require_roles,
    get_optional_user
)
from database import get_db

from models.content import Event, Poll
from models.engagement import Bookmark, Notification, UserActivityLog, Reaction, Share, CommentLike
from models.news import Category, News, Comment
from models.post import Post, PostComment
from models.user import User

from schemas import (
    AdminNotificationRequest,
    BookmarkContentPreview,
    BookmarkCreate,
    BookmarkOut,
    PaginatedBookmarkOut,
    NotificationOut,
    NotificationReadOut,
    AdminNotificationResponse,
    EngagementSummaryOut,
    UserActivityLogOut,
    UserRole,
)

router = APIRouter()

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def log_user_activity(
    db: Session,
    user_uid: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """Log user activity for analytics"""
    try:
        activity = UserActivityLog(
            user_uid=user_uid,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now(timezone.utc)
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        # Don't fail the main request if logging fails
        db.rollback()
        print(f"Failed to log activity: {e}")


def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# routes/engagement_routes.py - ADD THESE HELPERS

# routes/engagement_routes.py - ADD THESE HELPERS

def get_content_by_uid(db: Session, content_type: str, content_uid: str):
    """Get content by UUID"""
    if content_type == "news":
        return db.query(News).filter(News.news_uid == content_uid).first()
    elif content_type == "post":
        return db.query(Post).filter(Post.post_uid == content_uid).first()
    elif content_type == "event":
        return db.query(Event).filter(Event.event_uid == content_uid).first()
    elif content_type == "poll":
        return db.query(Poll).filter(Poll.poll_uid == content_uid).first()
    return None


def get_content_uid_by_id(db: Session, content_type: str, content_id: int) -> Optional[str]:
    """Get UUID from numeric content ID"""
    if content_type == "news":
        content = db.query(News).filter(News.id == content_id).first()
        return content.news_uid if content else None
    elif content_type == "post":
        content = db.query(Post).filter(Post.id == content_id).first()
        return content.post_uid if content else None
    return None


def get_content_preview_by_id(db: Session, content_type: str, content_id: int) -> Optional[dict]:
    """Get content preview by numeric ID"""
    content = get_content_by_id(db, content_type, content_id)
    if not content:
        return None
    
    preview = {
        "content_type": content_type,
        "content_id": content_id,
        "created_at": getattr(content, "created_at", None)
    }
    
    if content_type == "news":
        preview.update({
            "title": content.title,
            "summary": content.summary[:200] if content.summary else None,
            "image_url": content.image_url,
            "category_ids": [c.id for c in content.categories] if hasattr(content, 'categories') else []
        })
    elif content_type == "post":
        preview.update({
            "title": content.content[:100] if content.content else "Post",
            "summary": content.content[:200] if content.content else None,
            "image_url": content.image_url
        })
    elif content_type == "event":
        preview.update({
            "title": content.title,
            "summary": content.description[:200] if content.description else None,
            "image_url": content.image_url
        })
    elif content_type == "poll":
        preview.update({
            "title": content.question,
            "summary": content.description[:200] if content.description else None,
            "image_url": None
        })
    
    return preview


def get_content_by_id(db: Session, content_type: str, content_id: int):
    """Get content by numeric ID"""
    if content_type == "news":
        return db.query(News).filter(News.id == content_id).first()
    elif content_type == "post":
        return db.query(Post).filter(Post.id == content_id).first()
    elif content_type == "event":
        return db.query(Event).filter(Event.id == content_id).first()
    elif content_type == "poll":
        return db.query(Poll).filter(Poll.id == content_id).first()
    return None
# =========================================================
# BOOKMARKS (Authenticated)
# =========================================================

# routes/engagement_routes.py - FIXED BOOKMARK ENDPOINTS

# =========================================================
# BOOKMARKS (Authenticated)
# =========================================================

# routes/engagement_routes.py - COMPLETE UPDATED BOOKMARK APIS

# =========================================================
# BOOKMARKS WITH UUID SUPPORT
# =========================================================

@router.get("/bookmarks", tags=["Bookmarks"])
def get_my_bookmarks(
    request: Request,
    content_type: Optional[str] = Query(None, description="Filter by content type: news, event, poll, post"),
    category_id: Optional[int] = Query(None, description="Filter by category ID (for news)"),
    search: Optional[str] = Query(None, description="Search in title/content"),
    sort_by: str = Query("created_at", enum=["created_at", "title"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all bookmarks with UUIDs
    """
    try:
        query = db.query(Bookmark).filter(Bookmark.user_uid == current_user.user_uid)
        
        if content_type:
            query = query.filter(Bookmark.content_type == content_type)
        
        if category_id and content_type in ["news", None]:
            news_ids = db.query(News.id).filter(News.categories.any(id=category_id)).subquery()
            query = query.filter(
                Bookmark.content_type == "news",
                Bookmark.content_id.in_(news_ids)
            )
        
        bookmarks = query.all()
        
        if search:
            search_lower = search.lower()
            filtered = []
            for bookmark in bookmarks:
                content = get_content_by_uid(db, bookmark.content_type, bookmark.content_id)
                if content:
                    title = getattr(content, 'title', '') or getattr(content, 'content', '') or getattr(content, 'question', '')
                    if search_lower in title.lower():
                        filtered.append(bookmark)
            bookmarks = filtered
        
        # Sort
        if sort_by == "title":
            bookmarks_with_titles = []
            for bookmark in bookmarks:
                content = get_content_by_uid(db, bookmark.content_type, bookmark.content_id)
                title = getattr(content, 'title', '') or getattr(content, 'content', '') or getattr(content, 'question', '')
                bookmarks_with_titles.append((bookmark, title))
            bookmarks_with_titles.sort(key=lambda x: x[1], reverse=(sort_order == "desc"))
            bookmarks = [b for b, _ in bookmarks_with_titles]
        else:
            bookmarks.sort(key=lambda x: x.created_at, reverse=(sort_order == "desc"))
        
        total = len(bookmarks)
        paginated_bookmarks = bookmarks[offset:offset + limit]
        
        results = []
        for bookmark in paginated_bookmarks:
            content_uid = get_content_uid_by_id(db, bookmark.content_type, bookmark.content_id)
            content_preview = get_content_preview_by_id(db, bookmark.content_type, bookmark.content_id)
            
            results.append({
                "id": bookmark.id,
                "user_uid": bookmark.user_uid,
                "content_type": bookmark.content_type,
                "content_id": bookmark.content_id,
                "content_uid": content_uid,
                "created_at": bookmark.created_at.isoformat(),
                "content": content_preview
            })
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < total,
            "items": results
        }
        
    except Exception as e:
        print(f"Error in get_my_bookmarks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch bookmarks: {str(e)}")


@router.get("/bookmarks/by-category", tags=["Bookmarks"])
def get_bookmarks_by_category(
    request: Request,
    category_id: int = Query(..., description="Category ID"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bookmarks by category with UUIDs"""
    try:
        news_ids = db.query(News.id).filter(News.categories.any(id=category_id)).subquery()
        
        query = db.query(Bookmark).filter(
            Bookmark.user_uid == current_user.user_uid,
            Bookmark.content_type == "news",
            Bookmark.content_id.in_(news_ids)
        )
        
        total = query.count()
        bookmarks = query.order_by(desc(Bookmark.created_at)).offset(offset).limit(limit).all()
        
        results = []
        for bookmark in bookmarks:
            content_uid = get_content_uid_by_id(db, bookmark.content_type, bookmark.content_id)
            content_preview = get_content_preview_by_id(db, bookmark.content_type, bookmark.content_id)
            
            results.append({
                "id": bookmark.id,
                "user_uid": bookmark.user_uid,
                "content_type": bookmark.content_type,
                "content_id": bookmark.content_id,
                "content_uid": content_uid,
                "created_at": bookmark.created_at.isoformat(),
                "content": content_preview
            })
        
        category = db.query(category).filter(Category.id == category_id).first()
        
        return {
            "category_id": category_id,
            "category_name": category.name if category else None,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < total,
            "items": results
        }
        
    except Exception as e:
        print(f"Error in get_bookmarks_by_category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch bookmarks: {str(e)}")


@router.post("/bookmarks", status_code=201, tags=["Bookmarks"])
def add_bookmark(
    request: Request,
    bookmark: BookmarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a bookmark using UUID
    Request: {"content_type": "news", "content_uid": "NW78901234"}
    """
    try:
        valid_types = ["news", "event", "poll", "post"]
        if bookmark.content_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid content type. Must be one of: {valid_types}")
        
        # Get content by UUID
        content = get_content_by_uid(db, bookmark.content_type, bookmark.content_uid)
        if not content:
            raise HTTPException(status_code=404, detail=f"Content not found. Content type: {bookmark.content_type}, UID: {bookmark.content_uid}")
        
        content_id = content.id
        
        # Check if already bookmarked
        existing = db.query(Bookmark).filter(
            Bookmark.user_uid == current_user.user_uid,
            Bookmark.content_type == bookmark.content_type,
            Bookmark.content_id == content_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Already bookmarked")
        
        # Create bookmark
        db_bookmark = Bookmark(
            user_uid=current_user.user_uid,
            content_type=bookmark.content_type,
            content_id=content_id,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(db_bookmark)
        db.commit()
        db.refresh(db_bookmark)
        
        log_user_activity(
            db=db,
            user_uid=current_user.user_uid,
            action="bookmark",
            entity_type=bookmark.content_type,
            entity_id=bookmark.content_uid,
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("User-Agent")
        )
        
        return {
            "id": db_bookmark.id,
            "user_uid": db_bookmark.user_uid,
            "content_type": db_bookmark.content_type,
            "content_id": db_bookmark.content_id,
            "content_uid": bookmark.content_uid,
            "created_at": db_bookmark.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in add_bookmark: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add bookmark: {str(e)}")


@router.get("/bookmarks/check", tags=["Bookmarks"])
def check_bookmark_status(
    content_type: str = Query(..., description="News, event, poll, or post"),
    content_uid: str = Query(..., description="Content UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if content is bookmarked by current user using UUID"""
    try:
        content = get_content_by_uid(db, content_type, content_uid)
        if not content:
            return {"is_bookmarked": False, "bookmark_id": None, "message": "Content not found"}
        
        bookmark = db.query(Bookmark).filter(
            Bookmark.user_uid == current_user.user_uid,
            Bookmark.content_type == content_type,
            Bookmark.content_id == content.id
        ).first()
        
        return {
            "is_bookmarked": bookmark is not None,
            "bookmark_id": bookmark.id if bookmark else None,
            "content_uid": content_uid
        }
        
    except Exception as e:
        print(f"Error in check_bookmark_status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check bookmark: {str(e)}")


@router.delete("/bookmarks", tags=["Bookmarks"])
def remove_bookmark_by_content(
    request: Request,
    content_type: str = Query(..., description="News, event, poll, or post"),
    content_uid: str = Query(..., description="Content UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a bookmark by content type and UUID"""
    try:
        content = get_content_by_uid(db, content_type, content_uid)
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        bookmark = db.query(Bookmark).filter(
            Bookmark.user_uid == current_user.user_uid,
            Bookmark.content_type == content_type,
            Bookmark.content_id == content.id
        ).first()
        
        if not bookmark:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        
        db.delete(bookmark)
        db.commit()
        
        log_user_activity(
            db=db,
            user_uid=current_user.user_uid,
            action="unbookmark",
            entity_type=content_type,
            entity_id=content_uid
        )
        
        return {"message": "Bookmark removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in remove_bookmark_by_content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove bookmark: {str(e)}")
# =========================================================
# NOTIFICATIONS (Authenticated)
# =========================================================

@router.get("/notifications", tags=["Notifications"])
def get_my_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    notification_type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for current user"""
    query = db.query(Notification).filter(Notification.user_uid == current_user.user_uid)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid,
        Notification.is_read == False
    ).count()
    
    notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
    
    # Format response with actor info
    items = []
    for notif in notifications:
        actor_info = None
        if notif.actor_uid:
            actor = db.query(User).filter(User.user_uid == notif.actor_uid).first()
            if actor:
                actor_info = {
                    "user_uid": actor.user_uid,
                    "user_name": actor.user_name,
                    "name": actor.name,
                    "profile_picture": actor.profile_picture
                }
        
        items.append({
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "link_url": notif.link_url,
            "notification_type": notif.notification_type,
            "is_read": notif.is_read,
            "action_required": notif.action_required,
            "action_data": json.loads(notif.action_data) if notif.action_data else None,
            "actor": actor_info,
            "created_at": notif.created_at.isoformat(),
            "read_at": notif.read_at.isoformat() if notif.read_at else None
        })
    
    return {
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total,
        "items": items
    }


@router.get("/notifications/unread/count", tags=["Notifications"])
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications for current user"""
    count = db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}


@router.patch("/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a single notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_uid == current_user.user_uid
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    
    return {"success": True, "message": "Notification marked as read"}


@router.patch("/notifications/read-all", tags=["Notifications"])
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark every unread notification for current user as read"""
    notifications = db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid,
        Notification.is_read == False
    ).all()
    
    count = len(notifications)
    for n in notifications:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"success": True, "count": count, "message": f"{count} notifications marked as read"}


@router.delete("/notifications/clear", status_code=status.HTTP_204_NO_CONTENT, tags=["Notifications"])
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all notifications for current user"""
    db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid
    ).delete()
    
    db.commit()
    
    return None


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Notifications"])
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_uid == current_user.user_uid
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return None


# =========================================================
# REACTIONS
# =========================================================

@router.post("/reactions", tags=["Reactions"])
def add_reaction(
    request: Request,
    content_type: str = Query(..., description="news, post, comment"),
    content_id: int = Query(..., description="Content ID"),
    reaction_type: str = Query(..., description="like, love, laugh, shock, sad, angry"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add or remove a reaction"""
    
    valid_reactions = ["like", "love", "laugh", "shock", "sad", "angry"]
    if reaction_type not in valid_reactions:
        raise HTTPException(400, f"Invalid reaction. Use: {valid_reactions}")
    
    # Check if content exists
    content = None
    if content_type == "news":
        content = db.query(News).filter(News.id == content_id).first()
    elif content_type == "post":
        content = db.query(Post).filter(Post.id == content_id).first()
    elif content_type == "comment":
        content = db.query(Comment).filter(Comment.id == content_id).first()
    else:
        raise HTTPException(400, "Invalid content type")
    
    if not content:
        raise HTTPException(404, "Content not found")
    
    # Check existing reaction
    existing = db.query(Reaction).filter(
        Reaction.user_uid == current_user.user_uid,
        Reaction.content_type == content_type,
        Reaction.content_id == content_id
    ).first()
    
    if existing:
        if existing.reaction_type == reaction_type:
            # Remove reaction (toggle off)
            db.delete(existing)
            db.commit()
            return {"action": "removed", "reaction_type": None}
        else:
            # Update reaction
            existing.reaction_type = reaction_type
            db.commit()
            return {"action": "updated", "reaction_type": reaction_type}
    else:
        # Add new reaction
        reaction = Reaction(
            user_uid=current_user.user_uid,
            content_type=content_type,
            content_id=content_id,
            reaction_type=reaction_type
        )
        db.add(reaction)
        db.commit()
        
        log_user_activity(
            db=db,
            user_uid=current_user.user_uid,
            action="react",
            entity_type=content_type,
            entity_id=str(content_id)
        )
        
        return {"action": "added", "reaction_type": reaction_type}


@router.get("/reactions/count", tags=["Reactions"])
def get_reaction_counts(
    content_type: str = Query(..., description="news, post"),
    content_id: int = Query(..., description="Content ID"),
    db: Session = Depends(get_db)
):
    """Get reaction counts for content"""
    
    counts = db.query(
        Reaction.reaction_type,
        func.count(Reaction.id).label('count')
    ).filter(
        Reaction.content_type == content_type,
        Reaction.content_id == content_id
    ).group_by(Reaction.reaction_type).all()
    
    # Get user's reaction (if authenticated) - handled separately
    
    return {
        "content_type": content_type,
        "content_id": content_id,
        "reactions": [
            {"type": c.reaction_type, "count": c.count}
            for c in counts
        ],
        "total": sum(c.count for c in counts)
    }


# =========================================================
# ADMIN NOTIFICATIONS (Admin Only)
# =========================================================

@router.post("/admin/notifications/send", tags=["Admin Notifications"])
def send_admin_notification(
    data: AdminNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Send custom notification to users (Admin only)
    
    - target_type: all, role, state, district, city, user
    - target_value: ID or UID based on target_type
    """
    
    query = db.query(User)
    
    # Apply filters based on target type
    if data.target_type == "all":
        users = query.filter(User.is_suspended == False).all()
    
    elif data.target_type == "role":
        if not data.target_value:
            raise HTTPException(status_code=400, detail="target_value is required for role target_type")
        try:
            role_value = getattr(UserRole, data.target_value.upper())
            users = query.filter(User.role == role_value, User.is_suspended == False).all()
        except AttributeError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {data.target_value}")
    
    elif data.target_type == "state":
        users = query.filter(User.state_id == data.target_value, User.is_suspended == False).all()
    
    elif data.target_type == "district":
        users = query.filter(User.district_id == data.target_value, User.is_suspended == False).all()
    
    elif data.target_type == "city":
        users = query.filter(User.city_id == data.target_value, User.is_suspended == False).all()
    
    elif data.target_type == "user":
        users = query.filter(User.user_uid == data.target_value, User.is_suspended == False).all()
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Invalid target_type. Options: all, role, state, district, city, user"
        )
    
    if not users:
        return {"status": "No users found for target", "sent_to": 0}
    
    # Create notifications
    for user in users:
        notification = Notification(
            user_uid=user.user_uid,
            actor_uid=current_user.user_uid,
            title=data.title,
            message=data.message,
            link_url=data.link_url,
            notification_type="admin",
            created_at=datetime.now(timezone.utc)
        )
        db.add(notification)
    
    # Log admin action
    log_user_activity(
        db=db,
        user_uid=current_user.user_uid,
        action="send_notification",
        entity_type="admin",
        details={
            "target_type": data.target_type,
            "target_value": data.target_value,
            "recipient_count": len(users)
        }
    )
    
    db.commit()
    
    return {
        "status": "success",
        "sent_to": len(users),
        "target_type": data.target_type,
        "target_value": data.target_value
    }


@router.get("/admin/notifications/stats", tags=["Admin Notifications"])
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get notification statistics (Admin only)"""
    
    total_notifications = db.query(func.count(Notification.id)).scalar() or 0
    read_notifications = db.query(func.count(Notification.id)).filter(Notification.is_read == True).scalar() or 0
    unread_notifications = db.query(func.count(Notification.id)).filter(Notification.is_read == False).scalar() or 0
    
    # Notifications last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_notifications = db.query(func.count(Notification.id)).filter(
        Notification.created_at >= week_ago
    ).scalar() or 0
    
    # Top users with most notifications
    top_users = db.query(
        Notification.user_uid,
        func.count(Notification.id).label('count')
    ).group_by(Notification.user_uid).order_by(desc('count')).limit(10).all()
    
    return {
        "total_notifications": total_notifications,
        "read_notifications": read_notifications,
        "unread_notifications": unread_notifications,
        "read_rate": round(read_notifications / total_notifications * 100, 2) if total_notifications > 0 else 0,
        "recent_7_days": recent_notifications,
        "top_users": [
            {"user_uid": u.user_uid, "notification_count": u.count}
            for u in top_users
        ]
    }


# =========================================================
# USER ACTIVITY LOGS (Admin Only)
# =========================================================

@router.get("/admin/activities", tags=["Admin Activities"])
def get_user_activities(
    user_uid: Optional[str] = Query(None, description="Filter by user"),
    action: Optional[str] = Query(None, description="Filter by action"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get user activity logs (Admin only)"""
    
    query = db.query(UserActivityLog)
    
    if user_uid:
        query = query.filter(UserActivityLog.user_uid == user_uid)
    if action:
        query = query.filter(UserActivityLog.action == action)
    if entity_type:
        query = query.filter(UserActivityLog.entity_type == entity_type)
    if start_date:
        query = query.filter(UserActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(UserActivityLog.created_at <= end_date)
    
    total = query.count()
    activities = query.order_by(desc(UserActivityLog.created_at)).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total,
        "items": activities
    }


# =========================================================
# ENGAGEMENT SUMMARY
# =========================================================

@router.get("/summary/{user_uid}", tags=["Engagement"])
def get_engagement_summary(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get engagement summary for a user"""
    
    # Only allow users to see their own summary (or admin)
    if current_user.user_uid != user_uid and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Bookmarks count
    bookmarks_count = db.query(Bookmark).filter(Bookmark.user_uid == user_uid).count()
    
    # Notifications count
    total_notifications = db.query(func.count(Notification.id)).filter(Notification.user_uid == user_uid).scalar() or 0
    unread_notifications = db.query(func.count(Notification.id)).filter(
        Notification.user_uid == user_uid,
        Notification.is_read == False
    ).scalar() or 0
    
    # Reactions count
    reactions_count = db.query(Reaction).filter(Reaction.user_uid == user_uid).count()
    
    # Shares count
    shares_count = db.query(Share).filter(Share.user_uid == user_uid).count()
    
    # Recent activity
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_bookmarks = db.query(Bookmark).filter(
        Bookmark.user_uid == user_uid,
        Bookmark.created_at >= week_ago
    ).count()
    
    recent_notifications = db.query(func.count(Notification.id)).filter(
        Notification.user_uid == user_uid,
        Notification.created_at >= week_ago
    ).scalar() or 0
    
    return {
        "user_uid": user_uid,
        "bookmarks": {
            "total": bookmarks_count,
            "last_7_days": recent_bookmarks
        },
        "notifications": {
            "total": total_notifications,
            "unread": unread_notifications,
            "last_7_days": recent_notifications
        },
        "reactions_count": reactions_count,
        "shares_count": shares_count
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health", tags=["Health"])
def engagement_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for engagement service"""
    try:
        db.execute(text("SELECT 1"))
        bookmark_count = db.query(Bookmark).count()
        notification_count = db.query(Notification).count()
        reaction_count = db.query(Reaction).count()
        
        return {
            "status": "healthy",
            "service": "engagement_router",
            "services": {
                "api": "running",
                "database": "connected"
            },
            "bookmarks_count": bookmark_count,
            "notifications_count": notification_count,
            "reactions_count": reaction_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )
