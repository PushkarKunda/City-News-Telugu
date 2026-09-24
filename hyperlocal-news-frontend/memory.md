# 🧠 PROJECT MEMORY & PERMANENT INTELLIGENCE ENGINE

> **Project Name**: Hyperlocal News & Community Engagement Frontend (`hyperlocal-news-frontend`)  
> **Repository Owner**: Sujana2004  
> **Framework**: Expo (v52.0.23, Managed Workflow) & React Native (v0.76.9)  
> **Language**: TypeScript 5.3  
> **Target Platforms**: Android, iOS, Web  

---

## 1. Project Overview

### What the Project Does
`hyperlocal-news-frontend` is a state-of-the-art **Hyperlocal News & Community Engagement Mobile Application**. It enables citizens to discover real-time community news localized by State, District, City, and specific Localities. Beyond traditional article feeds, it incorporates immersive video shorts, interactive city polls, local events, neighbor posts, emergency breaking alerts, user rewards/gamification, and a dedicated **Publisher Dashboard** for local community journalists to publish verified news.

### Why it Exists
Traditional media channels focus heavily on national or state-level events, leaving neighborhood-specific news, local infrastructure issues, municipal polls, and civic updates underserved. This application solves the hyperlocal information vacuum by connecting local citizens, verified community reporters, and municipal stakeholders on a unified mobile platform.

---

## 2. PROJECT PURPOSE

### Business Problem Solved
1. **Hyperlocal Information Deficit**: Delivers news targeted to specific districts and cities down to neighborhood blocks.
2. **Community Reporter Empowerment**: Provides a self-publishing platform for accredited local journalists and verified community reporters.
3. **Civic Engagement & Feedback**: Enables instant citizen participation through polls, comments, post sharing, and event discovery.
4. **Multilingual Access**: Eliminates language barriers in regional communities through dynamic 6-language instant localization (English, Hindi, Telugu, Tamil, Spanish, French).

### Target Users
- **General Citizens / Readers**: Users discovering localized news, voting in neighborhood polls, watching news shorts, and bookmarking stories.
- **Community Publishers / Reporters**: Verified local journalists (Role >= 2) creating articles, tracking article analytics, and monitoring publication status.

### Primary Entities
- **User & User Preferences**: User profile, language preference, theme, location hierarchy (State, District, City), and category interests.
- **News Article & News Short**: Rich article entity (title, body, location, category, author, media URLs, breaking status, view count, share count).
- **Post & Comment**: Neighbor community discussions, hashtag associations, and nested comment threads.
- **Event & Poll**: Local community meetups and interactive civic polls with real-time vote distribution.
- **Reward & Badge**: Gamification points, login streaks, bingo cards, and reading/sharing challenge badges.

---

## 3. Technology Stack

| Category | Technology / Library | Purpose & Version |
| :--- | :--- | :--- |
| **Core Framework** | Expo (`~52.0.23`) / React Native (`0.76.9`) | Cross-platform native runtime (Managed Workflow) |
| **Navigation** | Expo Router (`~4.0.15`) | File-based typed routing stack & nested tabs |
| **State Management** | Zustand (`^5.0.2`) | Global modular stores with `@react-native-async-storage/async-storage` persistence |
| **Data Fetching** | TanStack React Query (`^5.62.11`) + Axios (`^1.7.9`) | Server state caching, retries, and network interceptors |
| **Authentication** | React Native Firebase Auth (`^24.1.0`) + Backend JWT | Phone OTP + Google OAuth via Firebase SDK, exchanged for custom JWT |
| **Storage / Media** | Supabase JS (`^2.107.0`) | Public storage bucket (`new-images`) for image and media uploads |
| **Form Handling** | React Hook Form (`^7.54.2`) + Zod (`^3.24.1`) | Typed form state & schema validation |
| **Styling & UI** | Vanilla React Native StyleSheet + Custom Design System | Pixel-perfect token grid (`Colors`, `Spacing`, `Typography`), Google Poppins fonts |
| **Animation & Polish**| React Native Reanimated (`~3.16.4`), Lottie (`7.1.0`), Expo Blur, Expo Linear Gradient | Hardware-accelerated transitions and visual polish |
| **Deployment / CI** | Expo Application Services (EAS) | Build profiles in `eas.json` (development, preview, production) |

