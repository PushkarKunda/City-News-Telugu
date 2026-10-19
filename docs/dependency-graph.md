# 🕸️ DEPENDENCY GRAPH & CRITICAL FILES INVENTORY

> **Project**: Hyperlocal News & Community Engagement Frontend  
> **Repository**: `Sujana2004/hyperlocal-news-frontend`  

---

## 1. High-Impact & Critical System Files

The following files constitute the primary backbone of the project and **should not be modified lightly**:

| File Path | Purpose | Downstream Impacted Files |
| :--- | :--- | :--- |
| [app/_layout.tsx](file:///c:/A/hyperlocal-news-frontend/app/_layout.tsx) | Root application entry & provider stack | All screens and navigation flows |
| [store/authStore.ts](file:///c:/A/hyperlocal-news-frontend/store/authStore.ts) | Core authentication, session & user preferences store | All screens, guards, and services |
| [services/api/client.ts](file:///c:/A/hyperlocal-news-frontend/services/api/client.ts) | Axios HTTP client, token interceptors & 401 refresh | All API calls across the application |
| [services/api/routes.ts](file:///c:/A/hyperlocal-news-frontend/services/api/routes.ts) | Master REST endpoint route mapping | All service modules in `services/api/` |
| [services/firebase.ts](file:///c:/A/hyperlocal-news-frontend/services/firebase.ts) | Native Firebase authentication wrapper | `store/authStore.ts`, login screens |
| [services/supabase.ts](file:///c:/A/hyperlocal-news-frontend/services/supabase.ts) | Supabase client & image upload functions | Avatar upload, article creator modal |
| [constants/Colors.ts](file:///c:/A/hyperlocal-news-frontend/constants/Colors.ts) | Universal theme palette definitions | Every UI component and layout screen |
| [constants/Spacing.ts](file:///c:/A/hyperlocal-news-frontend/constants/Spacing.ts) | Grid layout system, margins, radiuses | Every UI component and layout screen |

---

## 2. Module Dependency Map

```
app/_layout.tsx
 ├──► constants/Colors.ts
 ├──► hooks/useAppColorScheme.ts
 ├──► store/authStore.ts
 │     ├──► services/firebase.ts
 │     ├──► services/api/index.ts (auth, users)
 │     │     └──► services/api/client.ts
 │     │           ├──► services/api/token.ts
 │     │           └──► services/api/routes.ts
 │     ├──► services/image.ts
 │     └──► services/supabase.ts
 ├──► store/useStore.ts
 └──► app/ (Expo Router Screens)
       ├──► (auth)/
       │     ├── login.tsx ──► store/authStore.ts, hooks/useGoogleFirebaseAuth.ts
       │     └── verify-otp.tsx ──► store/authStore.ts
       ├──► (onboarding)/
       │     ├── language.tsx, location.tsx, districts.tsx, cities.tsx, interests.tsx
       │     └── setup-feed.tsx ──► store/authStore.ts
       ├──► (tabs)/
       │     ├── index.tsx ──► hooks/useNews.ts, hooks/feedInjection.ts, components/ImmersiveNewsCard.tsx
       │     ├── local.tsx ──► hooks/useNews.ts, components/LocalNewsCard.tsx
       │     ├── discover.tsx ──► hooks/useDiscovery.ts
       │     ├── shorts.tsx ──► hooks/useNews.ts
       │     ├── posts.tsx ──► hooks/usePosts.ts, components/PostCard.tsx
       │     └── profile.tsx ──► store/authStore.ts, components/common/BecomePublisherView.tsx
       ├──► (publisher)/
       │     └── dashboard.tsx ──► store/authStore.ts, components/CreateArticleModal.tsx
       └──► news/[id].tsx ──► hooks/useNews.ts, components/CommentsModal.tsx
```

---

## 3. Dependency Risk Assessment

### High Risk Components
- **`services/api/client.ts`**: Editing response interceptor handling for 401 statuses could lock users in infinite refresh loops or drop valid sessions.
- **`store/authStore.ts`**: Modifying state sanitization (`sanitizeUser`) or `completeOnboarding` will break user setup persistence across restarts.
- **`app/_layout.tsx`**: Altering font loading, SplashScreen handling, or QueryClient config could cause native crashes at cold launch.

### Low Risk Components
- **`components/ui/`**: Atomic visual primitives (`Badge`, `Button`, `Divider`, `Skeleton`). Edits are isolated to individual rendering surfaces.
