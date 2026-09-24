# =============================
# Standard Library
# =============================
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import logging


# =============================
# Third Party
# =============================
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status, Body
import requests
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_, and_, case

# =============================
# Local Imports
# =============================
# from auth.dependencies import admin_required, get_current_user, require_role
# from database import get_db
# from models.base_location import City, District, Language, State
# from models.content import Advertisement, Event, Poll, SponsoredPost
# from models.shorts import YouTubeShort
# from models.news import (
#     News, NewsFlag, Reaction, Comment, ScheduledNews, Share, NewsView, 
#     Category, scheduled_news_categories
# )
# from models.user import User, UserPreference, UserRole
# from schemas import (
#     BreakingNewsUpdate, NewsCreate, NewsOut, ScheduledNewsCreate, 
#     ScheduledNewsOut, ScheduledNewsUpdate, VideoItem, NewsFlagCreate, FlagReview
# )
# from utility import YOUTUBE_API_KEY, YOUTUBE_SEARCH_URL, generate_news_uid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
import requests
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_
# from FastAPIProject6.services import supabase_service
from models.post import Post
from services.avatar_service import get_avatar_for_user
from services.fcm_service import fcm_service
from services.cache_service import cache
from auth.dependencies import admin_required, get_current_user, get_optional_user, require_role, require_roles, require_permission
from auth.rbac import Permission
from models.base_location import City, District, Language, State
from models.content import Advertisement, Event, Poll, SponsoredPost
from models.shorts import YouTubeShort
from models.news import News, NewsFlag, Comment, ScheduledNews, NewsView, Category
from models.engagement import Reaction, Share
from database import get_db
from models.user import User, UserPreference
from routes.content_routes import get_active_advertisements
from schemas import BreakingNewsUpdate, NewsCreate, NewsCreateResponse, NewsOut, ScheduledNewsCreate, ScheduledNewsOut, ScheduledNewsUpdate, UserRole, VideoItem
from utility import YOUTUBE_API_KEY, YOUTUBE_SEARCH_URL, extract_source_name, generate_news_uid
from database import get_db
from schemas import (
    BreakingNewsUpdate, NewsCreate, NewsOut, VideoItem,
    DailyNewsStats, WeeklyNewsStats, MonthlyNewsStats,
    TopPerformingNews, TrendingNews, NewsFlagCreate, 
    NewsFlagOut, FlagReview, PendingFlagOut
)
from services.rewards_service import RewardsService
from services.bingo_service import BingoService
from config.rewards_config import RewardsConfig
from routes.content_routes import get_active_advertisements, get_active_sponsored_posts
from services.supabase_service import supabase_service
from services.ranking_service import NewsRankingService
from services.duplicate_detection_service import DuplicateDetectionService
from services.ad_service import MonetizationService
# =============================
# Logging Setup
# =============================
logger = logging.getLogger(__name__)

# =============================
# Router
# =============================
router = APIRouter(prefix="/v1", tags=["News"])
# Language-specific validation rules
def validate_content_by_language(title: str, summary: str, language_code: str) -> dict:
    """
    Validate title and summary length based on language (InShorts style)
    
    Returns: dict with 'valid' boolean and 'message' string
    """
    validation_rules = {
        "en": {  # English
            "title_min": 30,
            "title_max": 100,
            "summary_min": 250,
            "summary_max": 500,
            "title_message": "English title must be 30-100 characters (InShorts style)",
            "summary_message": "English summary must be 250-500 characters (byte-sized news)"
        },
        "hi": {  # Hindi
            "title_min": 25,
            "title_max": 80,
            "summary_min": 150,
            "summary_max": 300,
            "title_message": "हिंदी शीर्षक 25-80 अक्षर का होना चाहिए",
            "summary_message": "हिंदी सारांश 150-300 अक्षर का होना चाहिए"
        },
        "te": {  # Telugu
            "title_min": 20,
            "title_max": 70,
            "summary_min": 150,
            "summary_max": 300,
            "title_message": "తెలుగు టైటిల్ 20-70 అక్షరాలు ఉండాలి",
            "summary_message": "తెలుగు సారాంశం 150-300 అక్షరాలు ఉండాలి"
        },
        "ta": {  # Tamil
            "title_min": 20,
            "title_max": 70,
            "summary_min": 150,
            "summary_max": 300,
            "title_message": "தமிழ் தலைப்பு 20-70 எழுத்துகள் இருக்க வேண்டும்",
            "summary_message": "தமிழ் சுருக்கம் 150-300 எழுத்துகள் இருக்க வேண்டும்"
        },
        "ml": {  # Malayalam
            "title_min": 20,
            "title_max": 70,
            "summary_min": 150,
            "summary_max": 300,
            "title_message": "മലയാളം തലക്കെട്ട് 20-70 അക്ഷരങ്ങൾ ആയിരിക്കണം",
            "summary_message": "മലയാളം സംഗ്രഹം 150-300 അക്ഷരങ്ങൾ ആയിരിക്കണം"
        },
        "kn": {  # Kannada
            "title_min": 20,
            "title_max": 70,
            "summary_min": 150,
            "summary_max": 300,
            "title_message": "ಕನ್ನಡ ಶೀರ್ಷಿಕೆ 20-70 ಅಕ್ಷರಗಳಿರಬೇಕು",
            "summary_message": "ಕನ್ನಡ ಸಾರಾಂಶ 150-300 ಅಕ್ಷರಗಳಿರಬೇಕು"
        }
    }
    
    # Get rules for language, default to English
    rules = validation_rules.get(language_code, validation_rules["en"])
    
    title_clean = title.strip()
    summary_clean = summary.strip()
    
    title_len = len(title_clean)
    summary_len = len(summary_clean)
    
    if title_len < rules["title_min"]:
        return {
            "valid": False,
            "message": rules["title_message"],
            "current": title_len,
            "min": rules["title_min"],
            "max": rules["title_max"]
        }
    
    if title_len > rules["title_max"]:
        return {
            "valid": False,
            "message": rules["title_message"],
            "current": title_len,
            "min": rules["title_min"],
            "max": rules["title_max"]
        }
    
    if summary_len < rules["summary_min"]:
        return {
            "valid": False,
            "message": rules["summary_message"],
            "current": summary_len,
            "min": rules["summary_min"],
            "max": rules["summary_max"]
        }
    
    if summary_len > rules["summary_max"]:
        return {
            "valid": False,
            "message": rules["summary_message"],
            "current": summary_len,
            "min": rules["summary_min"],
            "max": rules["summary_max"]
        }
    
    return {"valid": True, "message": "Content validation passed"}


def validate_publisher_location_permission(
    target_user: User, 
    news_city_id: Optional[int],
    db: Session
) -> dict:
    """
    Validate if publisher can publish news for this location
    
    RULES:
    - Publisher can ONLY publish for their preferred language and state
    - Publisher can publish for ANY district/city within their state
    - Admin/Employee/Moderator have NO restrictions
    """
    
    # Admin/Employee/Moderator have no location restrictions
    if target_user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]:
        return {"allowed": True, "message": "Admin/Employee/Moderator can publish anywhere"}
    
    # Publisher validation
    if target_user.role == UserRole.PUBLISHER:
        # Get publisher's language preference
        user_pref = db.query(UserPreference).filter(
            UserPreference.user_uid == target_user.user_uid
        ).first()
        
        if not user_pref:
            return {
                "allowed": False, 
                "message": "Please set your language and state preferences first"
            }
        
        # Check if publisher has language preference
        language = db.query(Language).filter(Language.id == user_pref.language_id).first()
        if not language:
            return {
                "allowed": False,
                "message": "Language preference not set"
            }
        
        # If news has city, check if it belongs to publisher's state
        if news_city_id:
            city = db.query(City).filter(City.id == news_city_id).first()
            if city and city.district and city.district.state:
                # Check if city's state matches publisher's preferred state
                if user_pref.state_id and city.district.state.id != user_pref.state_id:
                    return {
                        "allowed": False,
                        "message": f"You can only publish news for your preferred state (State ID: {user_pref.state_id})"
                    }
        
        return {"allowed": True, "message": "Publisher location validation passed"}
    
    return {"allowed": False, "message": "Invalid user role"}

# # =====================================================
# # CONSTANTS
# # =====================================================

# AD_POSITIONS = {
#     "premium": 0,
#     "city_district": 4,
#     "state_language": 8,
#     "national": 12,
#     "rotated_local": 16
# }

# MIXED_CONTENT_POSITIONS = {
#     "sponsored": 10,
#     "event": 11,
#     "poll": 12
# }


# # =====================================================
# # HELPER FUNCTIONS
# # =====================================================

# def get_post_data(post: Post) -> dict:
#     """Extract post data for feed response"""
#     user = post.user
#     return {
#         "post_uid": post.post_uid,
#         "content": post.content[:300] if post.content else None,
#         "image_url": post.image_url,
#         "video_url": post.video_url,
#         "user_uid": post.user_uid,
#         "user_name": user.user_name if user else None,
#         "user_display_name": user.name if user else None,
#         "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
#         "likes": post.like_count,
#         "comments": post.comment_count,
#         "shares": post.share_count,
#         "hashtags": [h.name for h in post.hashtags] if post.hashtags else [],
#         "created_at": post.created_at.isoformat() if post.created_at else None,
#         "time_ago": get_time_ago(post.created_at) if post.created_at else None,
#         "is_edited": post.is_edited if hasattr(post, 'is_edited') else False,
#         "source": "post"
#     }


# def get_news_data(news: News) -> dict:
#     """Extract news data for feed response"""
#     return {
#         "news_uid": news.news_uid,
#         "title": news.title,
#         "summary": news.summary[:200] if news.summary else None,
#         "image_url": news.image_url,
#         "created_at": news.created_at.isoformat() if news.created_at else None,
#         "views": news.views_count,
#         "likes": news.likes_count,
#         "comments": news.comments_count,
#         "shares": news.shares_count,
#         "is_breaking": news.is_breaking,
#         "category_names": [c.name for c in news.categories] if news.categories else [],
#         "location": {
#             "city": news.city.name if news.city else None,
#             "district": news.city.district.name if news.city and news.city.district else None,
#             "state": news.city.district.state.name if news.city and news.city.district and news.city.district.state else None
#         },
#         "source": "news"
#     }


# def get_event_data(event: Event) -> dict:
#     """Extract event data for feed response"""
#     return {
#         "event_uid": event.event_uid,
#         "title": event.title,
#         "description": event.description[:150] if event.description else None,
#         "image_url": event.image_url,
#         "event_date": event.event_date.isoformat() if event.event_date else None,
#         "location": event.location,
#         "is_online": event.is_online,
#         "source": "event"
#     }


# def get_poll_data(poll: Poll) -> dict:
#     """Extract poll data for feed response"""
#     options = []
#     if poll.options:
#         for idx, option in enumerate(poll.options):
#             votes = poll.votes[idx] if poll.votes and idx < len(poll.votes) else 0
#             options.append({
#                 "id": idx + 1,
#                 "text": option,
#                 "votes": votes
#             })
    
#     return {
#         "poll_uid": poll.poll_uid,
#         "question": poll.question,
#         "options": options[:4],
#         "total_votes": sum(poll.votes) if poll.votes else 0,
#         "created_at": poll.created_at.isoformat() if poll.created_at else None,
#         "expires_at": poll.expires_at.isoformat() if poll.expires_at else None,
#         "source": "poll"
#     }


# def get_sponsored_data(sponsored_post) -> dict:
#     """Extract sponsored post data for feed response"""
#     return {
#         "id": sponsored_post.id,
#         "title": sponsored_post.title,
#         "content": sponsored_post.content[:200] if sponsored_post.content else None,
#         "image_url": sponsored_post.image_url,
#         "cta_text": getattr(sponsored_post, 'cta_text', "Learn More"),
#         "cta_url": getattr(sponsored_post, 'cta_url', None),
#         "sponsor_name": getattr(sponsored_post, 'sponsor_name', "Sponsored"),
#         "source": "sponsored"
#     }


# def get_time_ago(dt: datetime) -> str:
#     """Get human-readable time ago string"""
#     if not dt:
#         return ""
#     now = datetime.now(timezone.utc)
#     diff = now - dt
    
#     if diff.days > 0:
#         return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
#     elif diff.seconds >= 3600:
#         hours = diff.seconds // 3600
#         return f"{hours} hour{'s' if hours > 1 else ''} ago"
#     elif diff.seconds >= 60:
#         minutes = diff.seconds // 60
#         return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
#     else:
#         return "Just now"


# def calculate_news_score(news: News, user_pref: UserPreference, current_time: datetime) -> float:
#     """
#     Calculate ranking score for a news article
    
#     Score Components:
#     - Recency Score (40% weight)
#     - Engagement Score (30% weight)
#     - Location Score (20% weight)
#     - Category Score (10% weight)
#     - Breaking News Boost: +50 points
#     """
#     score = 0
    
#     # Make timezone-aware
#     news_created = news.created_at
#     if news_created.tzinfo is None:
#         news_created = news_created.replace(tzinfo=timezone.utc)
    
#     # =========================================================
#     # 1. RECENCY SCORE (0-100) - 40% weight
#     # =========================================================
#     age_hours = (current_time - news_created).total_seconds() / 3600
    
#     if age_hours < 1:
#         recency_score = 100
#     elif age_hours < 6:
#         recency_score = 80
#     elif age_hours < 24:
#         recency_score = 60
#     elif age_hours < 72:
#         recency_score = 40
#     elif age_hours < 168:
#         recency_score = 20
#     else:
#         recency_score = 10
    
#     score += recency_score * 0.4
    
#     # =========================================================
#     # 2. ENGAGEMENT SCORE (0-100) - 30% weight
#     # =========================================================
#     engagement_score = min(
#         (news.views_count / 1000) * 50 +
#         (news.likes_count / 100) * 30 +
#         (news.comments_count / 50) * 15 +
#         (news.shares_count / 20) * 5,
#         100
#     )
    
#     score += engagement_score * 0.3
    
#     # =========================================================
#     # 3. LOCATION SCORE (0-100) - 20% weight
#     # =========================================================
#     location_score = 0
    
#     if user_pref:
#         if user_pref.city_id and news.city_id == user_pref.city_id:
#             location_score = 100
#         elif user_pref.district_id and news.city_id:
#             if news.city and news.city.district_id == user_pref.district_id:
#                 location_score = 80
#             else:
#                 location_score = 10
#         elif user_pref.state_id and news.city_id:
#             if news.city and news.city.district and news.city.district.state_id == user_pref.state_id:
#                 location_score = 60
#             else:
#                 location_score = 10
#         elif user_pref.city_id and not news.city_id:
#             location_score = 30
#         else:
#             location_score = 10
    
#     score += location_score * 0.2
    
#     # =========================================================
#     # 4. CATEGORY SCORE (0-100) - 10% weight
#     # =========================================================
#     category_score = 0
    
#     if user_pref and user_pref.categories and news.categories:
#         user_category_ids = {c.id for c in user_pref.categories}
#         news_category_ids = {c.id for c in news.categories}
        
#         matching_categories = user_category_ids & news_category_ids
        
#         if matching_categories:
#             match_ratio = len(matching_categories) / len(news_category_ids)
#             category_score = min(match_ratio * 100, 100)
    
#     score += category_score * 0.1
    
#     # =========================================================
#     # 5. BREAKING NEWS BOOST
#     # =========================================================
#     if news.is_breaking:
#         if not news.breaking_expires_at or news.breaking_expires_at > current_time:
#             score += 50
    
#     return round(score, 2)


# =====================================================
# CONSTANTS
# =====================================================

AD_POSITIONS = {
    "premium": 0,
    "city_district": 4,
    "state_language": 8,
    "national": 12,
    "rotated_local": 16
}


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_post_data(post: Post) -> dict:
    """Extract post data for feed response"""
    user = post.user
    return {
        "post_uid": post.post_uid,
        "content": post.content[:300] if post.content else None,
        "image_url": post.image_url,
        "video_url": post.video_url,
        "user_uid": post.user_uid,
        "user_name": user.user_name if user else None,
        "user_display_name": user.name if user else None,
        "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
        "likes": post.like_count,
        "comments": post.comment_count,
        "shares": post.share_count,
        "hashtags": [h.name for h in post.hashtags] if post.hashtags else [],
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "time_ago": get_time_ago(post.created_at) if post.created_at else None,
        "is_edited": post.is_edited if hasattr(post, 'is_edited') else False,
        "source": "post"
    }


