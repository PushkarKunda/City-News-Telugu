# 📱 Backend Specification: Screen Aggregator (BFF) Endpoints

> **Target Service**: `HyperNews-Backend` (FastAPI / PostgreSQL)  
> **Target Audience**: Backend Engineering Team  
> **Frontend Reference**: [`services/api/screens.ts`](file:///c:/A/City-News-Telugu/services/api/screens.ts) & [`services/api/routes.ts`](file:///c:/A/City-News-Telugu/services/api/routes.ts)  
> **Status**: **Required** (Currently returning `404 Not Found`, causing client warnings & fallback round-trips)

---

## 1. Executive Summary & Problem Statement

The React Native mobile client implements a **Backend-For-Frontend (BFF)** aggregation layer (`/screens/*`). Instead of making 4 to 6 separate HTTP requests across different services when a user navigates to a tab (Home, Community, Profile, etc.), the client attempts to fetch a single consolidated payload.

### The Current Issue:
The backend currently returns **`404 Not Found`** for these `/screens/*` routes:
```text
WARN [screensApi.getHome] /screens/home failed, falling back to modular endpoints: [AxiosError: Request failed with status code 404]
WARN [screensApi.getCommunity] /screens/community failed, falling back to modular endpoints: [AxiosError: Request failed with status code 404]
WARN [screensApi.getProfile] /screens/profile failed, falling back to modular endpoints: [AxiosError: Request failed with status code 404]
```

### Impact & Solution:
* **Current state**: The frontend uses fallback logic with `Promise.allSettled`, querying the modular endpoints (`/news/v1/feed`, `/categories`, `/polls/active`, `/user/users/me`, etc.) individually.
* **Drawbacks**: Increased mobile latency (300-800ms slower), extra battery/cellular data drain, and continuous 404 warning logs.
* **Action Required**: Implement the `/screens/*` router in FastAPI, running internal queries in parallel via `asyncio.gather`.

---

## 2. Core Architectural Guidelines

1. **Endpoint Prefix**: All screen endpoints should be mounted under `/screens` (e.g. `router = APIRouter(prefix="/screens", tags=["Screens"])`).
2. **Resilience & Partial Failure**:
   * If a non-essential block fails (e.g., active polls or advertisements), the endpoint **MUST NOT** return `500 Internal Server Error`.
   * Return `null` or `[]` for that block and populate the `errors` dictionary with details:
     ```json
     {
       "errors": {
         "active_polls": "Failed to load active polls"
       }
     }
     ```
3. **Authentication**:
   * Some routes are **Public / Optional Auth** (e.g. `/screens/home`, `/screens/community`). If a `Bearer <JWT>` is present, inject personalized data (user bookmarks, preferences, personalized feed). If absent, return general defaults and `null` for user-specific fields.
   * `/screens/profile` and `/screens/notifications` **require** authentication (`401 Unauthorized` if no valid token).
4. **Backend Concurrency**:
   * Use `asyncio.gather(*tasks, return_exceptions=True)` to execute underlying database/service calls concurrently.

---

## 3. High-Priority Endpoints (Resolves Active Warnings)

### 3.1. `GET /screens/home`
Aggregates all components required to render the main Home tab in one round trip.

* **Auth**: Optional (`Bearer <JWT>` for personalized bookmarks/preferences; guest returns defaults)
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `cursor` | `string` | No | Pagination cursor for feed |
  | `limit` | `integer` | No | Feed items per page (default: `20`) |
  | `category_id` | `integer` | No | Filter feed by Category ID |
  | `category_slug` | `string` | No | Filter feed by Category Slug |
  | `language_id` | `integer` | No | Filter feed by Language ID |
  | `session_id` | `string` | No | Anonymous session identifier for tracking |

* **Consolidates**:
  1. User Preferences (`/user/preferences/me` or `null` if guest)
  2. Categories (`/categories/all`)
  3. Active Polls (`/content/polls/active`)
  4. News Feed (`/news/v1/feed`)
  5. User Bookmarks (news & post IDs bookmarked by user; empty arrays if guest)

* **Expected JSON Response**:
```json
{
  "preferences": {
    "language_id": 1,
    "state_id": 10,
    "district_id": 105,
    "city_id": null,
    "category_ids": [1, 2, 5]
  },
  "categories": [
    {
      "id": 1,
      "name": "రాజకీయాలు",
      "slug": "politics",
      "icon_url": "https://..."
    }
  ],
  "active_polls": [
    {
      "id": 12,
      "poll_uid": "poll_987xyz",
      "question": "వరద సహాయక చర్యలు సంతృప్తికరంగా ఉన్నాయా?",
      "options": [
        { "text": "అవును", "votes": 120 },
        { "text": "కాదు", "votes": 45 }
      ],
      "total_votes": 165,
      "expires_at": "2026-11-10T00:00:00Z",
      "created_at": "2026-11-05T12:00:00Z",
      "is_approved": true
    }
  ],
  "feed": {
    "items": [
      {
        "id": 101,
        "uid": "news_abc123",
        "title": "హైదరాబాద్‌లో భారీ వర్షం సూచన",
        "summary": "రాగల మూడు రోజుల్లో హైదరాబాద్‌లో భారీ వర్షాలు...",
        "image_url": "https://...",
        "category_id": 1,
        "likes_count": 45,
        "comments_count": 12,
        "user_liked": false,
        "created_at": "2026-11-06T18:30:00Z"
      }
    ],
    "metadata": {},
    "next_cursor": "eyJpZCI6MTAxfQ==",
    "has_more": true
  },
  "bookmarks": {
    "news": [],
    "posts": [],
    "news_uids": ["news_abc123"],
    "post_uids": []
  },
  "errors": {}
}
```

---

### 3.2. `GET /screens/community`
Aggregates community feed, trending hashtags, and bookmark status.

* **Auth**: Optional (`Bearer <JWT>`)
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `limit` | `integer` | No | Posts per page (default: `30`) |
  | `cursor` | `string` | No | Pagination cursor |

* **Consolidates**:
  1. Posts Public Feed (`/posts/v1/feed`)
  2. Trending Hashtags (`/posts/v1/trending/hashtags` or `/discovery/trending-hashtags`)
  3. Post Bookmarks (`/user/bookmarks?type=post` or `null` for guest)

* **Expected JSON Response**:
```json
{
  "feed": {
    "posts": [
      {
        "id": 55,
        "uid": "post_789xyz",
        "author": {
          "user_uid": "usr_111",
          "name": "రమేష్ రావు",
          "avatar_url": "https://..."
        },
        "content": "మా ఏరియాలో రోడ్ల మరమ్మతులు పూర్తయ్యాయి! #Hyderabad #RoadSafety",
        "media_urls": ["https://..."],
        "likes_count": 18,
        "comments_count": 4,
        "user_liked": true,
        "created_at": "2026-11-06T19:00:00Z"
      }
    ],
    "has_more": true,
    "next_cursor": "cursor_55"
  },
  "trending_hashtags": [
    { "tag": "Hyderabad", "count": 142 },
    { "tag": "APNews", "count": 98 }
  ],
  "bookmarks": [],
  "errors": {}
}
```

---

### 3.3. `GET /screens/profile`
Aggregates all profile, dashboard, and publisher eligibility data for the logged-in user.

* **Auth**: **Required** (`Bearer <JWT>`)
* **Query Parameters**: None
* **Consolidates**:
  1. User Profile (`/user/users/me`)
  2. Dashboard Statistics (`/user/dashboardnew?detailed=true`)
  3. Publisher Eligibility (`/user/users/me/publisher-eligibility`)
  4. User's Created Posts (`/posts/v1/users/:uid/posts`)
  5. User's Bookmarks (`/user/bookmarks` for both `news` and `post`)
  6. Rewards summary (`/user/rewards` or `null`)

* **Expected JSON Response**:
```json
{
  "user": {
    "user_uid": "usr_111",
    "phone": "+919876543210",
    "name": "రమేష్ రావు",
    "profile_picture": "https://...",
    "role": "publisher",
    "is_verified": true
  },
  "dashboard": {
    "total_views": 15420,
    "total_likes": 320,
    "total_shares": 95,
    "published_news_count": 14,
    "recent_stats": []
  },
  "publisher_eligibility": {
    "is_eligible": true,
    "requirements_met": {
      "phone_verified": true,
      "profile_completed": true,
      "minimum_posts": true
    }
  },
  "posts": [
    {
      "id": 55,
      "uid": "post_789xyz",
      "content": "రోడ్ల మరమ్మతులు పూర్తయ్యాయి!",
      "likes_count": 18,
      "created_at": "2026-11-06T19:00:00Z"
    }
  ],
  "bookmarks": {
    "news": [],
    "posts": []
  },
  "rewards": null,
  "errors": {}
}
```

---

## 4. Secondary Screen Aggregators

These endpoints are also defined in the mobile client (`services/api/screens.ts`) and should be added to the same router:

### 4.1. `GET /screens/shorts`
* **Query Parameters**: `language` (str), `limit` (int, default: 20), `cursor` (str)
* **Response**:
```json
{
  "shorts": {
    "items": [...],
    "has_more": false,
    "next_cursor": null,
    "total": 15
  },
  "ads": [...],
  "errors": {}
}
```

### 4.2. `GET /screens/news/{uid}`
* **Path Parameter**: `uid` (news article UID)
* **Auth**: Optional
* **Response**:
```json
{
  "article": { ... },
  "engagement": {
    "likes_count": 45,
    "views_count": 1200,
    "shares_count": 14,
    "user_liked": false
  },
  "bookmark": { "is_bookmarked": false },
  "comments": {
    "items": [...],
    "total": 8,
    "has_more": false
  },
  "ads": [...],
  "errors": {}
}
```

### 4.3. `GET /screens/discover`
* **Query Parameters**: `state_id` (int), `limit` (int)
* **Response**:
```json
{
  "trending_news": [...],
  "trending_hashtags": [...],
  "categories": [...],
  "popular_news": [...],
  "districts": [...],
  "errors": {}
}
```

### 4.4. `GET /screens/local`
* **Query Parameters**: `state`, `district`, `city`, `state_id`, `district_id`, `city_id`, `limit`, `cursor`
* **Response**:
```json
{
  "news": {
    "items": [...],
    "has_more": false,
    "next_cursor": null,
    "count": 10
  },
  "location": {
    "state": "Telangana",
    "district": "Hyderabad",
    "city": "Hyderabad",
    "state_id": 10,
    "district_id": 105,
    "city_id": null
  },
  "errors": {}
}
```

### 4.5. `GET /screens/notifications`
* **Auth**: Required (`Bearer <JWT>`)
* **Query Parameters**: `limit` (int), `offset` (int)
* **Response**:
```json
{
  "notifications": {
    "items": [
      {
        "id": 1,
        "title": "కొత్త వార్త అప్‌డేట్",
        "message": "మీ ప్రాంతంలో వర్ష సూచన విడుదలయింది.",
        "type": "news_alert",
        "is_read": false,
        "created_at": "2026-11-06T20:00:00Z",
        "link_url": "hypernews://news/news_abc123"
      }
    ],
    "total": 1,
    "has_next": false
  },
  "unread_count": 1,
  "errors": {}
}
```

---

## 5. Sample FastAPI Implementation Blueprint

Here is an idiomatic FastAPI implementation showing how to build `/screens/home` and handle concurrent sub-queries with partial failure recovery:

```python
# routes/screen_routes.py
from fastapi import APIRouter, Depends, Query, Request
from typing import Optional, Dict, Any
import asyncio

from services.news_service import get_feed, get_all_categories
from services.poll_service import get_active_polls
from services.user_service import get_user_preferences, get_user_bookmarks
from dependencies.auth import get_optional_current_user

router = APIRouter(prefix="/screens", tags=["Screens"])

@router.get("/home")
async def get_home_screen(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    category_id: Optional[int] = Query(None),
    category_slug: Optional[str] = Query(None),
    language_id: Optional[int] = Query(None),
    current_user: Optional[Any] = Depends(get_optional_current_user)
):
    errors: Dict[str, str] = {}

    # Define concurrent async calls
    async def fetch_prefs():
        if not current_user:
            return None
        return await get_user_preferences(user_id=current_user.id)

    async def fetch_categories():
        return await get_all_categories()

    async def fetch_polls():
        return await get_active_polls()

    async def fetch_feed():
        return await get_feed(
            cursor=cursor,
            limit=limit,
            category_id=category_id,
            category_slug=category_slug,
            language_id=language_id,
            viewer_id=current_user.id if current_user else None
        )

    async def fetch_bookmarks():
        if not current_user:
            return {"news": [], "posts": [], "news_uids": [], "post_uids": []}
        return await get_user_bookmarks(user_id=current_user.id)

    # Run tasks in parallel
    results = await asyncio.gather(
        fetch_prefs(),
        fetch_categories(),
        fetch_polls(),
        fetch_feed(),
        fetch_bookmarks(),
        return_exceptions=True
    )

    prefs_res, cat_res, polls_res, feed_res, bm_res = results

    def extract(res, field_name: str, fallback_value=None):
        if isinstance(res, Exception):
            errors[field_name] = str(res)
            return fallback_value
        return res

    return {
        "preferences": extract(prefs_res, "preferences", None),
        "categories": extract(cat_res, "categories", []),
        "active_polls": extract(polls_res, "active_polls", []),
        "feed": extract(feed_res, "feed", {"items": [], "has_more": False, "next_cursor": None}),
        "bookmarks": extract(bm_res, "bookmarks", {"news": [], "posts": [], "news_uids": [], "post_uids": []}),
        "errors": errors
    }
```

---

## 6. Verification & Test Plan

Once implemented on Railway / production:

1. **Verify `/screens/home` without token**:
   ```bash
   curl -X GET "https://hypernews-production.up.railway.app/screens/home?limit=10"
   ```
   * Expect HTTP `200 OK` with `categories`, `feed`, `active_polls`, and `preferences: null`.

2. **Verify `/screens/community` with cursor**:
   ```bash
   curl -X GET "https://hypernews-production.up.railway.app/screens/community?limit=20"
   ```
   * Expect HTTP `200 OK` with `feed.posts` and `trending_hashtags`.

3. **Verify `/screens/profile` with token**:
   ```bash
   curl -X GET "https://hypernews-production.up.railway.app/screens/profile" \
     -H "Authorization: Bearer <VALID_USER_JWT>"
   ```
   * Expect HTTP `200 OK` with `user`, `dashboard`, `publisher_eligibility`, and `posts`.

4. **Confirm mobile client console**:
   * Open app ➡️ Notice that `[screensApi.getHome]`, `[screensApi.getCommunity]`, and `[screensApi.getProfile]` warnings completely disappear from Expo / Metro console logs.

