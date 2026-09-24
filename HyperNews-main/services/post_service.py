# services/post_service.py
import random
import string
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional, Dict, Tuple

from models.post import Post, PostHashtag, PostLike, PostComment, PostShare
from models.user import User
from schemas import UserRole
from services.avatar_service import get_avatar_for_user
from services.cache_service import cache


class PostService:
    def __init__(self, db: Session):
        self.db = db
        self.MAX_HASHTAGS = 5
        self.MAX_CONTENT_LENGTH = 5000
    
    # =========================================================
    # HELPER METHODS
    # =========================================================
    
    def generate_post_uid(self) -> str:
        """Generate unique post UID"""
        while True:
            uid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
            existing = self.db.query(Post).filter(Post.post_uid == uid).first()
            if not existing:
                return uid
    
    def extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text - max 5"""
        if not text:
            return []
        hashtags = re.findall(r'#([a-zA-Z0-9_]+)', text)
        return [tag.lower().strip() for tag in hashtags[:self.MAX_HASHTAGS] if tag]
    
    def process_hashtags(self, hashtags: List[str]) -> List[PostHashtag]:
        """Process hashtags - max 5 per post"""
        result = []
        unique_hashtags = list(set(hashtags))[:self.MAX_HASHTAGS]
        
        for tag_name in unique_hashtags:
            tag_name = tag_name.lower().strip()
            if not tag_name:
                continue
            
            hashtag = self.db.query(PostHashtag).filter(PostHashtag.name == tag_name).first()
            if not hashtag:
                hashtag = PostHashtag(
                    name=tag_name,
                    usage_count=0,
                    last_used_at=datetime.now(timezone.utc)
                )
                self.db.add(hashtag)
                self.db.flush()
            
            hashtag.usage_count += 1
            hashtag.last_used_at = datetime.now(timezone.utc)
            result.append(hashtag)
        
        return result
    
    def get_time_ago(self, dt: datetime) -> str:
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
    
    # =========================================================
    # PERMISSION CHECKS
    # =========================================================
    
    def can_edit_post(self, post: Post, user: User) -> bool:
        """Check if user can edit post"""
        if user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]:
            return True
        return post.user_uid == user.user_uid
    
    def can_delete_post(self, post: Post, user: User) -> bool:
        """Check if user can delete post"""
        if user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]:
            return True
        return post.user_uid == user.user_uid
    
    def can_edit_hashtags(self, user: User) -> bool:
        """Check if user can edit hashtags (only Moderator+)"""
        return user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]
    
    # =========================================================
    # CRUD OPERATIONS
    # =========================================================
    
    def create_post(
        self,
        user_uid: str,
        content: str,
        image_url: str = None,
        video_url: str = None
    ) -> Post:
        """Create a new post with hashtags (max 5)"""
        
        post_uid = self.generate_post_uid()
        
        post = Post(
            post_uid=post_uid,
            content=content.strip(),
            image_url=image_url,
            video_url=video_url,
            user_uid=user_uid,
            hashtag_count=0,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(post)
        self.db.flush()
        
        # Extract and process hashtags (max 5)
        hashtags = self.extract_hashtags(content)
        if hashtags:
            hashtag_objects = self.process_hashtags(hashtags)
            post.hashtags = hashtag_objects
            post.hashtag_count = len(hashtag_objects)
        
        self.db.commit()
        self.db.refresh(post)
        
        # Invalidate feed cache
        cache.delete_pattern("cache:get_public_feed:*")
        
        return post
    
    def update_post(
        self,
        post_uid: str,
        user: User,
        content: str = None,
        image_url: str = None,
        video_url: str = None
    ) -> Dict:
        """Update post with permission checks"""
        
        post = self.db.query(Post).filter(Post.post_uid == post_uid).first()
        if not post:
            return {"success": False, "message": "Post not found"}
        
        if not self.can_edit_post(post, user):
            return {"success": False, "message": "You don't have permission to edit this post"}
        
        updated_fields = []
        
        # Update content
        if content is not None:
            old_hashtags = set([h.name for h in post.hashtags])
            new_hashtags = set(self.extract_hashtags(content))
            
            # Check if hashtags changed
            if old_hashtags != new_hashtags:
                if not self.can_edit_hashtags(user):
                    # Regular users: keep old hashtags, only update text
                    content_without_hashtags = re.sub(r'#([a-zA-Z0-9_]+)', '', content)
                    post.content = content_without_hashtags.strip()
                    updated_fields.append("content")
                    
                    self.db.commit()
                    self.db.refresh(post)
                    
                    return {
                        "success": True,
                        "message": "Post updated. Note: Hashtags can only be edited by moderators.",
                        "updated_fields": updated_fields,
                        "hashtags_changed": False,
                        "post": post
                    }
                else:
                    # Moderator+: can edit hashtags
                    # Remove old hashtags
                    for tag_name in old_hashtags:
                        hashtag = self.db.query(PostHashtag).filter(PostHashtag.name == tag_name).first()
                        if hashtag and hashtag.usage_count > 0:
                            hashtag.usage_count -= 1
                            post.hashtags.remove(hashtag)
                    
                    # Add new hashtags (max 5)
                    if new_hashtags:
                        hashtag_objects = self.process_hashtags(list(new_hashtags))
                        for h in hashtag_objects:
                            if h not in post.hashtags:
                                post.hashtags.append(h)
                    
                    post.hashtag_count = len(post.hashtags)
            
            post.content = content.strip()
            updated_fields.append("content")
        
        # Update image
        if image_url is not None:
            post.image_url = image_url
            updated_fields.append("image_url")
        
        # Update video
        if video_url is not None:
            post.video_url = video_url
            updated_fields.append("video_url")
        
        if not updated_fields:
            return {"success": False, "message": "No fields to update"}
        
        # Track edit
        post.is_edited = True
        post.edited_at = datetime.now(timezone.utc)
        post.edited_by_uid = user.user_uid
        post.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(post)
        
        # Invalidate caches
        cache.delete_pattern("cache:get_public_feed:*")
        
        return {
            "success": True,
            "message": "Post updated successfully",
            "updated_fields": updated_fields,
            "hashtags_changed": True,
            "post": post
        }
    
    def delete_post(self, post_uid: str, user: User) -> bool:
        """Delete post with permission check"""
        
        post = self.db.query(Post).filter(Post.post_uid == post_uid).first()
        if not post:
            return False
        
        if not self.can_delete_post(post, user):
            return False
        
        # Decrease hashtag usage counts
        for hashtag in post.hashtags:
            if hashtag.usage_count > 0:
                hashtag.usage_count -= 1
                if hashtag.usage_count == 0:
                    self.db.delete(hashtag)
        
        self.db.delete(post)
        self.db.commit()
        
        # Invalidate caches
        cache.delete_pattern("cache:get_public_feed:*")
        
        return True
    
    # =========================================================
    # READ OPERATIONS
    # =========================================================
    
    def get_public_feed(self, limit: int = 20, cursor: str = None) -> Tuple[List[Dict], bool, Optional[str]]:
        """Get public feed - ALL posts"""
        
        query = self.db.query(Post).order_by(desc(Post.created_at))
        
        if cursor:
            last_id = int(cursor)
            query = query.filter(Post.id < last_id)
        
        posts = query.limit(limit + 1).all()
        has_more = len(posts) > limit
        posts = posts[:limit]
        
        result = self._format_posts(posts)
        next_cursor = str(posts[-1].id) if has_more and posts else None
        
        return result, has_more, next_cursor
    
    def get_post(self, post_uid: str, viewer_uid: str = None) -> Dict:
        """Get single post by UID"""
        
        post = self.db.query(Post).filter(Post.post_uid == post_uid).first()
        if not post:
            return None
        
        result = self._format_post(post, viewer_uid)
        return result
    
    def get_user_posts(self, user_uid: str, limit: int = 20) -> List[Dict]:
        """Get posts by specific user"""
        
        posts = self.db.query(Post).filter(
            Post.user_uid == user_uid
        ).order_by(desc(Post.created_at)).limit(limit).all()
        
        return self._format_posts(posts)
    
    def get_posts_by_hashtag(self, hashtag_name: str, limit: int = 20) -> List[Dict]:
        """Get posts by hashtag"""
        
        hashtag = self.db.query(PostHashtag).filter(PostHashtag.name == hashtag_name.lower()).first()
        if not hashtag:
            return []
        
        posts = self.db.query(Post).filter(
            Post.hashtags.contains(hashtag)
        ).order_by(desc(Post.created_at)).limit(limit).all()
        
        return self._format_posts(posts)
    
    def get_trending_hashtags(self, limit: int = 10) -> List[Dict]:
        """Get trending hashtags with recency weighting"""
        
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        hashtags = self.db.query(PostHashtag).filter(
            PostHashtag.usage_count > 0,
            PostHashtag.last_used_at >= week_ago
        ).order_by(
            desc(PostHashtag.usage_count),
            desc(PostHashtag.last_used_at)
        ).limit(limit).all()
        
        return [{"name": h.name, "usage_count": h.usage_count} for h in hashtags]
    
    # =========================================================
    # ENGAGEMENT OPERATIONS
    # =========================================================
    
    def like_post(self, post_id: int, user_uid: str) -> Dict:
        """Like or unlike a post"""
        
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"success": False, "message": "Post not found", "is_liked": False}
        
        existing = self.db.query(PostLike).filter(
            PostLike.post_id == post_id,
            PostLike.user_uid == user_uid
        ).first()
        
        if existing:
            self.db.delete(existing)
            post.like_count -= 1
            self.db.commit()
            cache.delete_pattern("cache:get_public_feed:*")
            return {"success": True, "is_liked": False, "like_count": post.like_count}
        else:
            like = PostLike(post_id=post_id, user_uid=user_uid)
            self.db.add(like)
            post.like_count += 1
            self.db.commit()
            cache.delete_pattern("cache:get_public_feed:*")
            return {"success": True, "is_liked": True, "like_count": post.like_count}
    
    def add_comment(self, post_id: int, user_uid: str, comment_text: str) -> Dict:
        """Add comment to post"""
        
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"success": False, "message": "Post not found"}
        
        comment = PostComment(
            post_id=post_id,
            user_uid=user_uid,
            comment_text=comment_text.strip()
        )
        self.db.add(comment)
        post.comment_count += 1
        self.db.commit()
        self.db.refresh(comment)
        
        user = self.db.query(User).filter(User.user_uid == user_uid).first()
        
        return {
            "success": True,
            "comment": {
                "id": comment.id,
                "comment_text": comment.comment_text,
                "user_uid": user_uid,
                "user_name": user.user_name if user else None,
                "user_display_name": user.name if user else None,
                "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
                "created_at": comment.created_at.isoformat(),
                "time_ago": self.get_time_ago(comment.created_at)
            }
        }
    
    def share_post(self, post_id: int, user_uid: str, platform: str = None) -> Dict:
        """Record a share"""
        
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return {"success": False, "message": "Post not found"}
        
        share = PostShare(
            post_id=post_id,
            user_uid=user_uid,
            platform=platform
        )
        self.db.add(share)
        post.share_count += 1
        self.db.commit()
        
        cache.delete_pattern("cache:get_public_feed:*")
        
        return {"success": True, "share_count": post.share_count}
    
    # =========================================================
    # FORMAT HELPERS
    # =========================================================
    
    def _format_post(self, post: Post, viewer_uid: str = None) -> Dict:
        """Format a single post"""
        
        user = self.db.query(User).filter(User.user_uid == post.user_uid).first()
        
        is_liked = False
        if viewer_uid:
            is_liked = self.db.query(PostLike).filter(
                PostLike.post_id == post.id,
                PostLike.user_uid == viewer_uid
            ).first() is not None
        
        return {
            "id": post.id,
            "post_uid": post.post_uid,
            "content": post.content,
            "image_url": post.image_url,
            "video_url": post.video_url,
            "user_uid": post.user_uid,
            "user_name": user.user_name if user else None,
            "user_display_name": user.name if user else None,
            "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "share_count": post.share_count,
            "is_edited": post.is_edited,
            "edited_at": post.edited_at.isoformat() if post.edited_at else None,
            "created_at": post.created_at.isoformat(),
            "time_ago": self.get_time_ago(post.created_at),
            "hashtags": [{"name": h.name} for h in post.hashtags],
            "is_liked": is_liked
        }
    
    def _format_posts(self, posts: List[Post], viewer_uid: str = None) -> List[Dict]:
        """Format multiple posts"""
        return [self._format_post(p, viewer_uid) for p in posts]