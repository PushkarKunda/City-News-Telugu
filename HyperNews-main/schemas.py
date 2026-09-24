"""
Schemas for the application using Pydantic models.
Organized by category for better readability.
Standardized to Pydantic v2 conventions (e.g., model_config with from_attributes=True).
Removed duplicates, unused imports, and inconsistencies.
"""

from fastapi import UploadFile
from pydantic import BaseModel, HttpUrl, EmailStr, Field, ConfigDict, field_validator
from typing import Any, Optional, List, Literal, Union, Dict
from datetime import datetime, timedelta
from enum import IntEnum
from datetime import date, datetime  # ← Add 'date' here


# =============================================================================
# Enums
# =============================================================================

class UserRole(IntEnum):
    """User roles for access control."""
    GUEST = 0
    USER = 1
    PUBLISHER = 2
    MODERATOR = 3
    EMPLOYEE = 4
    ADMIN = 5
    SUPER_ADMIN = 6
    NEWS_EDITOR = 7
    CONTENT_MANAGER = 8
    AD_MANAGER = 9
    ANALYST = 10
    REPORTER = 11
    VERIFIER = 12
    SUPPORT = 13


USER_ROLE_LABELS: dict[int, str] = {
    0: "Guest",
    1: "User",
    2: "Publisher",
    3: "Moderator",
    4: "Employee",
    5: "Admin",
    6: "Super Admin",
    7: "News Editor",
    8: "Content Manager",
    9: "Ad Manager",
    10: "Analyst",
    11: "Reporter",
    12: "Verifier",
    13: "Support",
}


def user_role_label(role: int) -> str:
    """Human-readable label for a stored ``users.role`` integer."""
    try:
        r = int(role)
    except (TypeError, ValueError):
        return "Unknown"
    return USER_ROLE_LABELS.get(r, "Unknown")


# =============================================================================
# Authentication & OTP Schemas
# =============================================================================
# schemas.py - ADD THIS AT THE TOP with your other schemas

from pydantic import BaseModel, Field

class FirebaseLoginRequest(BaseModel):
    """Request body for Firebase login"""
    firebase_token: str = Field(..., description="Firebase ID token from Firebase Auth SDK")
    
class TokenResponse(BaseModel):
    """Response containing authentication tokens."""
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    refresh_expires_in: int
    email: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Request to initiate password reset via email or phone."""
    identifier: str


class PasswordResetConfirm(BaseModel):
    """Request to complete password reset using reset token."""
    token: str
    new_password: str


class RoleAssignRequest(BaseModel):
    """Request to assign a new role to a user."""
    user_id: str
    new_role: UserRole


class AdminLoginRequest(BaseModel):
    """Request for login after an OTP has been sent."""
    identifier: str  # email or phone
    role: UserRole  # expected role
    otp: str


class SendOtpRequest(BaseModel):
    """Request to send OTP via email or mobile."""
    type: str  # 'mobile' or 'email' (constrained externally if needed)
    value: str  # phone number or email


class VerifyOtp(BaseModel):
    """Request to verify OTP."""
    type: Literal["email", "mobile"]
    value: str
    otp: str


class OTPVerifyRequest(BaseModel):
    """Request to verify OTP for user registration/login."""
    user_uid: str
    email: Optional[EmailStr] = None
    email_otp: Optional[str] = None
    mobile: Optional[str] = None
    mobile_otp: Optional[str] = None


class SendOtp(BaseModel):
    """Simple request to send OTP (alternative/duplicate consolidated)."""
    type: str  # "mobile" or "email"
    value: str  # phone number or email


class PasswordLoginRequest(BaseModel):
    """Standard password-based authentication request."""
    identifier: str = Field(..., description="Email or phone number")
    password: str = Field(..., min_length=6, description="User password")


class UserRegisterRequest(BaseModel):
    """User account registration request."""
    identifier: str = Field(..., description="Email or phone number")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    name: Optional[str] = None
    language_code: Optional[str] = "en"


class TokenRefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


# =============================================================================
# User Schemas
# =============================================================================

class UserBase(BaseModel):
    """Base user model with common fields."""
    phone: str
    name: Optional[str] = None
    gender: Optional[str] = None
    language: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    email_verified: Optional[bool] = False
    mobile_verified: Optional[bool] = False


class UserCreate(UserBase):
    """Schema for creating a new user."""
    pass


class UserOut(UserBase):
    """Output schema for user details."""
    user_uid: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NewsUserInfo(BaseModel):
    """User  info for news-related contexts."""
    user_uid: str
    name: Optional[str] = None
    phone: Optional[str] = None


# =============================================================================
# Location Schemas (State, District, City, Language)
# =============================================================================

class LanguageCreate(BaseModel):
    """Schema for creating a language."""
    code: str
    name: str


class LanguageResponse(BaseModel):
    """Response schema for language details."""
    id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class LanguageOut(LanguageResponse):
    """Output schema for language (alias/consolidated)."""
    pass


class StateCreate(BaseModel):
    """Schema for creating a state."""
    name: str


class StateResponse(BaseModel):
    """Response schema for state details."""
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class StateOut(StateResponse):
    """Output schema for state (alias/consolidated)."""
    pass


class DistrictCreate(BaseModel):
    """Schema for creating a district."""
    name: str
    state_id: int


class DistrictOut(BaseModel):
    """Output schema for district details."""
    id: int
    name: str
    state_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CityCreate(BaseModel):
    """Schema for creating a city."""
    name: str
    district_id: int


class CityOut(BaseModel):
    """Output schema for city details."""
    id: int
    name: str
    district_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CityRef(BaseModel):
    """Reference schema for city (lightweight)."""
    id: int
    name: str


class StateLanguageResponse(BaseModel):
    """Combined response for state and language."""
    state: StateResponse
    language: Optional[LanguageResponse] = None
    message: Optional[str] = None


# =============================================================================
# Category Schemas
# =============================================================================

# class CategoryCreate(BaseModel):
#     """Schema for creating a category."""
#     name: str


# class CategoryOut(BaseModel):
#     """Output schema for category details."""
#     id: int
#     name: str

#     model_config = ConfigDict(from_attributes=True)

# schemas.py - Add these

# =============================================================================
# Category Schemas
# =============================================================================

class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=2, max_length=50)


class CategoryCreate(CategoryBase):
    """Create category - Frontend sends image URL"""
    image_url: Optional[str] = Field(None, max_length=500)
    display_order: int = 0
    is_active: bool = True
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = Field(None, max_length=500)


class CategoryUpdate(BaseModel):
    """Update category"""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(BaseModel):
    """Category output for mobile app"""
    id: int
    name: str
    image_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    color: Optional[str] = None
    description: Optional[str] = None
    news_count: int = 0  # Number of news in this category

    model_config = ConfigDict(from_attributes=True)


class CategoryAdminOut(CategoryOut):
    """Category output for admin panel (with timestamps)"""
    created_at: datetime
    updated_at: Optional[datetime] = None


class CategoryReorder(BaseModel):
    """Reorder categories request"""
    category_ids: List[int] = Field(..., description="Category IDs in desired order")

# =============================================================================
# News Schemas
# =============================================================================

# class NewsCreate(BaseModel):
#     """Schema for creating news."""
#     title: str
#     summary: str
#     image_url: Optional[str] = None
#     language_id: int
#     user_uid: str
#     city_id: Optional[int] = None
#     category_ids: Optional[List[int]] = []
#     source_url: Optional[str] = None
#     source_name: Optional[str] = None
class EngagementOut(BaseModel):
    likes: int = 0
    comments: int = 0
    shares: int = 0
    views: int = 0
    user_liked: bool = False
    

    
# schemas.py - UPDATED NewsCreate

class NewsCreate(BaseModel):
    """Create news - Publishers don't need source_url/source_name"""
    title: str
    summary: str
    image_url: Optional[HttpUrl] = None
    language_id: int
    user_uid: Optional[str] = None  # ✅ CHANGE: Make it Optional

    city_id: Optional[int] = None
    category_ids: List[int] = Field(default_factory=list)
    
    # These are ONLY for admin/employee (auto-generate)
    source_url: Optional[HttpUrl] = None
    source_name: Optional[str] = None
    
    class Config:
        from_attributes = True
class NewsUpdate(BaseModel):
    """Schema for updating news."""
    title: Optional[str] = None
    summary: Optional[str] = None
    image_url: Optional[str] = None
    language_id: Optional[int] = None
    city_id: Optional[int] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    category_ids: Optional[List[int]] = None



# schemas.py - UPDATED NewsOut

class NewsOut(BaseModel):
    """Detailed output with names instead of IDs"""
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str] = None
    
    # Language details
    language_id: Optional[int] = None
    language_code: Optional[str] = None
    language_name: Optional[str] = None
    
    # Publisher details
    user_uid: str
    publisher_name: Optional[str] = None
    publisher_username: Optional[str] = None
    
    # Location details (with names)
    city_id: Optional[int] = None
    city_name: Optional[str] = None
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    
    # Categories (with names)
    categories: List[dict] = []  # [{"id": 1, "name": "Politics"}]
    category_ids: List[int] = []
    
    # Source attribution (only for auto-generated)
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    is_auto_generated: bool = False
    
    # Status
    is_approved: int
    approval_status: str = "pending"  # pending, approved, rejected
    rejection_reason: Optional[str] = None
    
    # Timestamps
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    
    # Engagement
    engagement: Optional[EngagementOut] = None
    
    # Response message
    message: Optional[str] = None
    
    class Config:
        from_attributes = True


class NewsCreateResponse(BaseModel):
    """Response after creating news"""
    success: bool
    message: str
    news: Optional[NewsOut] = None
    status: str  # pending_review, approved
    next_steps: Optional[str] = None

