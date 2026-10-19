# 📡 API MAP & REST INVENTORY

> **Base URL**: `https://hypernews-production.up.railway.app`  
> **Route Definition Source**: [services/api/routes.ts](file:///c:/A/hyperlocal-news-frontend/services/api/routes.ts)  

---

## 1. Authentication Domain (`API_ROUTES.auth`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/user/auth/firebase/login` | Exchange Firebase ID token for JWT token pair | `{ firebase_token: string }` | No |
| `POST` | `/user/auth/refresh` | Refresh expired JWT access token | `refresh_token` (query param) | Refresh Token |
| `POST` | `/user/auth/logout` | Invalidate current user session | None | Bearer JWT |
| `POST` | `/user/auth/switch-to-publisher` | Upgrade user role to Publisher (Role 2) | None | Bearer JWT |
| `POST` | `/user/device/token/register` | Register FCM push notification token | `{ fcm_token, device_type, device_name }` | Bearer JWT |
| `DELETE`| `/user/device/token/unregister` | Unregister FCM token | None | Bearer JWT |

---

## 2. User & Profile Domain (`API_ROUTES.user`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/user/users/me` | Fetch active user profile | None | Bearer JWT |
| `PATCH` | `/user/users/me` | Update profile information (name, avatar, phone) | `{ name?, profile_picture?, phone? }` | Bearer JWT |
| `GET` | `/user/users/me/publisher-eligibility` | Check if user meets requirements to become reporter | None | Bearer JWT |
| `GET` | `/user/users/me/suspension-status` | Check if user account is suspended | None | Bearer JWT |
| `GET` | `/user/preferences/me` | Get user onboarding preferences | None | Bearer JWT |
| `POST` | `/user/preferences/me` | Batch save user onboarding preferences | `{ language_id, state_id, district_id, city_id, category_ids }` | Bearer JWT |
| `GET` | `/user/dashboardnew` | Fetch main user dashboard summary | None | Bearer JWT |
| `GET` | `/user/dashboard/engagement` | Fetch personal engagement statistics | None | Bearer JWT |

---

## 3. News Domain (`API_ROUTES.news`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/news/v1/feed` | Fetch main geo-targeted news feed | `page`, `limit`, `state_id`, `district_id`, `city_id` | Bearer JWT |
| `POST` | `/news/v1/news` | Publish new article (Publisher) | `{ title, body, category_id, state_id, district_id, city_id, image_url }` | Bearer JWT (Role >= 2) |
| `GET` | `/news/v1/news/:uid` | Fetch article detail by UID | `uid` (path param) | Optional |
| `PUT` | `/news/v1/news/:uid` | Update existing article | `uid` (path param), updated fields | Bearer JWT (Author) |
| `DELETE`| `/news/v1/user/news/:uid` | Delete published article | `uid` (path param) | Bearer JWT (Author) |
| `GET` | `/news/v1/news/breaking` | Fetch breaking emergency news alerts | None | Bearer JWT |
| `GET` | `/news/v1/news/popular` | Fetch popular articles | None | Bearer JWT |
| `GET` | `/news/v1/news/analytics/trending` | Fetch trending news items | None | Bearer JWT |
| `GET` | `/news/v1/news/location` | Fetch news filtered by specific location | `state_id`, `district_id`, `city_id` | Bearer JWT |
| `GET` | `/news/v1/news/category/:id` | Fetch news by category ID | `id` (category ID) | Bearer JWT |
| `GET` | `/content/news-shorts` | Fetch vertical video shorts feed | `page`, `limit` | Bearer JWT |
| `POST` | `/news/v1/user/news/:uid/like` | Like an article | `uid` (news UID) | Bearer JWT |
| `DELETE`| `/news/v1/user/news/:uid/like` | Unlike an article | `uid` (news UID) | Bearer JWT |
| `POST` | `/news/v1/user/news/:uid/view` | Record article view count | `uid` (news UID) | Bearer JWT |
| `POST` | `/news/v1/user/news/:uid/share` | Record article share action | `uid` (news UID) | Bearer JWT |
| `GET` | `/news/v1/news/:uid/comments` | Fetch article comments | `uid` (news UID) | Bearer JWT |
| `POST` | `/news/v1/user/news/:uid/comment` | Submit comment on article | `uid`, `{ content: string }` | Bearer JWT |
| `DELETE`| `/news/v1/user/news/:uid/comment/:id`| Delete user comment | `uid`, `id` (comment ID) | Bearer JWT |

---

## 4. Content, Events & Polls Domain (`API_ROUTES.content`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/content/advertisements/active` | Fetch active feed advertisements | None | Bearer JWT |
| `GET` | `/content/sponsored-posts/active` | Fetch active sponsored posts | None | Bearer JWT |
| `GET` | `/content/events` | Fetch local community events | `location_id` | Bearer JWT |
| `GET` | `/content/polls/active` | Fetch active neighborhood polls | None | Bearer JWT |
| `PUT` | `/content/polls/vote` | Cast vote on active poll | `{ poll_id, option_id }` | Bearer JWT |

---

## 5. Location & Base Data Domain (`API_ROUTES.location`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/base/languages` | List all supported application languages | None | Public |
| `GET` | `/base/states` | List all available States | None | Public |
| `GET` | `/base/districts` | List Districts in selected State | `state_id` (query) | Public |
| `GET` | `/base/cities` | List Cities in selected District | `district_id` (query) | Public |
| `GET` | `/base/search` | Search locations by keyword | `q` (search query) | Public |

---

## 6. Rewards & Gamification Domain (`API_ROUTES.rewards`)

| Method | Endpoint Route | Purpose | Payload / Parameters | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/rewards/me` | Fetch user reward points & rank | None | Bearer JWT |
| `POST` | `/rewards/daily-login` | Claim daily login reward points | None | Bearer JWT |
| `POST` | `/rewards/earn/read` | Claim reward points for reading article | `{ article_id }` | Bearer JWT |
| `POST` | `/rewards/earn/share` | Claim reward points for sharing article | `{ article_id }` | Bearer JWT |
| `GET` | `/rewards/bingo` | Fetch user bingo challenge card | None | Bearer JWT |
| `POST` | `/rewards/bingo/claim` | Claim bingo completion reward | `{ tile_id }` | Bearer JWT |
