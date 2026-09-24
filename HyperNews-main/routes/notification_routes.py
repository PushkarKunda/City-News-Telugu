# routes/notification_routes.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from auth.dependencies import get_current_user, admin_required
from database import get_db
from models.user import User, DeviceToken
from models.engagement import Notification
from services.fcm_service import fcm_service
from services.notification_service import notification_service
from schemas import (
    PushNotificationRequest,
    BulkNotificationRequest,
    NotificationListOut,
    NotificationOut
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/send/push", tags=["Admin"])
def send_push_notification(
    request: PushNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Send push notification to users (Admin only)
    
    target_type can be:
    - "all": All active users
    - "user": Specific user by user_uid
    - "topic": Send to a topic
    - "category": Users subscribed to a category
    """
    
    if request.target_type == "all":
        # Get all active device tokens
        tokens = db.query(DeviceToken).filter(
            DeviceToken.is_active == True
        ).all()
        fcm_tokens = [t.fcm_token for t in tokens]
        
        if not fcm_tokens:
            return {"message": "No devices found", "sent": 0}
        
        background_tasks.add_task(
            fcm_service.send_to_multiple,
            fcm_tokens,
            request.title,
            request.body,
            request.data
        )
        
        return {
            "message": f"Sending push to {len(fcm_tokens)} devices",
            "target_count": len(fcm_tokens)
        }
    
    elif request.target_type == "user":
        if not request.user_uid:
            raise HTTPException(400, "user_uid is required when target_type is 'user'")

        tokens = db.query(DeviceToken).filter(
            DeviceToken.user_uid == request.user_uid,
            DeviceToken.is_active == True
        ).all()
        fcm_tokens = [t.fcm_token for t in tokens]
        
        if not fcm_tokens:
            return {"message": "No devices found for user", "sent": 0}
        
        background_tasks.add_task(
            fcm_service.send_to_multiple,
            fcm_tokens,
            request.title,
            request.body,
            request.data
        )
        
        return {"message": "Push sent", "target_count": len(fcm_tokens)}
    
    elif request.target_type == "topic":
        if not request.topic:
            raise HTTPException(400, "topic is required when target_type is 'topic'")

        background_tasks.add_task(
            fcm_service.send_to_topic,
            request.topic,
            request.title,
            request.body,
            request.data
        )
        return {"message": f"Push sent to topic: {request.topic}"}

    elif request.target_type == "category":
        if request.category_id is None:
            raise HTTPException(400, "category_id is required when target_type is 'category'")

        topic = f"category_{request.category_id}"
        background_tasks.add_task(
            fcm_service.send_to_topic,
            topic,
            request.title,
            request.body,
            request.data
        )
        return {"message": f"Push sent to topic: {topic}"}
    
    else:
        raise HTTPException(400, f"Invalid target_type: {request.target_type}")


@router.post("/send/both", tags=["Admin"])
def send_both_notifications(
    request: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Send BOTH in-app AND push notifications (Recommended)
    This ensures users get notifications even when app is closed
    """
    
    # Get all active users
    users = db.query(User).filter(User.is_suspended == False).all()
    
    results = {
        "total_users": len(users),
        "in_app_sent": 0,
        "push_sent": 0
    }
    
    for user in users:
        # 1. Save in-app notification
        notification = Notification(
            user_uid=user.user_uid,
            title=request.title,
            message=request.body,
            link_url=request.link_url,
            notification_type="admin",
            created_at=datetime.now(timezone.utc)
        )
        db.add(notification)
        results["in_app_sent"] += 1
        
        # 2. Send push notification
        background_tasks.add_task(
            send_push_to_user,
            user.user_uid,
            request.title,
            request.body,
            request.data
        )
    
    db.commit()
    
    return {
        "message": f"Sending notifications to {len(users)} users",
        "in_app_sent": results["in_app_sent"],
        "push_scheduled": len(users)
    }


async def send_push_to_user(user_uid: str, title: str, body: str, data: dict = None):
    """Background task to send push to user's devices"""
    notification_service.send_push(user_uid, title, body, data)


@router.get("/in-app", response_model=NotificationListOut)
def get_in_app_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's in-app notifications (notification history)
    Users see these when they open the app
    """
    notifications = db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid
    ).order_by(
        Notification.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    total = db.query(func.count(Notification.id)).filter(
        Notification.user_uid == current_user.user_uid
    ).scalar() or 0
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total,
        "items": notifications
    }


@router.patch("/in-app/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark in-app notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_uid == current_user.user_uid
    ).first()
    
    if not notification:
        raise HTTPException(404, "Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Notification marked as read"}


@router.get("/in-app/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread in-app notifications"""
    count = db.query(Notification).filter(
        Notification.user_uid == current_user.user_uid,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}