#before updated the engagements section
# class NewsOut(BaseModel):
#     """Detailed output schema for news."""
#     news_uid: str
#     title: str
#     summary: str
#     image_url: Optional[str] = None
#     language: Optional[LanguageOut] = None
#     user_uid: str
#     is_approved: int
#     created_at: Optional[datetime] = None
#     city: Optional[CityOut] = None
#     district: Optional[DistrictOut] = None
#     state: Optional[StateOut] = None
#     source_url: Optional[str] = None
#     source_name: Optional[str] = None
#     category_ids: List[int] = []

#     model_config = ConfigDict(from_attributes=True)


class PublicNewsOut(BaseModel):
    """Public-facing output schema for approved news."""
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str] = None
    language: Optional[str] = None
    is_approved: int
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    created_at: datetime
    category_names: List[str]
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# class AdminNewsDetailsOut(BaseModel):
#     """Admin view of news with approver info."""
#     news_uid: str
#     title: str
#     summary: str
#     image_url: Optional[str] = None
#     language: Optional[LanguageOut] = None
#     is_approved: int
#     source_url: Optional[str] = None
#     source_name: Optional[str] = None
#     created_at: Optional[datetime] = None
#     category_names: List[str] = []
#     state: Optional[str] = None
#     district: Optional[str] = None
#     city: Optional[str] = None
#     user_name: Optional[str] = None
#     posted_by: Optional[Dict] = None
#     approved_by: Optional[Dict] = None

class AdminEngagementOut(BaseModel):
    likes: int = 0
    comments: int = 0
    shares: int = 0
    views: int = 0


class AdminNewsDetailsOut(BaseModel):
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str]

    language: Optional[dict]

    is_approved: int
    source_url: Optional[str]
    source_name: Optional[str]

    created_at: Optional[datetime]

    category_names: List[str]

    state: Optional[str]
    district: Optional[str]
    city: Optional[str]

    user_name: Optional[str]

    posted_by: Optional[dict]
    approved_by: Optional[dict]

    engagement: AdminEngagementOut

class AdminNewsItemOut(BaseModel):
    """Admin list item for news."""
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str] = None
    language: Optional[str] = None
    is_approved: int
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    created_at: Optional[datetime] = None
    category_names: List[str]
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    user_name: Optional[str] = None
    user_uid: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NewsURLInput(BaseModel):
    """Input for news from URL."""
    url: HttpUrl
    user_uid: str
    state: Optional[str] = None


class AutoNewsCreate(BaseModel):
    """Schema for auto-generated news from sources."""
    source_url: str
    city_id: Optional[int] = None
    district_id: Optional[int] = None
    state_id: Optional[int] = None
    category_ids: Optional[List[int]] = []

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# Sponsored Posts & Advertisements
# =============================================================================

# class SponsoredPostCreate(BaseModel):
#     """Schema for creating a sponsored post."""
#     title: str
#     content: str
#     image_url: str
#     cta_text: str
#     cta_url: str
#     state: Optional[str] = None
#     district: Optional[str] = None
#     city: Optional[str] = None
#     start_date: datetime
#     end_date: datetime


# class SponsoredPostOut(SponsoredPostCreate):
#     """Output schema for sponsored post."""
#     id: int
#     is_approved: bool
#     created_at: datetime

#     model_config = ConfigDict(from_attributes=True)


# class SponsoredItem(BaseModel):
#     """Lightweight sponsored item for feeds."""
#     id: int
#     title: str
#     content: str
#     image_url: Optional[str] = None
#     cta_text: Optional[str] = None
#     cta_url: Optional[str] = None
#     start_date: datetime
#     end_date: datetime

#     model_config = ConfigDict(from_attributes=True)


# class AdvertisementBase(BaseModel):
#     """Base schema for advertisements."""
#     title: str
#     image_url: str
#     redirect_url: Optional[str] = None
#     placement: str
#     start_date: datetime
#     end_date: datetime
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
#     is_active: bool = True


# class AdvertisementCreate(AdvertisementBase):
#     """Schema for creating an advertisement."""
#     pass


# class AdvertisementOut(AdvertisementBase):
#     """Output schema for advertisement."""
#     id: int

#     model_config = ConfigDict(from_attributes=True)


# class AdItem(BaseModel):
#     """Lightweight ad item for feeds."""
#     id: int
#     title: str
#     image_url: str
#     redirect_url: Optional[str] = None
#     placement: str
#     start_date: datetime
#     end_date: datetime
#     is_active: bool = True

#     model_config = ConfigDict(from_attributes=True)

# =============================================================================
# Enhanced Ad Schemas
# =============================================================================

class AdTargeting(BaseModel):
    """Targeting options for ads and sponsored posts"""
    languages: Optional[List[int]] = Field(None, description="Language IDs")
    states: Optional[List[int]] = Field(None, description="State IDs")
    districts: Optional[List[int]] = Field(None, description="District IDs")
    cities: Optional[List[int]] = Field(None, description="City IDs")
    gender: Optional[str] = Field(None, pattern="^(male|female|all)$", description="Target gender")
    age_min: Optional[int] = Field(None, ge=13, le=100, description="Minimum age")
    age_max: Optional[int] = Field(None, ge=13, le=100, description="Maximum age")


class AdvertisementCreate(BaseModel):
    """Schema for creating an advertisement"""
    title: str = Field(..., max_length=200)
    image_url: str = Field(..., max_length=500)
    redirect_url: Optional[str] = Field(None, max_length=500)
    placement: str = Field(..., description="banner, interstitial, native, feed")
    start_date: datetime
    end_date: datetime
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    language_id: Optional[int] = None
    is_active: bool = True
    targeting: Optional[AdTargeting] = None


class AdvertisementOut(BaseModel):
    """Output schema for advertisement"""
    id: int
    title: str
    image_url: str
    redirect_url: Optional[str]
    placement: str
    start_date: datetime
    end_date: datetime
    state_id: Optional[int]
    district_id: Optional[int]
    city_id: Optional[int]
    language_id: Optional[int]
    target_gender: Optional[str]
    target_age_min: Optional[int]
    target_age_max: Optional[int]
    is_active: bool
    is_premium: bool = False  # ✅ ADD THIS
    premium_priority: int = 0  # ✅ ADD THIS
    created_at: datetime
    updated_at: Optional[datetime]
    relevance_score: Optional[float] = None
    
    class Config:
        from_attributes = True


# In schemas.py
class SponsoredPostCreate(BaseModel):
    """Schema for creating a sponsored post."""
    title: str
    content: str
    image_url: str
    cta_text: str
    cta_url: str
    state_id: Optional[int] = None      # ← Change to state_id
    district_id: Optional[int] = None   # ← Change to district_id
    city_id: Optional[int] = None       # ← Change to city_id
    language_id: Optional[int] = None
    start_date: datetime
    end_date: datetime
    targeting: Optional[AdTargeting] = None


class SponsoredPostOut(BaseModel):
    """Output schema for sponsored post."""
    id: int
    title: str
    content: str
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    start_date: datetime
    end_date: datetime
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    language_id: Optional[int] = None
    target_gender: Optional[str] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_approved: bool = False
    
    class Config:
        from_attributes = True
    
    
# Add to schemas.py

# Add these paginated schemas to your schemas.py

class PaginatedAdvertisementsOut(BaseModel):
    """Paginated response for advertisements"""
    total: int
    page: int
    limit: int
    items: List[AdvertisementOut]
    
    class Config:
        from_attributes = True


class PaginatedSponsoredPostsOut(BaseModel):
    """Paginated response for sponsored posts"""
    total: int
    page: int
    limit: int
    items: List[SponsoredPostOut]
    
    class Config:
        from_attributes = True
# =============================================================================
# Events
# =============================================================================

class EventCreate(BaseModel):
    """Schema for creating an event."""
    title: str
    description: str
    image_url: Optional[str] = None
    event_date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: str
    is_online: bool = False
    event_url: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None


class EventOut(EventCreate):
    """Output schema for event."""
    id: int
    event_uid: str
    is_approved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# Polls
# =============================================================================

class PollCreate(BaseModel):
    """Schema for creating a poll."""
    question: str
    options: List[str]
    expires_at: Optional[datetime] = None


class PollVote(BaseModel):
    """Schema for voting in a poll."""
    poll_uid: str
    option_index: int
    user_uid: str


class PollOut(BaseModel):
    """Basic output schema for poll."""
    poll_uid: str
    question: str
    options: List[str]
    votes: List[int]
    expires_at: Optional[datetime] = None


class PollDetailOut(BaseModel):
    """Detailed output schema for poll."""
    poll_uid: str
    question: str
    options: List[str]
    votes: List[int]
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# schemas.py - UPDATED Bookmark Schemas

# schemas.py - ADD THESE SCHEMAS

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BookmarkContentPreview(BaseModel):
    """Preview of bookmarked content"""
    content_type: str
    content_id: Optional[int] = None
    content_uid: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    category_ids: Optional[List[int]] = []
    
    class Config:
        from_attributes = True


class BookmarkCreate(BaseModel):
    """Create bookmark request using UUID"""
    content_type: str = Field(..., description="news, post, event, poll")
    content_uid: str = Field(..., description="Content UUID (e.g., news_uid, post_uid)")


class BookmarkOut(BaseModel):
    """Bookmark response"""
    id: int
    user_uid: str
    content_type: str
    content_id: int
    content_uid: Optional[str] = None
    created_at: datetime
    content: Optional[BookmarkContentPreview] = None
    
    class Config:
        from_attributes = True