---

## 4. Repository Structure & Tree

```filepath
hyperlocal-news-frontend/
├── .easignore                   # Artifact exclusion for EAS builds
├── .env.example                 # Template for environment variables
├── GoogleService-Info.plist      # Native iOS Firebase config
├── google-services.json         # Native Android Firebase config
├── app.json                     # Expo native app configuration & plugin manifests
├── eas.json                     # EAS build & deployment profiles
├── index.ts                     # Main entrypoint registering Expo root
├── package.json                 # Project dependencies & npm scripts
├── tsconfig.json                # TypeScript compiler config & path aliases (@/*)
├── app/                         # Expo Router File-based Navigation
│   ├── _layout.tsx              # Root Layout, font loader, theme sync, network guard
│   ├── index.tsx                # Initial splash screen & authentication router guard
│   ├── (auth)/                  # Auth group (login, OTP verification)
│   │   ├── _layout.tsx
│   │   ├── login.tsx            # Phone OTP & Google Sign-In UI
│   │   └── verify-otp.tsx       # 6-digit OTP verification screen
│   ├── (onboarding)/            # Onboarding wizard flow
│   │   ├── _layout.tsx
│   │   ├── language.tsx         # Step 1: Select preferred language
│   │   ├── location.tsx         # Step 2: Select State
│   │   ├── districts.tsx        # Step 3: Select District
│   │   ├── cities.tsx           # Step 4: Select City
│   │   ├── interests.tsx        # Step 5: Select News Categories
│   │   ├── setup-feed.tsx       # Step 6: Feed preference initialization loader
│   │   ├── complete.tsx         # Step 7: Onboarding success welcome screen
│   │   └── edit-profile.tsx     # Profile setup & avatar compressor/uploader
│   ├── (tabs)/                  # Main app navigation bottom tabs
│   │   ├── _layout.tsx          # Custom tab bar wrapper with Zustand visibility control
│   │   ├── index.tsx            # Geo-targeted main news feed
│   │   ├── local.tsx            # Neighborhood / Locality specific news & events
│   │   ├── discover.tsx         # Search, breaking news, popular & category explore
│   │   ├── shorts.tsx           # Vertical immersive video shorts feed
│   │   ├── posts.tsx            # Community neighbor posts & hashtag feeds
│   │   ├── profile.tsx          # User profile dashboard, settings & publisher link
│   │   ├── menu-bookmarks.tsx   # Saved articles library
│   │   ├── notifications.tsx    # In-app & push notification center
│   │   ├── settings.tsx         # General app settings
│   │   ├── settings-interests.tsx
│   │   ├── settings-language.tsx
│   │   ├── settings-location.tsx
│   │   ├── help.tsx             # Help, FAQ & Support
│   │   └── more.tsx             # Extended menu options
│   ├── (publisher)/             # Community Publisher Portal
│   │   ├── _layout.tsx
│   │   └── dashboard.tsx        # Publisher article management, stats & draft creator
│   └── news/
│       └── [id].tsx             # Dynamic article detail view, comments & sharing
├── components/                  # Modular Component Library
│   ├── Header.tsx               # Universal dynamic header with search & notification badges
│   ├── TabBar.tsx               # Custom bottom navigation bar component
│   ├── ImmersiveNewsCard.tsx    # Full-featured news card with voting, bookmarks & share
│   ├── LocalNewsCard.tsx        # Compact news card for local feeds
│   ├── PostCard.tsx             # Community post card with likes and comments
│   ├── CommentsModal.tsx        # Article comment section overlay modal
│   ├── PostCommentsModal.tsx    # Community post comment modal
│   ├── CreateArticleModal.tsx   # Publisher article creation modal
│   ├── common/                  # Reusable business views
│   │   ├── BecomePublisherView.tsx
│   │   └── NotificationItem.tsx
│   └── ui/                      # Design System Atoms
│       ├── Badge.tsx, Button.tsx, Card.tsx, Divider.tsx, EmptyState.tsx,
│       IconButton.tsx, Input.tsx, LoadingSpinner.tsx, ProfileMenuItem.tsx, Skeleton.tsx
├── constants/                   # Design Tokens
│   ├── Colors.ts                # Light & dark theme palettes (`#4648D4` primary)
│   ├── Spacing.ts               # Layout grid spacing, border radiuses & shadows
│   └── Typography.ts            # Poppins font sizes & line heights
├── hooks/                       # Custom React Hooks
│   ├── useApi.ts                # Generic TanStack React Query query & mutation handler
│   ├── useAppColorScheme.ts     # Light / Dark / System theme resolver
│   ├── useAppTextScale.ts       # Font accessibility scale
│   ├── useNews.ts               # Localized news feed queries & mutations
│   ├── usePosts.ts              # Community posts fetching & creation
│   ├── usePolls.ts              # Poll voting logic & local state updates
│   ├── useEngagement.ts         # Likes, bookmarks, shares, and comments hooks
│   ├── useDiscovery.ts          # Search, trending, and category discovery
│   ├── useNotifications.ts      # Push & in-app notification state
│   ├── useGoogleFirebaseAuth.ts  # Native Google Sign-In credential helper
│   └── feedInjection.ts         # Smart feed algorithm combining news, ads & polls
├── services/                    # Infrastructure Integration Layer
│   ├── api/                     # Centralized API network client
│   │   ├── client.ts            # Axios instance, Bearer token interceptor & refresh queue
│   │   ├── config.ts            # Base URL resolution & timeout configs
│   │   ├── routes.ts            # Endpoint registry (~70 REST routes)
│   │   ├── token.ts             # SecureStore token reader/writer
│   │   ├── auth.ts, content.ts, discovery.ts, engagement.ts, follow.ts,
│   │   location.ts, news.ts, notifications.ts, posts.ts, users.ts
│   ├── firebase.ts              # Firebase Native Auth (Phone OTP & Google Sign-In)
│   ├── supabase.ts              # Supabase Storage client for image uploads
│   └── image.ts                 # Expo Image Manipulator compressor helper
├── store/                       # Zustand Global Stores
│   ├── authStore.ts             # User session, onboarding data, preferences & theme
│   ├── useStore.ts              # Active bookmarks, publisher status & user state sync
│   └── tabBarStore.ts           # Tab bar visibility toggle store
└── utils/                       # Utility Functions
    ├── apiClient.ts             # Mock API simulator fallback
    ├── formatters.ts            # Date formatting (date-fns) & number formatters
    ├── responsive.ts            # Screen dimension calculations & grid scaling
    └── validators.ts            # Form inputs validation helpers
