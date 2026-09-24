# 🗄️ DATABASE MAP & ENTITY RELATIONSHIPS

> **Scope**: Inferred Backend Database Schema & Frontend Entity Types  
> **Type Definitions**: [store/authStore.ts](file:///c:/A/hyperlocal-news-frontend/store/authStore.ts), [services/api/auth.ts](file:///c:/A/hyperlocal-news-frontend/services/api/auth.ts), [services/api/news.ts](file:///c:/A/hyperlocal-news-frontend/services/api/news.ts)  

---

## 1. Entity Definitions & Table Maps

### Table: `users`
- **Purpose**: Core user account and identity record.
- **Fields**:
  - `user_uid` (UUID, Primary Key)
  - `user_name` (String, Nullable)
  - `name` (String, Nullable)
  - `email` (String, Nullable, Unique)
  - `phone` (String, Nullable, Unique)
  - `role` (Integer: `1` = Reader, `2` = Publisher, `3` = Admin)
  - `email_verified` (Boolean)
  - `mobile_verified` (Boolean)
  - `is_suspended` (Boolean)
  - `profile_picture` (String / URL, Nullable)
  - `created_at` (Timestamp)
- **Relationships**:
  - Has one `user_preferences` (`user_uid` ➔ `users.user_uid`)
  - Has many `news` (`author_uid` ➔ `users.user_uid`)
  - Has many `posts` (`user_uid` ➔ `users.user_uid`)
  - Has many `comments` (`user_uid` ➔ `users.user_uid`)
  - Has many `bookmarks` (`user_uid` ➔ `users.user_uid`)

---

### Table: `user_preferences`
- **Purpose**: User location hierarchy selection and preferred news interests.
- **Fields**:
  - `id` (Integer, Primary Key)
  - `user_uid` (UUID, Foreign Key ➔ `users.user_uid`)
  - `language_id` (Integer, Foreign Key ➔ `languages.id`)
  - `state_id` (Integer, Foreign Key ➔ `states.id`)
  - `district_id` (Integer, Foreign Key ➔ `districts.id`)
  - `city_id` (Integer, Foreign Key ➔ `cities.id`)
  - `category_ids` (Array[Integer])
- **Relationships**:
  - Belongs to `users` (`user_uid`)
  - Belongs to `languages` (`language_id`)
  - Belongs to `states` (`state_id`)
  - Belongs to `districts` (`district_id`)
  - Belongs to `cities` (`city_id`)

---

### Table: `languages`
- **Purpose**: Supported localization languages.
- **Fields**:
  - `id` (Integer, Primary Key)
  - `code` (String, e.g., `'en'`, `'hi'`, `'te'`, `'ta'`, `'es'`, `'fr'`)
  - `name` (String, e.g., `'English'`, `'Hindi'`, `'Telugu'`)
  - `native_name` (String)

---

### Table: `states`, `districts`, `cities` (Location Hierarchy)
- **Purpose**: Geo-tagging tree for hyperlocal routing.
- **Hierarchy**:
  - `states` (`id`, `name`, `code`)
  - └── `districts` (`id`, `state_id` ➔ `states.id`, `name`)
  -     └── `cities` (`id`, `district_id` ➔ `districts.id`, `name`)

---

### Table: `categories`
- **Purpose**: News categorization system.
- **Fields**:
  - `id` (Integer, Primary Key)
  - `name` (String, e.g., `'Crime'`, `'Politics'`, `'Traffic'`, `'Jobs'`, `'Events'`)
  - `slug` (String, Unique)
  - `icon` (String, Nullable)

---

### Table: `news`
- **Purpose**: Main published news articles.
- **Fields**:
  - `uid` (UUID, Primary Key)
  - `title` (Text)
  - `body` (Text)
  - `summary` (Text, Nullable)
  - `category_id` (Integer, Foreign Key ➔ `categories.id`)
  - `state_id` (Integer, Foreign Key ➔ `states.id`)
  - `district_id` (Integer, Foreign Key ➔ `districts.id`)
  - `city_id` (Integer, Foreign Key ➔ `cities.id`)
  - `author_uid` (UUID, Foreign Key ➔ `users.user_uid`)
  - `image_url` (Text, Nullable)
  - `is_breaking` (Boolean, Default: `false`)
  - `likes_count` (Integer, Default: `0`)
  - `views_count` (Integer, Default: `0`)
  - `shares_count` (Integer, Default: `0`)
  - `comments_count` (Integer, Default: `0`)
  - `published_at` (Timestamp)
- **Relationships**:
  - Belongs to `users` (`author_uid`)
  - Belongs to `categories` (`category_id`)
  - Has many `news_comments` (`news_uid` ➔ `news.uid`)
  - Has many `news_likes` (`news_uid` ➔ `news.uid`)

---

### Table: `polls` & `poll_options` & `poll_votes`
- **Purpose**: Neighborhood voting system.
- **Structure**:
  - `polls` (`uid`, `question`, `category_id`, `state_id`, `district_id`, `is_active`, `created_at`)
  - └── `poll_options` (`id`, `poll_uid` ➔ `polls.uid`, `option_text`, `votes_count`)
  -     └── `poll_votes` (`id`, `poll_uid` ➔ `polls.uid`, `option_id` ➔ `poll_options.id`, `user_uid` ➔ `users.user_uid`)

---

## 2. Parent ➔ Child ER Mapping

```
[users] ─── (1:1) ───► [user_preferences]
[users] ─── (1:N) ───► [news] (as author)
[users] ─── (1:N) ───► [posts]
[users] ─── (1:N) ───► [bookmarks]
[users] ─── (1:N) ───► [news_comments]

[states] ─── (1:N) ───► [districts] ─── (1:N) ───► [cities]
[states] ─── (1:N) ───► [news]
[districts] ─(1:N) ───► [news]
[cities] ─── (1:N) ───► [news]

[categories] ─(1:N) ──► [news]
[news] ────── (1:N) ──► [news_comments]
[news] ────── (1:N) ──► [news_likes]

[polls] ───── (1:N) ──► [poll_options] ─── (1:N) ──► [poll_votes]
```