class PaginatedBookmarkOut(BaseModel):
    """Paginated bookmark response"""
    total: int
    limit: int
    offset: int
    has_next: bool
    items: List[BookmarkOut]
    
    class Config:
        from_attributes = True


# =============================================================================
# Feed & Shared Items
# =============================================================================

class NewsItem(BaseModel):
    """News item for feeds."""
    id: int
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str] = None
    language: Optional[str] = None
    created_at: datetime
    reaction_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NewsFeedItem(BaseModel):
    """News item for news feed."""
    news_uid: str
    title: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    language: str
    is_approved: int
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    created_at: datetime
    category_names: List[str]
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeedItem(BaseModel):
    """Generic feed item supporting multiple types."""
    type: Literal["news", "sponsored", "ad"]
    data: Union[NewsItem, SponsoredPostOut, AdvertisementOut]


class ApproverInfo(BaseModel):
    """Info for approvers in admin contexts."""
    user_uid: str
    name: Optional[str] = None
    phone: Optional[str] = None


# =============================================================================
# Video & Shorts
# =============================================================================


class VideoItem(BaseModel):
    """YouTube video item used by legacy news shorts endpoints."""
    title: str
    video_id: str
    thumbnail_url: Optional[str] = None
    channel_title: Optional[str] = None
    published_at: Optional[datetime] = None
    video_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# schemas.py - ADD THESE AT THE END

# =========================================================
# SHORTS SCHEMAS (If not already added)
# =========================================================

class ShortOut(BaseModel):
    """Base short response"""
    id: int
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    published_at: Optional[datetime] = None
    source: str  # youtube or user
    
    class Config:
        from_attributes = True


class YouTubeShortOut(ShortOut):
    """YouTube short response"""
    video_id: str
    channel_title: Optional[str] = None
    source: str = "youtube"