```

---

## 5. SYSTEM ARCHITECTURE

### Text Architecture Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT (EXPO / RN)                       │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Expo Router Screens   │   │ Design System Components             │  │
│  │ (Auth, Tabs, News)    │   │ (ImmersiveNewsCard, Header, Modal)  │  │
│  └──────────┬────────────┘   └──────────────────┬───────────────────┘  │
│             │                                   │                      │
│  ┌──────────▼───────────────────────────────────▼───────────────────┐  │
│  │ Custom React Hooks (useNews, useAuthStore, useApi)               │  │
│  └──────────┬───────────────────────────────────┬───────────────────┘  │
│             │                                   │                      │
│  ┌──────────▼─────────────┐          ┌──────────▼───────────────────┐  │
│  │ Zustand Stores         │          │ TanStack React Query Cache   │  │
│  │ (AsyncStorage Sync)    │          │ (StaleTime: 5m, GC: 10m)     │  │
│  └──────────┬─────────────┘          └──────────┬───────────────────┘  │
│             │                                   │                      │
│  ┌──────────▼───────────────────────────────────▼───────────────────┐  │
│  │ Axios Network Client (interceptors, SecureStore Tokens, Refresh) │  │
│  └──────────┬───────────────────────────────────┬───────────────────┘  │
└─────────────┼───────────────────────────────────┼──────────────────────┘
              │                                   │
   ┌──────────▼───────────────┐        ┌──────────▼──────────────────────┐
   │ Firebase Native Auth SDK │        │ Supabase Storage (`new-images`) │
   │ (Phone OTP & Google)     │        │ (Profile & News Image Uploads)  │
   └──────────┬───────────────┘        └─────────────────────────────────┘
              │ (Firebase ID Token)
   ┌──────────▼──────────────────────────────────────────────────────────┐
   │ EXTERNAL BACKEND MICROSERVICES                                      │
   │ API Gateway: https://hypernews-production.up.railway.app            │
   │ (POST /user/auth/firebase/login -> Issues JWT Access/Refresh)  │
   └─────────────────────────────────────────────────────────────────────┘
```