def get_news_data(news: News) -> dict:
    """Extract news data for feed response"""
    return {
        "news_uid": news.news_uid,
        "title": news.title,
        "summary": news.summary[:200] if news.summary else None,
        "image_url": news.image_url,
        "created_at": news.created_at.isoformat() if news.created_at else None,
        "views": news.views_count,
        "likes": news.likes_count,
        "comments": news.comments_count,
        "shares": news.shares_count,
        "is_breaking": news.is_breaking if hasattr(news, 'is_breaking') else False,
        "category_names": [c.name for c in news.categories] if news.categories else [],
        "category_ids": [c.id for c in news.categories] if news.categories else [],
        "location": {
            "city": news.city.name if news.city else None,
            "district": news.city.district.name if news.city and hasattr(news.city, 'district') and news.city.district else None,
            "state": news.city.district.state.name if news.city and hasattr(news.city, 'district') and news.city.district and hasattr(news.city.district, 'state') else None
        },
        "source": "news"
    }


def get_event_data(event: Event) -> dict:
    """Extract event data for feed response"""
    return {
        "event_uid": event.event_uid if hasattr(event, 'event_uid') else str(event.id),
        "title": event.title,
        "description": event.description[:150] if event.description else None,
        "image_url": event.image_url,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "location": event.location if hasattr(event, 'location') else None,
        "is_online": event.is_online if hasattr(event, 'is_online') else False,
        "source": "event"
    }


def get_poll_data(poll: Poll) -> dict:
    """Extract poll data for feed response"""
    options = []
    if poll.options:
        for idx, option in enumerate(poll.options):
            votes = poll.votes[idx] if poll.votes and idx < len(poll.votes) else 0
            options.append({
                "id": idx + 1,
                "text": option,
                "votes": votes
            })
    
    return {
        "poll_uid": poll.poll_uid if hasattr(poll, 'poll_uid') else str(poll.id),
        "question": poll.question,
        "options": options[:4],
        "total_votes": sum(poll.votes) if poll.votes else 0,
        "created_at": poll.created_at.isoformat() if poll.created_at else None,
        "expires_at": poll.expires_at.isoformat() if poll.expires_at else None,
        "source": "poll"
    }


def get_sponsored_data(sponsored_post) -> dict:
    """Extract sponsored post data for feed response"""
    return {
        "id": sponsored_post.id,
        "title": sponsored_post.title,
        "content": sponsored_post.content[:200] if hasattr(sponsored_post, 'content') and sponsored_post.content else None,
        "image_url": sponsored_post.image_url if hasattr(sponsored_post, 'image_url') else None,
        "cta_text": getattr(sponsored_post, 'cta_text', "Learn More"),
        "cta_url": getattr(sponsored_post, 'cta_url', None),
        "sponsor_name": getattr(sponsored_post, 'sponsor_name', "Sponsored"),
        "source": "sponsored"
    }


def get_time_ago(dt: datetime) -> str:
    """Get human-readable time ago string"""
    if not dt:
        return ""
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


def get_location_name(db: Session, location_type: str, location_id: int) -> Optional[str]:
    """Get location name by type and ID"""
    if not location_type or not location_id:
        return None
    
    try:
        if location_type == "city":
            city = db.query(City).filter(City.id == location_id).first()
            return city.name if city else None
        elif location_type == "district":
            district = db.query(District).filter(District.id == location_id).first()
            return district.name if district else None
        elif location_type == "state":
            state = db.query(State).filter(State.id == location_id).first()
            return state.name if state else None
    except Exception:
        return None
    return None


def calculate_news_score_with_filters(
    news: News, 
    user_pref: Optional[UserPreference], 
    current_time: datetime,
    category: Optional[Category] = None,
    location_type: Optional[str] = None,
    location_id: Optional[int] = None,
    news_type: Optional[str] = None
) -> float:
    """
    Enhanced ranking score with category and location filters
    
    Score Components:
    - Recency Score (35% weight)
    - Engagement Score (25% weight)
    - Location Score (20% weight)
    - Category Score (10% weight)
    - Filter Match Score (10% weight)
    - Breaking News Boost: +50 points
    """
    score = 0.0
    
    # Make timezone-aware
    news_created = news.created_at
    if news_created.tzinfo is None:
        news_created = news_created.replace(tzinfo=timezone.utc)
    
    # =========================================================
    # 1. RECENCY SCORE (0-100) - 35% weight
    # =========================================================
    age_hours = (current_time - news_created).total_seconds() / 3600
    
    if age_hours < 1:
        recency_score = 100
    elif age_hours < 6:
        recency_score = 80
    elif age_hours < 24:
        recency_score = 60
    elif age_hours < 72:
        recency_score = 40
    elif age_hours < 168:
        recency_score = 20
    else:
        recency_score = 10
    
    score += recency_score * 0.35
    
    # =========================================================
    # 2. ENGAGEMENT SCORE (0-100) - 25% weight
    # =========================================================
    engagement_score = min(
        (news.views_count / 1000) * 50 +
        (news.likes_count / 100) * 30 +
        (news.comments_count / 50) * 15 +
        (news.shares_count / 20) * 5,
        100
    )
    
    score += engagement_score * 0.25
    
    # =========================================================
    # 3. LOCATION SCORE (0-100) - 20% weight
    # =========================================================
    location_score = 0
    
    # Use filter location if provided, else use user preference
    if location_type and location_id:
        if location_type == "city" and news.city_id == location_id:
            location_score = 100
        elif location_type == "district" and news.city and news.city.district_id == location_id:
            location_score = 80
        elif location_type == "state" and news.city and news.city.district and news.city.district.state_id == location_id:
            location_score = 60
        else:
            location_score = 10
    elif user_pref:
        if user_pref.city_id and news.city_id == user_pref.city_id:
            location_score = 100
        elif user_pref.district_id and news.city and news.city.district_id == user_pref.district_id:
            location_score = 80
        elif user_pref.state_id and news.city and news.city.district and news.city.district.state_id == user_pref.state_id:
            location_score = 60
        else:
            location_score = 10
    else:
        location_score = 50  # Neutral if no preferences
    
    score += location_score * 0.2
    
    # =========================================================
    # 4. CATEGORY SCORE (0-100) - 10% weight
    # =========================================================
    category_score = 0
    
    if category:
        # If category filter is applied, boost matching news
        if news.categories and category.id in [c.id for c in news.categories]:
            category_score = 100
        else:
            category_score = 0
    elif user_pref and user_pref.categories and news.categories:
        user_category_ids = {c.id for c in user_pref.categories}
        news_category_ids = {c.id for c in news.categories}
        
        matching_categories = user_category_ids & news_category_ids
        
        if matching_categories:
            match_ratio = len(matching_categories) / len(news_category_ids) if news_category_ids else 0
            category_score = min(match_ratio * 100, 100)
    else:
        category_score = 30  # Neutral if no preferences
    
    score += category_score * 0.1
    
    # =========================================================
    # 5. FILTER MATCH SCORE (0-100) - 10% weight
    # =========================================================
    filter_score = 50  # Base score
    
    # News type match
    if news_type and news_type != "all":
        news_type_value = getattr(news, 'news_type', 'national')
        if news_type_value == news_type:
            filter_score += 30
    
    # Category match (if category filter applied)
    if category and news.categories and category.id in [c.id for c in news.categories]:
        filter_score += 20
    
    score += filter_score * 0.1
    
    # =========================================================
    # 6. BREAKING NEWS BOOST
    # =========================================================
    if hasattr(news, 'is_breaking') and news.is_breaking:
        breaking_expires_at = getattr(news, 'breaking_expires_at', None)
        if not breaking_expires_at or breaking_expires_at > current_time:
            score += 50
    
    return round(score, 2)


# =====================================================
# CREATE NEWS
# =====================================================

# @router.post("/news", response_model=NewsOut, status_code=status.HTTP_201_CREATED)
# def create_news(
#     news: NewsCreate, 
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role(UserRole.PUBLISHER))
# ):
#     """Create a new news article (Publisher and above)"""
    
#     # 1️⃣ Verify user exists
#     user = db.query(User).filter_by(user_uid=news.user_uid).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     # 2️⃣ Verify language exists
#     language = db.query(Language).filter_by(id=news.language_id).first()
#     if not language:
#         raise HTTPException(status_code=404, detail="Language not found")

#     # 3️⃣ Handle optional city_id
#     city, district, state = None, None, None
#     if news.city_id:
#         city = db.query(City).filter_by(id=news.city_id).first()
#         if not city:
#             raise HTTPException(status_code=404, detail="City not found")
#         district = city.district
#         state = district.state if district else None

#     # 4️⃣ Generate unique ID
#     news_uid = generate_news_uid()

#     # 5️⃣ Create new News object
#     new_news = News(
#         news_uid=news_uid,
#         title=news.title,
#         summary=news.summary,
#         image_url=news.image_url,
#         language_id=news.language_id,
#         user_uid=news.user_uid,
#         city_id=news.city_id if news.city_id else None,
#         source_url=news.source_url if news.source_url else None,
#         source_name=news.source_name if news.source_name else None,
#         is_approved=0
#     )

#     # 6️⃣ Attach categories
#     if news.category_ids:
#         categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
#         new_news.categories = categories

#     # 7️⃣ Save to DB
#     db.add(new_news)
#     db.commit()
#     db.refresh(new_news)

#     # 8️⃣ Build response
#     return NewsOut(
#         news_uid=new_news.news_uid,
#         title=new_news.title,
#         summary=new_news.summary,
#         image_url=new_news.image_url,
#         language={"id": language.id, "code": language.code, "name": language.name},
#         user_uid=new_news.user_uid,
#         posted_username=user.user_name if hasattr(user, 'user_name') else None,
#         posted_userid=user.user_uid,
#         source_url=new_news.source_url,
#         source_name=new_news.source_name,
#         is_approved=new_news.is_approved,
#         created_at=new_news.created_at,
#         city={"id": city.id, "name": city.name} if city else None,
#         district={"id": district.id, "name": district.name} if district else None,
#         state={"id": state.id, "name": state.name} if state else None,
#         category_ids=[cat.id for cat in new_news.categories]
#     )
from auth.dependencies import require_roles, can_modify_content
from schemas import UserRole

# @router.post("/news", response_model=NewsOut, status_code=status.HTTP_201_CREATED)
# def create_news(
#     news: NewsCreate, 
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
# ):
#     """Create a new news article (Publisher and above)"""
    
#     # 1️⃣ Verify the target user exists
#     target_user = db.query(User).filter_by(user_uid=news.user_uid).first()
#     if not target_user:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     # 2️⃣ Check if user can create news for this target user
#     # Using your existing can_modify_content helper
#     if not can_modify_content(current_user, news.user_uid):
#         raise HTTPException(
#             status_code=403, 
#             detail="You can only create news for your own account"
#         )
    
#     # 3️⃣ Verify target user has publishing permission
#     if target_user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
#         raise HTTPException(
#             status_code=403, 
#             detail="Target user does not have permission to publish news"
#         )

#     # 4️⃣ Verify language exists
#     language = db.query(Language).filter_by(id=news.language_id).first()
#     if not language:
#         raise HTTPException(status_code=404, detail="Language not found")

#     # 5️⃣ Handle optional city_id
#     city, district, state = None, None, None
#     if news.city_id:
#         city = db.query(City).filter_by(id=news.city_id).first()
#         if not city:
#             raise HTTPException(status_code=404, detail="City not found")
#         district = city.district
#         state = district.state if district else None

#     # 6️⃣ Validate categories
#     if news.category_ids:
#         categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
#         if len(categories) != len(news.category_ids):
#             raise HTTPException(status_code=400, detail="One or more category IDs are invalid")
#     else:
#         categories = []

#     # 7️⃣ Generate unique ID
#     news_uid = generate_news_uid()

#     # 8️⃣ Create new News object
#     new_news = News(
#         news_uid=news_uid,
#         title=news.title.strip(),
#         summary=news.summary.strip(),
#         image_url=news.image_url,
#         language_id=news.language_id,
#         user_uid=news.user_uid,
#         city_id=news.city_id if news.city_id else None,
#         source_url=news.source_url if news.source_url else None,
#         source_name=news.source_name if news.source_name else None,
#         is_approved=0,
#         created_at=datetime.now(timezone.utc)
#     )

#     # 9️⃣ Attach categories
#     if categories:
#         new_news.categories = categories

#     # 🔟 Save to DB with error handling
#     try:
#         db.add(new_news)
#         db.commit()
#         db.refresh(new_news)
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Failed to create news: {str(e)}")

#     # 1️⃣1️⃣ Build response
#     return NewsOut(
#         news_uid=new_news.news_uid,
#         title=new_news.title,
#         summary=new_news.summary,
#         image_url=new_news.image_url,
#         language={"id": language.id, "code": language.code, "name": language.name},
#         user_uid=new_news.user_uid,
#         posted_username=target_user.user_name if hasattr(target_user, 'user_name') else None,
#         posted_userid=target_user.user_uid,
#         source_url=new_news.source_url,
#         source_name=new_news.source_name,
#         is_approved=new_news.is_approved,
#         created_at=new_news.created_at,
#         city={"id": city.id, "name": city.name} if city else None,
#         district={"id": district.id, "name": district.name} if district else None,
#         state={"id": state.id, "name": state.name} if state else None,
#         category_ids=[cat.id for cat in new_news.categories]
#     )

# routes/news_routes.py - SIMPLIFIED VERSION

# @router.post("/news", response_model=NewsOut, status_code=status.HTTP_201_CREATED)
# def create_news(
#     news: NewsCreate, 
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
# ):
#     """Create a new news article - Automatically assigned to logged-in user"""
    
#     # =========================================================
#     # 1️⃣ The logged-in user is the publisher
#     # =========================================================
#     target_user = current_user  # ✅ No need to fetch from DB again
    
#     # =========================================================
#     # 2️⃣ Verify user has publishing permission
#     # =========================================================
#     if target_user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
#         raise HTTPException(
#             status_code=403, 
#             detail="You do not have permission to publish news"
#         )

#     # =========================================================
#     # 3️⃣ Verify language exists and get language code
#     # =========================================================
#     language = db.query(Language).filter_by(id=news.language_id).first()
#     if not language:
#         raise HTTPException(status_code=404, detail="Language not found")
    
#     language_code = language.code.lower()
    
#     # =========================================================
#     # 4️⃣ CONTENT VALIDATION (InShorts Style)
#     # =========================================================
#     title = news.title.strip()
#     summary = news.summary.strip()
    
#     if not title:
#         raise HTTPException(status_code=400, detail="Title is required")
#     if not summary:
#         raise HTTPException(status_code=400, detail="Summary is required")
    
#     # Language-specific validation
#     validation = validate_content_by_language(title, summary, language_code)
#     if not validation["valid"]:
#         raise HTTPException(
#             status_code=400,
#             detail={
#                 "error": True,
#                 "message": validation["message"],
#                 "current_length": validation.get("current"),
#                 "min_length": validation.get("min"),
#                 "max_length": validation.get("max"),
#                 "language": language_code
#             }
#         )
    
#     # =========================================================
#     # 5️⃣ Additional content quality checks
#     # =========================================================
#     if title.count('!') > 2 or title.count('?') > 2:
#         raise HTTPException(status_code=400, detail="Too many punctuation marks in title")
    
#     if title.isupper() and len(title) > 10:
#         raise HTTPException(status_code=400, detail="Title should not be in ALL CAPS")
    
#     words = title.lower().split()
#     if len(words) > 3 and len(set(words)) < len(words) * 0.5:
#         raise HTTPException(status_code=400, detail="Title contains too many repeated words")
    
#     # =========================================================
#     # 6️⃣ Handle optional city_id
#     # =========================================================
#     city, district, state = None, None, None
#     if news.city_id:
#         city = db.query(City).filter_by(id=news.city_id).first()
#         if not city:
#             raise HTTPException(status_code=404, detail="City not found")
#         district = city.district
#         state = district.state if district else None

#     # =========================================================
#     # 7️⃣ Validate categories
#     # =========================================================
#     categories = []
#     if news.category_ids:
#         categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
#         if len(categories) != len(news.category_ids):
#             raise HTTPException(status_code=400, detail="One or more category IDs are invalid")

#     # =========================================================
#     # 8️⃣ Generate unique ID
#     # =========================================================
#     news_uid = generate_news_uid()

#     # =========================================================
#     # 9️⃣ Create new News object
#     # =========================================================
#     new_news = News(
#         news_uid=news_uid,
#         title=title,
#         summary=summary,
#         image_url=news.image_url,
#         language_id=news.language_id,
#         user_uid=current_user.user_uid,  # ✅ From JWT token
#         city_id=news.city_id if news.city_id else None,
#         source_url=news.source_url if news.source_url else None,
#         source_name=news.source_name if news.source_name else None,
#         is_approved=0,
#         created_at=datetime.now(timezone.utc)
#     )

