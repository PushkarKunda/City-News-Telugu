# models/__init__.py
"""
Central export for all SQLAlchemy domain models.
"""
from models.user import User, OTPStore, UserPreference, DeviceToken, user_preference_categories
from models.news import (
    News, Category, Comment, NewsView, NewsFlag, ScheduledNews,
    news_categories, scheduled_news_categories
)
from models.base_location import Language, State, District, City
from models.monetization import Advertiser, Campaign, AdUnitConfig, AdEvent, CampaignStatus, AdNetwork, AdType
from models.content import (
    Advertisement, SponsoredPost, AdImpression, SponsoredImpression,
    Event, Poll, ContentSchedule, FlaggedContent, ContentVersion,
    ContentTag, ContentTagMapping
)
from models.engagement import (
    Bookmark, Notification, UserActivityLog, Reaction, Share, CommentLike
)
from models.insorts import Insight, InsightPage, InsightShare
from models.source import NewsSource
from models.audit import AuditLog
from models.post import Post, PostComment, PostLike, PostShare, PostHashtag, post_hashtags
from models.follow import Follow
from models.shorts import YouTubeShort
from models.settings import MenuItem, FooterLink, SocialLink, AppSettings
from models.rewards import (
    UserRewards, UserTransaction, UserBadge, Referral, ReferralMilestone,
    DailyChallenge, UserChallengeProgress, BingoCard, AdReward,
    Voucher, UserVoucher, SuspiciousActivity
)
from models.user_activity import UserSession, UserActivity

__all__ = [
    "User", "OTPStore", "UserPreference", "DeviceToken", "user_preference_categories",
    "News", "Category", "Comment", "NewsView", "NewsFlag", "ScheduledNews",
    "news_categories", "scheduled_news_categories",
    "Language", "State", "District", "City",
    "Advertiser", "Campaign", "AdUnitConfig", "AdEvent", "CampaignStatus", "AdNetwork", "AdType",
    "Advertisement", "SponsoredPost", "AdImpression", "SponsoredImpression",
    "Event", "Poll", "ContentSchedule", "FlaggedContent", "ContentVersion",
    "ContentTag", "ContentTagMapping",
    "Bookmark", "Notification", "UserActivityLog", "Reaction", "Share", "CommentLike",
    "Insight", "InsightPage", "InsightShare",
    "NewsSource", "AuditLog",
    "Post", "PostComment", "PostLike", "PostShare", "PostHashtag", "post_hashtags", "Follow", "YouTubeShort",
    "MenuItem", "FooterLink", "SocialLink", "AppSettings",
    "UserRewards", "UserTransaction", "UserBadge", "Referral", "ReferralMilestone",
    "DailyChallenge", "UserChallengeProgress", "BingoCard", "AdReward",
    "Voucher", "UserVoucher", "SuspiciousActivity",
    "UserSession", "UserActivity",
]