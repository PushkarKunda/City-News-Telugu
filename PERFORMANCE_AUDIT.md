# Performance Audit & Remediation Log — City News Telugu

**Status:** Optimizations applied & verified  
**Target devices:** Low-to-mid-range Android (2–4 GB RAM), variable/unstable networks in India  
**Scope:** Whole-codebase review and optimization of `D:\A` (Expo SDK 52, React Native 0.76.9)

---

## 1. Discovery & Architecture Summary

| Item | Status / Configuration |
|---|---|
| **Framework** | Expo SDK 52 (`expo: ~52.0.23`), bare `android/` directory present |
| **React Native** | 0.76.9 (`react-native: 0.76.9`), React 18.3.1 |
| **New Architecture** | **Disabled** (`newArchEnabled: false` in `android/gradle.properties` & `app.json:73`) |
| **JS Engine** | **Hermes** (`hermesEnabled=true`) |
| **Navigation** | **expo-router 4** (file-based routing; `expo-router: ~4.0.15`) |
| **State Management** | **Zustand 5** (`authStore`, `commentCountStore`, `readerFontStore`, `tabBarStore`) |
| **Data Fetching** | **@tanstack/react-query 5** + Axios (`client.ts`), Supabase client, Firebase Auth |
| **Build Configuration** | R8/ProGuard enabled (`android.enableProguardInReleaseBuilds=true`, `shrinkResources=true`) |

---

## 2. Remediation Summary (Applied Fixes)

| # | Severity | Domain | File | Status | Description |
|---|---|---|---|---|---|
| **1** | **Critical** | Network / UI | `hooks/useScreens.ts` | **RESOLVED** | Guest readers can now view news details (`enabled: Boolean(uid) && isFocused`). |
| **2** | **Critical** | Virtualization | `app/(tabs)/local.tsx` | **RESOLVED** | Converted unvirtualized `ScrollView` into a performant `SectionList` (`windowSize={5}`, `initialNumToRender={5}`). |
| **3** | **High** | Cache Mismatch | `hooks/useScreens.ts` | **RESOLVED** | Aligned `useLocalScreen` seed key with `useLocationNews` to eliminate duplicate parallel network requests. |
| **4** | **High** | Virtualization | `components/CommentsModal.tsx` | **RESOLVED** | Added `windowSize={5}`, `maxToRenderPerBatch={8}`, `removeClippedSubviews`, and avatar disk caching. |
| **5** | **High** | Virtualization | `components/PostCommentsModal.tsx` | **RESOLVED** | Added windowing props (`windowSize={5}`, `maxToRenderPerBatch={8}`, `removeClippedSubviews`). |
| **6** | **High** | Virtualization | `app/(tabs)/index.tsx` | **RESOLVED** | Removed array index from `keyExtractor` to prevent unnecessary subtree remounts. |
| **7** | **High** | Tooling / Debug | `babel.config.js` | **RESOLVED** | Guarded `transform-remove-console` to production builds only, restoring local development logs. |
| **8** | **Medium** | Binary Size | `package.json` | **RESOLVED** | Uninstalled `lottie-react-native`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, and `zod`. |
| **9** | **Medium** | Asset Diet | `assets/` | **RESOLVED** | Compressed `logo.png`, `icon.png`, and `android-icon-foreground.png`, saving **~2.1 MB** of raw PNGs. |
| **10** | **Medium** | UI Thread / Jank | `app/(onboarding)/cities.tsx` | **RESOLVED** | Removed `useNativeDriver: false` color animation on JS thread in favor of zero-overhead state styles. |

---

## 3. Remaining Recommended Roadmap

1. **Home Feed Server Pagination:**
   - Convert `useHomeScreen` to `useInfiniteQuery` with backend support for page cursors, lowering initial limit from 50 to 15.
2. **AppState Gating for Supabase WebSockets:**
   - In `hooks/useRealtimeReconciliation.ts`, pause or disconnect the 3 postgres channels when the app is backgrounded to preserve mobile data and battery.
3. **Shared Relative Timestamp Ticker:**
   - In `hooks/useRelativeTime.ts`, replace per-card `setInterval` and `AppState` listeners with a single central minute clock in a Zustand store.