#     if categories:
#         new_news.categories = categories

#     # =========================================================
#     # 🔟 Save to DB
#     # =========================================================
#     try:
#         db.add(new_news)
#         db.commit()
#         db.refresh(new_news)
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Failed to create news: {str(e)}")

#     # =========================================================
#     # 1️⃣1️⃣ Award points to publisher
#     # =========================================================
#     try:
#         from services.rewards_service import RewardsService
#         rewards_service = RewardsService(db)
#         rewards_service.add_points(
#             user_uid=current_user.user_uid,
#             points=25,
#             description=f"Published news: {title[:50]}",
#             reference_id=news_uid,
#             metadata={"action_type": "publish_news", "news_uid": news_uid}
#         )
#     except Exception as e:
#         logger.warning(f"Failed to award points: {e}")

#     # =========================================================
#     # 1️⃣2️⃣ Build response
#     # =========================================================
#     return NewsOut(
#         news_uid=new_news.news_uid,
#         title=new_news.title,
#         summary=new_news.summary,
#         image_url=new_news.image_url,
#         language={"id": language.id, "code": language.code, "name": language.name},
#         user_uid=current_user.user_uid,
#         posted_username=current_user.user_name,
#         posted_userid=current_user.user_uid,
#         source_url=new_news.source_url,
#         source_name=new_news.source_name,
#         is_approved=new_news.is_approved,
#         created_at=new_news.created_at,
#         city={"id": city.id, "name": city.name} if city else None,
#         district={"id": district.id, "name": district.name} if district else None,
#         state={"id": state.id, "name": state.name} if state else None,
#         category_ids=[cat.id for cat in new_news.categories]
#     )

# routes/news_routes.py - FINAL VERSION

# routes/news_routes.py - COMPLETE UPDATED API

@router.post("/news", response_model=NewsCreateResponse, status_code=status.HTTP_201_CREATED)
def create_news(
    news: NewsCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """
    Create a new news article
    
    RULES:
    ┌─────────────────┬────────────────────────────────────────────────────────┐
    │ ROLE            │ PUBLISHING RULES                                       │
    ├─────────────────┼────────────────────────────────────────────────────────┤
    │ PUBLISHER       │ - Only their preferred language                        │
    │                 │ - Only their preferred state                           │
    │                 │ - ANY district/city within their state                 │
    │                 │ - NO source_url (copyright protection)                 │
    │                 │ - Needs admin approval                                 │
    ├─────────────────┼────────────────────────────────────────────────────────┤
    │ MODERATOR       │ - Any language                                         │
    │                 │ - Any state/district/city                              │
    │                 │ - Can use source_url                                   │
    │                 │ - Auto-approved                                        │
    ├─────────────────┼────────────────────────────────────────────────────────┤
    │ EMPLOYEE        │ - Any language                                         │
    │                 │ - Any state/district/city                              │
    │                 │ - Can use source_url                                   │
    │                 │ - Auto-approved                                        │
    ├─────────────────┼────────────────────────────────────────────────────────┤
    │ ADMIN           │ - Any language                                         │
    │                 │ - Any state/district/city                              │
    │                 │ - Can use source_url                                   │
    │                 │ - Auto-approved                                        │
    └─────────────────┴────────────────────────────────────────────────────────┘
    """
    
    # =========================================================
    # 1️⃣ DETERMINE TARGET USER (Who gets credit)
    # =========================================================
    
    is_admin_or_employee = current_user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]
    
    if news.user_uid and is_admin_or_employee:
        target_user = db.query(User).filter_by(user_uid=news.user_uid).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Target publisher not found")
        
        if target_user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
            raise HTTPException(
                status_code=403, 
                detail=f"User {target_user.user_uid} does not have publishing permission"
            )
    else:
        target_user = current_user
        
        if news.user_uid and news.user_uid != current_user.user_uid:
            raise HTTPException(
                status_code=403, 
                detail="Publishers can only create news for themselves. Omit 'user_uid' field."
            )
    
    # =========================================================
    # 2️⃣ VERIFY PUBLISHER PERMISSION
    # =========================================================
    if target_user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403, 
            detail=f"User {target_user.user_uid} does not have permission to publish news"
        )
    
    # =========================================================
    # 3️⃣ LOCATION PERMISSION VALIDATION (Publisher restrictions)
    # =========================================================
    location_validation = validate_publisher_location_permission(
        target_user, news.city_id, db
    )
    if not location_validation["allowed"]:
        raise HTTPException(status_code=403, detail=location_validation["message"])
    
    # =========================================================
    # 4️⃣ SOURCE URL VALIDATION
    # =========================================================
    source_url = None
    source_name = None
    is_auto_generated = False
    
    if news.source_url:
        if not is_admin_or_employee:
            raise HTTPException(
                status_code=403,
                detail="Only Admin, Employee, or Moderator can use source_url"
            )
        source_url = str(news.source_url)
        source_name = news.source_name or extract_source_name(source_url)
        is_auto_generated = True
    
    # =========================================================
    # 5️⃣ VERIFY LANGUAGE
    # =========================================================
    language = db.query(Language).filter_by(id=news.language_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    
    language_code = language.code.lower()
    
    # =========================================================
    # 6️⃣ LANGUAGE PERMISSION (Publisher can only use their preferred language)
    # =========================================================
    if target_user.role == UserRole.PUBLISHER:
        user_pref = db.query(UserPreference).filter(
            UserPreference.user_uid == target_user.user_uid
        ).first()
        
        if user_pref:
            user_language = db.query(Language).filter(
                Language.id == user_pref.language_id
            ).first()
            if user_language and user_language.code.lower() != language_code:
                raise HTTPException(
                    status_code=403,
                    detail=f"You can only publish in your preferred language: {user_language.name}"
                )
    
    # =========================================================
    # 7️⃣ CONTENT VALIDATION
    # =========================================================
    title = news.title.strip()
    summary = news.summary.strip()
    
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not summary:
        raise HTTPException(status_code=400, detail="Summary is required")
    
    validation = validate_content_by_language(title, summary, language_code)
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": validation["message"],
                "current_length": validation.get("current"),
                "min_length": validation.get("min"),
                "max_length": validation.get("max"),
                "language": language_code
            }
        )
    
    # =========================================================
    # 8️⃣ QUALITY CHECKS
    # =========================================================
    if title.count('!') > 2 or title.count('?') > 2:
        raise HTTPException(status_code=400, detail="Too many punctuation marks in title")
    
    if title.isupper() and len(title) > 10:
        raise HTTPException(status_code=400, detail="Title should not be in ALL CAPS")
    
    # =========================================================
    # 9️⃣ LOCATION DATA
    # =========================================================
    city, district, state = None, None, None
    
    if news.city_id:
        city = db.query(City).filter_by(id=news.city_id).first()
        if not city:
            raise HTTPException(status_code=404, detail="City not found")
        district = city.district
        state = district.state if district else None
    
    # =========================================================
    # 🔟 CATEGORIES VALIDATION
    # =========================================================
    categories = []
    if news.category_ids:
        categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
        if len(categories) != len(news.category_ids):
            raise HTTPException(status_code=400, detail="One or more category IDs are invalid")
    
    # =========================================================
    # 1️⃣1️⃣ GENERATE UNIQUE ID
    # =========================================================
    news_uid = generate_news_uid()
    
    # =========================================================
    # 1️⃣2️⃣ DETERMINE APPROVAL STATUS
    # =========================================================
    is_auto_approved = is_admin_or_employee
    is_approved = 1 if is_auto_approved else 0
    
    # =========================================================
    # 1️⃣3️⃣ CREATE NEWS OBJECT
    # =========================================================
    # Check for duplicate story before creation
    dup_service = DuplicateDetectionService(db)
    dup_result = dup_service.check_duplicate(
        title=title,
        summary=summary,
        language_id=news.language_id,
        source_url=str(news.source_url) if news.source_url else None
    )
    if dup_result.is_duplicate and dup_result.duplicate_score >= 0.95:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate news story detected: this article already exists (matched news UID: {dup_result.matched_news_uid})."
        )

    new_news = News(
        news_uid=news_uid,
        title=title,
        summary=summary,
        image_url=str(news.image_url) if news.image_url else None,  # ✅ Convert to string

        language_id=news.language_id,
        user_uid=target_user.user_uid,
        city_id=news.city_id if news.city_id else None,
        source_url=str(news.source_url) if news.source_url else None,  # ✅ Convert to string
        source_name=source_name,
        is_auto_generated=is_auto_generated,
        is_approved=is_approved,
        cluster_id=dup_result.cluster_id,
        canonical_story_id=dup_result.canonical_story_id,
        is_duplicate=dup_result.is_duplicate,
        duplicate_score=dup_result.duplicate_score,
        approved_at=datetime.now(timezone.utc) if is_auto_approved else None,
        approved_by_uid=current_user.user_uid if is_auto_approved else None,
        created_at=datetime.now(timezone.utc)
    )
    
    if categories:
        new_news.categories = categories
    
    # =========================================================
    # 1️⃣4️⃣ SAVE TO DATABASE
    # =========================================================
    try:
        db.add(new_news)
        db.commit()
        db.refresh(new_news)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create news: {str(e)}")
    
    # =========================================================
    # 1️⃣5️⃣ AWARD POINTS
    # =========================================================
    try:
        if is_approved:
            from services.rewards_service import RewardsService
            rewards_service = RewardsService(db)
            rewards_service.add_points(
                user_uid=target_user.user_uid,
                points=25,
                description=f"Published news: {title[:50]}",
                reference_id=news_uid,
                metadata={"action_type": "publish_news", "news_uid": news_uid}
            )
    except Exception as e:
        logger.warning(f"Failed to award points: {e}")
    
    # =========================================================
    # 1️⃣6️⃣ BUILD RESPONSE
    # =========================================================
    category_list = [{"id": cat.id, "name": cat.name} for cat in new_news.categories]
    
    if is_approved:
        message = "✅ Your news has been published successfully!"
        next_steps = "Your news is now live and visible to all users."
        status_text = "approved"
    else:
        message = "📝 Your news has been submitted for review!"
        next_steps = "Our moderators will review your news. You will be notified once approved."
        status_text = "pending_review"
    
    news_out = NewsOut(
        news_uid=new_news.news_uid,
        title=new_news.title,
        summary=new_news.summary,
        image_url=new_news.image_url,
        language_id=language.id,
        language_code=language.code,
        language_name=language.name,
        user_uid=target_user.user_uid,
        publisher_name=target_user.name,
        publisher_username=target_user.user_name,
        city_id=city.id if city else None,
        city_name=city.name if city else None,
        district_id=district.id if district else None,
        district_name=district.name if district else None,
        state_id=state.id if state else None,
        state_name=state.name if state else None,
        categories=category_list,
        category_ids=[c.id for c in new_news.categories],
        source_url=source_url,
        source_name=source_name,
        is_auto_generated=is_auto_generated,
        is_approved=is_approved,
        approval_status=status_text,
        rejection_reason=None,
        created_at=new_news.created_at,
        approved_at=new_news.approved_at,
        engagement=None
    )
    
    return NewsCreateResponse(
        success=True,
        message=message,
        news=news_out,
        status=status_text,
        next_steps=next_steps
    )
# =====================================================
# BREAKING NEWS
# =====================================================

