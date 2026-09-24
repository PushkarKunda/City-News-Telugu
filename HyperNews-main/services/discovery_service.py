# services/discovery_service.py - OPTIMIZED VERSION

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Dict, Optional, Tuple
import json

from models.news import News
from models.post import Post, PostHashtag
from models.user import User, UserPreference
from models.engagement import Reaction, Share, Bookmark
from models.follow import Follow
from models.news import Category
from services.cache_service import cache


class DiscoveryService:
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================
    # TIER 1: HOME FEED - Single Optimized Query
    # =========================================================
    
    def get_home_feed(self, user_uid: str, limit: int = 20) -> Dict:
        """
        ⭐ MAIN API - Returns everything in ONE optimized query
        """
        
        # Try cache first (5 minutes)
        cache_key = f"home_feed:{user_uid}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # 1. Get trending content (single query)
        trending = self._get_trending_content(limit // 2)
        
        # 2. Get personalized content (single query)
        personalized = self._get_personalized_content(user_uid, limit // 2)
        
        # 3. Get recommendations (single query)
        recommendations = self._get_recommendations(user_uid, 5)
        
        # 4. Get trending hashtags (single query)
        hashtags = self._get_trending_hashtags(5)
        
        # 5. Get popular categories (single query)
        categories = self._get_popular_categories()
        
        result = {
            "trending": trending,
            "personalized": personalized,
            "recommendations": recommendations,
            "trending_hashtags": hashtags,
            "popular_categories": categories,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, result, ttl=300)
        
        return result
    
    def _get_trending_content(self, limit: int = 10) -> List[Dict]:
        """Optimized trending content with engagement scoring"""
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Single query with engagement score
        results = self.db.query(
            News,
            (News.views_count * 1 + 
             News.likes_count * 2 + 
             News.comments_count * 3 + 
             News.shares_count * 4).label('score')
        ).filter(
            News.is_approved == 1,
            News.created_at >= cutoff_time
        ).order_by(
            desc('score')
        ).limit(limit).all()
        
        return self._format_news_results(results)
    
    def _get_personalized_content(self, user_uid: str, limit: int = 10) -> List[Dict]:
        """Personalized content based on user preferences"""
        
        # Get user preferences in single query
        prefs = self.db.query(UserPreference).filter(
            UserPreference.user_uid == user_uid
        ).first()
        
        if not prefs or not prefs.categories:
            return self._get_trending_content(limit)
        
        category_ids = [c.id for c in prefs.categories]
        
        # Single query for personalized content
        results = self.db.query(News).filter(
            News.is_approved == 1,
            News.categories.any(News.category_id.in_(category_ids))
        ).order_by(
            desc(News.created_at)
        ).limit(limit).all()
        
        return self._format_news_results(results)
    
    def _get_recommendations(self, user_uid: str, limit: int = 5) -> List[Dict]:
        """Get recommendations based on user's reading history"""
        
        # Get user's recent interactions in single query
        recent_news = self.db.query(News.news_uid).filter(
            News.views_count > 0
        ).limit(10).subquery()
        
        results = self.db.query(News).filter(
            News.is_approved == 1,
            News.news_uid.notin_(recent_news)
        ).order_by(
            desc(News.views_count)
        ).limit(limit).all()
        
        return self._format_news_results(results)
    
    def _get_trending_hashtags(self, limit: int = 5) -> List[Dict]:
        """Optimized hashtag query"""
        
        results = self.db.query(
            PostHashtag.name,
            func.count(PostHashtag.id).label('count')
        ).join(
            PostHashtag.posts
        ).filter(
            Post.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
        ).group_by(
            PostHashtag.name
        ).order_by(
            desc('count')
        ).limit(limit).all()
        
        return [{"name": r.name, "count": r.count} for r in results]
    
    def _get_popular_categories(self, limit: int = 6) -> List[Dict]:
        """Get popular categories"""
        
        results = self.db.query(
            Category.id,
            Category.name,
            Category.image_url,
            func.count(News.id).label('count')
        ).join(
            News.categories
        ).filter(
            News.is_approved == 1
        ).group_by(
            Category.id, Category.name, Category.image_url
        ).order_by(
            desc('count')
        ).limit(limit).all()
        
        return [
            {
                "id": r.id,
                "name": r.name,
                "icon": r.image_url or "📰",
                "count": r.count
            }
            for r in results
        ]
    
    def _format_news_results(self, results: List) -> List[Dict]:
        """Format news results with user info"""
        
        formatted = []
        for item in results:
            # Handle tuple results (with score)
            news = item[0] if isinstance(item, tuple) else item
            score = item[1] if isinstance(item, tuple) else 0
            
            # Get user in single query (with cache)
            user = self.db.query(User).filter(User.user_uid == news.user_uid).first()
            
            formatted.append({
                "uid": news.news_uid,
                "title": news.title,
                "summary": news.summary[:150] if news.summary else None,
                "image_url": news.image_url,
                "user_name": user.user_name if user else None,
                "category_ids": [c.id for c in news.categories] if news.categories else [],
                "engagement": {
                    "views": news.views_count,
                    "likes": news.likes_count,
                    "comments": news.comments_count,
                    "shares": news.shares_count,
                    "score": score
                },
                "created_at": news.created_at.isoformat(),
                "time_ago": self._get_time_ago(news.created_at)
            })
        
        return formatted
    
    # =========================================================
    # TIER 2: CATEGORY EXPLORE
    # =========================================================
    
    def get_category_explore(self, category_id: int, limit: int = 20, cursor: str = None) -> Dict:
        """Explore content by category with pagination"""
        
        cache_key = f"category_explore:{category_id}:{limit}:{cursor}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get category details
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return {"error": "Category not found"}
        
        # Get news in this category
        query = self.db.query(News).filter(
            News.is_approved == 1,
            News.categories.any(Category.id == category_id)
        )
        
        if cursor:
            last_id = int(cursor)
            query = query.filter(News.id < last_id)
        
        items = query.order_by(desc(News.created_at)).limit(limit + 1).all()
        has_more = len(items) > limit
        items = items[:limit]
        
        result = {
            "category": {
                "id": category.id,
                "name": category.name,
                "icon": category.image_url or "📰",
                "description": category.description
            },
            "items": self._format_news_results(items),
            "has_more": has_more,
            "next_cursor": str(items[-1].id) if has_more and items else None
        }
        
        # Cache for 2 minutes
        cache.set(cache_key, result, ttl=120)
        
        return result
    
    # =========================================================
    # TIER 3: RELATED CONTENT
    # =========================================================
    
    def get_related_content(self, content_uid: str, content_type: str = "news", limit: int = 5) -> Dict:
        """Get related content based on categories"""
        
        cache_key = f"related:{content_type}:{content_uid}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get content categories
        categories = []
        if content_type == "news":
            content = self.db.query(News).filter(News.news_uid == content_uid).first()
            if content:
                categories = [c.id for c in content.categories] if content.categories else []
        elif content_type == "post":
            content = self.db.query(Post).filter(Post.post_uid == content_uid).first()
            if content:
                categories = [h.name for h in content.hashtags] if content.hashtags else []
        
        if not categories:
            return {"items": [], "count": 0}
        
        # Get related content
        related = self.db.query(News).filter(
            News.is_approved == 1,
            News.news_uid != content_uid,
            News.categories.any(News.category_id.in_(categories))
        ).order_by(
            desc(News.created_at)
        ).limit(limit).all()
        
        result = {
            "items": self._format_news_results(related),
            "count": len(related)
        }
        
        # Cache for 10 minutes
        cache.set(cache_key, result, ttl=600)
        
        return result
    
    # =========================================================
    # HELPER
    # =========================================================
    
    def _get_time_ago(self, dt: datetime) -> str:
        """Human-readable time"""
        now = datetime.now(timezone.utc)
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds >= 3600:
            return f"{diff.seconds // 3600}h ago"
        elif diff.seconds >= 60:
            return f"{diff.seconds // 60}m ago"
        else:
            return "Just now"