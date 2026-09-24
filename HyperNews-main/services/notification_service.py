# services/notification_service.py
import logging
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import json

from services.fcm_service import fcm_service
from models.engagement import Notification
from models.user import DeviceToken, User
from services.avatar_service import get_avatar_for_user

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Combined service for sending both in-app and push notifications
    """
    
    # =========================================================
    # IN-APP NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def send_in_app(
        db: Session, 
        user_uid: str, 
        title: str, 
        message: str, 
        link_url: str = None, 
        notification_type: str = "general",
        actor_uid: str = None,
        action_required: bool = False,
        action_data: dict = None
    ) -> Notification:
        """Send in-app notification (saved to database)"""
        
        # Don't notify self
        if user_uid == actor_uid:
            return None
        
        # Check for duplicate in last hour (prevent spam for follow/like)
        if actor_uid and notification_type in ["follow", "like", "comment"]:
            recent = db.query(Notification).filter(
                Notification.user_uid == user_uid,
                Notification.actor_uid == actor_uid,
                Notification.notification_type == notification_type,
                Notification.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
            ).first()
            
            if recent:
                return None
        
        notification = Notification(
            user_uid=user_uid,
            title=title[:100],
            message=message[:500],
            link_url=link_url,
            notification_type=notification_type,
            actor_uid=actor_uid,
            action_required=action_required,
            action_data=json.dumps(action_data) if action_data else None,
            created_at=datetime.now(timezone.utc)
        )
        db.add(notification)
        db.flush()
        db.refresh(notification)
        
        return notification
    
    # =========================================================
    # PUSH NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def send_push(user_uid: str, title: str, message: str, data: Dict = None) -> bool:
        """Send push notification to user's devices"""
        db = None
        try:
            from database import get_db
            db = next(get_db())
            
            # Get user's active device tokens
            tokens = db.query(DeviceToken).filter(
                DeviceToken.user_uid == user_uid,
                DeviceToken.is_active == True
            ).all()
            
            if not tokens:
                logger.info(f"No active devices for user {user_uid}")
                return False
            
            fcm_tokens = [t.fcm_token for t in tokens]
            result = fcm_service.send_to_multiple(fcm_tokens, title, message, data)
            
            return result["success"] > 0
            
        except Exception as e:
            logger.error(f"Failed to send push: {str(e)}")
            return False
        finally:
            if db:
                db.close()
    
    # =========================================================
    # SEND BOTH (In-App + Push)
    # =========================================================
    
    @staticmethod
    def send_both(
        db: Session, 
        user_uid: str, 
        title: str, 
        message: str,
        link_url: str = None, 
        push_data: Dict = None, 
        notification_type: str = "general",
        actor_uid: str = None,
        action_required: bool = False,
        action_data: dict = None
    ) -> Dict:
        """
        Send BOTH in-app AND push notifications
        This is the recommended method for maximum engagement
        """
        result = {
            "in_app": None,
            "push": False
        }
        
        # 1. Send in-app notification
        result["in_app"] = NotificationService.send_in_app(
            db=db,
            user_uid=user_uid,
            title=title,
            message=message,
            link_url=link_url,
            notification_type=notification_type,
            actor_uid=actor_uid,
            action_required=action_required,
            action_data=action_data
        )
        
        # 2. Send push notification (async preferred)
        if result["in_app"]:
            result["push"] = NotificationService.send_push(
                user_uid=user_uid,
                title=title,
                message=message,
                data=push_data or {"type": notification_type, "link": link_url}
            )
        
        return result
    
    # =========================================================
    # SPECIFIC NOTIFICATION TYPES
    # =========================================================
    
    @staticmethod
    def notify_follow(
        db: Session, 
        user_uid: str, 
        follower_uid: str, 
        follower_name: str,
        send_push: bool = True
    ) -> Dict:
        """Notify user when someone follows them"""
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            actor_uid=follower_uid,
            title="New Follower",
            message=f"{follower_name} started following you",
            link_url=f"/profile/{follower_uid}",
            notification_type="follow",
            push_data={"type": "follow", "follower_uid": follower_uid},
            action_required=False
        )
    
    @staticmethod
    def notify_like(
        db: Session,
        user_uid: str,
        actor_uid: str,
        post_uid: str,
        post_content: str,
        send_push: bool = True
    ) -> Dict:
        """Notify user when someone likes their post"""
        
        # Get actor name
        actor = db.query(User).filter(User.user_uid == actor_uid).first()
        actor_name = actor.user_name if actor else "Someone"
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            actor_uid=actor_uid,
            title="New Like",
            message=f"{actor_name} liked your post: {post_content[:50]}...",
            link_url=f"/posts/{post_uid}",
            notification_type="like",
            push_data={"type": "like", "post_uid": post_uid}
        )
    
    @staticmethod
    def notify_comment(
        db: Session,
        user_uid: str,
        actor_uid: str,
        post_uid: str,
        comment_text: str,
        send_push: bool = True
    ) -> Dict:
        """Notify user when someone comments on their post"""
        
        # Get actor name
        actor = db.query(User).filter(User.user_uid == actor_uid).first()
        actor_name = actor.user_name if actor else "Someone"
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            actor_uid=actor_uid,
            title="New Comment",
            message=f"{actor_name} commented: {comment_text[:50]}...",
            link_url=f"/posts/{post_uid}",
            notification_type="comment",
            push_data={"type": "comment", "post_uid": post_uid}
        )
    
    @staticmethod
    def notify_news_approved(
        db: Session,
        user_uid: str,
        news_title: str,
        news_uid: str,
        send_push: bool = True
    ) -> Dict:
        """Notify publisher when news article is approved"""
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            title="News Article Approved",
            message=f'Your news article "{news_title}" has been approved and is now live.',
            link_url=f"/news/{news_uid}",
            notification_type="news_approved",
            push_data={"type": "news_approved", "news_uid": news_uid}
        )
    
    @staticmethod
    def notify_news_rejected(
        db: Session,
        user_uid: str,
        news_title: str,
        rejection_reason: str,
        send_push: bool = True
    ) -> Dict:
        """Notify publisher when news article is rejected"""
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            title="News Article Rejected",
            message=f'Your news article "{news_title}" was rejected. Reason: {rejection_reason}',
            link_url="/dashboard?tab=news",
            notification_type="news_rejected",
            action_required=True,
            action_data={"news_title": news_title, "rejection_reason": rejection_reason},
            push_data={"type": "news_rejected", "reason": rejection_reason}
        )
    
    @staticmethod
    def notify_reward(
        db: Session,
        user_uid: str,
        points: int,
        coins: int,
        reason: str,
        send_push: bool = True
    ) -> Dict:
        """Notify user when they earn rewards"""
        
        return NotificationService.send_both(
            db=db,
            user_uid=user_uid,
            title="Rewards Earned! 🎉",
            message=f"You earned {points} points and {coins} coins for {reason}",
            link_url="/rewards",
            notification_type="reward",
            push_data={"type": "reward", "points": points, "coins": coins}
        )
    
    # =========================================================
    # GET NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_uid: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False
    ) -> Dict:
        """Get user's in-app notifications"""
        
        query = db.query(Notification).filter(Notification.user_uid == user_uid)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        total = query.count()
        unread_count = db.query(Notification).filter(
            Notification.user_uid == user_uid,
            Notification.is_read == False
        ).count()
        
        notifications = query.order_by(
            desc(Notification.created_at)
        ).offset(offset).limit(limit).all()
        
        result = []
        for notif in notifications:
            # Get actor info
            actor_info = None
            if notif.actor_uid:
                actor = db.query(User).filter(User.user_uid == notif.actor_uid).first()
                if actor:
                    actor_info = {
                        "user_uid": actor.user_uid,
                        "user_name": actor.user_name,
                        "name": actor.name,
                        "profile_picture": get_avatar_for_user(actor.name, actor.user_uid)
                    }
            
            result.append({
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "link_url": notif.link_url,
                "notification_type": notif.notification_type,
                "is_read": notif.is_read,
                "action_required": getattr(notif, 'action_required', False),
                "action_data": json.loads(notif.action_data) if getattr(notif, 'action_data', None) else None,
                "actor": actor_info,
                "created_at": notif.created_at.isoformat(),
                "time_ago": NotificationService._get_time_ago(notif.created_at)
            })
        
        return {
            "total": total,
            "unread_count": unread_count,
            "notifications": result,
            "has_more": offset + limit < total
        }
    
    @staticmethod
    def get_unread_count(db: Session, user_uid: str) -> int:
        """Get unread notification count"""
        
        return db.query(Notification).filter(
            Notification.user_uid == user_uid,
            Notification.is_read == False
        ).count()
    
    # =========================================================
    # MARK NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def mark_as_read(db: Session, user_uid: str, notification_id: int) -> bool:
        """Mark a single notification as read"""
        
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_uid == user_uid
        ).first()
        
        if not notification:
            return False
        
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        
        return True
    
    @staticmethod
    def mark_all_as_read(db: Session, user_uid: str) -> int:
        """Mark all notifications as read"""
        
        result = db.query(Notification).filter(
            Notification.user_uid == user_uid,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.now(timezone.utc)
        })
        
        db.commit()
        
        return result
    
    # =========================================================
    # DELETE NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def delete_notification(db: Session, user_uid: str, notification_id: int) -> bool:
        """Delete a notification"""
        
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_uid == user_uid
        ).first()
        
        if not notification:
            return False
        
        db.delete(notification)
        db.commit()
        
        return True
    
    @staticmethod
    def delete_all_notifications(db: Session, user_uid: str) -> int:
        """Delete all notifications for a user"""
        
        result = db.query(Notification).filter(
            Notification.user_uid == user_uid
        ).delete()
        
        db.commit()
        
        return result
    
    # =========================================================
    # MASS NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def send_to_all_users(
        db: Session, 
        title: str, 
        message: str, 
        link_url: str = None, 
        push_data: Dict = None,
        notification_type: str = "mass_notification",
        role_filter: int = None
    ) -> Dict:
        """Send notification to ALL active users (optionally filter by role)"""
        
        query = db.query(User).filter(User.is_suspended == False)
        
        if role_filter is not None:
            query = query.filter(User.role == role_filter)
        
        users = query.all()
        
        results = {
            "total_users": len(users),
            "in_app_sent": 0,
            "push_sent": 0
        }
        
        for user in users:
            # Send in-app
            NotificationService.send_in_app(
                db=db,
                user_uid=user.user_uid,
                title=title,
                message=message,
                link_url=link_url,
                notification_type=notification_type
            )
            results["in_app_sent"] += 1
            
            # Send push
            if NotificationService.send_push(user.user_uid, title, message, push_data):
                results["push_sent"] += 1
        
        db.commit()
        return results
    
    # =========================================================
    # CLEANUP OLD NOTIFICATIONS
    # =========================================================
    
    @staticmethod
    def cleanup_old_notifications(db: Session, days: int = 30) -> int:
        """Delete read notifications older than specified days"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = db.query(Notification).filter(
            Notification.created_at < cutoff_date,
            Notification.is_read == True
        ).delete()
        
        db.commit()
        
        return result
    
    # =========================================================
    # HELPER
    # =========================================================
    
    @staticmethod
    def _get_time_ago(dt: datetime) -> str:
        """Get human-readable time ago string"""
        
        now = datetime.now(timezone.utc)
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


# Singleton instance
notification_service = NotificationService()