---

## 6. ROUTING INTELLIGENCE

Expo Router v4 is utilized for file-based typed routing.

### Navigation Rules & Guards (`app/index.tsx`)
When the app launches:
1. `SplashScreen` performs intro branding animation (1.0s).
2. Reads `authStore` persistent state from AsyncStorage:
   - If `isAuthenticated && isOnboarded` ➔ Redirect to `/(tabs)`
   - If `isAuthenticated && !isOnboarded` ➔ Redirect to `/(onboarding)/language`
   - If `pendingPhone && pendingVerificationId` ➔ Redirect to `/(auth)/verify-otp`
   - Otherwise ➔ Redirect to `/(auth)/login`

---

## 7. FRONTEND ANALYSIS

### Key Components & Responsibilities
- `app/_layout.tsx`: Root provider initializing Poppins Google fonts, TanStack QueryClient, Theme Appearance listener, NetInfo network offline modal, and Stack navigator.
- `Header.tsx`: Universal top navigation bar displaying active location, language selector, search trigger, and notification badge counter.
- `ImmersiveNewsCard.tsx`: Primary news card featuring background image gradients, bookmarking, poll integration, comment launcher, and native share.
- `TabBar.tsx`: Custom bottom navigation bar controlled dynamically via `useTabBarStore` (hides automatically on detail/short views).
- `CommentsModal.tsx`: Bottom sheet overlay displaying article comments with real-time post comment submission.
- `CreateArticleModal.tsx`: Publisher content submission form supporting local photo selection, Supabase upload, category selection, and geo-location tagging.

### Data Flow Pattern
```
User Action ➔ UI Component Event ➔ Custom Hook / Zustand Action ➔ Axios Request (with Bearer Token) ➔ Backend Gateway ➔ Response ➔ React Query Cache Update ➔ UI Render
```

---

## 8. BACKEND & API INTELLIGENCE

### Authentication Architecture & Flow
1. **Initiation**: User enters phone number or taps Google Sign-In.
2. **Firebase Auth**: Firebase SDK handles SMS verification / Google OAuth and returns a Firebase ID Token.
3. **Backend Exchange**: Client calls `POST /user/auth/firebase/login` passing `{ firebase_token }`.
4. **JWT Issuance**: Backend returns `{ access_token, refresh_token, user }`. Tokens are stored in Expo SecureStore (`auth_token`, `refresh_token`).
5. **Axios Interceptor**: Subsequent requests automatically inject `Authorization: Bearer <access_token>`.
6. **Token Refresh**: On HTTP 401 Unauthorized, Axios queues pending requests, fetches a new access token via `POST /user/auth/refresh?refresh_token=...`, saves the new token pair, and retries original failed requests seamlessly.

