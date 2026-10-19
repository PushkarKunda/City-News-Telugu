# 🗺️ ROUTING MAP & EXPO ROUTER INVENTORY

> **Project**: Hyperlocal News & Community Engagement Frontend  
> **Routing Engine**: Expo Router (v4.0.15, Typed File-Based Routing)  

---

## Complete App Routes Table

| Route Path | File Location | Purpose & Function | Access Guard | Dynamic Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `/` | [index.tsx](file:///c:/A/hyperlocal-news-frontend/app/index.tsx) | Application splash screen & auth state dispatcher | Public | None |
| `/(auth)/login` | [(auth)/login.tsx](file:///c:/A/hyperlocal-news-frontend/app/(auth)/login.tsx) | Phone authentication & Google OAuth sign-in screen | Public | None |
| `/(auth)/verify-otp` | [(auth)/verify-otp.tsx](file:///c:/A/hyperlocal-news-frontend/app/(auth)/verify-otp.tsx) | 6-digit SMS OTP verification screen | Public | `phone` (query string) |
| `/(onboarding)/language` | [(onboarding)/language.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/language.tsx) | Onboarding Step 1: Preferred language selection | Auth Required | None |
| `/(onboarding)/location` | [(onboarding)/location.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/location.tsx) | Onboarding Step 2: State selection | Auth Required | None |
| `/(onboarding)/districts` | [(onboarding)/districts.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/districts.tsx) | Onboarding Step 3: District selection | Auth Required | None |
| `/(onboarding)/cities` | [(onboarding)/cities.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/cities.tsx) | Onboarding Step 4: City selection | Auth Required | None |
| `/(onboarding)/interests` | [(onboarding)/interests.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/interests.tsx) | Onboarding Step 5: News category preferences selection | Auth Required | None |
| `/(onboarding)/setup-feed` | [(onboarding)/setup-feed.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/setup-feed.tsx) | Onboarding Step 6: Initializing news feed animation | Auth Required | None |
| `/(onboarding)/complete` | [(onboarding)/complete.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/complete.tsx) | Onboarding Step 7: Welcome completion screen | Auth Required | None |
| `/(onboarding)/edit-profile` | [(onboarding)/edit-profile.tsx](file:///c:/A/hyperlocal-news-frontend/app/(onboarding)/edit-profile.tsx) | Profile setup, name, email & avatar compressor | Auth Required | None |
| `/(tabs)` | [(tabs)/index.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/index.tsx) | Main geo-targeted hyperlocal news feed | Auth & Onboarded | None |
| `/(tabs)/local` | [(tabs)/local.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/local.tsx) | Locality-specific community news & events feed | Auth & Onboarded | None |
| `/(tabs)/discover` | [(tabs)/discover.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/discover.tsx) | Search, breaking news, popular & category explore | Auth & Onboarded | None |
| `/(tabs)/shorts` | [(tabs)/shorts.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/shorts.tsx) | Full-screen vertical video shorts feed | Auth & Onboarded | None |
| `/(tabs)/posts` | [(tabs)/posts.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/posts.tsx) | Neighbor community discussions & hashtag feed | Auth & Onboarded | None |
| `/(tabs)/profile` | [(tabs)/profile.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/profile.tsx) | User profile dashboard, settings & publisher portal link | Auth & Onboarded | None |
| `/(tabs)/menu-bookmarks` | [(tabs)/menu-bookmarks.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/menu-bookmarks.tsx) | Saved news articles collection | Auth & Onboarded | None |
| `/(tabs)/notifications` | [(tabs)/notifications.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/notifications.tsx) | Push & in-app notifications center | Auth & Onboarded | None |
| `/(tabs)/settings` | [(tabs)/settings.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/settings.tsx) | App settings hub (theme, font scale, account) | Auth & Onboarded | None |
| `/(tabs)/settings-interests`| [(tabs)/settings-interests.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/settings-interests.tsx)| Modify preferred news categories | Auth & Onboarded | None |
| `/(tabs)/settings-language` | [(tabs)/settings-language.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/settings-language.tsx) | Change app translation language | Auth & Onboarded | None |
| `/(tabs)/settings-location` | [(tabs)/settings-location.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/settings-location.tsx) | Change active State, District, or City | Auth & Onboarded | None |
| `/(tabs)/help` | [(tabs)/help.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/help.tsx) | Help center, FAQs, and feedback submission | Public / Auth | None |
| `/(tabs)/more` | [(tabs)/more.tsx](file:///c:/A/hyperlocal-news-frontend/app/(tabs)/more.tsx) | Extended app menu options | Auth & Onboarded | None |
| `/(publisher)/dashboard` | [(publisher)/dashboard.tsx](file:///c:/A/hyperlocal-news-frontend/app/(publisher)/dashboard.tsx)| Publisher dashboard & article submission portal | Publisher (Role >= 2)| None |
| `/news/[id]` | [news/[id].tsx](file:///c:/A/hyperlocal-news-frontend/app/news/[id].tsx) | Dynamic article reader view with comments | Public / Auth | `id` (path param) |

---

## Layout Structure (`_layout.tsx` Files)

1. **`app/_layout.tsx`**: Top-level root layout. Wraps entire application with `SafeAreaProvider`, `QueryClientProvider`, `GestureHandlerRootView`, preloads Poppins font family, monitors network connectivity via `NetInfo`, and handles token invalidation logging out.
2. **`app/(auth)/_layout.tsx`**: Stack navigator for login and OTP verification screens with smooth slide animations.
3. **`app/(onboarding)/_layout.tsx`**: Stack navigator enforcing sequential onboarding wizard navigation.
4. **`app/(tabs)/_layout.tsx`**: Custom Bottom Tabs layout rendering `TabBar.tsx` dynamically and injecting custom header components.
5. **`app/(publisher)/_layout.tsx`**: Stack navigator for community journalist publishing tools.