@router.put("/admin/news/{news_uid}/breaking", tags=["Admin", "Moderation"])
def set_breaking_news(
    news_uid: str,
    payload: BreakingNewsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """
    Set news as breaking news (Moderator and Admin only)
    
    - MODERATOR: Can set/unset breaking news
    - ADMIN: Full access
    """
    news = db.query(News).filter(News.news_uid == news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")
    
    # Optional: Add logging for audit trail
    action = "set as breaking" if payload.is_breaking else "removed breaking status"
    
    if payload.is_breaking:
        # Validate priority range (1-5)
        if payload.priority < 1 or payload.priority > 5:
            raise HTTPException(400, "Priority must be between 1 and 5")
        
        # Validate expire hours
        if payload.expire_hours < 1 or payload.expire_hours > 72:
            raise HTTPException(400, "Expire hours must be between 1 and 72")
        
        news.is_breaking = True
        news.breaking_priority = payload.priority
        news.breaking_expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expire_hours)
    else:
        news.is_breaking = False
        news.breaking_priority = 0
        news.breaking_expires_at = None

    news.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    # Optional: Create notification for users
    # background_tasks.add_task(notify_users_breaking_news, news, action)
    
    return {
        "message": f"Breaking news {action} successfully",
        "news_uid": news_uid,
        "is_breaking": news.is_breaking,
        "priority": news.breaking_priority if news.is_breaking else None,
        "expires_at": news.breaking_expires_at if news.is_breaking else None,
        "updated_by": current_user.user_uid,
        "updated_by_role": UserRole(current_user.role).name
    }

@router.get("/news/breaking")
def get_breaking_news(db: Session = Depends(get_db)):
    """Get active breaking news"""
    breaking_news = db.query(News).filter(
        News.is_breaking == True,
        News.breaking_expires_at > datetime.now(timezone.utc),
        News.is_approved == 1
    ).order_by(desc(News.breaking_priority)).limit(5).all()

    return [
        {
            "news_uid": n.news_uid,
            "title": n.title,
            "summary": n.summary[:150] if n.summary else None,
            "image_url": n.image_url,
            "priority": n.breaking_priority,
            "expires_at": n.breaking_expires_at
        }
        for n in breaking_news
    ]


# =====================================================
# NEWS FEED
# =====================================================

# routes/news_routes.py - CORRECTED FEED ENDPOINT

@router.get("/feed", response_model=dict)
def get_news_feed(
    request: Request,
    cursor: Optional[datetime] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=5, le=50, description="Number of items per page"),
    hashtag: Optional[str] = Query(None, description="Filter by hashtag"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    location_type: Optional[str] = Query(None, description="city, district, state"),
    location_id: Optional[int] = Query(None, description="Location ID"),
    news_type: Optional[str] = Query(None, description="national, state, local, all"),
    language_id: Optional[int] = Query(None, description="Filter by language ID"),
    session_id: Optional[str] = Query(None, description="Session ID for ad rotation"),
    include_ads: str = Query("true", description="Include advertisements"),
    include_sponsored: str = Query("true", description="Include sponsored posts"),
    include_events: str = Query("true", description="Include upcoming events"),
    include_polls: str = Query("true", description="Include active polls"),
    include_posts: str = Query("true", description="Include trending user posts"),
    post_limit: int = Query(2, ge=1, le=5, description="Number of trending posts to mix in"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Complete News Feed with guest access, category/location filtering, ranking & monetization.
    """
    current_time = datetime.now(timezone.utc)
    user_uid = current_user.user_uid if current_user else None
    
    # ✅ Clean and convert parameters
    try:
        limit = int(str(limit).strip())
        post_limit = int(str(post_limit).strip())
        include_ads = str(include_ads).strip().lower() == "true"
        include_sponsored = str(include_sponsored).strip().lower() == "true"
        include_events = str(include_events).strip().lower() == "true"
        include_polls = str(include_polls).strip().lower() == "true"
        include_posts = str(include_posts).strip().lower() == "true"
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid parameter value: {str(e)}")
    
    # Make cursor timezone-aware if provided
    if cursor and cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=timezone.utc)
    
    # =========================================================
    # 1️⃣ GET USER PREFERENCES (WITH GUEST / DEFAULT FALLBACK)
    # =========================================================
    user_pref = None
    if user_uid:
        user_pref = db.query(UserPreference).options(
            joinedload(UserPreference.categories),
            joinedload(UserPreference.language)
        ).filter(UserPreference.user_uid == user_uid).first()
    
    if not user_pref:
        default_lang = db.query(Language).filter(Language.is_active == True).first()
        active_lang_id = language_id if language_id else (default_lang.id if default_lang else 1)

        class GuestPreferences:
            def __init__(self, lang_id):
                self.language_id = lang_id
                self.city_id = location_id if location_type == "city" else None
                self.district_id = location_id if location_type == "district" else None
                self.state_id = location_id if location_type == "state" else None
                self.categories = []
                self.language = default_lang

        user_pref = GuestPreferences(active_lang_id)
    elif language_id:
        user_pref.language_id = language_id
    
    # =========================================================
    # 2️⃣ GET NEWS - CANONICAL STORIES ONLY (EXCLUDE DUPLICATES)
    # =========================================================
    news_query = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language)
    ).filter(
        News.is_approved == 1,
        News.is_duplicate == False,
        News.language_id == user_pref.language_id
    )

    # Category filtering
    if category_id:
        news_query = news_query.filter(News.categories.any(Category.id == category_id))
    elif category_slug:
        news_query = news_query.filter(News.categories.any(Category.slug == category_slug))

    # Location filtering
    if location_type and location_id:
        if location_type == "city":
            news_query = news_query.filter(News.city_id == location_id)
        elif location_type == "district":
            news_query = news_query.join(News.city).filter(City.district_id == location_id)
        elif location_type == "state":
            news_query = news_query.join(News.city).join(City.district).filter(District.state_id == location_id)
    
    if cursor:
        news_query = news_query.filter(News.created_at < cursor)
    
    news_query = news_query.order_by(News.created_at.desc())
    
    # Fetch candidate batch for ranking & diversity engine
    all_news = news_query.limit(limit * 3).all()
    
    # Apply modern ranking algorithm with diversity controls
    ranking_service = NewsRankingService()
    ranked_news = ranking_service.rank_and_diversify_feed(all_news, user_pref, current_time)
    
    # =========================================================
    # 3️⃣ GET TRENDING POSTS
    # =========================================================
    posts = []
    if include_posts:
        try:
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            
            query = db.query(Post).options(
                joinedload(Post.user),
                joinedload(Post.hashtags)
            ).filter(
                Post.created_at >= week_ago
            )
            
            if hashtag:
                from models.post import PostHashtag
                query = query.join(Post.hashtags).filter(PostHashtag.name == hashtag)
            
            query = query.order_by(
                desc(Post.like_count + Post.comment_count + Post.share_count)
            )
            
            trending_posts = query.limit(post_limit + 5).all()
            posts = trending_posts[:post_limit]
            
            logger.info(f"✅ Retrieved {len(posts)} trending posts")
        except Exception as e:
            logger.error(f"Error fetching trending posts: {e}")
            posts = []
    
    # =========================================================
    # 4️⃣ GET ADS (DIRECT QUERY - NO HELPER)
    # =========================================================
    ads = []
    if include_ads:
        try:
            # ✅ Direct query for ads
            ads_query = db.query(Advertisement).filter(
                Advertisement.is_active == True,
                Advertisement.is_approved == True,
                Advertisement.start_date <= current_time,
                Advertisement.end_date >= current_time
            )
            
            # Location targeting
            if user_pref.city_id:
                ads_query = ads_query.filter(
                    or_(
                        Advertisement.city_id == user_pref.city_id,
                        Advertisement.city_id == None
                    )
                )
            
            if user_pref.state_id:
                ads_query = ads_query.filter(
                    or_(
                        Advertisement.state_id == user_pref.state_id,
                        Advertisement.state_id == None
                    )
                )
            
            # Language targeting
            if user_pref.language_id:
                ads_query = ads_query.filter(
                    or_(
                        Advertisement.language_id == user_pref.language_id,
                        Advertisement.language_id == None
                    )
                )
            
            # Order by premium first
            ads_query = ads_query.order_by(
                desc(Advertisement.is_premium),
                desc(Advertisement.premium_priority),
                Advertisement.created_at.desc()
            )
            
            ads = ads_query.limit(10).all()
            logger.info(f"✅ Retrieved {len(ads)} ads")
        except Exception as e:
            logger.error(f"Error fetching ads: {e}")
            ads = []
    
    # =========================================================
    # 5️⃣ GET SPONSORED POSTS (DIRECT QUERY)
    # =========================================================
    sponsored_posts = []
    if include_sponsored:
        try:
            sponsored_query = db.query(SponsoredPost).filter(
                SponsoredPost.is_approved == True,
                SponsoredPost.start_date <= current_time,
                SponsoredPost.end_date >= current_time
            )
            
            # Location targeting
            if user_pref.city_id:
                sponsored_query = sponsored_query.filter(
                    or_(
                        SponsoredPost.city_id == user_pref.city_id,
                        SponsoredPost.city_id == None
                    )
                )
            
            if user_pref.state_id:
                sponsored_query = sponsored_query.filter(
                    or_(
                        SponsoredPost.state_id == user_pref.state_id,
                        SponsoredPost.state_id == None
                    )
                )
            
            # Language targeting
            if user_pref.language_id:
                sponsored_query = sponsored_query.filter(
                    or_(
                        SponsoredPost.language_id == user_pref.language_id,
                        SponsoredPost.language_id == None
                    )
                )
            
            sponsored_posts = sponsored_query.order_by(
                SponsoredPost.created_at.desc()
            ).limit(3).all()
            
            logger.info(f"✅ Retrieved {len(sponsored_posts)} sponsored posts")
        except Exception as e:
            logger.error(f"Error fetching sponsored posts: {e}")
            sponsored_posts = []
    
    # =========================================================
    # 6️⃣ GET EVENTS
    # =========================================================
    events = []
    if include_events:
        try:
            events = db.query(Event).filter(
                Event.is_approved == True,
                Event.event_date >= current_time.date()
            ).order_by(Event.event_date.asc()).limit(3).all()
            logger.info(f"✅ Retrieved {len(events)} events")
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            events = []
    
    # =========================================================
    # 7️⃣ GET POLLS
    # =========================================================
    polls = []
    if include_polls:
        try:
            polls = db.query(Poll).filter(
                Poll.is_approved == True,
                (Poll.expires_at == None) | (Poll.expires_at > current_time)
            ).order_by(desc(Poll.created_at)).limit(2).all()
            logger.info(f"✅ Retrieved {len(polls)} polls")
        except Exception as e:
            logger.error(f"Error fetching polls: {e}")
            polls = []
    
    # =========================================================
    # 8️⃣ BUILD FEED
    # =========================================================
    feed = []
    news_index = 0
    post_index = 0
    ad_index = 0
    sponsored_index = 0
    event_index = 0
    poll_index = 0
    
    def add_news():
        nonlocal news_index
        if news_index < len(ranked_news):
            news = ranked_news[news_index]
            feed.append({
                "type": "news",
                "data": get_news_data(news),
                "position": len(feed),
                "ranking_score": getattr(news, "ranking_score", 0.0)
            })
            news_index += 1
            return True
        return False
    
    def add_post():
        nonlocal post_index
        if post_index < len(posts):
            post = posts[post_index]
            feed.append({
                "type": "post",
                "data": get_post_data(post),
                "position": len(feed),
                "source": "trending"
            })
            post_index += 1
            return True
        return False
    
    def add_ad():
        nonlocal ad_index
        if ad_index < len(ads):
            ad = ads[ad_index]
            feed.append({
                "type": "ad",
                "data": {
                    "id": ad.id,
                    "title": ad.title,
                    "image_url": ad.image_url,
                    "redirect_url": ad.redirect_url,
                    "cta_text": "Learn More",
                    "priority": "premium" if ad.is_premium else "standard"
                },
                "position": len(feed)
            })
            ad_index += 1
            return True
        return False
    
    def add_sponsored():
        nonlocal sponsored_index
        if sponsored_index < len(sponsored_posts):
            post = sponsored_posts[sponsored_index]
            feed.append({
                "type": "sponsored",
                "data": get_sponsored_data(post),
                "position": len(feed)
            })
            sponsored_index += 1
            return True
        return False
    
    def add_event():
        nonlocal event_index
        if event_index < len(events):
            event = events[event_index]
            feed.append({
                "type": "event",
                "data": get_event_data(event),
                "position": len(feed)
            })
            event_index += 1
            return True
        return False
    
    def add_poll():
        nonlocal poll_index
        if poll_index < len(polls):
            poll = polls[poll_index]
            feed.append({
                "type": "poll",
                "data": get_poll_data(poll),
                "position": len(feed)
            })
            poll_index += 1
            return True
        return False
    
    # =========================================================
    # BUILD FEED
    # =========================================================
    
    # Premium Ad at top
    if not add_ad():
        add_news()
    
    # First 3 news + 1 post
    for i in range(3):
        add_news()
        if i == 1:
            add_post()
    
    # City/District Ad
    if not add_ad():
        add_news()
    
    # Next 3 news + sponsored
    for i in range(3):
        add_news()
        if i == 1:
            add_sponsored()
    
    # State/Language Ad
    if not add_ad():
        add_news()
    
    # Mixed content: news + event + poll + sponsored
    for i in range(3):
        add_news()
        if i == 0:
            add_event()
        elif i == 1:
            add_poll()
        elif i == 2:
            add_sponsored()
    
    # National Ad
    if not add_ad():
        add_news()
    
    # Remaining news
    while news_index < len(ranked_news):
        add_news()
        
        if news_index % 5 == 0 and post_index < len(posts):
            add_post()
        if news_index % 10 == 0 and sponsored_index < len(sponsored_posts):
            add_sponsored()
    
    # Add remaining posts
    while post_index < len(posts):
        add_post()
    
    # Add remaining sponsored
    while sponsored_index < len(sponsored_posts):
        add_sponsored()
    
    # =========================================================
    # GET NEXT CURSOR
    # =========================================================
    next_cursor = ranked_news[-1].created_at if ranked_news else None
    if next_cursor and next_cursor.tzinfo is None:
        next_cursor = next_cursor.replace(tzinfo=timezone.utc)
    
    # Count stats
    news_count = sum(1 for item in feed if item.get("type") == "news")
    post_count = sum(1 for item in feed if item.get("type") == "post")
    ad_count = sum(1 for item in feed if item.get("type") == "ad")
    sponsored_count = sum(1 for item in feed if item.get("type") == "sponsored")
    event_count = sum(1 for item in feed if item.get("type") == "event")
    poll_count = sum(1 for item in feed if item.get("type") == "poll")
    
    logger.info(f"📊 Feed built: News={news_count}, Posts={post_count}, Ads={ad_count}, Sponsored={sponsored_count}, Events={event_count}, Polls={poll_count}")
    
    return {
        "items": feed[:limit],
        "metadata": {
            "total_items": len(feed),
            "returned_items": len(feed[:limit]),
            "next_cursor": next_cursor.isoformat() if next_cursor else None,
            "has_more": len(ranked_news) >= limit,
            "user_uid": user_uid,
            "hashtag_filter": hashtag,
            "feed_composition": {
                "news": news_count,
                "posts": post_count,
                "ads": ad_count,
                "sponsored": sponsored_count,
                "events": event_count,
                "polls": poll_count
            },
            "ad_metadata": {
                "ads_shown": ad_index,
                "premium_ad_shown": ad_index > 0,
                "sponsored_shown": sponsored_index,
                "events_shown": event_index,
                "polls_shown": poll_index
            },
            "ranking_summary": {
                "total_scored": len(ranked_news),
                "top_score": getattr(ranked_news[0], "ranking_score", 0.0) if ranked_news else 0,
                "avg_score": round(sum(getattr(n, "ranking_score", 0.0) for n in ranked_news[:20]) / min(20, len(ranked_news)), 2) if ranked_news else 0
            }
        }
    }


@router.get("/feed_new", response_model=dict, tags=["News"])
def get_news_feed_new_alias(
    request: Request,
    cursor: Optional[datetime] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=5, le=50, description="Number of items per page"),
    hashtag: Optional[str] = Query(None, description="Filter by hashtag"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    location_type: Optional[str] = Query(None, description="city, district, state"),
    location_id: Optional[int] = Query(None, description="Location ID"),
    news_type: Optional[str] = Query(None, description="national, state, local, all"),
    language_id: Optional[int] = Query(None, description="Filter by language ID"),
    session_id: Optional[str] = Query(None, description="Session ID for ad rotation"),
    include_ads: str = Query("true", description="Include advertisements"),
    include_sponsored: str = Query("true", description="Include sponsored posts"),
    include_events: str = Query("true", description="Include upcoming events"),
    include_polls: str = Query("true", description="Include active polls"),
    include_posts: str = Query("true", description="Include trending user posts"),
    post_limit: int = Query(2, ge=1, le=5, description="Number of trending posts to mix in"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Backward-compatible alias for /feed with unified ranking, guest support, and duplicate filtering.
    """
    return get_news_feed(
        request=request,
        cursor=cursor,
        limit=limit,
        hashtag=hashtag,
        category_id=category_id,
        category_slug=category_slug,
        location_type=location_type,
        location_id=location_id,
        news_type=news_type,
        language_id=language_id,
        session_id=session_id,
        include_ads=include_ads,
        include_sponsored=include_sponsored,
        include_events=include_events,
        include_polls=include_polls,
        include_posts=include_posts,
        post_limit=post_limit,
        db=db,
        current_user=current_user,
    )
    
# routes/news_routes.py - ADD THIS NEW ENDPOINT

@router.get("/trending", response_model=dict)
def get_trending_feed(
    request: Request,
    hours: int = Query(24, ge=1, le=168, description="Hours to look back for trending content"),
    limit: int = Query(20, ge=5, le=50, description="Number of items per page"),
    cursor: Optional[datetime] = Query(None, description="Pagination cursor"),
    include_posts: bool = Query(True, description="Include trending user posts"),
    post_limit: int = Query(3, ge=1, le=5, description="Number of trending posts to mix in"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get trending content from the last N hours
    - Calculates engagement score: views + likes*2 + comments*3 + shares*4
    - Weighted by recency (newer content gets higher score)
    - Includes both news articles and user posts
    """
    current_time = datetime.now(timezone.utc)
    cutoff_time = current_time - timedelta(hours=hours)
    user_uid = current_user.user_uid
    
    # =========================================================
    # 1️⃣ GET USER PREFERENCES (for language filtering)
    # =========================================================
    user_pref = db.query(UserPreference).options(
        joinedload(UserPreference.categories),
        joinedload(UserPreference.language)
    ).filter(UserPreference.user_uid == user_uid).first()
    
    if not user_pref:
        raise HTTPException(
            status_code=404, 
            detail="User preferences not found. Please set your preferences first."
        )
    
    # =========================================================
    # 2️⃣ GET TRENDING NEWS (Last N hours)
    # =========================================================
    news_query = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language)
    ).filter(
        News.is_approved == 1,
        News.language_id == user_pref.language_id,
        News.created_at >= cutoff_time
    )
    
    if cursor:
        news_query = news_query.filter(News.created_at < cursor)
    
    # Calculate trending score
    all_news = news_query.order_by(News.created_at.desc()).limit(limit + 10).all()
    
    # Score each news item
    scored_news = []
    for news in all_news:
        # Trending score = engagement + recency boost
        engagement_score = (
            news.views_count * 1 +
            news.likes_count * 2 +
            news.comments_count * 3 +
            news.shares_count * 4
        )
        
        # Recency boost (newer = higher score)
        hours_ago = (current_time - news.created_at).total_seconds() / 3600
        recency_boost = max(0, (24 - hours_ago) / 24 * 50) if hours_ago < 24 else 0
        
        total_score = engagement_score + recency_boost
        scored_news.append((total_score, news))
    
    # Sort by score (highest first)
    scored_news.sort(key=lambda x: x[0], reverse=True)
    ranked_news = [news for score, news in scored_news]
    
    # =========================================================
    # 3️⃣ GET TRENDING POSTS (Last N hours)
    # =========================================================
    posts = []
    if include_posts:
        try:
            posts_query = db.query(Post).options(
                joinedload(Post.user),
                joinedload(Post.hashtags)
            ).filter(
                Post.created_at >= cutoff_time
            )
            
            # Calculate post score
            all_posts = posts_query.order_by(
                desc(Post.created_at)
            ).limit(post_limit + 5).all()
            
            scored_posts = []
            for post in all_posts:
                post_score = (
                    post.like_count * 2 +
                    post.comment_count * 3 +
                    post.share_count * 4
                )
                hours_ago = (current_time - post.created_at).total_seconds() / 3600
                recency_boost = max(0, (24 - hours_ago) / 24 * 30) if hours_ago < 24 else 0
                total_score = post_score + recency_boost
                scored_posts.append((total_score, post))
            
            scored_posts.sort(key=lambda x: x[0], reverse=True)
            posts = [post for score, post in scored_posts[:post_limit]]
            
        except Exception as e:
            logger.error(f"Error fetching trending posts: {e}")
            posts = []
    
    # =========================================================
    # 4️⃣ BUILD FEED
    # =========================================================
    feed = []
    news_index = 0
    post_index = 0
    
    def add_news():
        nonlocal news_index
        if news_index < len(ranked_news):
            news = ranked_news[news_index]
            feed.append({
                "type": "news",
                "data": get_news_data(news),
                "trending_score": scored_news[news_index][0] if news_index < len(scored_news) else 0,
                "position": len(feed)
            })
            news_index += 1
            return True
        return False
    
    def add_post():
        nonlocal post_index
        if post_index < len(posts):
            post = posts[post_index]
            feed.append({
                "type": "post",
                "data": get_post_data(post),
                "source": "trending",
                "position": len(feed)
            })
            post_index += 1
            return True
        return False
    
    # Build feed: Mix news and posts (3 news : 1 post ratio)
    counter = 0
    while news_index < len(ranked_news) or post_index < len(posts):
        if news_index < len(ranked_news):
            add_news()
            counter += 1
        
        # Insert post after every 3 news items
        if counter % 3 == 0 and post_index < len(posts):
            add_post()
        
        # Break if we have enough items
        if len(feed) >= limit:
            break
    
    # Add remaining items
    while len(feed) < limit:
        if news_index < len(ranked_news):
            add_news()
        elif post_index < len(posts):
            add_post()
        else:
            break
    
    # =========================================================
    # 5️⃣ GET NEXT CURSOR
    # =========================================================
    next_cursor = ranked_news[-1].created_at if ranked_news else None
    if next_cursor and next_cursor.tzinfo is None:
        next_cursor = next_cursor.replace(tzinfo=timezone.utc)
    
    # Count stats
    news_count = sum(1 for item in feed if item.get("type") == "news")
    post_count = sum(1 for item in feed if item.get("type") == "post")
    
    return {
        "items": feed,
        "metadata": {
            "total_items": len(feed),
            "returned_items": len(feed),
            "next_cursor": next_cursor.isoformat() if next_cursor else None,
            "has_more": len(ranked_news) > limit,
            "hours_lookback": hours,
            "feed_composition": {
                "news": news_count,
                "posts": post_count
            },
            "trending_summary": {
                "total_scored": len(scored_news),
                "top_score": scored_news[0][0] if scored_news else 0,
                "avg_score": sum(s for s, _ in scored_news[:20]) / min(20, len(scored_news)) if scored_news else 0
            }
        }
    }
# =====================================================
# GET SINGLE NEWS
# =====================================================

@router.get("/news/{news_uid}", response_model=NewsOut)
def get_news(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get single news article by UID"""
    news = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language),
        joinedload(News.user)
    ).filter(News.news_uid == news_uid).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    city = news.city
    district = city.district if city else None
    state = district.state if district else None
    language = news.language

    # Check if user liked
    user_liked = False
    if current_user:
        liked = db.query(Reaction).filter(
            Reaction.content_type == 'news',
            Reaction.content_id == news.id,
            Reaction.user_uid == current_user.user_uid,
            Reaction.reaction_type == "like"
        ).first()
        user_liked = True if liked else False

    return NewsOut(
        news_uid=news.news_uid,
        title=news.title,
        summary=news.summary,
        image_url=news.image_url,
        language={
            "id": language.id,
            "name": language.name,
            "code": language.code
        } if language else None,
        user_uid=news.user_uid,
        posted_username=news.user.user_name if news.user else None,
        posted_userid=news.user_uid,
        is_approved=news.is_approved,
        created_at=news.created_at,
        city={
            "id": city.id,
            "name": city.name,
            "district_id": city.district_id
        } if city else None,
        district={
            "id": district.id,
            "name": district.name
        } if district else None,
        state={
            "id": state.id,
            "name": state.name
        } if state else None,
        source_url=news.source_url,
        source_name=news.source_name,
        category_ids=[c.id for c in news.categories],
        engagement={
            "likes": news.likes_count,
            "comments": news.comments_count,
            "shares": news.shares_count,
            "views": news.views_count,
            "user_liked": user_liked
        }
    )


# =====================================================
# COMMENTS (Authenticated)
# =====================================================

# routes/news_routes.py - Update your add_comment endpoint

@router.post("/user/news/{news_uid}/comment", tags=["News Engagement"])
def add_comment(
    news_uid: str,
    request: Request,  # ✅ ADD THIS
    comment_text: str = Body(..., embed=True, min_length=1, max_length=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add comment to news (Authenticated) - Earn points"""
    user_uid = current_user.user_uid
    
    news = db.query(News).filter_by(news_uid=news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")

    comment = Comment(
        news_uid=news_uid,
        user_uid=user_uid,
        comment_text=comment_text.strip()
    )
    news.comments_count += 1
    db.add(comment)
    
    # ✅ TRIGGER REWARDS FOR COMMENTING
    points_earned = 0
    rewards_service = RewardsService(db, request)
    
    from models.rewards import UserTransaction
    from datetime import date
    
    # Check daily limit
    daily_comments = db.query(UserTransaction).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.description.contains("Comment"),
        func.date(UserTransaction.created_at) == date.today()
    ).count()
    
    if daily_comments < RewardsConfig.COMMENT_DAILY_LIMIT:
        rewards_service.add_points(
            user_uid,
            RewardsConfig.COMMENT_ARTICLE_POINTS,
            f"Commented on article: {news.title[:50]}",
            reference_id=news_uid,
            metadata={"action_type": "comment", "news_uid": news_uid}
        )
        points_earned = RewardsConfig.COMMENT_ARTICLE_POINTS
        
        # Update bingo progress
        bingo_service = BingoService(db, request)
        bingo_service.update_bingo_progress(user_uid, "comment")
        bingo_service.update_challenge_progress(user_uid, "comment")
    
    db.commit()
    db.refresh(comment)

    return {
        "message": "Comment added",
        "comment_id": comment.id,
        "comment": comment.comment_text,
        "created_at": comment.created_at,
        "points_earned": points_earned
    }

@router.delete("/user/news/{news_uid}/comment/{comment_id}", tags=["News Engagement"])
def delete_comment(
    news_uid: str,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete own comment"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.news_uid == news_uid,
        Comment.user_uid == current_user.user_uid
    ).first()

    if not comment:
        raise HTTPException(404, "Comment not found or unauthorized")

    news = db.query(News).filter_by(news_uid=news_uid).first()
    if news and news.comments_count > 0:
        news.comments_count -= 1

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted"}


@router.get("/news/{news_uid}/comments", tags=["News Engagement"])
def get_comments(
    news_uid: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all comments for a news article"""
    offset = (page - 1) * limit

    comments = db.query(Comment).filter(
        Comment.news_uid == news_uid
    ).order_by(
        desc(Comment.created_at)
    ).offset(offset).limit(limit).all()

    total = db.query(Comment).filter(Comment.news_uid == news_uid).count()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": c.id,
                "user_uid": c.user_uid,
                "comment_text": c.comment_text,
                "created_at": c.created_at
            }
            for c in comments
        ]
    }


# =====================================================
# LIKES (Authenticated)
# =====================================================

# routes/news_routes.py - Update your like_news endpoint

@router.post("/user/news/{news_uid}/like", tags=["News Engagement"])
def like_news(
    news_uid: str,
    request: Request,  # ✅ ADD THIS
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Like news (Authenticated) - Earn points"""
    user_uid = current_user.user_uid
    
    news = db.query(News).filter_by(news_uid=news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")

    existing = db.query(Reaction).filter(
        Reaction.content_type == 'news',
        Reaction.content_id == news.id,
        Reaction.user_uid == user_uid,
        Reaction.reaction_type == "like"
    ).first()

    if existing:
        raise HTTPException(400, "Already liked")

    reaction = Reaction(
        content_id=news.id,
        content_type='news',
        user_uid=user_uid,
        reaction_type="like"
    )
    news.likes_count += 1
    db.add(reaction)
    
    # ✅ TRIGGER REWARDS FOR LIKING
    points_earned = 0
    rewards_service = RewardsService(db, request)
    
    from models.rewards import UserTransaction
    from datetime import date
    
    # Check if already liked this article today
    existing_today = db.query(UserTransaction).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.reference_id == news_uid,
        UserTransaction.description == "Liked article",
        func.date(UserTransaction.created_at) == date.today()
    ).first()
    
    if not existing_today:
        # Check daily limit
        daily_likes = db.query(UserTransaction).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.description == "Liked article",
            func.date(UserTransaction.created_at) == date.today()
        ).count()
        
        if daily_likes < RewardsConfig.LIKE_DAILY_LIMIT:
            rewards_service.add_points(
                user_uid,
                RewardsConfig.LIKE_ARTICLE_POINTS,
                "Liked article",
                reference_id=news_uid,
                metadata={"action_type": "like", "news_uid": news_uid}
            )
            points_earned = RewardsConfig.LIKE_ARTICLE_POINTS
            
            # Update bingo progress
            bingo_service = BingoService(db, request)
            bingo_service.update_bingo_progress(user_uid, "like")
    
    db.commit()

    return {
        "message": "News liked",
        "likes_count": news.likes_count,
        "points_earned": points_earned
    }

@router.delete("/user/news/{news_uid}/like", tags=["News Engagement"])
def unlike_news(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unlike news (Authenticated)"""
    news = db.query(News).filter_by(news_uid=news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")

    reaction = db.query(Reaction).filter(
        Reaction.content_type == 'news',
        Reaction.content_id == news.id,
        Reaction.user_uid == current_user.user_uid,
        Reaction.reaction_type == "like"
    ).first()

    if not reaction:
        raise HTTPException(404, "Like not found")

    news = db.query(News).filter_by(news_uid=news_uid).first()
    if news and news.likes_count > 0:
        news.likes_count -= 1

    db.delete(reaction)
    db.commit()

    return {"message": "Like removed", "likes_count": news.likes_count if news else 0}


# =====================================================
# VIEWS
# =====================================================

# routes/news_routes.py - Update your record_view endpoint

@router.post("/user/news/{news_uid}/view", tags=["News Engagement"])
def record_view(
    news_uid: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Record a view for news - Earn points for reading"""
    news = db.query(News).filter_by(news_uid=news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")

    user_uid = current_user.user_uid if current_user else None

    view = NewsView(
        news_uid=news_uid,
        user_uid=user_uid
    )
    news.views_count += 1
    db.add(view)
    
    points_earned = 0
    
    if current_user:
        rewards_service = RewardsService(db, request)
        
        from models.rewards import UserTransaction
        from datetime import date
        
        existing = db.query(UserTransaction).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.reference_id == news_uid,
            UserTransaction.description.contains("Read"),
            func.date(UserTransaction.created_at) == date.today()
        ).first()
        
        if not existing:
            # ✅ Get category IDs from categories relationship
            category_ids = [c.id for c in news.categories] if news.categories else []
            
            rewards_service.add_points(
                user_uid,
                RewardsConfig.READ_ARTICLE_POINTS,
                f"Read article: {news.title[:50]}",
                reference_id=news_uid,
                metadata={
                    "action_type": "read", 
                    "news_uid": news_uid, 
                    "category_ids": category_ids  # ✅ Use category_ids instead of category_id
                }
            )
            points_earned = RewardsConfig.READ_ARTICLE_POINTS
            
            rewards_service.update_daily_streak(user_uid)
            
            bingo_service = BingoService(db, request)
            bingo_service.update_bingo_progress(user_uid, "read")
            bingo_service.update_challenge_progress(user_uid, "read")
            
            total_reads = db.query(UserTransaction).filter(
                UserTransaction.user_uid == user_uid,
                UserTransaction.description.contains("Read"),
                UserTransaction.transaction_type == "earn"
            ).count()
            rewards_service.check_and_award_milestone_badges(user_uid, "read", total_reads)
    
    db.commit()

    return {
        "message": "View recorded",
        "views_count": news.views_count,
        "points_earned": points_earned
    }

# =====================================================
# DELETE NEWS (User)
# =====================================================

@router.delete("/user/news/{news_uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_news_by_user(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete news article (Owner or Admin/Moderator/Employee)"""
    news = db.query(News).filter_by(news_uid=news_uid).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    is_owner = news.user_uid == current_user.user_uid
    is_privileged = current_user.role in [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.MODERATOR]
    if not is_owner and not is_privileged:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to delete this news article")
    
    # Optional: Delete image from Supabase
    if news.image_url:
        try:
            supabase_service.delete_image(news.image_url)
        except Exception:
            pass
    
    db.delete(news)
    db.commit()
    return None


# =====================================================
# SEARCH
# =====================================================

@router.get("/search", tags=["Search"])
def realtime_search(
    q: Optional[str] = Query(None, min_length=2, max_length=100, description="Search keyword"),
    state_id: Optional[int] = None,
    district_id: Optional[int] = None,
    city_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search news with filters"""
    query = db.query(News).filter(News.is_approved == 1)

    # Keyword Search
    if q:
        query = query.outerjoin(User, News.user_uid == User.user_uid).outerjoin(News.categories).filter(
            or_(
                News.title.ilike(f"%{q}%"),
                News.summary.ilike(f"%{q}%"),
                News.source_name.ilike(f"%{q}%"),
                User.user_name.ilike(f"%{q}%"),
                Category.name.ilike(f"%{q}%")
            )
        )

    # Category Filter
    if category_id:
        query = query.join(News.categories).filter(Category.id == category_id)

    # Location Filters
    if city_id:
        query = query.filter(News.city_id == city_id)
    elif district_id:
        query = query.join(City).filter(City.district_id == district_id)
    elif state_id:
        query = query.join(City).join(District).filter(District.state_id == state_id)

    # Date Filters
    if start_date:
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        query = query.filter(News.created_at >= start_date)
    if end_date:
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        query = query.filter(News.created_at <= end_date)

    total = query.count()

    news_results = query.distinct().order_by(
        desc(News.created_at)
    ).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "news_uid": n.news_uid,
                "title": n.title,
                "summary": n.summary[:200] if n.summary else None,
                "image_url": n.image_url,
                "source_name": n.source_name,
                "created_at": n.created_at,
                "views": n.views_count,
                "likes": n.likes_count
            }
            for n in news_results
        ],
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total
    }


# =====================================================
# SHARE NEWS
# =====================================================

# routes/news_routes.py - Update your share_news endpoint



@router.post("/user/news/{news_uid}/share", tags=["News Engagement"])
def share_news(
    news_uid: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    platform: Optional[str] = Query(None, description="Platform name (facebook, twitter, whatsapp, etc.)")
):
    """Share news (Authenticated) - Earn points and coins"""
    user_uid = current_user.user_uid
    
    news = db.query(News).filter(News.news_uid == news_uid).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    existing = db.query(Share).filter(
        Share.content_type == "news",
        Share.content_id == news.id,
        Share.user_uid == user_uid
    ).first()

    points_earned = 0
    coins_earned = 0

    if existing:
        return {
            "message": "Already shared", 
            "share_count": news.shares_count,
            "points_earned": 0,
            "coins_earned": 0
        }

    # ✅ CREATE SHARE RECORD
    share = Share(
        content_type="news",
        content_id=news.id,
        user_uid=user_uid,
        platform=platform
    )
    news.shares_count += 1
    db.add(share)
    
    # ✅ TRIGGER REWARDS FOR SHARING
    rewards_service = RewardsService(db, request)
    
    # Check daily limit
    from models.rewards import UserTransaction
    from datetime import date
    
    daily_shares = db.query(UserTransaction).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.description.contains("Shared"),
        func.date(UserTransaction.created_at) == date.today()
    ).count()
    
    if daily_shares < RewardsConfig.SHARE_DAILY_LIMIT:
        # Award points
        rewards_service.add_points(
            user_uid,
            RewardsConfig.SHARE_ARTICLE_POINTS,
            f"Shared article: {news.title[:50]} on {platform or 'social media'}",
            reference_id=f"{news_uid}:{platform}",
            metadata={"action_type": "share", "platform": platform or "unknown", "news_uid": news_uid}
        )
        points_earned = RewardsConfig.SHARE_ARTICLE_POINTS
        
        # Award coins
        rewards_service.add_coins(
            user_uid,
            RewardsConfig.SHARE_ARTICLE_COINS,
            f"Coin reward for sharing news",
            metadata={"action_type": "share", "platform": platform or "unknown"}
        )
        coins_earned = RewardsConfig.SHARE_ARTICLE_COINS
        
        # Update bingo progress
        bingo_service = BingoService(db, request)
        bingo_service.update_bingo_progress(user_uid, "share", metadata={"platform": platform})
        bingo_service.update_challenge_progress(user_uid, "share")
        
        # Check sharing milestone
        total_shares = db.query(UserTransaction).filter(
            UserTransaction.user_uid == user_uid,
            UserTransaction.description.contains("Shared"),
            UserTransaction.transaction_type == "earn"
        ).count()
        
        rewards_service.check_and_award_milestone_badges(user_uid, "share", total_shares)
        
        # First share badge
        if total_shares == 1:
            rewards_service.award_badge(user_uid, "first_share")
    
    db.commit()

    return {
        "message": "News shared successfully!",
        "share_count": news.shares_count,
        "points_earned": points_earned,
        "coins_earned": coins_earned,
        "daily_share_limit": RewardsConfig.SHARE_DAILY_LIMIT,
        "shares_today": daily_shares + 1
    }

# =====================================================
# ENGAGEMENT SUMMARY
# =====================================================

@router.get("/news/{news_uid}/engagement", tags=["News Engagement"])
def get_news_engagement(
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get engagement metrics for a news article"""
    news = db.query(News).filter(News.news_uid == news_uid).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    user_liked = False
    if current_user:
        liked = db.query(Reaction).filter(
            Reaction.content_type == "news",
            Reaction.content_id == news.id,
            Reaction.user_uid == current_user.user_uid,
            Reaction.reaction_type == "like"
        ).first()
        user_liked = True if liked else False

    return {
        "news_uid": news_uid,
        "views": news.views_count,
        "likes": news.likes_count,
        "comments": news.comments_count,
        "shares": news.shares_count,
        "user_liked": user_liked
    }


# =====================================================
# UPDATE NEWS
# =====================================================

# @router.put("/news/{news_uid}", response_model=NewsOut)
# def update_news(
#     news_uid: str,
#     news: NewsCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role(UserRole.PUBLISHER))
# ):
#     """Update news article (Publisher and above)"""
#     existing_news = db.query(News).filter_by(news_uid=news_uid).first()
#     if not existing_news:
#         raise HTTPException(status_code=404, detail="News not found")
    
#     # Check ownership or admin
#     if existing_news.user_uid != current_user.user_uid and current_user.role != UserRole.ADMIN:
#         raise HTTPException(status_code=403, detail="Not authorized to update this news")

#     user = db.query(User).filter_by(user_uid=news.user_uid).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     language = db.query(Language).filter_by(id=news.language_id).first()
#     if not language:
#         raise HTTPException(status_code=404, detail="Language not found")

#     city, district, state = None, None, None
#     if news.city_id:
#         city = db.query(City).filter_by(id=news.city_id).first()
#         if not city:
#             raise HTTPException(status_code=404, detail="City not found")
#         district = city.district
#         state = district.state if district else None

#     # Update fields
#     existing_news.title = news.title
#     existing_news.summary = news.summary
#     existing_news.image_url = news.image_url
#     existing_news.language_id = news.language_id
#     existing_news.city_id = news.city_id
#     existing_news.source_url = news.source_url
#     existing_news.source_name = news.source_name
#     existing_news.updated_at = datetime.now(timezone.utc)

#     # Update categories
#     if news.category_ids:
#         categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
#         existing_news.categories = categories
#     else:
#         existing_news.categories = []

#     db.commit()
#     db.refresh(existing_news)

#     return NewsOut(
#         news_uid=existing_news.news_uid,
#         title=existing_news.title,
#         summary=existing_news.summary,
#         image_url=existing_news.image_url,
#         language=language,
#         user_uid=existing_news.user_uid,
#         posted_username=user.user_name if user else None,
#         posted_userid=user.user_uid,
#         is_approved=existing_news.is_approved,
#         created_at=existing_news.created_at,
#         city=city,
#         district=district,
#         state=state,
#         source_url=existing_news.source_url,
#         source_name=existing_news.source_name,
#         category_ids=[c.id for c in existing_news.categories],
#         engagement={
#             "likes": existing_news.likes_count,
#             "comments": existing_news.comments_count,
#             "shares": existing_news.shares_count,
#             "views": existing_news.views_count,
#             "user_liked": False
#         }
#     )

@router.put("/news/{news_uid}", response_model=NewsOut)
def update_news(
    news_uid: str,
    news: NewsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Update news article (Publisher and above)"""
    
    # 1️⃣ Get existing news
    existing_news = db.query(News).filter_by(news_uid=news_uid).first()
    if not existing_news:
        raise HTTPException(status_code=404, detail="News not found")
    
    # 2️⃣ Check authorization based on role
    is_owner = existing_news.user_uid == current_user.user_uid
    is_moderator = current_user.role == UserRole.MODERATOR
    is_admin = current_user.role == UserRole.ADMIN
    
    # ✅ PUBLISHER and EMPLOYEE can only update their own news
    # ✅ MODERATOR and ADMIN can update anyone's news
    if not is_owner and not is_moderator and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="You can only update your own news articles"
        )
    
    # 3️⃣ Prevent editing approved news (unless admin/moderator)
    if existing_news.is_approved == 1 and not (is_moderator or is_admin):
        raise HTTPException(
            status_code=400, 
            detail="Cannot edit approved news. Please contact moderator for changes."
        )
    
    # 4️⃣ Validate input
    if not news.title or len(news.title.strip()) < 5:
        raise HTTPException(status_code=400, detail="Title must be at least 5 characters")
    if not news.summary or len(news.summary.strip()) < 20:
        raise HTTPException(status_code=400, detail="Summary must be at least 20 characters")
    
    # 5️⃣ Verify target user exists (if publisher/employee changing owner - not allowed)
    target_user = db.query(User).filter_by(user_uid=news.user_uid).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # 6️⃣ Only admin can change ownership
    if news.user_uid != existing_news.user_uid and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only admin can transfer news ownership"
        )

    # 7️⃣ Verify language exists
    language = db.query(Language).filter_by(id=news.language_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")

    # 8️⃣ Handle optional city_id
    city, district, state = None, None, None
    if news.city_id:
        city = db.query(City).filter_by(id=news.city_id).first()
        if not city:
            raise HTTPException(status_code=404, detail="City not found")
        district = city.district
        state = district.state if district else None

    # 9️⃣ Validate categories
    categories = []
    if news.category_ids:
        categories = db.query(Category).filter(Category.id.in_(news.category_ids)).all()
        if len(categories) != len(news.category_ids):
            raise HTTPException(status_code=400, detail="One or more category IDs are invalid")

    # 🔟 Update fields
    try:
        existing_news.title = news.title.strip()
        existing_news.summary = news.summary.strip()
        existing_news.image_url = news.image_url
        existing_news.language_id = news.language_id
        existing_news.city_id = news.city_id if news.city_id else None
        existing_news.source_url = news.source_url if news.source_url else None
        existing_news.source_name = news.source_name if news.source_name else None
        existing_news.updated_at = datetime.now(timezone.utc)
        
        # Only admin can change owner
        if is_admin and news.user_uid != existing_news.user_uid:
            existing_news.user_uid = news.user_uid

        # Update categories
        existing_news.categories = categories
        
        db.commit()
        db.refresh(existing_news)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update news: {str(e)}")

    # 1️⃣1️⃣ Build response
    return NewsOut(
        news_uid=existing_news.news_uid,
        title=existing_news.title,
        summary=existing_news.summary,
        image_url=existing_news.image_url,
        language={"id": language.id, "code": language.code, "name": language.name},
        user_uid=existing_news.user_uid,
        posted_username=target_user.user_name if target_user else None,
        posted_userid=target_user.user_uid if target_user else existing_news.user_uid,
        is_approved=existing_news.is_approved,
        created_at=existing_news.created_at,
        city={"id": city.id, "name": city.name} if city else None,
        district={"id": district.id, "name": district.name} if district else None,
        state={"id": state.id, "name": state.name} if state else None,
        source_url=existing_news.source_url,
        source_name=existing_news.source_name,
        category_ids=[c.id for c in existing_news.categories],
        engagement={
            "likes": existing_news.likes_count,
            "comments": existing_news.comments_count,
            "shares": existing_news.shares_count,
            "views": existing_news.views_count,
            "user_liked": False
        }
    )
# =====================================================
# NEWS SHORTS (YouTube)
# =====================================================



# =====================================================
# NEWS STATISTICS & ANALYTICS (Production Ready)
# =====================================================

@router.get("/news/analytics/daily", response_model=Dict[str, Any], tags=["Analytics"])
def get_daily_news_stats(
    date: Optional[datetime] = Query(None, description="Specific date (default: today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """
    Get daily news statistics
    
    - PUBLISHER: Sees only their own news
    - MODERATOR/EMPLOYEE/ADMIN: Sees all news
    """
    target_date = date or datetime.now(timezone.utc)
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Base query with role-based filtering
    news_query = db.query(News).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day
    )
    
    approved_query = db.query(News).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    
    # Restrict to user's own news for PUBLISHER
    if current_user.role == UserRole.PUBLISHER:
        news_query = news_query.filter(News.user_uid == current_user.user_uid)
        approved_query = approved_query.filter(News.user_uid == current_user.user_uid)
    
    news_created = news_query.count()
    news_approved = approved_query.count() if hasattr(News, 'approved_at') else 0
    
    total_views = db.query(func.sum(News.views_count)).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    if current_user.role == UserRole.PUBLISHER:
        total_views = total_views.filter(News.user_uid == current_user.user_uid)
    total_views = total_views.scalar() or 0
    
    total_likes = db.query(func.sum(News.likes_count)).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    if current_user.role == UserRole.PUBLISHER:
        total_likes = total_likes.filter(News.user_uid == current_user.user_uid)
    total_likes = total_likes.scalar() or 0
    
    total_comments = db.query(func.sum(News.comments_count)).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    if current_user.role == UserRole.PUBLISHER:
        total_comments = total_comments.filter(News.user_uid == current_user.user_uid)
    total_comments = total_comments.scalar() or 0
    
    total_shares = db.query(func.sum(News.shares_count)).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    if current_user.role == UserRole.PUBLISHER:
        total_shares = total_shares.filter(News.user_uid == current_user.user_uid)
    total_shares = total_shares.scalar() or 0
    
    top_news_query = db.query(News).filter(
        News.created_at >= start_of_day,
        News.created_at < end_of_day,
        News.is_approved == 1
    )
    if current_user.role == UserRole.PUBLISHER:
        top_news_query = top_news_query.filter(News.user_uid == current_user.user_uid)
    top_news = top_news_query.order_by(desc(News.views_count)).limit(5).all()
    
    return {
        "date": start_of_day.isoformat(),
        "user_role": UserRole(current_user.role).name,
        "summary": {
            "news_created": news_created,
            "news_approved": news_approved,
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares
        },
        "top_news": [
            {
                "news_uid": n.news_uid,
                "title": n.title,
                "views": n.views_count,
                "likes": n.likes_count,
                "image_url": n.image_url
            }
            for n in top_news
        ]
    }


@router.get("/news/analytics/weekly", response_model=Dict[str, Any], tags=["Analytics"])
def get_weekly_news_stats(
    week_start: Optional[datetime] = Query(None, description="Start of week (Monday)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Get weekly news statistics"""
    
    if week_start:
        start_date = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        today = datetime.now(timezone.utc).date()
        start_date = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
    
    end_date = start_date + timedelta(days=7)
    
    daily_stats = []
    for i in range(7):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        news_query = db.query(News).filter(
            News.created_at >= day_start,
            News.created_at < day_end
        )
        views_query = db.query(func.sum(News.views_count)).filter(
            News.created_at >= day_start,
            News.created_at < day_end,
            News.is_approved == 1
        )
        
        if current_user.role == UserRole.PUBLISHER:
            news_query = news_query.filter(News.user_uid == current_user.user_uid)
            views_query = views_query.filter(News.user_uid == current_user.user_uid)
        
        news_count = news_query.count()
        views = views_query.scalar() or 0
        
        daily_stats.append({
            "date": day_start.isoformat(),
            "news_count": news_count,
            "views": views
        })
    
    total_news_query = db.query(News).filter(
        News.created_at >= start_date,
        News.created_at < end_date
    )
    total_views_query = db.query(func.sum(News.views_count)).filter(
        News.created_at >= start_date,
        News.created_at < end_date,
        News.is_approved == 1
    )
    total_likes_query = db.query(func.sum(News.likes_count)).filter(
        News.created_at >= start_date,
        News.created_at < end_date,
        News.is_approved == 1
    )
    
    if current_user.role == UserRole.PUBLISHER:
        total_news_query = total_news_query.filter(News.user_uid == current_user.user_uid)
        total_views_query = total_views_query.filter(News.user_uid == current_user.user_uid)
        total_likes_query = total_likes_query.filter(News.user_uid == current_user.user_uid)
    
    total_news = total_news_query.count()
    total_views = total_views_query.scalar() or 0
    total_likes = total_likes_query.scalar() or 0
    
    # Top categories (only for non-publisher roles)
    top_categories = []
    if current_user.role != UserRole.PUBLISHER:
        top_categories = db.query(
            Category.id,
            Category.name,
            func.count(News.id).label('news_count')
        ).join(News.categories).filter(
            News.created_at >= start_date,
            News.created_at < end_date,
            News.is_approved == 1
        ).group_by(Category.id).order_by(desc('news_count')).limit(5).all()
        top_categories = [
            {"id": c.id, "name": c.name, "news_count": c.news_count}
            for c in top_categories
        ]
    
    return {
        "week_start": start_date.isoformat(),
        "week_end": (end_date - timedelta(days=1)).isoformat(),
        "user_role": UserRole(current_user.role).name,
        "summary": {
            "total_news": total_news,
            "total_views": total_views,
            "total_likes": total_likes,
            "average_views_per_news": total_views / total_news if total_news > 0 else 0
        },
        "daily_breakdown": daily_stats,
        "top_categories": top_categories
    }


@router.get("/news/analytics/top", response_model=Dict[str, Any], tags=["Analytics"])
def get_top_performing_news(
    period: str = Query("week", enum=["day", "week", "month", "all"], description="Time period"),
    metric: str = Query("views", enum=["views", "likes", "comments", "shares"], description="Metric to sort by"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Get top performing news"""
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = datetime(2000, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    
    query = db.query(News).filter(
        News.is_approved == 1,
        News.created_at >= start_date
    )
    
    # Restrict to user's own news for PUBLISHER
    if current_user.role == UserRole.PUBLISHER:
        query = query.filter(News.user_uid == current_user.user_uid)
    
    # Apply sorting
    if metric == "views":
        query = query.order_by(desc(News.views_count))
    elif metric == "likes":
        query = query.order_by(desc(News.likes_count))
    elif metric == "comments":
        query = query.order_by(desc(News.comments_count))
    elif metric == "shares":
        query = query.order_by(desc(News.shares_count))
    
    top_news = query.limit(limit).all()
    
    return {
        "period": period,
        "metric": metric,
        "user_role": UserRole(current_user.role).name,
        "items": [
            {
                "rank": idx + 1,
                "news_uid": n.news_uid,
                "title": n.title,
                "summary": n.summary[:150] if n.summary else None,
                "image_url": n.image_url,
                "created_at": n.created_at,
                "views": n.views_count,
                "likes": n.likes_count,
                "comments": n.comments_count,
                "shares": n.shares_count,
                "engagement_rate": round(
                    (n.likes_count + n.comments_count + n.shares_count) / n.views_count * 100 if n.views_count > 0 else 0, 2
                )
            }
            for idx, n in enumerate(top_news)
        ]
    }


@router.get("/news/analytics/trending", response_model=Dict[str, Any], tags=["Analytics"])
def get_trending_news(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """Get trending news based on views velocity"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(hours=hours)
    
    query = db.query(News).filter(
        News.is_approved == 1,
        News.created_at >= start_date,
        News.views_count > 0
    )
    
    # Restrict to user's own news for PUBLISHER
    if current_user.role == UserRole.PUBLISHER:
        query = query.filter(News.user_uid == current_user.user_uid)
    
    trending = query.all()
    
    results = []
    for n in trending:
        news_created = n.created_at
        if news_created.tzinfo is None:
            news_created = news_created.replace(tzinfo=timezone.utc)
        
        age_hours = (now - news_created).total_seconds() / 3600
        views_per_hour = n.views_count / age_hours if age_hours > 0 else 0
        
        results.append({
            "news_uid": n.news_uid,
            "title": n.title,
            "image_url": n.image_url,
            "views": n.views_count,
            "likes": n.likes_count,
            "created_at": n.created_at,
            "age_hours": round(age_hours, 1),
            "views_per_hour": round(views_per_hour, 2),
            "trending_score": round(views_per_hour, 2)
        })
    
    results.sort(key=lambda x: x['trending_score'], reverse=True)
    
    return {
        "time_window_hours": hours,
        "user_role": UserRole(current_user.role).name,
        "items": results[:limit]
    }


@router.get("/admin/analytics/overview", response_model=Dict[str, Any], tags=["Admin", "Analytics"])
def get_admin_analytics_overview(
    days: int = Query(30, ge=1, le=90, description="Number of days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.EMPLOYEE, UserRole.ADMIN]))  # ✅ EMPLOYEE + ADMIN
):
    """
    Get comprehensive analytics overview for dashboard
    
    - EMPLOYEE: Sees all analytics (same as admin for overview)
    - ADMIN: Full access
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    total_news = db.query(News).count()
    total_approved = db.query(News).filter(News.is_approved == 1).count()
    total_pending = db.query(News).filter(News.is_approved == 0).count()
    
    total_views = db.query(func.sum(News.views_count)).scalar() or 0
    total_likes = db.query(func.sum(News.likes_count)).scalar() or 0
    total_comments = db.query(func.sum(News.comments_count)).scalar() or 0
    total_shares = db.query(func.sum(News.shares_count)).scalar() or 0
    
    daily_trends = []
    for i in range(min(days, 30)):
        day_start = (now - timedelta(days=days-i-1)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_news = db.query(News).filter(
            News.created_at >= day_start,
            News.created_at < day_end
        ).count()
        
        day_views = db.query(func.sum(News.views_count)).filter(
            News.created_at >= day_start,
            News.created_at < day_end,
            News.is_approved == 1
        ).scalar() or 0
        
        daily_trends.append({
            "date": day_start.isoformat(),
            "news_count": day_news,
            "views": day_views
        })
    
    category_stats = db.query(
        Category.id,
        Category.name,
        func.count(News.id).label('count')
    ).join(News.categories).filter(
        News.is_approved == 1
    ).group_by(Category.id).order_by(desc('count')).limit(10).all()
    
    previous_period_start = start_date - timedelta(days=days)
    previous_news = db.query(News).filter(
        News.created_at >= previous_period_start,
        News.created_at < start_date
    ).count()
    
    growth_rate = ((total_news - previous_news) / previous_news * 100) if previous_news > 0 else 0
    
    # Top publishers
    top_publishers = db.query(
        User.user_uid,
        User.user_name,
        User.name,
        func.count(News.id).label('news_count'),
        func.sum(News.views_count).label('total_views')
    ).join(News, User.user_uid == News.user_uid).filter(
        News.is_approved == 1,
        News.created_at >= start_date
    ).group_by(User.user_uid).order_by(desc('news_count')).limit(10).all()
    
    return {
        "period_days": days,
        "user_role": UserRole(current_user.role).name,
        "summary": {
            "total_news": total_news,
            "approved_news": total_approved,
            "pending_news": total_pending,
            "approval_rate": round(total_approved / total_news * 100, 2) if total_news > 0 else 0,
            "growth_rate": round(growth_rate, 2)
        },
        "engagement": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "avg_views_per_news": round(total_views / total_approved, 2) if total_approved > 0 else 0,
            "engagement_rate": round((total_likes + total_comments + total_shares) / total_views * 100, 2) if total_views > 0 else 0
        },
        "daily_trends": daily_trends,
        "top_categories": [
            {"id": c.id, "name": c.name, "count": c.count}
            for c in category_stats
        ],
        "top_publishers": [
            {
                "user_uid": p.user_uid,
                "user_name": p.user_name,
                "name": p.name,
                "news_count": p.news_count,
                "total_views": p.total_views
            }
            for p in top_publishers
        ]
    }

# =====================================================
# NEWS SCHEDULING APIs
# =====================================================

from auth.dependencies import admin_or_employee_required, require_roles


# =====================================================
# SCHEDULING ENDPOINTS (EMPLOYEE + ADMIN)
# =====================================================

@router.post("/admin/news/schedule", response_model=ScheduledNewsOut, status_code=status.HTTP_201_CREATED, tags=["Admin", "Scheduling"])
def schedule_news(
    schedule_data: ScheduledNewsCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """
    Schedule a news article for future publishing (Employee and Admin only)
    
    - EMPLOYEE: Can schedule news for themselves or other publishers
    - ADMIN: Full access
    """
    
    # 1️⃣ Verify user exists
    user = db.query(User).filter_by(user_uid=schedule_data.user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2️⃣ Check if employee can schedule for this user
    if current_user.role == UserRole.EMPLOYEE:
        # Employee can only schedule for PUBLISHER, MODERATOR, EMPLOYEE, ADMIN
        if user.role not in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]:
            raise HTTPException(
                status_code=403, 
                detail="Employee can only schedule news for users with publishing permissions"
            )

    # 3️⃣ Verify language exists
    language = db.query(Language).filter_by(id=schedule_data.language_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")

    # 4️⃣ Handle optional city_id
    if schedule_data.city_id:
        city = db.query(City).filter_by(id=schedule_data.city_id).first()
        if not city:
            raise HTTPException(status_code=404, detail="City not found")

    # 5️⃣ Validate scheduled time
    if schedule_data.scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    # 6️⃣ Validate input
    if not schedule_data.title or len(schedule_data.title.strip()) < 5:
        raise HTTPException(status_code=400, detail="Title must be at least 5 characters")
    if not schedule_data.summary or len(schedule_data.summary.strip()) < 20:
        raise HTTPException(status_code=400, detail="Summary must be at least 20 characters")

    # 7️⃣ Generate unique ID
    news_uid = generate_news_uid()

    # 8️⃣ Create scheduled news
    scheduled_news = ScheduledNews(
        news_uid=news_uid,
        title=schedule_data.title.strip(),
        summary=schedule_data.summary.strip(),
        image_url=schedule_data.image_url,
        language_id=schedule_data.language_id,
        user_uid=schedule_data.user_uid,
        city_id=schedule_data.city_id,
        source_url=schedule_data.source_url,
        source_name=schedule_data.source_name,
        scheduled_at=schedule_data.scheduled_at,
        scheduled_by=current_user.user_uid,
        status="pending"
    )

    db.add(scheduled_news)
    db.flush()

    # 9️⃣ Attach categories
    if schedule_data.category_ids:
        categories = db.query(Category).filter(Category.id.in_(schedule_data.category_ids)).all()
        if len(categories) != len(schedule_data.category_ids):
            raise HTTPException(status_code=400, detail="One or more category IDs are invalid")
        scheduled_news.categories = categories

    db.commit()
    db.refresh(scheduled_news)

    return ScheduledNewsOut(
        id=scheduled_news.id,
        news_uid=scheduled_news.news_uid,
        title=scheduled_news.title,
        summary=scheduled_news.summary,
        image_url=scheduled_news.image_url,
        language_id=scheduled_news.language_id,
        user_uid=scheduled_news.user_uid,
        city_id=scheduled_news.city_id,
        source_url=scheduled_news.source_url,
        source_name=scheduled_news.source_name,
        category_ids=[c.id for c in scheduled_news.categories],
        scheduled_at=scheduled_news.scheduled_at,
        status=scheduled_news.status,
        created_at=scheduled_news.created_at,
        published_at=scheduled_news.published_at
    )


@router.get("/admin/news/scheduled", response_model=Dict[str, Any], tags=["Admin", "Scheduling"])
def get_scheduled_news(
    status: Optional[str] = Query(None, enum=["pending", "published", "failed", "cancelled"]),
    language_id: Optional[int] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None, min_length=2),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Get all scheduled news articles (Employee and Admin only)"""
    query = db.query(ScheduledNews)
    
    if status:
        query = query.filter(ScheduledNews.status == status)
    if language_id:
        query = query.filter(ScheduledNews.language_id == language_id)
    if from_date:
        if from_date.tzinfo is None:
            from_date = from_date.replace(tzinfo=timezone.utc)
        query = query.filter(ScheduledNews.scheduled_at >= from_date)
    if to_date:
        if to_date.tzinfo is None:
            to_date = to_date.replace(tzinfo=timezone.utc)
        query = query.filter(ScheduledNews.scheduled_at <= to_date)
    if search:
        query = query.filter(
            or_(
                ScheduledNews.title.ilike(f"%{search}%"),
                ScheduledNews.summary.ilike(f"%{search}%")
            )
        )
    
    total = query.count()
    
    scheduled = query.order_by(
        ScheduledNews.scheduled_at.asc()
    ).offset(offset).limit(limit).all()
    
    results = []
    for s in scheduled:
        category_names = [c.name for c in s.categories]
        
        results.append({
            "id": s.id,
            "news_uid": s.news_uid,
            "title": s.title,
            "summary": s.summary[:150] if s.summary else None,
            "image_url": s.image_url,
            "language_id": s.language_id,
            "user_uid": s.user_uid,
            "city_id": s.city_id,
            "scheduled_at": s.scheduled_at,
            "status": s.status,
            "category_names": category_names,
            "created_at": s.created_at,
            "published_at": s.published_at,
            "scheduled_by": s.scheduled_by
        })
    
    return {
        "total": total,
        "items": results,
        "limit": limit,
        "offset": offset,
        "has_next": offset + limit < total
    }


@router.get("/admin/news/scheduled/{schedule_id}", response_model=ScheduledNewsOut, tags=["Admin", "Scheduling"])
def get_scheduled_news_details(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Get details of a specific scheduled news article (Employee and Admin only)"""
    scheduled = db.query(ScheduledNews).filter(
        ScheduledNews.id == schedule_id
    ).first()
    
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled news not found"
        )
    
    return ScheduledNewsOut(
        id=scheduled.id,
        news_uid=scheduled.news_uid,
        title=scheduled.title,
        summary=scheduled.summary,
        image_url=scheduled.image_url,
        language_id=scheduled.language_id,
        user_uid=scheduled.user_uid,
        city_id=scheduled.city_id,
        source_url=scheduled.source_url,
        source_name=scheduled.source_name,
        category_ids=[c.id for c in scheduled.categories],
        scheduled_at=scheduled.scheduled_at,
        status=scheduled.status,
        created_at=scheduled.created_at,
        published_at=scheduled.published_at
    )


@router.put("/admin/news/scheduled/{schedule_id}", response_model=ScheduledNewsOut, tags=["Admin", "Scheduling"])
def update_scheduled_news(
    schedule_id: int,
    update_data: ScheduledNewsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Update a scheduled news article (Employee and Admin only)"""
    scheduled = db.query(ScheduledNews).filter(
        ScheduledNews.id == schedule_id
    ).first()
    
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled news not found"
        )
    
    if scheduled.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update scheduled news with status: {scheduled.status}"
        )
    
    # Employee can only update their own scheduled news
    if current_user.role == UserRole.EMPLOYEE and scheduled.scheduled_by != current_user.user_uid:
        raise HTTPException(
            status_code=403,
            detail="Employee can only update their own scheduled news"
        )
    
    if update_data.title is not None:
        if len(update_data.title.strip()) < 5:
            raise HTTPException(status_code=400, detail="Title must be at least 5 characters")
        scheduled.title = update_data.title.strip()
    if update_data.summary is not None:
        if len(update_data.summary.strip()) < 20:
            raise HTTPException(status_code=400, detail="Summary must be at least 20 characters")
        scheduled.summary = update_data.summary.strip()
    if update_data.image_url is not None:
        scheduled.image_url = update_data.image_url
    if update_data.language_id is not None:
        language = db.query(Language).filter_by(id=update_data.language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        scheduled.language_id = update_data.language_id
    if update_data.city_id is not None:
        if update_data.city_id:
            city = db.query(City).filter_by(id=update_data.city_id).first()
            if not city:
                raise HTTPException(status_code=404, detail="City not found")
        scheduled.city_id = update_data.city_id
    if update_data.source_url is not None:
        scheduled.source_url = update_data.source_url
    if update_data.source_name is not None:
        scheduled.source_name = update_data.source_name
    if update_data.scheduled_at is not None:
        if update_data.scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        scheduled.scheduled_at = update_data.scheduled_at
    
    if update_data.category_ids is not None:
        categories = db.query(Category).filter(
            Category.id.in_(update_data.category_ids)
        ).all()
        if len(categories) != len(update_data.category_ids):
            raise HTTPException(status_code=400, detail="One or more category IDs are invalid")
        scheduled.categories = categories
    
    scheduled.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(scheduled)
    
    return ScheduledNewsOut(
        id=scheduled.id,
        news_uid=scheduled.news_uid,
        title=scheduled.title,
        summary=scheduled.summary,
        image_url=scheduled.image_url,
        language_id=scheduled.language_id,
        user_uid=scheduled.user_uid,
        city_id=scheduled.city_id,
        source_url=scheduled.source_url,
        source_name=scheduled.source_name,
        category_ids=[c.id for c in scheduled.categories],
        scheduled_at=scheduled.scheduled_at,
        status=scheduled.status,
        created_at=scheduled.created_at,
        published_at=scheduled.published_at
    )


@router.delete("/admin/news/scheduled/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin", "Scheduling"])
def cancel_scheduled_news(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Cancel a scheduled news article (Employee and Admin only)"""
    scheduled = db.query(ScheduledNews).filter(
        ScheduledNews.id == schedule_id
    ).first()
    
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled news not found"
        )
    
    if scheduled.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel schedule with status: {scheduled.status}"
        )
    
    # Employee can only cancel their own scheduled news
    if current_user.role == UserRole.EMPLOYEE and scheduled.scheduled_by != current_user.user_uid:
        raise HTTPException(
            status_code=403,
            detail="Employee can only cancel their own scheduled news"
        )
    
    scheduled.status = "cancelled"
    scheduled.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return None


@router.post("/admin/news/scheduled/{schedule_id}/publish-now", response_model=NewsOut, tags=["Admin", "Scheduling"])
def publish_scheduled_news_now(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Immediately publish a scheduled news article (Employee and Admin only)"""
    scheduled = db.query(ScheduledNews).options(
        joinedload(ScheduledNews.categories)
    ).filter(ScheduledNews.id == schedule_id).first()
    
    if not scheduled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled news not found"
        )
    
    if scheduled.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish schedule with status: {scheduled.status}"
        )
    
    # Create actual news article
    new_news = News(
        news_uid=scheduled.news_uid,
        title=scheduled.title,
        summary=scheduled.summary,
        image_url=scheduled.image_url,
        language_id=scheduled.language_id,
        user_uid=scheduled.user_uid,
        city_id=scheduled.city_id,
        source_url=scheduled.source_url,
        source_name=scheduled.source_name,
        is_approved=1,
        approved_at=datetime.now(timezone.utc),
        approved_by_uid=current_user.user_uid,
        created_at=datetime.now(timezone.utc)
    )
    
    # Attach categories
    if scheduled.categories:
        new_news.categories = scheduled.categories
    
    db.add(new_news)
    
    # Update scheduled record
    scheduled.status = "published"
    scheduled.published_at = datetime.now(timezone.utc)
    scheduled.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(new_news)
    
    # Get related data for response
    language = db.query(Language).filter(Language.id == new_news.language_id).first()
    city = new_news.city
    district = city.district if city else None
    state = district.state if district else None
    
    return NewsOut(
        news_uid=new_news.news_uid,
        title=new_news.title,
        summary=new_news.summary,
        image_url=new_news.image_url,
        language={"id": language.id, "code": language.code, "name": language.name} if language else None,
        user_uid=new_news.user_uid,
        posted_username=None,
        posted_userid=new_news.user_uid,
        is_approved=new_news.is_approved,
        created_at=new_news.created_at,
        city={"id": city.id, "name": city.name} if city else None,
        district={"id": district.id, "name": district.name} if district else None,
        state={"id": state.id, "name": state.name} if state else None,
        source_url=new_news.source_url,
        source_name=new_news.source_name,
        category_ids=[c.id for c in new_news.categories],
        engagement={
            "likes": new_news.likes_count,
            "comments": new_news.comments_count,
            "shares": new_news.shares_count,
            "views": new_news.views_count,
            "user_liked": False
        }
    )


@router.get("/admin/news/scheduled/upcoming", response_model=List[Dict[str, Any]], tags=["Admin", "Scheduling"])
def get_upcoming_scheduled_news(
    hours: int = Query(24, ge=1, le=168, description="Hours ahead to check"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Get upcoming scheduled news within next X hours (Employee and Admin only)"""
    now = datetime.now(timezone.utc)
    upcoming_time = now + timedelta(hours=hours)
    
    query = db.query(ScheduledNews).filter(
        ScheduledNews.status == "pending",
        ScheduledNews.scheduled_at >= now,
        ScheduledNews.scheduled_at <= upcoming_time
    )
    
    # Employee can only see their own scheduled news
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(ScheduledNews.scheduled_by == current_user.user_uid)
    
    upcoming = query.order_by(ScheduledNews.scheduled_at.asc()).limit(limit).all()
    
    results = []
    for s in upcoming:
        minutes_until = round((s.scheduled_at - now).total_seconds() / 60, 0)
        results.append({
            "id": s.id,
            "news_uid": s.news_uid,
            "title": s.title,
            "scheduled_at": s.scheduled_at,
            "minutes_until": minutes_until,
            "user_uid": s.user_uid,
            "scheduled_by": s.scheduled_by
        })
    
    return results


@router.get("/admin/news/scheduled/stats", response_model=Dict[str, Any], tags=["Admin", "Scheduling"])
def get_scheduling_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_employee_required)  # ✅ EMPLOYEE + ADMIN
):
    """Get scheduling statistics for dashboard (Employee and Admin only)"""
    now = datetime.now(timezone.utc)
    
    query = db.query(ScheduledNews)
    
    # Employee can only see their own statistics
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(ScheduledNews.scheduled_by == current_user.user_uid)
    
    total_scheduled = query.count()
    pending = query.filter(ScheduledNews.status == "pending").count()
    published = query.filter(ScheduledNews.status == "published").count()
    failed = query.filter(ScheduledNews.status == "failed").count()
    cancelled = query.filter(ScheduledNews.status == "cancelled").count()
    
    upcoming_24h = query.filter(
        ScheduledNews.status == "pending",
        ScheduledNews.scheduled_at >= now,
        ScheduledNews.scheduled_at <= now + timedelta(hours=24)
    ).count()
    
    overdue = query.filter(
        ScheduledNews.status == "pending",
        ScheduledNews.scheduled_at < now
    ).count()
    
    # Only show top schedulers for admin
    top_schedulers = []
    if current_user.role == UserRole.ADMIN:
        top_schedulers = db.query(
            ScheduledNews.user_uid,
            func.count(ScheduledNews.id).label('count')
        ).group_by(ScheduledNews.user_uid).order_by(desc('count')).limit(5).all()
        top_schedulers = [
            {"user_uid": s.user_uid, "count": s.count}
            for s in top_schedulers
        ]
    
    return {
        "total_scheduled": total_scheduled,
        "status_breakdown": {
            "pending": pending,
            "published": published,
            "failed": failed,
            "cancelled": cancelled
        },
        "upcoming_24h": upcoming_24h,
        "overdue": overdue,
        "top_schedulers": top_schedulers
    }

# =====================================================
# RELATED NEWS
# =====================================================

@router.get("/news/{news_uid}/related", response_model=List[Dict[str, Any]], tags=["News"])
def get_related_news(
    news_uid: str,
    limit: int = Query(5, ge=1, le=20, description="Number of related news items"),
    db: Session = Depends(get_db)
):
    """Get related news based on categories and location"""
    
    news = db.query(News).options(
        joinedload(News.categories)
    ).filter(News.news_uid == news_uid).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    # Get category IDs
    category_ids = [c.id for c in news.categories]
    
    if not category_ids:
        return []
    
    # Find related news: same categories, same language, excluding current
    related_query = db.query(News).filter(
        News.is_approved == 1,
        News.news_uid != news_uid,
        News.language_id == news.language_id
    ).join(News.categories).filter(
        Category.id.in_(category_ids)
    ).distinct()
    
    # Boost location relevance
    if news.city_id:
        related_query = related_query.order_by(
            # Exact city match first, then others
            case(
                (News.city_id == news.city_id, 1),
                else_=0
            ).desc(),
            desc(News.views_count)
        )
    else:
        related_query = related_query.order_by(desc(News.views_count))
    
    related_news = related_query.limit(limit).all()
    
    return [
        {
            "news_uid": rn.news_uid,
            "title": rn.title,
            "summary": rn.summary[:150] if rn.summary else None,
            "image_url": rn.image_url,
            "created_at": rn.created_at,
            "views": rn.views_count,
            "likes": rn.likes_count
        }
        for rn in related_news
    ]


# =====================================================
# NEWS BY CATEGORY
# =====================================================

@router.get("/news/category/{category_id}", response_model=Dict[str, Any], tags=["News"])
def get_news_by_category(
    category_id: int,
    cursor: Optional[datetime] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db)
):
    """Get news by category with pagination"""
    
    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if cursor and cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=timezone.utc)
    
    query = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language)
    ).filter(
        News.is_approved == 1,
        News.categories.any(id=category_id)
    )
    
    if cursor:
        query = query.filter(News.created_at < cursor)
    
    news_items = query.order_by(desc(News.created_at)).limit(limit + 1).all()
    
    # Check if there are more items
    has_more = len(news_items) > limit
    items = news_items[:limit]
    
    next_cursor = items[-1].created_at if items and has_more else None
    if next_cursor and next_cursor.tzinfo is None:
        next_cursor = next_cursor.replace(tzinfo=timezone.utc)
    
    return {
        "category": {
            "id": category.id,
            "name": category.name,
            "image_url": category.image_url,
            "color": category.color
        },
        "items": [
            {
                "news_uid": n.news_uid,
                "title": n.title,
                "summary": n.summary[:200] if n.summary else None,
                "image_url": n.image_url,
                "created_at": n.created_at,
                "views": n.views_count,
                "likes": n.likes_count,
                "is_breaking": n.is_breaking
            }
            for n in items
        ],
        "metadata": {
            "total": None,  # For performance, we don't count total
            "has_more": has_more,
            "next_cursor": next_cursor.isoformat() if next_cursor else None,
            "limit": limit
        }
    }


# =====================================================
# NEWS BY LOCATION
# =====================================================

@router.get("/news/location", response_model=Dict[str, Any], tags=["News"])
def get_news_by_location(
    state_id: Optional[int] = Query(None, description="Filter by state"),
    district_id: Optional[int] = Query(None, description="Filter by district"),
    city_id: Optional[int] = Query(None, description="Filter by city"),
    cursor: Optional[datetime] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db)
):
    """Get news filtered by location (state, district, or city)"""
    
    if not any([state_id, district_id, city_id]):
        raise HTTPException(
            status_code=400, 
            detail="At least one location filter (state_id, district_id, or city_id) is required"
        )
    
    if cursor and cursor.tzinfo is None:
        cursor = cursor.replace(tzinfo=timezone.utc)
    
    query = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language)
    ).filter(News.is_approved == 1)
    
    # Apply location filters
    if city_id:
        query = query.filter(News.city_id == city_id)
        location_name = db.query(City).filter(City.id == city_id).first()
        location_type = "city"
    elif district_id:
        query = query.join(City).filter(City.district_id == district_id)
        location_name = db.query(District).filter(District.id == district_id).first()
        location_type = "district"
    else:  # state_id
        query = query.join(City).join(District).filter(District.state_id == state_id)
        location_name = db.query(State).filter(State.id == state_id).first()
        location_type = "state"
    
    if cursor:
        query = query.filter(News.created_at < cursor)
    
    news_items = query.order_by(desc(News.created_at)).limit(limit + 1).all()
    
    has_more = len(news_items) > limit
    items = news_items[:limit]
    
    next_cursor = items[-1].created_at if items and has_more else None
    if next_cursor and next_cursor.tzinfo is None:
        next_cursor = next_cursor.replace(tzinfo=timezone.utc)
    
    return {
        "location": {
            "type": location_type,
            "id": location_name.id if location_name else None,
            "name": location_name.name if location_name else None
        },
        "items": [
            {
                "news_uid": n.news_uid,
                "title": n.title,
                "summary": n.summary[:200] if n.summary else None,
                "image_url": n.image_url,
                "created_at": n.created_at,
                "views": n.views_count,
                "likes": n.likes_count,
                "city": n.city.name if n.city else None,
                "district": n.city.district.name if n.city and n.city.district else None
            }
            for n in items
        ],
        "metadata": {
            "has_more": has_more,
            "next_cursor": next_cursor.isoformat() if next_cursor else None,
            "limit": limit
        }
    }


# =====================================================
# POPULAR NEWS (Trending)
# =====================================================

@router.get("/news/popular", response_model=Dict[str, Any], tags=["News"])
def get_popular_news(
    period: str = Query("day", enum=["day", "week", "month", "all"], description="Time period"),
    limit: int = Query(10, ge=1, le=50, description="Number of items"),
    db: Session = Depends(get_db)
):
    """Get most popular news based on views"""
    
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
    
    popular_news = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.language)
    ).filter(
        News.is_approved == 1,
        News.created_at >= start_date
    ).order_by(
        desc(News.views_count)
    ).limit(limit).all()
    
    return {
        "period": period,
        "items": [
            {
                "rank": idx + 1,
                "news_uid": n.news_uid,
                "title": n.title,
                "summary": n.summary[:150] if n.summary else None,
                "image_url": n.image_url,
                "created_at": n.created_at,
                "views": n.views_count,
                "likes": n.likes_count,
                "category_names": [c.name for c in n.categories]
            }
            for idx, n in enumerate(popular_news)
        ]
    }


# =====================================================
# BULK NEWS OPERATIONS (Admin)
# =====================================================

@router.post("/admin/news/bulk-approve", tags=["Admin"])
def bulk_approve_news(
    news_uids: List[str] = Body(..., description="List of news UIDs to approve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Bulk approve multiple news articles (Admin only)"""
    
    results = {
        "successful": [],
        "failed": [],
        "total": len(news_uids)
    }
    
    for news_uid in news_uids:
        try:
            news = db.query(News).filter(News.news_uid == news_uid).first()
            if not news:
                results["failed"].append({"news_uid": news_uid, "reason": "News not found"})
                continue
            
            if news.is_approved == 1:
                results["failed"].append({"news_uid": news_uid, "reason": "Already approved"})
                continue
            
            news.is_approved = 1
            news.approved_at = datetime.now(timezone.utc)
            news.approved_by_uid = current_user.user_uid
            news.updated_at = datetime.now(timezone.utc)
            
            results["successful"].append({
                "news_uid": news_uid,
                "title": news.title
            })
            
        except Exception as e:
            results["failed"].append({"news_uid": news_uid, "reason": str(e)})
    
    db.commit()
    
    return {
        "message": f"Bulk approval completed",
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "results": results
    }


@router.post("/admin/news/bulk-reject", tags=["Admin"])
def bulk_reject_news(
    news_uids: List[str] = Body(..., description="List of news UIDs to reject"),
    rejection_reason: str = Body(..., description="Reason for rejection"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Bulk reject multiple news articles (Admin only)"""
    
    results = {
        "successful": [],
        "failed": [],
        "total": len(news_uids)
    }
    
    for news_uid in news_uids:
        try:
            news = db.query(News).filter(News.news_uid == news_uid).first()
            if not news:
                results["failed"].append({"news_uid": news_uid, "reason": "News not found"})
                continue
            
            if news.is_approved == 1:
                results["failed"].append({"news_uid": news_uid, "reason": "Already approved"})
                continue
            
            news.is_approved = 0
            news.rejected_at = datetime.now(timezone.utc)
            news.rejected_by_uid = current_user.user_uid
            news.rejection_reason = rejection_reason
            news.updated_at = datetime.now(timezone.utc)
            
            results["successful"].append({
                "news_uid": news_uid,
                "title": news.title
            })
            
        except Exception as e:
            results["failed"].append({"news_uid": news_uid, "reason": str(e)})
    
    db.commit()
    
    return {
        "message": f"Bulk rejection completed",
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "rejection_reason": rejection_reason,
        "results": results
    }


@router.delete("/admin/news/bulk-delete", tags=["Admin"])
def bulk_delete_news(
    news_uids: List[str] = Body(..., description="List of news UIDs to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Bulk delete multiple news articles (Admin only)"""
    
    results = {
        "successful": [],
        "failed": [],
        "total": len(news_uids)
    }
    
    for news_uid in news_uids:
        try:
            news = db.query(News).filter(News.news_uid == news_uid).first()
            if not news:
                results["failed"].append({"news_uid": news_uid, "reason": "News not found"})
                continue
            
            # Store title for response before deletion
            title = news.title
            
            db.delete(news)
            results["successful"].append({
                "news_uid": news_uid,
                "title": title
            })
            
        except Exception as e:
            results["failed"].append({"news_uid": news_uid, "reason": str(e)})
    
    db.commit()
    
    return {
        "message": f"Bulk deletion completed",
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "results": results
    }


# =====================================================
# NEWS EXPORT (Admin)
# =====================================================

@router.get("/admin/news/export", tags=["Admin"])
def export_news(
    format: str = Query("csv", enum=["csv", "json"], description="Export format"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Export news data as CSV or JSON (Admin only)"""
    
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    query = db.query(News).options(
        joinedload(News.categories),
        joinedload(News.user),
        joinedload(News.city).joinedload(City.district).joinedload(District.state),
        joinedload(News.language)
    ).filter(News.is_approved == 1)
    
    if start_date:
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        query = query.filter(News.created_at >= start_date)
    
    if end_date:
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        query = query.filter(News.created_at <= end_date)
    
    if category_id:
        query = query.join(News.categories).filter(Category.id == category_id)
    
    news_items = query.order_by(desc(News.created_at)).all()
    
    if format == "json":
        return {
            "total": len(news_items),
            "items": [
                {
                    "news_uid": n.news_uid,
                    "title": n.title,
                    "summary": n.summary,
                    "image_url": n.image_url,
                    "created_at": n.created_at.isoformat(),
                    "views": n.views_count,
                    "likes": n.likes_count,
                    "comments": n.comments_count,
                    "shares": n.shares_count,
                    "author_name": n.user.name if n.user else None,
                    "author_username": n.user.user_name if n.user else None,
                    "categories": [c.name for c in n.categories],
                    "city": n.city.name if n.city else None,
                    "district": n.city.district.name if n.city and n.city.district else None,
                    "state": n.city.district.state.name if n.city and n.city.district and n.city.district.state else None,
                    "language": n.language.name if n.language else None
                }
                for n in news_items
            ]
        }
    
    # CSV Export
    output = StringIO()
    writer = csv.writer(output)
    
    # Headers
    headers = [
        "News UID", "Title", "Summary", "Image URL", "Created At", 
        "Views", "Likes", "Comments", "Shares", "Author Name", 
        "Author Username", "Categories", "City", "District", "State", "Language"
    ]
    writer.writerow(headers)
    
    for n in news_items:
        writer.writerow([
            n.news_uid,
            n.title,
            n.summary[:500] if n.summary else "",
            n.image_url or "",
            n.created_at.isoformat() if n.created_at else "",
            n.views_count,
            n.likes_count,
            n.comments_count,
            n.shares_count,
            n.user.name if n.user else "",
            n.user.user_name if n.user else "",
            ", ".join([c.name for c in n.categories]),
            n.city.name if n.city else "",
            n.city.district.name if n.city and n.city.district else "",
            n.city.district.state.name if n.city and n.city.district and n.city.district.state else "",
            n.language.name if n.language else ""
        ])
    
    output.seek(0)
    
    filename = f"news_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =====================================================
# HEALTH CHECK
# =====================================================

@router.get("/health", tags=["Health"])
def news_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for news service"""
    try:
        # Simple query to check database connectivity
        news_count = db.query(News).count()
        
        return {
            "status": "healthy",
            "service": "news_router",
            "services": {
                "api": "running",
                "database": "connected"
            },
            "total_news_count": news_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )

# routes/news_routes.py - Add at the top
from services.notification_service import notification_service

@router.put("/admin/news/{news_uid}/breakingFireBase", tags=["Admin"])
def set_breaking_news(
    news_uid: str,
    payload: BreakingNewsUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Set breaking news and send push notifications"""
    news = db.query(News).filter(News.news_uid == news_uid).first()
    if not news:
        raise HTTPException(404, "News not found")

    if payload.is_breaking:
        news.is_breaking = True
        news.breaking_priority = payload.priority
        news.breaking_expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expire_hours)
        
        # Send push notification to ALL users
        background_tasks.add_task(
            send_breaking_news_push,
            news.title,
            news.summary[:100] if news.summary else "",
            news.news_uid
        )
        
    else:
        news.is_breaking = False
        news.breaking_priority = 0
        news.breaking_expires_at = None

    news.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Breaking news updated", "news_uid": news_uid}


async def send_breaking_news_push(title: str, body: str, news_uid: str):
    """Send breaking news push notification to all users"""
    try:
        # Send to topic (more efficient)
        fcm_service.send_to_topic(
            topic="breaking_news",
            title=f"🚨 BREAKING: {title[:50]}",
            body=body[:100],
            data={
                "news_uid": news_uid,
                "type": "breaking_news",
                "click_action": "FLUTTER_NOTIFICATION_CLICK"
            }
        )
        logger.info(f"Breaking news push sent: {title}")
    except Exception as e:
        logger.error(f"Failed to send breaking news push: {str(e)}")
# =====================================================
# ERROR HANDLERS
# =====================================================

# @router.exception_handler(HTTPException)
# async def http_exception_handler(request, exc):
#     """Custom HTTP exception handler"""
#     logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
#     return {
#         "error": True,
#         "status_code": exc.status_code,
#         "detail": exc.detail,
#         "path": request.url.path
#     }


# @router.exception_handler(Exception)
# async def general_exception_handler(request, exc):
#     """General exception handler"""
#     logger.error(f"Unhandled Exception: {str(exc)}")
#     return {
#         "error": True,
#         "status_code": 500,
#         "detail": "Internal server error",
#         "path": request.url.path
#     }
