# services/follow_service.py - COMPLETE UPDATED VERSION

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Optional, Tuple

from models.follow import Follow
from models.user import User
from models.post import Post
from services.avatar_service import get_avatar_for_user
from schemas import UserRole

# ✅ Better Notification import
try:
    from models.engagement import Notification
except ImportError:
    from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
    from database import Base
    
    class Notification(Base):
        __tablename__ = "notifications"
        id = Column(Integer, primary_key=True)
        user_uid = Column(String, ForeignKey("users.user_uid"))
        actor_uid = Column(String, ForeignKey("users.user_uid"), nullable=True)
        title = Column(String(200))
        message = Column(Text)
        link_url = Column(String(500), nullable=True)
        notification_type = Column(String(30), default="follow")
        is_read = Column(Boolean, default=False)
        created_at = Column(DateTime(timezone=True), server_default=func.now())


class FollowService:
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================
    # FOLLOW / UNFOLLOW
    # =========================================================
    
    def follow_user(self, follower_uid: str, following_uid: str) -> Dict:
        """Follow another user"""
        
        if follower_uid == following_uid:
            return {"success": False, "message": "Cannot follow yourself", "action": None}
        
        target_user = self.db.query(User).filter(User.user_uid == following_uid).first()
        if not target_user:
            return {"success": False, "message": "User not found", "action": None}
        
        follower = self.db.query(User).filter(User.user_uid == follower_uid).first()
        
        # Check if already following
        existing = self.db.query(Follow).filter(
            Follow.follower_uid == follower_uid,
            Follow.following_uid == following_uid
        ).first()
        
        if existing:
            if existing.is_active:
                # Idempotent: already following is not an error
                return {"success": True, "message": f"Already following {target_user.user_name}", "action": "already_following"}
            else:
                # Reactivate follow
                existing.is_active = True
                existing.updated_at = datetime.now(timezone.utc)
                self.db.commit()
                self.db.refresh(existing)  # ✅ Refresh after commit
                
                # Create notification
                self._create_follow_notification(following_uid, follower_uid, follower.user_name if follower else "Someone")
                
                return {
                    "success": True, 
                    "action": "followed", 
                    "message": f"Now following {target_user.user_name}"
                }
        
        # Create new follow
        follow = Follow(
            follower_uid=follower_uid,
            following_uid=following_uid,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(follow)
        self.db.commit()
        self.db.refresh(follow)  # ✅ Refresh after commit
        
        # Create notification
        self._create_follow_notification(following_uid, follower_uid, follower.user_name if follower else "Someone")
        
        return {
            "success": True, 
            "action": "followed", 
            "message": f"Now following {target_user.user_name}"
        }
    
    def unfollow_user(self, follower_uid: str, following_uid: str) -> Dict:
        """Unfollow a user"""
        
        follow = self.db.query(Follow).filter(
            Follow.follower_uid == follower_uid,
            Follow.following_uid == following_uid,
            Follow.is_active == True
        ).first()
        
        target_user = self.db.query(User).filter(User.user_uid == following_uid).first()
        if not target_user:
            return {"success": False, "message": "User not found", "action": None}
        
        if not follow:
            # Idempotent: already not following is not an error
            return {"success": True, "message": f"Not following {target_user.user_name}", "action": "already_unfollowed"}
        
        follow.is_active = False
        follow.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(follow)  # ✅ Refresh after commit
        
        return {
            "success": True, 
            "action": "unfollowed", 
            "message": f"Unfollowed {target_user.user_name}"
        }
    
    # =========================================================
    # NOTIFICATION
    # =========================================================
    
    def _create_follow_notification(self, user_uid: str, follower_uid: str, follower_name: str):
        """Create in-app notification for new follower"""
        
        if user_uid == follower_uid:
            return
        
        try:
            # Check for duplicate in last hour
            recent = self.db.query(Notification).filter(
                Notification.user_uid == user_uid,
                Notification.notification_type == "follow",
                Notification.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
            ).first()
            
            if recent:
                return
            
            notification = Notification(
                user_uid=user_uid,
                actor_uid=follower_uid,
                title="New Follower",
                message=f"{follower_name} started following you",
                link_url=f"/profile/{follower_uid}",
                notification_type="follow",
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)  # ✅ Refresh after commit
        except Exception as e:
            # Don't break follow functionality if notification fails
            print(f"Notification error: {e}")
            pass
    
    # =========================================================
    # FOLLOW STATUS & COUNTS
    # =========================================================
    
    def is_following(self, follower_uid: str, following_uid: str) -> bool:
        """Check if user is following another user"""
        
        follow = self.db.query(Follow).filter(
            Follow.follower_uid == follower_uid,
            Follow.following_uid == following_uid,
            Follow.is_active == True
        ).first()
        
        return follow is not None
    
    def get_follow_status(self, current_user_uid: str, target_user_uid: str) -> Dict:
        """Get detailed follow status between two users"""
        
        is_following = self.is_following(current_user_uid, target_user_uid)
        is_followed_by = self.is_following(target_user_uid, current_user_uid)
        
        return {
            "is_following": is_following,
            "is_followed_by": is_followed_by,
            "is_mutual": is_following and is_followed_by,
            "relation": "mutual" if (is_following and is_followed_by) else 
                       "following" if is_following else 
                       "follower" if is_followed_by else 
                       "none"
        }
    
    def get_follow_counts(self, user_uid: str) -> Dict:
        """Get follower and following counts"""
        
        followers_count = self.db.query(Follow).filter(
            Follow.following_uid == user_uid,
            Follow.is_active == True
        ).count()
        
        following_count = self.db.query(Follow).filter(
            Follow.follower_uid == user_uid,
            Follow.is_active == True
        ).count()
        
        return {
            "followers": followers_count,
            "following": following_count
        }
    
    # =========================================================
    # LISTS
    # =========================================================
    
    def get_followers(self, user_uid: str, current_user_uid: str = None, 
                      limit: int = 20, offset: int = 0) -> Dict:
        """Get list of users who follow this user"""
        
        query = self.db.query(Follow).filter(
            Follow.following_uid == user_uid,
            Follow.is_active == True
        )
        
        total = query.count()
        follows = query.order_by(desc(Follow.created_at)).offset(offset).limit(limit).all()
        
        followers = []
        for follow in follows:
            user = self.db.query(User).filter(User.user_uid == follow.follower_uid).first()
            if user:
                followers.append({
                    "user_uid": user.user_uid,
                    "user_name": user.user_name,
                    "name": user.name,
                    "profile_picture": get_avatar_for_user(user.name, user.user_uid),
                    "followed_at": follow.created_at.isoformat(),
                    "time_ago": self._get_time_ago(follow.created_at),
                    "is_following_back": self.is_following(current_user_uid, user.user_uid) if current_user_uid else False
                })
        
        return {
            "total": total,
            "items": followers,
            "has_more": offset + limit < total
        }
    
    def get_following(self, user_uid: str, current_user_uid: str = None,
                      limit: int = 20, offset: int = 0) -> Dict:
        """Get list of users this user follows"""
        
        query = self.db.query(Follow).filter(
            Follow.follower_uid == user_uid,
            Follow.is_active == True
        )
        
        total = query.count()
        follows = query.order_by(desc(Follow.created_at)).offset(offset).limit(limit).all()
        
        following = []
        for follow in follows:
            user = self.db.query(User).filter(User.user_uid == follow.following_uid).first()
            if user:
                following.append({
                    "user_uid": user.user_uid,
                    "user_name": user.user_name,
                    "name": user.name,
                    "profile_picture": get_avatar_for_user(user.name, user.user_uid),
                    "followed_at": follow.created_at.isoformat(),
                    "time_ago": self._get_time_ago(follow.created_at),
                    "follows_back": self.is_following(current_user_uid, user.user_uid) if current_user_uid else False
                })
        
        return {
            "total": total,
            "items": following,
            "has_more": offset + limit < total
        }
    
    # =========================================================
    # SUGGESTIONS
    # =========================================================
    
    def get_follow_suggestions(self, user_uid: str, limit: int = 10) -> List[Dict]:
        """Get suggested users to follow"""
        
        # ✅ Check if user exists
        user = self.db.query(User).filter(User.user_uid == user_uid).first()
        if not user:
            return []
        
        # Get users that current user follows
        following_uids = set([
            f.following_uid for f in self.db.query(Follow).filter(
                Follow.follower_uid == user_uid,
                Follow.is_active == True
            ).all()
        ])
        
        # Get popular users not followed
        popular_users = self.db.query(User).filter(
            User.user_uid != user_uid,
            User.user_uid.notin_(following_uids),
            User.role == 1
        ).order_by(
            desc(User.created_at)
        ).limit(limit * 2).all()
        
        suggestions = []
        for user in popular_users[:limit]:
            follower_count = self.db.query(Follow).filter(
                Follow.following_uid == user.user_uid,
                Follow.is_active == True
            ).count()
            
            suggestions.append({
                "user_uid": user.user_uid,
                "user_name": user.user_name,
                "name": user.name,
                "profile_picture": get_avatar_for_user(user.name, user.user_uid),
                "follower_count": follower_count
            })
        
        return suggestions
    
    # =========================================================
    # POST FEED
    # =========================================================
    
    def get_following_posts(self, user_uid: str, limit: int = 20, cursor: str = None) -> Tuple:
        """Get posts from followed users"""
        
        # Get users that current user follows
        following_uids = [
            f.following_uid for f in self.db.query(Follow).filter(
                Follow.follower_uid == user_uid,
                Follow.is_active == True
            ).all()
        ]
        
        # Also include current user's own posts
        following_uids.append(user_uid)
        
        if not following_uids:
            return [], False, None
        
        query = self.db.query(Post).filter(
            Post.user_uid.in_(following_uids)
        ).order_by(desc(Post.created_at))
        
        if cursor:
            last_id = int(cursor)
            query = query.filter(Post.id < last_id)
        
        posts = query.limit(limit + 1).all()
        has_more = len(posts) > limit
        posts = posts[:limit]
        
        next_cursor = str(posts[-1].id) if has_more and posts else None
        
        return posts, has_more, next_cursor
    
    # =========================================================
    # HELPER
    # =========================================================
    
    def _get_time_ago(self, dt: datetime) -> str:
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