class UserShortCreate(BaseModel):
    """Create user short request"""
    title: str = Field(..., max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    video_url: HttpUrl
    thumbnail_url: Optional[HttpUrl] = None
    youtube_video_id: Optional[str] = Field(None, max_length=20)
    language: str = Field(..., min_length=2, max_length=10)
    category_id: Optional[int] = None


class UserShortUpdate(BaseModel):
    """Update user short request"""
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    thumbnail_url: Optional[HttpUrl] = None
    category_id: Optional[int] = None


class UserShortOut(ShortOut):
    """User short response"""
    short_uid: str
    user_uid: str
    user_name: Optional[str] = None
    user_profile_picture: Optional[str] = None
    description: Optional[str] = None
    is_approved: int
    approval_status: str
    source: str = "user"


class ShortFeedResponse(BaseModel):
    """Short feed response"""
    items: List[ShortOut]
    has_more: bool
    next_cursor: Optional[str] = None
    total: int


# ✅ ADD THIS ALIAS FOR BACKWARD COMPATIBILITY
NewsShortCreate = UserShortCreate

# =============================================================================
# Notifications & Admin
# =============================================================================

class BreakingNewsUpdate(BaseModel):
    is_breaking: bool
    priority: int = 5
    expire_hours: int = 6

class AdminNotificationRequest(BaseModel):
    """Request for sending admin notifications."""
    title: str
    message: str
    link_url: Optional[str] = None
    target_type: Literal["all", "role", "state", "district", "city", "user"]
    target_value: Optional[str] = None  # UID or name based on target_type

    @field_validator("target_value")
    def validate_target_value(cls, value, info):
        if info.data.get("target_type") != "all" and not value:
            raise ValueError("target_value is required when target_type is not 'all'.")
        return value


class PushNotificationRequest(BaseModel):
    """Request for sending Firebase push notifications."""
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    target_type: Literal["all", "user", "topic", "category"]
    user_uid: Optional[str] = None
    topic: Optional[str] = None
    category_id: Optional[int] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class BulkNotificationRequest(BaseModel):
    """Request for sending in-app and push notifications to all users."""
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    link_url: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class NotificationOut(BaseModel):
    """Output schema for notifications."""
    id: int
    user_uid: str
    title: str
    message: str
    link_url: Optional[str] = None
    notification_type: Optional[str] = None
    created_at: datetime
    is_read: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


class NotificationListOut(BaseModel):
    """Paginated notification list."""
    total: int
    limit: int
    offset: int
    has_next: bool
    items: List[NotificationOut]

    model_config = ConfigDict(from_attributes=True)


class AdminNotificationResponse(BaseModel):
    """Response for admin notification broadcast."""
    status: str
    sent_to: int
    target_type: str
    target_value: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EngagementSummaryOut(BaseModel):
    """Engagement summary response."""
    user_uid: str
    bookmarks: Dict[str, int]
    notifications: Dict[str, int]

    model_config = ConfigDict(from_attributes=True)


class NotificationReadOut(BaseModel):
    """After marking one or more notifications as read."""
    updated: int
    notification_ids: list[int] = []

from pydantic import BaseModel
from typing import List

class DashboardStat(BaseModel):
    total: int
    today: int | None = None


class EngagementStats(BaseModel):
    views: int
    likes: int
    comments: int
    shares: int


class TopReporter(BaseModel):
    user_uid: str
    name: str
    news_count: int


class TrendingNews(BaseModel):
    news_uid: str
    title: str
    views: int


class AdminDashboardOut(BaseModel):

    news: DashboardStat
    users: DashboardStat
    ads: DashboardStat
    events: DashboardStat
    polls: DashboardStat

    engagement: EngagementStats

    pending_news: int
    rejected_news: int

    top_reporters: List[TopReporter]

    trending_news: List[TrendingNews]
    
    
class DailyMetric(BaseModel):
    date: str
    news_posted: int
    views: int
    likes: int
    comments: int
    shares: int


class UserGrowth(BaseModel):
    date: str
    new_users: int


class AdminNewsAnalyticsOut(BaseModel):
    daily_metrics: List[DailyMetric]
    user_growth: List[UserGrowth]
# =============================================================================
# User/Guest Preferences
# =============================================================================

# =============================================================================
# User Preference Schemas
# =============================================================================
# schemas.py

class UserPreferenceCreateMe(BaseModel):
    """Create preferences for current user (no user_uid needed)"""
    language_id: int
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    category_ids: List[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UserPreferenceUpdateMe(BaseModel):
    """Update preferences for current user (full update)"""
    language_id: int
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    category_ids: List[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UserPreferencePatchMe(BaseModel):
    """Partial update for current user preferences"""
    language_id: Optional[int] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    category_ids: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)


# schemas.py - UPDATE THIS SCHEMA

class UserPreferenceResponse(BaseModel):
    """User preference response with names instead of IDs"""
    user_uid: str
    language: str  # Language code (te, hi, en)
    language_name: Optional[str] = None  # ✅ ADD THIS - Language name
    state_id: Optional[int] = None
    state_name: Optional[str] = None  # ✅ ADD THIS - State name
    district_id: Optional[int] = None
    district_name: Optional[str] = None  # ✅ ADD THIS - District name
    city_id: Optional[int] = None
    city_name: Optional[str] = None  # ✅ ADD THIS - City name
    categories: Optional[List[Dict[str, Any]]] = None  # ✅ CHANGE - Return objects with id and name
    category_ids: Optional[List[int]] = None  # Keep for backward compatibility
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
# class UserPreferenceCreate(BaseModel):
#     """Create/Update user preference"""
#     user_uid: str
#     language_id: int
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
#     category_ids: List[int] = Field(default_factory=list)

#     model_config = ConfigDict(from_attributes=True)


# class UserPreferenceResponse(BaseModel):
#     """User preference response"""
#     user_uid: str
#     language: str  # language code (en, te, hi)
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
#     category_ids: List[int]
#     created_at: datetime
#     updated_at: datetime

#     model_config = ConfigDict(from_attributes=True)
# class UserPreferenceResponse(BaseModel):
#     user_uid: str
#     language: str
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
#     category_ids: List[int]
#     created_at: datetime
#     updated_at: datetime

#     model_config = ConfigDict(from_attributes=True)


# =============================================================================
# Guest User Schemas
# =============================================================================

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class GuestCreateRequest(BaseModel):
    """Create guest user request"""
    device_id: str = Field(..., max_length=100, description="Unique device identifier")
    device_name: Optional[str] = Field(None, max_length=100, description="Device name/model")
    android_version: Optional[str] = Field(None, max_length=20, description="Android OS version")
    app_version: Optional[str] = Field(None, max_length=20, description="App version")
    app_version_code: Optional[str] = Field(None, max_length=10, description="App version code")
    state_id: Optional[int] = Field(None, description="Default state ID")
    district_id: Optional[int] = Field(None, description="Default district ID")
    city_id: Optional[int] = Field(None, description="Default city ID")

    model_config = ConfigDict(from_attributes=True)


class GuestResponse(BaseModel):
    """Guest user response"""
    guest_uid: str
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    android_version: Optional[str] = None
    app_version: Optional[str] = None
    app_version_code: Optional[str] = None
    created_at: datetime
    last_active_at: Optional[datetime] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    onboarding_completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GuestPreferenceCreate(BaseModel):
    """Create guest preferences"""
    guest_uid: str = Field(..., description="Guest UID")
    language: str = Field(..., max_length=10, description="Language code (en, te, hi)")
    state_id: Optional[int] = Field(None, description="State ID")
    district_id: Optional[int] = Field(None, description="District ID")
    city_id: Optional[int] = Field(None, description="City ID")
    category_ids: List[int] = Field(default_factory=list, description="Selected category IDs")

    model_config = ConfigDict(from_attributes=True)


class GuestPreferenceUpdate(BaseModel):
    """Update guest preferences"""
    language: Optional[str] = Field(None, max_length=10, description="Language code (en, te, hi)")
    state_id: Optional[int] = Field(None, description="State ID")
    district_id: Optional[int] = Field(None, description="District ID")
    city_id: Optional[int] = Field(None, description="City ID")
    category_ids: Optional[List[int]] = Field(None, description="Selected category IDs")

    model_config = ConfigDict(from_attributes=True)


class GuestPreferenceResponse(BaseModel):
    """Guest preference response"""
    guest_uid: str
    language: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    city_id: Optional[int] = None
    city_name: Optional[str] = None
    category_ids: List[int] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuestFeedResponse(BaseModel):
    """Guest feed response with personalized content"""
    guest_uid: str
    has_preferences: bool
    recommended_news: List[dict] = []
    recommended_categories: List[dict] = []
    message: Optional[str] = None
    guest_limitations: Optional[dict] = {
        "can_read": True,
        "can_like": False,
        "can_comment": False,
        "can_share": False,
        "can_bookmark": False,
        "message": "Sign up to like, comment, share, and bookmark news"
    }

    model_config = ConfigDict(from_attributes=True)


class GuestOnboardingRequest(BaseModel):
    """Complete guest onboarding request"""
    language: str = Field(..., max_length=10, description="Language code (en, te, hi)")
    state_id: Optional[int] = Field(None, description="State ID")
    district_id: Optional[int] = Field(None, description="District ID")
    city_id: Optional[int] = Field(None, description="City ID")
    category_ids: List[int] = Field(default_factory=list, description="Selected category IDs")

    model_config = ConfigDict(from_attributes=True)


class GuestOnboardingResponse(BaseModel):
    """Guest onboarding completion response"""
    message: str
    guest_uid: str
    preferences: dict
    next_steps: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


class GuestStatsResponse(BaseModel):
    """Guest statistics response (Admin only)"""
    total_guests: int
    active_today: int
    active_this_week: int
    guests_with_preferences: int
    conversion_rate: float
    top_languages: List[dict]

    model_config = ConfigDict(from_attributes=True)


class GuestLocationUpdate(BaseModel):
    """Update guest location"""
    state_id: Optional[int] = Field(None, description="State ID")
    district_id: Optional[int] = Field(None, description="District ID")
    city_id: Optional[int] = Field(None, description="City ID")

    model_config = ConfigDict(from_attributes=True)


class GuestHeartbeatResponse(BaseModel):
    """Guest heartbeat response"""
    message: str
    last_active: datetime

    model_config = ConfigDict(from_attributes=True)

# Add these new schemas to your existing schemas.py
# Add to NewsOut or create separate for guest
class GuestNewsItem(BaseModel):
    """News item for guest feed (limited fields)"""
    news_uid: str
    title: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    views: int = 0
    can_interact: bool = False

    model_config = ConfigDict(from_attributes=True)


# =============================
# Content Scheduling Schemas
# =============================

class ScheduledContentBase(BaseModel):
    content_type: str = Field(..., description="Type: sponsored_post, advertisement, event, poll")
    content_id: int = Field(..., description="ID of the content")
    scheduled_at: datetime = Field(..., description="When to publish")

class ScheduledContentCreate(ScheduledContentBase):
    pass

class ScheduledContentOut(ScheduledContentBase):
    id: int
    status: str  # pending, published, failed
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =============================
# Flagged Content Schemas
# =============================

class FlaggedContentBase(BaseModel):
    content_type: str = Field(..., description="Type: news, event, poll, sponsored, advertisement")
    content_id: int
    reason: str = Field(..., max_length=500)

class FlaggedContentCreate(FlaggedContentBase):
    flagged_by: str

class FlaggedContentOut(FlaggedContentBase):
    id: int
    flagged_by: str
    status: str  # pending, reviewed, dismissed
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FlaggedContentReview(BaseModel):
    action: str = Field(..., description="approve, reject, or dismiss")
    review_notes: Optional[str] = None

# =============================
# Content Tags Schemas
# =============================

class TagBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class TagCreate(TagBase):
    pass

class TagOut(TagBase):
    id: int
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class ContentTagsUpdate(BaseModel):
    tags: List[str] = Field(..., description="List of tag names to assign")

class TaggedContentOut(BaseModel):
    id: int
    content_type: str
    content_id: int
    tag: TagOut

# =============================
# Content Versioning Schemas
# =============================

class ContentVersionOut(BaseModel):
    id: int
    version_number: int
    data: Any
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True

# =============================
# Content Analytics Schemas
# =============================

class ContentAnalyticsOut(BaseModel):
    content_type: str
    content_id: int
    views: int
    clicks: int
    engagement_rate: float
    total_interactions: int
    period_start: datetime
    period_end: datetime
    daily_breakdown: List[dict]

class TopPerformingContentOut(BaseModel):
    content_type: str
    content_id: int
    title: str
    metric_value: int
    metric_type: str
    created_at: datetime

class ContentAnalyticsOverviewOut(BaseModel):
    total_content: int
    published_today: int
    published_this_week: int
    published_this_month: int
    top_performing: List[TopPerformingContentOut]
    engagement_trends: dict

# =============================
# Content Expiry Schemas
# =============================

class ContentExpiryUpdate(BaseModel):
    expires_at: datetime = Field(..., description="When content should expire")

class ExpiringContentOut(BaseModel):
    content_type: str
    content_id: int
    title: str
    expires_at: datetime
    days_until_expiry: int

# =============================
# Content Preview Schemas
# =============================

class ContentPreviewOut(BaseModel):
    content_type: str
    content_id: int
    data: dict
    preview_html: Optional[str] = None

# =============================
# Content Report Schemas
# =============================

class DailyReportOut(BaseModel):
    date: datetime
    content_created: dict  # Breakdown by type
    content_published: dict
    total_views: int
    total_engagement: int
    top_content: List[dict]

class MonthlyReportOut(BaseModel):
    year: int
    month: int
    summary: dict
    daily_breakdown: List[DailyReportOut]

# =============================
# Content Relationship Schemas
# =============================

class RelatedContentOut(BaseModel):
    content_type: str
    content_id: int
    title: str
    relationship_type: str
    created_at: datetime

class RelatedContentCreate(BaseModel):
    related_content_type: str
    related_content_id: int
    relationship_type: str = Field(default="related")

# =============================
# Content Template Schemas
# =============================

class ContentTemplateBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    content_type: str = Field(..., description="sponsored_post, advertisement, event, poll")
    template_data: dict
    description: Optional[str] = None

class ContentTemplateCreate(ContentTemplateBase):
    pass

class ContentTemplateOut(ContentTemplateBase):
    id: int
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True

# =============================
# Review Queue Schemas
# =============================

class ReviewQueueOut(BaseModel):
    id: int
    content_type: str
    content_id: int
    title: str
    submitted_by: str
    submitted_at: datetime
    priority: str = "medium"
    assigned_to: Optional[str] = None

# =============================
# Bulk Operation Schemas
# =============================

class BulkOperation(BaseModel):
    content_ids: List[int] = Field(..., min_items=1, max_items=100)
    action: str = Field(..., description="approve, reject, delete, archive")

class BulkOperationResponse(BaseModel):
    total: int
    successful: int
    failed: int
    errors: List[dict] = []

# =============================
# Content Search Schemas
# =============================

class ContentSearchResults(BaseModel):
    total: int
    items: List[dict]
    page: int
    limit: int
    has_next: bool
    has_previous: bool
    
    
# Add these to your schemas.py



# ==============================
# News Analytics Schemas
# ==============================

class DailyNewsStats(BaseModel):
    date: str
    summary: dict
    top_news: List[dict]

class WeeklyNewsStats(BaseModel):
    week_start: str
    week_end: str
    summary: dict
    daily_breakdown: List[dict]
    top_categories: List[dict]

class MonthlyNewsStats(BaseModel):
    year: int
    month: int
    month_name: str
    summary: dict
    weekly_breakdown: List[dict]
    language_breakdown: List[dict]

class TopPerformingNews(BaseModel):
    rank: int
    news_uid: str
    title: str
    summary: Optional[str]
    image_url: Optional[str]
    created_at: datetime
    views: int
    likes: int
    comments: int
    shares: int
    engagement_rate: float

class TrendingNews(BaseModel):
    news_uid: str
    title: str
    image_url: Optional[str]
    views: int
    likes: int
    created_at: datetime
    age_hours: float
    views_per_hour: float
    trending_score: float

# ==============================
# News Moderation Schemas
# ==============================

class NewsFlagCreate(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)

class NewsFlagOut(BaseModel):
    id: int
    news_uid: str
    user_uid: str
    reason: str
    status: str
    review_notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class FlagReview(BaseModel):
    action: str = Field(..., description="approve, reject, or dismiss")
    review_notes: Optional[str] = Field(None, max_length=500)

class PendingFlagOut(BaseModel):
    id: int
    type: str
    content_id: str
    content_title: str
    reporter_uid: str
    reporter_name: Optional[str]
    reason: str
    status: str
    created_at: datetime
    review_notes: Optional[str] = None
    
# Add to your schemas.py

# ==============================
# News Scheduling Schemas
# ==============================

class ScheduledNewsBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    summary: str = Field(..., min_length=10, max_length=2000)
    image_url: Optional[str] = Field(None, max_length=500)
    language_id: int
    user_uid: str
    city_id: Optional[int] = None
    source_url: Optional[str] = Field(None, max_length=500)
    source_name: Optional[str] = Field(None, max_length=200)
    category_ids: List[int] = Field(default_factory=list)

class ScheduledNewsCreate(ScheduledNewsBase):
    scheduled_at: datetime = Field(..., description="When to publish the news")

class ScheduledNewsUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=500)
    summary: Optional[str] = Field(None, min_length=10, max_length=2000)
    image_url: Optional[str] = Field(None, max_length=500)
    language_id: Optional[int] = None
    city_id: Optional[int] = None
    source_url: Optional[str] = Field(None, max_length=500)
    source_name: Optional[str] = Field(None, max_length=200)
    category_ids: Optional[List[int]] = None
    scheduled_at: Optional[datetime] = None

class ScheduledNewsOut(BaseModel):
    id: int
    news_uid: str
    title: str
    summary: str
    image_url: Optional[str] = None
    language_id: int
    user_uid: str
    city_id: Optional[int] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    category_ids: List[int] = []
    scheduled_at: datetime
    status: str
    created_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
#==================================================================================================


#==================================================================
# Add to schemas.py

# =====================================================
# User Suspension Schemas
# =====================================================

class UserSuspendRequest(BaseModel):
    """Request to suspend a user"""
    reason: str = Field(..., min_length=5, max_length=500, description="Reason for suspension")
    duration_days: int = Field(30, ge=1, le=365, description="Suspension duration in days")
    notify_user: bool = Field(True, description="Send notification to user")


class UserActivateRequest(BaseModel):
    """Request to activate a user"""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for activation")
    notify_user: bool = Field(True, description="Send in-app notification to the user")


class UserSuspendResponse(BaseModel):
    """Response after suspending a user"""
    user_uid: str
    user_name: Optional[str]
    is_suspended: bool
    suspension_reason: str
    suspended_until: datetime
    suspended_by: str
    message: str


class UserSuspensionStatus(BaseModel):
    """Check suspension status of a user"""
    is_suspended: bool
    suspension_reason: Optional[str] = None
    suspended_at: Optional[datetime] = None
    suspended_until: Optional[datetime] = None
    suspended_by: Optional[str] = None
    days_remaining: Optional[int] = None


class UserSuspensionHistory(BaseModel):
    """Suspension history entry"""
    id: int
    user_uid: str
    reason: str
    suspended_at: datetime
    suspended_until: Optional[datetime] = None
    suspended_by: str
    activated_at: Optional[datetime] = None
    activated_by: Optional[str] = None
    was_permanent: bool = False
# =====================================================
# Admin User Creation Schemas
# =====================================================

class AdminUserPreferenceCreate(BaseModel):
    """Preferences for admin user creation"""
    language_id: int
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    category_ids: List[int] = Field(default_factory=list)


class AdminUserCreate(BaseModel):
    """Schema for admin creating a user"""
    user_name: Optional[str] = Field(None, min_length=3, max_length=50, description="Username")
    name: Optional[str] = Field(None, max_length=100, description="Full name")
    phone: Optional[str] = Field(None, description="Phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$", description="Gender")
    date_of_birth: Optional[datetime] = Field(None, description="Date of birth")
    language: Optional[str] = Field(None, description="Preferred language")
    state_id: Optional[int] = Field(None, description="State ID")
    district_id: Optional[int] = Field(None, description="District ID")
    city_id: Optional[int] = Field(None, description="City ID")
    role: int = Field(
        1,
        description="0:GUEST, 1:USER, 2:PUBLISHER, 3:MODERATOR, 4:EMPLOYEE, 5:ADMIN",
    )
    email_verified: Optional[bool] = Field(None, description="Email verification status")
    mobile_verified: Optional[bool] = Field(None, description="Mobile verification status")
    preferences: Optional[AdminUserPreferenceCreate] = Field(None, description="User preferences")
    

# Add these after your existing User schemas (around line 80-100)

# =============================================================================
# User Profile Extended Schemas (NEW)
# =============================================================================

class UserProfileOut(BaseModel):
    """Extended user profile output for dashboard and profile pages"""
    user_uid: str
    user_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    profile_picture: Optional[str] = None  # ✅ ADD THIS
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    language: Optional[str] = None
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    city_id: Optional[int] = None
    city_name: Optional[str] = None
    role: int
    role_name: str
    email_verified: bool = False
    mobile_verified: bool = False
    is_suspended: bool = False
    suspension_reason: Optional[str] = None
    suspension_until: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    preferences: Optional[dict] = None
    stats: Optional[dict] = None
    
    class Config:
        from_attributes = True


# schemas.py - ADD THIS

class UserUpdate(BaseModel):
    user_name: Optional[str] = Field(None, min_length=3, max_length=18)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
    date_of_birth: Optional[date] = None
    language_id: Optional[int] = None  
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    profile_picture: Optional[str] = None


class UserDetailOut(UserProfileOut):
    """Extended user details for admin with additional fields"""
    statistics: Optional[dict] = None
    recent_posts: Optional[List[dict]] = None
    admin_info: Optional[dict] = None
    
    class Config:
        from_attributes = True
        

# Add these after your existing User schemas (around line 80-100)

# =============================================================================
# User Profile Extended Schemas (NEW)
# =============================================================================

# schemas.py - UPDATE UserProfileOut

class UserProfileOut(BaseModel):
    """User profile output schema"""
    user_uid: str
    user_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    profile_picture: Optional[str] = None
    
    # ✅ FIXED: Use language_id instead of language
    language_id: Optional[int] = None
    language_code: Optional[str] = None
    language_name: Optional[str] = None
    
    # ✅ FIXED: Location fields
    state_id: Optional[int] = None
    state_name: Optional[str] = None
    district_id: Optional[int] = None
    district_name: Optional[str] = None
    city_id: Optional[int] = None
    city_name: Optional[str] = None
    
    role: int
    role_name: str
    email_verified: bool
    mobile_verified: bool
    is_suspended: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    preferences: Optional[dict] = None
    
    class Config:
        from_attributes = True

# class UserUpdate(BaseModel):
#     """User profile update"""
#     user_name: Optional[str] = Field(None, min_length=3, max_length=18)
#     name: Optional[str] = Field(None, min_length=2, max_length=100)
#     gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")
#     date_of_birth: Optional[date] = None  # ✅ Changed from datetime to date
#     language_id: Optional[int] = None
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
#     profile_picture: Optional[str] = None
    
#     class Config:
#         from_attributes = True
# # Add these after your existing User schemas

# =============================================================================
# User Profile Schemas (Minimal)
# =============================================================================

class UserProfileOut(BaseModel):
    """User profile output (without heavy stats)"""
    user_uid: str
    user_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    profile_picture: Optional[str] = None  # ✅ ADD THIS

    date_of_birth: Optional[datetime] = None
    language: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    role: int
    email_verified: bool = False
    mobile_verified: bool = False
    is_suspended: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# class UserUpdate(BaseModel):
#     """Schema for updating user profile"""
#     user_name: Optional[str] = Field(None, min_length=3, max_length=50)
#     name: Optional[str] = Field(None, max_length=100)
#     profile_picture: Optional[str] = None  # ✅ ADD THIS

#     email: Optional[EmailStr] = None
#     phone: Optional[str] = Field(None, min_length=10, max_length=15)
#     gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
#     date_of_birth: Optional[datetime] = None
#     language: Optional[str] = Field(None, max_length=10)
#     state_id: Optional[int] = None
#     district_id: Optional[int] = None
#     city_id: Optional[int] = None
# Add to schemas.py

# =============================================================================
# Insights Schemas
# =============================================================================

class InsightPageCreate(BaseModel):
    """Schema for creating an insight page."""
    page_number: int
    title: str
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class InsightPageCreateWithFile(BaseModel):
    """Schema for creating an insight page with file upload support."""
    page_number: int
    title: str
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    image_file: Optional[UploadFile] = None


class InsightPageOut(BaseModel):
    """Output schema for insight page."""
    id: int
    page_number: int
    title: str
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InsightStoryCreate(BaseModel):
    """Schema for creating/updating an insight story."""
    insight_uid: Optional[str] = None  # Auto-generated if not provided
    title: str
    cover_image_url: Optional[str] = None
    category_name: str
    pages: List[InsightPageCreate]


class InsightStoryCreateWithFiles(BaseModel):
    """Schema for creating/updating an insight story with file upload support."""
    insight_uid: Optional[str] = None  # Auto-generated if not provided
    title: str
    cover_image_url: Optional[str] = None
    category_name: str
    pages: List[InsightPageCreate]
    cover_image_file: Optional[UploadFile] = None


class InsightCoverOut(BaseModel):
    """Output schema for insight cover (grid view)."""
    id: int
    insight_uid: str
    title: str
    cover_image_url: Optional[str] = None
    category_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InsightListResponse(BaseModel):
    """Paginated list response for insight covers."""
    total: int
    limit: int
    offset: int
    has_next: bool
    items: List[InsightCoverOut]
    category: Optional[str] = None


class InsightStoryOut(BaseModel):
    """Output schema for full insight story."""
    id: int
    insight_uid: str
    title: str
    cover_image_url: Optional[str] = None
    category_name: str
    created_at: datetime
    pages: List[InsightPageOut]

    model_config = ConfigDict(from_attributes=True)


class InsightShareCreate(BaseModel):
    """Schema for creating an insight share."""
    insight_uid: str
    user_uid: str
    platform: str

# Add this to your schemas.py file

class InsightUpdate(BaseModel):
    """Schema for updating an insight story"""
    insight_uid: Optional[str] = Field(None, max_length=8, description="New unique identifier")
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    category_name: Optional[str] = Field(None, min_length=2, max_length=100)
    cover_image_url: Optional[str] = None
    pages: Optional[List[InsightPageCreate]] = Field(None, min_items=1, max_items=50)
    
# Add these schemas if not present

class UserActivityLogOut(BaseModel):
    """Schema for user activity log response"""
    id: int
    user_uid: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# schemas/rewards_schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# =========================================================
# ENUMS
# =========================================================

class TransactionType(str, Enum):
    EARN = "earn"
    SPEND = "spend"
    BONUS = "bonus"
    REFERRAL = "referral"
    AD_REWARD = "ad_reward"


class CurrencyType(str, Enum):
    POINTS = "points"
    COINS = "coins"


class BadgeRarity(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"
    MYTHIC = "mythic"


class ReferralStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    REWARDED = "rewarded"


class VoucherType(str, Enum):
    DISCOUNT = "discount"
    GIFT_CARD = "gift_card"
    PREMIUM = "premium"
    PHYSICAL = "physical"
    AFFILIATE = "affiliate"


class LeaderboardPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


# =========================================================
# BASE SCHEMAS
# =========================================================

class BadgeSchema(BaseModel):
    badge_id: str
    badge_name: str
    badge_icon: Optional[str] = None
    badge_color: Optional[str] = None
    badge_description: Optional[str] = None
    rarity: BadgeRarity = BadgeRarity.COMMON
    earned_at: datetime

    class Config:
        from_attributes = True


class TransactionSchema(BaseModel):
    id: int
    transaction_type: TransactionType
    currency_type: CurrencyType
    amount: int
    description: str
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =========================================================
# REWARDS SCHEMAS
# =========================================================

class NextLevelInfo(BaseModel):
    level: int
    points_needed: int


class UserRewardsSummary(BaseModel):
    points: int
    coins: int
    level: int
    level_progress: int
    current_streak: int
    longest_streak: int
    referral_code: str
    referral_count: int
    total_points_earned: int
    total_coins_earned: int
    total_ads_watched: int
    coins_from_ads: int
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    is_flagged: bool
    rank: int
    recent_badges: List[BadgeSchema]
    next_level: Optional[NextLevelInfo] = None


class TransactionListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    has_next: bool
    items: List[TransactionSchema]


class LeaderboardEntry(BaseModel):
    rank: int
    user_uid: str
    user_name: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    points_earned: int


class LeaderboardResponse(BaseModel):
    period: LeaderboardPeriod
    leaderboard: List[LeaderboardEntry]


# =========================================================
# EARNING SCHEMAS
# =========================================================

class EarnReadResponse(BaseModel):
    message: str
    points_earned: int
    total_reads: int


class EarnShareResponse(BaseModel):
    message: str
    points_earned: int
    coins_earned: int
    total_shares: int


class EarnCommentResponse(BaseModel):
    message: str
    points_earned: int


class EarnLikeResponse(BaseModel):
    message: str
    points_earned: int


class EarnBookmarkResponse(BaseModel):
    message: str
    points_earned: int


class DailyLoginResponse(BaseModel):
    claimed: bool
    points_earned: int
    coins_earned: int
    current_streak: int
    longest_streak: int


# =========================================================
# AD REWARD SCHEMAS
# =========================================================

class AdRewardClaimRequest(BaseModel):
    ad_id: Optional[int] = None


class AdRewardClaimResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    coins_earned: int
    total_coins: int
    ads_watched_today: int
    daily_limit: int


# =========================================================
# REFERRAL SCHEMAS
# =========================================================

class ReferralMilestoneInfo(BaseModel):
    count: int
    remaining: int
    reward_coins: int
    reward_points: int
    badge: str
    description: str


class ReferralEarnings(BaseModel):
    points: int
    coins: int


class ReferralShareLinks(BaseModel):
    whatsapp: str
    telegram: str
    twitter: str
    facebook: str


class ReferralInfoResponse(BaseModel):
    referral_code: str
    referral_count: int
    total_referrals: int
    pending_referrals: int
    completed_referrals: int
    total_earned: ReferralEarnings
    next_milestone: Optional[ReferralMilestoneInfo] = None
    recent_referrals: List[Dict[str, Any]]
    share_text: str
    share_links: ReferralShareLinks


class UseReferralRequest(BaseModel):
    referral_code: str = Field(..., min_length=5, max_length=20)

    @field_validator('referral_code')
    @classmethod
    def validate_referral_code(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('Referral code must be alphanumeric')
        return v.upper()


class UseReferralResponse(BaseModel):
    success: bool
    message: str
    referrer_earned: Optional[ReferralEarnings] = None
    new_user_earned: Optional[ReferralEarnings] = None


# =========================================================
# DAILY CHALLENGE SCHEMAS
# =========================================================

class DailyChallengeResponse(BaseModel):
    id: int
    title: str
    description: str
    action_type: str
    target_count: int
    reward_points: int
    reward_coins: int
    progress: int
    completed: bool
    claimed: bool
    percentage: int


class ClaimChallengeResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    points_earned: Optional[int] = None
    coins_earned: Optional[int] = None


class UpcomingChallenge(BaseModel):
    date: str
    title: str
    description: str
    reward_points: int
    reward_coins: int


class UpcomingChallengesResponse(BaseModel):
    challenges: List[UpcomingChallenge]


# =========================================================
# BINGO SCHEMAS
# =========================================================

class BingoCell(BaseModel):
    task_key: str
    task_name: str
    completed: bool
    difficulty: str
    position: Dict[str, int]


class BingoProgress(BaseModel):
    completed_cells: int
    total_cells: int
    percentage: float
    lines_completed: int
    max_possible_lines: int


class BingoStatusResponse(BaseModel):
    week_start: str
    week_end: str
    days_remaining: int
    grid: List[List[BingoCell]]
    completed_lines: List[str]
    lines_count: int
    progress: BingoProgress
    potential_reward: int
    is_complete: bool
    reward_claimed: bool


class ClaimBingoResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    reward_coins: Optional[int] = None
    lines_completed: Optional[int] = None
    full_house: bool = False


# =========================================================
# VOUCHER SCHEMAS
# =========================================================

class VoucherSchema(BaseModel):
    id: int
    voucher_uid: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    voucher_type: VoucherType
    points_cost: int
    coins_cost: int
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    total_quantity: int
    remaining_quantity: int
    user_limit: int
    sponsor_name: Optional[str] = None
    sponsor_logo_url: Optional[str] = None
    is_active: bool
    is_featured: bool
    redemption_count: int

    class Config:
        from_attributes = True


class VoucherListResponse(BaseModel):
    total: int
    featured: List[VoucherSchema]
    available: List[VoucherSchema]
    popular: List[VoucherSchema]


class RedeemVoucherRequest(BaseModel):
    voucher_id: int

    @field_validator('voucher_id')
    @classmethod
    def validate_voucher_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError('Invalid voucher ID')
        return v


class RedeemVoucherResponse(BaseModel):
    success: bool
    message: str
    voucher_code: Optional[str] = None
    voucher_details: Optional[VoucherSchema] = None
    points_spent: int = 0
    coins_spent: int = 0
    remaining_points: int = 0
    remaining_coins: int = 0


class UserVoucherSchema(BaseModel):
    id: int
    voucher_id: int
    voucher_code: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    voucher_type: VoucherType
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    status: str
    redeemed_at: datetime
    used_at: Optional[datetime] = None
    expires_at: datetime

    class Config:
        from_attributes = True


class MyVouchersResponse(BaseModel):
    active: List[UserVoucherSchema]
    used: List[UserVoucherSchema]
    expired: List[UserVoucherSchema]


# =========================================================
# ADMIN SCHEMAS
# =========================================================

class RewardsStatsSummary(BaseModel):
    total_users: int
    total_points_earned: int
    total_coins_earned: int
    total_coins_spent: int
    total_ads_watched: int
    average_points_per_user: float


class TopUserStats(BaseModel):
    user_uid: str
    user_name: str
    points: int
    level: int


class BadgeDistribution(BaseModel):
    badge_id: str
    badge_name: str
    count: int


class FlaggedUserInfo(BaseModel):
    user_uid: str
    flag_reason: Optional[str] = None
    flagged_at: Optional[datetime] = None
    points: int
    coins: int


class RewardsStatsResponse(BaseModel):
    summary: RewardsStatsSummary
    top_users: List[TopUserStats]
    badge_distribution: List[BadgeDistribution]
    flagged_users: List[FlaggedUserInfo]


class AdminAddPointsRequest(BaseModel):
    user_uid: str = Field(..., min_length=6, max_length=8)
    points: int = Field(..., gt=0, le=100000)
    reason: str = Field(..., min_length=3, max_length=500)

    @field_validator('user_uid')
    @classmethod
    def validate_user_uid(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('User UID must be alphanumeric')
        return v.upper()


class AdminAddPointsResponse(BaseModel):
    message: str
    points_added: int
    user_uid: str


class AdminClearFlagResponse(BaseModel):
    message: str
    user_uid: str


# =========================================================
# FRAUD DETECTION SCHEMAS
# =========================================================

class SuspiciousActivitySchema(BaseModel):
    id: int
    user_uid: str
    activity_type: str
    description: str
    ip_address: Optional[str] = None
    severity: str
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FlaggedUsersResponse(BaseModel):
    flagged_users: List[FlaggedUserInfo]


# =========================================================
# ERROR SCHEMAS
# =========================================================

class ErrorResponse(BaseModel):
    error: bool = True
    detail: str
    status_code: int


class RateLimitErrorResponse(BaseModel):
    error: bool = True
    detail: str
    limit: int
    remaining: int
    retry_after: int


# =========================================================
# REQUEST VALIDATION SCHEMAS
# =========================================================

class EarnReadRequest(BaseModel):
    news_uid: str = Field(..., min_length=1, max_length=50)

    @field_validator('news_uid')
    @classmethod
    def validate_news_uid(cls, v: str) -> str:
        if not v or len(v) < 5:
            raise ValueError('Invalid news UID')
        return v


class EarnShareRequest(BaseModel):
    news_uid: str = Field(..., min_length=1, max_length=50)
    platform: str = Field(..., pattern='^(whatsapp|telegram|twitter|facebook|linkedin)$')

    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        valid_platforms = ['whatsapp', 'telegram', 'twitter', 'facebook', 'linkedin']
        if v.lower() not in valid_platforms:
            raise ValueError(f'Platform must be one of: {", ".join(valid_platforms)}')
        return v.lower()


class EarnCommentRequest(BaseModel):
    comment_id: int = Field(..., gt=0)


class EarnLikeRequest(BaseModel):
    news_uid: str = Field(..., min_length=1, max_length=50)


class EarnBookmarkRequest(BaseModel):
    news_uid: str = Field(..., min_length=1, max_length=50)
    
# =========================================================
# Enums
# =========================================================

class DeviceType(str, Enum):
    """Device types for session tracking"""
    ANDROID = "android"
    IOS = "ios"
    WEB = "web"
    DESKTOP = "desktop"
    TABLET = "tablet"


class ActivityAction(str, Enum):
    """User activity actions for logging"""
    # Auth actions
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    REFRESH_TOKEN = "refresh_token"
    
    # Profile actions
    UPDATE_PROFILE = "update_profile"
    UPDATE_PASSWORD = "update_password"
    UPDATE_EMAIL = "update_email"
    UPDATE_PHONE = "update_phone"
    UPDATE_AVATAR = "update_avatar"
    
    # News actions
    CREATE_NEWS = "create_news"
    UPDATE_NEWS = "update_news"
    DELETE_NEWS = "delete_news"
    PUBLISH_NEWS = "publish_news"
    APPROVE_NEWS = "approve_news"
    REJECT_NEWS = "reject_news"
    
    # Engagement actions
    LIKE_NEWS = "like_news"
    UNLIKE_NEWS = "unlike_news"
    COMMENT_NEWS = "comment_news"
    DELETE_COMMENT = "delete_comment"
    SHARE_NEWS = "share_news"
    SAVE_NEWS = "save_news"
    REPORT_NEWS = "report_news"
    
    # Admin actions
    SUSPEND_USER = "suspend_user"
    ACTIVATE_USER = "activate_user"
    CHANGE_ROLE = "change_role"
    DELETE_USER = "delete_user"
    VIEW_USER_DATA = "view_user_data"
    EXPORT_DATA = "export_data"
    
    # Session actions
    SESSION_EXPIRED = "session_expired"
    SESSION_KILLED = "session_killed"
    DEVICE_REMOVED = "device_removed"
    DEVICE_BLACKLISTED = "device_blacklisted"
    
    # Security actions
    SUSPICIOUS_LOGIN = "suspicious_login"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INVALID_TOKEN = "invalid_token"
    
    # Settings actions
    UPDATE_PREFERENCES = "update_preferences"
    UPDATE_NOTIFICATIONS = "update_notifications"
    ENABLE_2FA = "enable_2fa"
    DISABLE_2FA = "disable_2fa"


class SecuritySeverity(str, Enum):
    """Security event severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# =========================================================
# Device Limit Configuration
# =========================================================

# Maximum devices allowed per role
# Role IDs: 0=GUEST, 1=USER, 2=PUBLISHER, 3=MODERATOR, 4=EMPLOYEE, 5=ADMIN
DEVICE_LIMITS = {
    0: 1,   # GUEST - 1 device
    1: 1,   # USER - 1 device
    2: 1,   # PUBLISHER - 1 device
    3: 2,   # MODERATOR - 2 devices
    4: 2,   # EMPLOYEE - 2 devices
    5: 3,   # ADMIN - 3 devices
}


def get_max_devices(role: int) -> int:
    """Get maximum allowed devices for a role"""
    return DEVICE_LIMITS.get(role, 1)


def get_role_name(role: int) -> str:
    """Get role name from role ID"""
    role_names = {
        0: "GUEST",
        1: "USER",
        2: "PUBLISHER",
        3: "MODERATOR",
        4: "EMPLOYEE",
        5: "ADMIN"
    }
    return role_names.get(role, "UNKNOWN")


# =========================================================
# Session Schemas
# =========================================================

class DeviceInfo(BaseModel):
    """Device information for session tracking"""
    device_id: str = Field(..., min_length=10, max_length=255, description="Unique device identifier")
    device_name: Optional[str] = Field(None, max_length=100, description="Device name (e.g., iPhone 13)")
    device_type: DeviceType = Field(..., description="Type of device")
    device_model: Optional[str] = Field(None, max_length=100, description="Device model")
    os_version: Optional[str] = Field(None, max_length=50, description="OS version")
    app_version: Optional[str] = Field(None, max_length=20, description="App version")
    fcm_token: Optional[str] = Field(None, max_length=255, description="FCM push notification token")
    
    @field_validator('device_id')
    def validate_device_id(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Device ID must be at least 10 characters')
        return v.strip()
    
    @field_validator('device_type')
    def validate_device_type(cls, v):
        if v not in [dt.value for dt in DeviceType]:
            raise ValueError(f'Invalid device type. Must be one of: {[dt.value for dt in DeviceType]}')
        return v
    
    model_config = ConfigDict(use_enum_values=True)


class SessionResponse(BaseModel):
    """Session information response (public facing)"""
    session_id: str = Field(..., description="Hashed session ID (for reference only)")
    device_id: str = Field(..., description="Partial device ID hash for identification")
    device_name: Optional[str] = Field(None, description="Device name")
    device_type: str = Field(..., description="Device type")
    device_model: Optional[str] = Field(None, description="Device model (hidden for privacy)")
    is_active: bool = Field(..., description="Whether session is active")
    is_current: bool = Field(..., description="Whether this is the current session")
    ip_address: Optional[str] = Field(None, description="IP address (hidden for privacy)")
    location: Optional[str] = Field(None, description="Approximate location")
    login_at: datetime = Field(..., description="Login timestamp")
    last_activity_at: datetime = Field(..., description="Last activity timestamp")
    expires_at: datetime = Field(..., description="Session expiry timestamp")
    
    model_config = ConfigDict(from_attributes=True)


class ActiveSessionsResponse(BaseModel):
    """Response for active sessions list"""
    current_session: Optional[SessionResponse] = Field(None, description="Current session details")
    other_sessions: List[SessionResponse] = Field(default_factory=list, description="Other active sessions")
    total_active_sessions: int = Field(..., description="Total number of active sessions")
    max_allowed_devices: int = Field(..., description="Maximum devices allowed for role")
    can_add_more: bool = Field(..., description="Whether user can add more devices")
    
    model_config = ConfigDict(from_attributes=True)


class KillSessionRequest(BaseModel):
    """Request to kill a session"""
    session_id: str = Field(..., description="Session ID hash to kill")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for killing session")
    
    @field_validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Valid session ID is required')
        return v.strip()


class KillAllOtherSessionsRequest(BaseModel):
    """Request to kill all other sessions"""
    keep_current: bool = Field(True, description="Whether to keep current session")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for killing sessions")
    
    model_config = ConfigDict(from_attributes=True)


class CreateSessionRequest(BaseModel):
    """Request to create a new session (used internally)"""
    device_info: DeviceInfo
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    expires_in_days: int = Field(30, ge=1, le=90, description="Session expiry in days")


# =========================================================
# Activity Schemas
# =========================================================

class ActivityLogCreate(BaseModel):
    """Create activity log entry"""
    action: ActivityAction = Field(..., description="Action performed")
    resource_type: Optional[str] = Field(None, max_length=50, description="Type of resource affected")
    resource_id: Optional[str] = Field(None, max_length=100, description="ID of resource affected")
    method: Optional[str] = Field(None, max_length=10, description="HTTP method")
    endpoint: Optional[str] = Field(None, max_length=500, description="API endpoint")
    status_code: Optional[int] = Field(None, ge=100, le=599, description="HTTP status code")
    response_time_ms: Optional[int] = Field(None, ge=0, description="Response time in milliseconds")
    old_value: Optional[Dict[str, Any]] = Field(None, description="Previous value (for updates)")
    new_value: Optional[Dict[str, Any]] = Field(None, description="New value (for updates)")
    error_message: Optional[str] = Field(None, description="Error message if applicable")
    
    @field_validator('resource_type')
    def validate_resource_type(cls, v):
        if v:
            allowed = ['news', 'user', 'comment', 'profile', 'preference', 'device', 'session']
            if v.lower() not in allowed:
                raise ValueError(f'Resource type must be one of: {allowed}')
        return v.lower() if v else v
    
    @field_validator('method')
    def validate_method(cls, v):
        if v:
            allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
            if v.upper() not in allowed:
                raise ValueError(f'HTTP method must be one of: {allowed}')
        return v.upper() if v else v
    
    model_config = ConfigDict(use_enum_values=True)


class ActivityLogResponse(BaseModel):
    """Activity log response"""
    id: int = Field(..., description="Database ID")
    activity_id: str = Field(..., description="Unique activity ID (UUID)")
    user_uid: str = Field(..., description="User UID")
    action: str = Field(..., description="Action performed")
    resource_type: Optional[str] = Field(None, description="Type of resource")
    resource_id: Optional[str] = Field(None, description="Resource ID")
    method: Optional[str] = Field(None, description="HTTP method")
    endpoint: Optional[str] = Field(None, description="API endpoint (admin only)")
    status_code: Optional[int] = Field(None, description="HTTP status code")
    response_time_ms: Optional[int] = Field(None, description="Response time")
    ip_address: Optional[str] = Field(None, description="IP address (admin only)")
    location: Optional[str] = Field(None, description="Location (approximate)")
    old_value: Optional[Dict[str, Any]] = Field(None, description="Previous value")
    new_value: Optional[Dict[str, Any]] = Field(None, description="New value")
    error_message: Optional[str] = Field(None, description="Error message")
    created_at: datetime = Field(..., description="Timestamp")
    
    model_config = ConfigDict(from_attributes=True)


class ActivityFilterParams(BaseModel):
    """Filters for activity logs"""
    user_uid: Optional[str] = Field(None, description="Filter by user UID")
    action: Optional[ActivityAction] = Field(None, description="Filter by action")
    resource_type: Optional[str] = Field(None, description="Filter by resource type")
    resource_id: Optional[str] = Field(None, description="Filter by resource ID")
    status_code: Optional[int] = Field(None, ge=100, le=599, description="Filter by status code")
    from_date: Optional[datetime] = Field(None, description="Start date")
    to_date: Optional[datetime] = Field(None, description="End date")
    min_response_time: Optional[int] = Field(None, ge=0, description="Minimum response time")
    max_response_time: Optional[int] = Field(None, ge=0, description="Maximum response time")
    
    model_config = ConfigDict(use_enum_values=True)


class PaginatedActivityResponse(BaseModel):
    """Paginated activity logs response"""
    items: List[ActivityLogResponse] = Field(..., description="List of activity logs")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_previous: bool = Field(..., description="Whether there is a previous page")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Device Management Schemas
# =========================================================

class DeviceBlacklistRequest(BaseModel):
    """Request to blacklist a device"""
    device_id: str = Field(..., min_length=10, max_length=255, description="Device ID to blacklist")
    reason: str = Field(..., min_length=5, max_length=500, description="Reason for blacklisting")
    expires_at: Optional[datetime] = Field(None, description="When the blacklist expires (null = permanent)")
    is_permanent: bool = Field(False, description="Whether this is a permanent blacklist")
    
    @field_validator('reason')
    def validate_reason(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('Reason must be at least 5 characters')
        return v.strip()
    
    @field_validator('expires_at')
    def validate_expiry(cls, v):
        if v and v <= datetime.now():
            raise ValueError('Expiry date must be in the future')
        return v
    
    model_config = ConfigDict(from_attributes=True)


class DeviceBlacklistResponse(BaseModel):
    """Device blacklist response"""
    device_id: str = Field(..., description="Partial device ID hash")
    reason: str = Field(..., description="Reason for blacklisting")
    blocked_by: str = Field(..., description="Admin UID who blocked the device")
    blocked_at: datetime = Field(..., description="When the device was blacklisted")
    expires_at: Optional[datetime] = Field(None, description="When the blacklist expires")
    is_permanent: bool = Field(..., description="Whether this is permanent")
    
    model_config = ConfigDict(from_attributes=True)


class DeviceInfoResponse(BaseModel):
    """Device information response (admin only)"""
    device_id_hash: str = Field(..., description="Hashed device ID")
    device_fingerprint: str = Field(..., description="Device fingerprint (hashed)")
    device_type: str = Field(..., description="Device type")
    device_name: Optional[str] = Field(None, description="Device name (decrypted for admin)")
    device_model: Optional[str] = Field(None, description="Device model (decrypted for admin)")
    os_version: Optional[str] = Field(None, description="OS version (decrypted for admin)")
    app_version: Optional[str] = Field(None, description="App version (decrypted for admin)")
    first_seen: datetime = Field(..., description="First time this device was seen")
    last_seen: datetime = Field(..., description="Last time this device was seen")
    total_sessions: int = Field(..., description="Total number of sessions from this device")
    is_blacklisted: bool = Field(..., description="Whether device is blacklisted")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Session Statistics Schemas
# =========================================================

class SessionStatsResponse(BaseModel):
    """Session statistics response"""
    total_sessions: int = Field(..., description="Total number of sessions (including inactive)")
    active_sessions: int = Field(..., description="Currently active sessions")
    active_devices: int = Field(..., description="Currently active devices")
    sessions_today: int = Field(..., description="Sessions created today")
    unique_devices_last_30_days: int = Field(..., description="Unique devices in last 30 days")
    most_used_device: Optional[str] = Field(None, description="Most frequently used device type")
    average_session_duration_hours: float = Field(..., description="Average session duration in hours")
    
    model_config = ConfigDict(from_attributes=True)


class DeviceLimitInfo(BaseModel):
    """Device limit information for a role"""
    role: int = Field(..., description="Role ID")
    role_name: str = Field(..., description="Role name")
    max_devices: int = Field(..., description="Maximum allowed devices")
    current_devices: int = Field(..., description="Currently active devices")
    can_add_more: bool = Field(..., description="Whether user can add more devices")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Security Audit Schemas
# =========================================================

class SecurityEventResponse(BaseModel):
    """Security event response"""
    event_id: str = Field(..., description="Unique event ID")
    event_type: str = Field(..., description="Type of security event")
    severity: SecuritySeverity = Field(..., description="Severity level")
    user_uid: Optional[str] = Field(None, description="Affected user UID")
    details: Dict[str, Any] = Field(..., description="Event details")
    ip_address: Optional[str] = Field(None, description="IP address (admin only)")
    created_at: datetime = Field(..., description="When the event occurred")
    is_resolved: bool = Field(False, description="Whether event has been resolved")
    resolved_at: Optional[datetime] = Field(None, description="When event was resolved")
    resolved_by: Optional[str] = Field(None, description="Admin who resolved the event")
    
    model_config = ConfigDict(from_attributes=True)


class ResolveSecurityEventRequest(BaseModel):
    """Request to resolve a security event"""
    notes: Optional[str] = Field(None, max_length=500, description="Resolution notes")
    
    @field_validator('notes')
    def validate_notes(cls, v):
        if v and len(v.strip()) < 5:
            raise ValueError('Notes must be at least 5 characters if provided')
        return v.strip() if v else v
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Analytics Schemas
# =========================================================

class UserActivitySummary(BaseModel):
    """Summary of user activity for analytics"""
    user_uid: str = Field(..., description="User UID")
    total_actions: int = Field(..., description="Total number of actions")
    unique_actions: List[str] = Field(..., description="Unique actions performed")
    most_frequent_action: str = Field(..., description="Most frequently performed action")
    last_active: datetime = Field(..., description="Last activity timestamp")
    activity_days: int = Field(..., description="Number of days with activity")
    average_daily_actions: float = Field(..., description="Average actions per day")
    
    model_config = ConfigDict(from_attributes=True)


class ActivityTrendsResponse(BaseModel):
    """Activity trends over time"""
    daily_activity: Dict[str, int] = Field(..., description="Daily activity counts")
    hourly_distribution: Dict[int, int] = Field(..., description="Hourly distribution of activities")
    top_actions: List[Dict[str, Any]] = Field(..., description="Most common actions")
    active_users_trend: List[Dict[str, Any]] = Field(..., description="Active users over time")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Request/Response Wrappers
# =========================================================

class ActivityStatsResponse(BaseModel):
    """Combined activity statistics"""
    period: str = Field(..., description="Time period (day, week, month, year)")
    total_activities: int = Field(..., description="Total activities in period")
    unique_users: int = Field(..., description="Unique users who performed activities")
    top_actions: List[Dict[str, Any]] = Field(..., description="Top 5 actions")
    peak_hours: List[int] = Field(..., description="Peak activity hours")
    
    model_config = ConfigDict(from_attributes=True)


class BulkActivityResponse(BaseModel):
    """Response for bulk activity operations"""
    success: bool = Field(..., description="Whether operation succeeded")
    message: str = Field(..., description="Response message")
    processed_count: int = Field(..., description="Number of activities processed")
    failed_count: int = Field(0, description="Number of failed operations")
    errors: Optional[List[str]] = Field(None, description="Error messages if any")
    
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Validation Helpers
# =========================================================

def validate_session_hash(session_hash: str) -> bool:
    """Validate session hash format"""
    import re
    # Session hash should be 64 character hex string
    return bool(re.match(r'^[a-f0-9]{64}$', session_hash))


def validate_device_id(device_id: str) -> bool:
    """Validate device ID format"""
    return device_id and len(device_id) >= 10


def get_device_limit_message(role: int, current: int) -> str:
    """Get user-friendly device limit message"""
    max_devices = get_max_devices(role)
    role_name = get_role_name(role)
    
    if current >= max_devices:
        return f"You have reached the maximum device limit ({max_devices}) for {role_name} role. Please logout from another device first."
    else:
        remaining = max_devices - current
        return f"You can add {remaining} more device(s). Maximum allowed for {role_name} role is {max_devices}."
    
    # schemas.py - Add these

class PostCreate(BaseModel):
    content: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[HttpUrl] = None
    video_url: Optional[HttpUrl] = None

    model_config = ConfigDict(from_attributes=True)

# schemas.py - ADD THIS

class PostUpdate(BaseModel):
    """Update post schema"""
    content: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = None
    video_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PostCommentCreate(BaseModel):
    """Request body for creating a post comment."""
    comment_text: str = Field(..., min_length=1, max_length=1000)

    model_config = ConfigDict(from_attributes=True)


class PostShareRequest(BaseModel):
    """Optional request body for sharing a post."""
    platform: Optional[str] = Field(None, description="whatsapp, instagram, twitter, facebook")

    model_config = ConfigDict(from_attributes=True)


class PostOut(BaseModel):
    post_uid: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    user_uid: str
    user_name: Optional[str] = None
    user_display_name: Optional[str] = None
    user_profile_picture: Optional[str] = None
    like_count: int
    comment_count: int
    share_count: int
    created_at: datetime
    time_ago: str
    hashtags: List[Dict] = []
    is_liked: bool = False

    model_config = ConfigDict(from_attributes=True)
