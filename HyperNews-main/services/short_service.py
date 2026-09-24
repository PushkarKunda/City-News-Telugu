# services/shorts_service.py
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import List, Dict, Optional, Tuple
import random
import string
import requests
import os
import logging

from models.shorts import YouTubeShort, UserShort, ShortEngagement
from models.user import User
from services.avatar_service import get_avatar_for_user

logger = logging.getLogger(__name__)

# YouTube API Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


class ShortsService:
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================
    # YOUTUBE SHORTS
    # =========================================================
    
    def generate_short_uid(self) -> str:
        """Generate unique short UID"""
        while True:
            uid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
            existing = self.db.query(UserShort).filter(UserShort.short_uid == uid).first()
            if not existing:
                return uid
    
    def fetch_youtube_shorts(self, query: str, language: str, limit: int = 10) -> List[Dict]:
        """Fetch shorts from YouTube API"""
        if not YOUTUBE_API_KEY:
            logger.warning("YouTube API key not configured")
            return []
        
        params = {
            "key": YOUTUBE_API_KEY,
            "part": "snippet",
            "q": query,
            "maxResults": limit,
            "type": "video",
            "videoDuration": "short",
            "order": "date",
            "videoEmbeddable": "true"
        }
        
        try:
            response = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logger.error(f"YouTube API error: {e}")
            return []
        
        result = []
        for item in data.get("items", []):
            if item["id"]["kind"] == "youtube#video":
                video_id = item["id"]["videoId"]
                snippet = item["snippet"]
                
                # Check if already exists
                existing = self.db.query(YouTubeShort).filter(
                    YouTubeShort.video_id == video_id
                ).first()
                
                if existing:
                    result.append(self._format_youtube_short(existing))
                    continue
                
                # Create new record
                short = YouTubeShort(
                    video_id=video_id,
                    title=snippet["title"],
                    thumbnail_url=snippet["thumbnails"]["high"]["url"],
                    channel_title=snippet["channelTitle"],
                    video_url=f"https://www.youtube.com/watch?v={video_id}",
                    published_at=datetime.fromisoformat(
                        snippet["publishedAt"].replace('Z', '+00:00')
                    ) if snippet.get("publishedAt") else None,
                    language=language
                )
                self.db.add(short)
                self.db.commit()
                self.db.refresh(short)
                
                result.append(self._format_youtube_short(short))
        
        return result
    
    def _format_youtube_short(self, short: YouTubeShort) -> Dict:
        """Format YouTube short for response"""
        return {
            "id": short.id,
            "video_id": short.video_id,
            "title": short.title,
            "thumbnail_url": short.thumbnail_url,
            "channel_title": short.channel_title,
            "video_url": short.video_url,
            "views": short.views or 0,
            "likes": short.likes or 0,
            "published_at": short.published_at.isoformat() if short.published_at else None,
            "source": "youtube"
        }
    
    def get_youtube_shorts(self, language: str, limit: int = 20) -> List[Dict]:
        """Get YouTube shorts from database"""
        shorts = self.db.query(YouTubeShort).filter(
            YouTubeShort.language == language,
            YouTubeShort.is_active == True
        ).order_by(
            desc(YouTubeShort.published_at)
        ).limit(limit).all()
        
        return [self._format_youtube_short(s) for s in shorts]
    
    # =========================================================
    # USER SHORTS
    # =========================================================
    
    def create_user_short(
        self,
        user_uid: str,
        title: str,
        video_url: str,
        language: str,
        description: str = None,
        thumbnail_url: str = None,
        youtube_video_id: str = None,
        category_id: int = None
    ) -> UserShort:
        """Create a user short"""
        
        short_uid = self.generate_short_uid()
        
        # Check if user is publisher/admin for auto-approval
        user = self.db.query(User).filter(User.user_uid == user_uid).first()
        is_auto_approved = user.role in [2, 3, 4, 5]  # Publisher, Moderator, Employee, Admin
        
        short = UserShort(
            short_uid=short_uid,
            user_uid=user_uid,
            title=title,
            description=description,
            video_url=str(video_url),
            thumbnail_url=str(thumbnail_url) if thumbnail_url else None,
            youtube_video_id=youtube_video_id,
            language=language,
            category_id=category_id,
            is_approved=1 if is_auto_approved else 0,
            approved_at=datetime.now(timezone.utc) if is_auto_approved else None,
            approved_by=user_uid if is_auto_approved else None,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(short)
        self.db.commit()
        self.db.refresh(short)
        
        return short
    
    def get_user_shorts(
        self,
        user_uid: str = None,
        language: str = None,
        limit: int = 20,
        cursor: str = None
    ) -> Tuple[List[Dict], bool, Optional[str]]:
        """Get user shorts with pagination"""
        
        query = self.db.query(UserShort).filter(
            UserShort.is_approved == 1,
            UserShort.is_active == True
        )
        
        if user_uid:
            query = query.filter(UserShort.user_uid == user_uid)
        
        if language:
            query = query.filter(UserShort.language == language)
        
        if cursor:
            last_id = int(cursor)
            query = query.filter(UserShort.id < last_id)
        
        query = query.order_by(desc(UserShort.created_at))
        shorts = query.limit(limit + 1).all()
        
        has_more = len(shorts) > limit
        shorts = shorts[:limit]
        
        result = []
        for short in shorts:
            user = self.db.query(User).filter(User.user_uid == short.user_uid).first()
            result.append({
                "id": short.id,
                "short_uid": short.short_uid,
                "title": short.title,
                "description": short.description,
                "video_url": short.video_url,
                "thumbnail_url": short.thumbnail_url,
                "user_uid": short.user_uid,
                "user_name": user.user_name if user else None,
                "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
                "views": short.views,
                "likes": short.likes,
                "comments": short.comments,
                "shares": short.shares,
                "is_approved": short.is_approved,
                "approval_status": self._get_approval_status(short.is_approved),
                "created_at": short.created_at.isoformat() if short.created_at else None,
                "source": "user"
            })
        
        next_cursor = str(shorts[-1].id) if has_more and shorts else None
        
        return result, has_more, next_cursor
    
    def _get_approval_status(self, is_approved: int) -> str:
        """Get approval status string"""
        if is_approved == 1:
            return "approved"
        elif is_approved == 2:
            return "rejected"
        return "pending"
    
    # =========================================================
    # COMBINED SHORTS FEED
    # =========================================================
    
    def get_shorts_feed(
        self,
        language: str,
        limit: int = 20,
        cursor: str = None
    ) -> Tuple[List[Dict], bool, Optional[str]]:
        """Get combined shorts feed (YouTube + User)"""
        
        # Get YouTube shorts
        youtube_shorts = self.get_youtube_shorts(language, limit // 2)
        
        # Get user shorts
        user_shorts, _, _ = self.get_user_shorts(
            language=language,
            limit=limit // 2,
            cursor=cursor
        )
        
        # Combine and shuffle
        combined = youtube_shorts + user_shorts
        random.shuffle(combined)
        
        # Limit
        has_more = len(combined) > limit
        result = combined[:limit]
        
        return result, has_more, None
    
    # =========================================================
    # ENGAGEMENT
    # =========================================================
    
    def track_view(self, short_type: str, short_id: int, user_uid: str) -> bool:
        """Track a view on a short"""
        try:
            engagement = ShortEngagement(
                user_uid=user_uid,
                short_type=short_type,
                short_id=short_id,
                engagement_type="view"
            )
            self.db.add(engagement)
            
            # Update view count
            if short_type == "youtube":
                short = self.db.query(YouTubeShort).filter(YouTubeShort.id == short_id).first()
            else:
                short = self.db.query(UserShort).filter(UserShort.id == short_id).first()
            
            if short:
                short.views += 1
                self.db.commit()
                return True
        except Exception as e:
            logger.error(f"Error tracking view: {e}")
        return False
    
    def toggle_like(self, short_type: str, short_id: int, user_uid: str) -> Dict:
        """Like or unlike a short"""
        try:
            # Check existing like
            existing = self.db.query(ShortEngagement).filter(
                ShortEngagement.user_uid == user_uid,
                ShortEngagement.short_type == short_type,
                ShortEngagement.short_id == short_id,
                ShortEngagement.engagement_type == "like"
            ).first()
            
            if existing:
                # Unlike
                self.db.delete(existing)
                self.db.commit()
                
                # Decrement like count
                if short_type == "youtube":
                    short = self.db.query(YouTubeShort).filter(YouTubeShort.id == short_id).first()
                else:
                    short = self.db.query(UserShort).filter(UserShort.id == short_id).first()
                
                if short and short.likes > 0:
                    short.likes -= 1
                    self.db.commit()
                
                return {"liked": False, "like_count": short.likes if short else 0}
            else:
                # Like
                like = ShortEngagement(
                    user_uid=user_uid,
                    short_type=short_type,
                    short_id=short_id,
                    engagement_type="like"
                )
                self.db.add(like)
                
                if short_type == "youtube":
                    short = self.db.query(YouTubeShort).filter(YouTubeShort.id == short_id).first()
                else:
                    short = self.db.query(UserShort).filter(UserShort.id == short_id).first()
                
                if short:
                    short.likes += 1
                    self.db.commit()
                
                return {"liked": True, "like_count": short.likes if short else 0}
        except Exception as e:
            logger.error(f"Error toggling like: {e}")
            return {"liked": False, "like_count": 0}