---

## 9. ENVIRONMENT & CONFIGURATION

### `.env` File Keys
| Environment Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_BASE_URL` | Base endpoint URL for Railway microservices API |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | Request timeout in milliseconds (Default: `15000`) |
| `EXPO_PUBLIC_USE_MOCKS` | Toggle boolean (`true`/`false`) for offline mock dataset preview |
| `EXPO_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anonymous client API key |
| `EXPO_PUBLIC_SUPABASE_BUCKET` | Supabase storage bucket name (`new-images`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Client ID for Web / Firebase |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth Client ID for iOS |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Client ID for Android |

---

## 10. PERFORMANCE & TECHNICAL DEBT

### Performance Optimizations
- **Fast Image Caching**: `expo-image` is used throughout the feed cards to provide memory-efficient disk caching.
- **Font Preloading**: App splash screen prevents auto-hide until all Poppins font weights are loaded.
- **Global Text Interceptor**: Dynamically injects Poppins typography styles without needing custom Text wrapper components across every screen.
- **Selective Store Subscription**: Screens subscribe to specific state slices in Zustand (`useAuthStore((state) => state.user)`) preventing full-tree re-renders.

### Known Technical Debt / Bottlenecks
- **Supabase Base64 Conversion**: Image upload decodes local images to Base64 in JavaScript prior to binary upload, which can cause minor UI thread lag for high-resolution images. *(Recommendation: Migrate to direct file blob upload via Expo FileSystem).*
- **Mock Fallback Duplication**: `utils/apiClient.ts` contains duplicate mock logic when `EXPO_PUBLIC_USE_MOCKS=true`.

---

## 11. FEATURE INVENTORY

| Feature Name | Primary Purpose | Key Frontend Files | External Services / APIs |
| :--- | :--- | :--- | :--- |
| **Geo-Targeted Feed** | Display localized community news by State, District, City | `app/(tabs)/index.tsx`, `useNews.ts` | `GET /news/v1/feed` |
| **Video Shorts** | Immersive vertical short video feed | `app/(tabs)/shorts.tsx` | `GET /news/v1/news-shorts` |
| **Community Polls** | Participatory neighborhood voting | `components/ImmersiveNewsCard.tsx`, `usePolls.ts` | `PUT /content/polls/vote` |
| **Publisher Hub** | Article creation & statistics portal | `app/(publisher)/dashboard.tsx`, `CreateArticleModal.tsx` | `POST /news/v1/news`, Supabase Storage |
| **Interactive Bookmarks** | Save news articles for offline reading | `app/(tabs)/menu-bookmarks.tsx`, `useStore.ts` | `POST /engagement/bookmarks` |
| **Community Posts** | Neighbor social discussions & hashtags | `app/(tabs)/posts.tsx`, `usePosts.ts` | `POST /posts/`, `GET /posts/feed` |
| **Gamification Rewards** | Daily login streaks, bingo cards, challenge badges | `store/authStore.ts`, `useApi.ts` | `GET /rewards/me`, `POST /rewards/daily-login` |

---

## 12. DEVELOPMENT & DEPLOYMENT WORKFLOW

### Local Development Scripts
```bash
# Start Expo development server
npm run start

# Run on Android Emulator / Physical Device
npm run android

# Run on iOS Simulator
npm run ios

# Run web browser preview
npm run web

# TypeScript type checking
npm run type-check

# ESLint audit
npm run lint

# Start Expo with cleared cache
npm run clear
```

### EAS Build & Deployment Profile (`eas.json`)
- **Development**: Builds native dev client (`expo-dev-client`) for local simulator testing.
- **Preview**: Internal preview build for staging/QA.
- **Production**: Optimized release build targeting Google Play Store (.aab) & Apple App Store (.ipa).
