# Performance Audit — City News Telugu

**Status:** Report only — **no files were modified**  
**Target devices:** Low-to-mid-range Android (2–4 GB RAM), slow/unstable networks in India  
**Scope:** Source code review of `D:\A` (Expo SDK 52, React Native 0.76.9)

---
## 1. Discovery Summary

| Item | Finding |
|---|---|
| Framework | **Expo** with dev-client (`expo run:android`, native `android/` folder present) |
| Expo SDK | 52 (`expo: ~52.0.23`) |
| React Native | 0.76.9 (`react-native: 0.76.9`) |
| React | 18.3.1 |
| New Architecture | **Disabled** (`newArchEnabled: false`, `app.json:73`) |
| JS engine | **Hermes** (SDK 52 default; no `jsEngine` override in `app.json`) |
| Navigation | **expo-router 4** (file-based routing; `expo-router: ~4.0.15`) |
| State management | **Zustand 5** (`store/authStore.ts`, `commentCountStore.ts`, `readerFontStore.ts`, `tabBarStore.ts`) — persisted to AsyncStorage |
| Data fetching | **@tanstack/react-query 5** + axios (`services/api/client.ts`, `services/queryClient.ts`); Supabase for image uploads; Firebase Auth for OTP/Google sign-in |
| Backend | REST at `https://hypernews-production.up.railway.app` (`eas.json:17`) |
| Production builds | **Android App Bundle** (`eas.json:20-25`) |

### Architecture in 5 lines
1. File-based routing via expo-router: `(auth)` → `(onboarding)` → `(tabs)` groups; `app/(tabs)/index.tsx` is a TikTok-style full-screen paged news feed.
2. All server data flows through a single axios client (`services/api/client.ts`) with Firebase token refresh, wrapped in React Query hooks (`hooks/useNews.ts`, `hooks/useScreens.ts`).
3. Global UI/session state lives in four small Zustand stores; the auth store is persisted to AsyncStorage.
4. Heavy content screens: paged FlatList feed (`index.tsx`), YouTube-WebView + expo-video shorts (`shorts.tsx`), posts feed (`posts.tsx`).
5. Production builds ship via EAS as an Android App Bundle.

### Already good (no action required)
- Feeds use `FlatList` with `getItemLayout`, `keyExtractor`, `windowSize`, `initialNumToRender`, and memoized render items (`index.tsx:678-701`, `shorts.tsx:413-418`, `posts.tsx:729-732`).
- `ImmersiveFeedCard` is `React.memo` with a custom comparator (`ImmersiveNewsCard.tsx:1073-1102`); images use `expo-image` with `cachePolicy="disk"` (`:628-632`).
- ~100 animation sites use `useNativeDriver: true` (only 2 exceptions in `cities.tsx`).
- Zustand uses fine-grained selectors + `useShallow` (`index.tsx:47-55`) — no Context-wide re-render problem.
- Timers/listeners are cleaned up where read (`useImmersiveChrome`, `shorts.tsx`, `_layout.tsx` NetInfo unsubscribe).
- Hermes enabled; EAS ships AAB.



---

## 2. Audit Findings Table

| # | Issue | File:Line | Impact | Effort | Fix |
|---|---|---|---|---|---|
| 1 | **Home feed has no pagination** — fetches `limit: 50` items once, FlatList has no `onEndReached`; heavy users hit a dead end and 50 full article JSON objects load at once on slow networks | `app/(tabs)/index.tsx:39`; FlatList `:678-701` | High | Med | Convert `useHomeScreen` feed to `useInfiniteQuery` + `onEndReached` (pattern already exists in `useNews.ts:168`) |
| 2 | **`limit: 50` first-paint payload** — even before pagination exists, 50 articles × full body text + images is a large JSON on 2G/3G | `app/(tabs)/index.tsx:39` | High | Low | Reduce initial `limit` to 10–15 once pagination lands |
| 3 | **Global `Text.render` monkey-patch** — intercepts and `StyleSheet.flatten`s props of **every `<Text>` on every render**, including every Telugu headline in every list cell | `app/_layout.tsx:58-104` | High | Med | Delete interceptor; set default font via a thin wrapper or `Text.defaultProps` |
| 4 | **YouTube Shorts run in full-screen WebViews** — each WebView costs 30–80 MB RAM; on 2–4 GB devices 2–3 mounted WebViews + feed images risks OOM/ANR. `removeClippedSubviews={false}` makes it worse | `app/(tabs)/shorts.tsx:63-160, 415-418` | High | High | Prefer native MP4 players; if YouTube embed is mandatory, unmount off-screen WebViews via `shouldLoad` |
| 5 | **98 `console.log/warn/error` calls shipped**, incl. telemetry on every Home mount and on every `homeScreenData` change | `app/(tabs)/index.tsx:109-126`; 98 repo-wide matches | Med | Low | `babel-plugin-transform-remove-console` (prod-only) or verify Metro already strips |
| 6 | **ProGuard/R8 and resource shrinking OFF** (`enableProguardInReleaseBuilds` defaults `false`, `shrinkResources` `false`) | `android/app/build.gradle` | Med | Low | Set both to `true` in `android/gradle.properties` |
| 7 | **Oversized bundled PNG assets**: `logo.png` 944 KB, `icon.png` 837 KB, `android-icon-foreground.png` 589 KB — ~2.4 MB of PNGs per install | `assets/` | Med | Low | Compress to WebP/optimized PNG (<100 KB each) with `sharp` (already devDep) |
| 8 | **7 font TTFs load at startup; app renders nothing until all load** (`if (!fontsLoaded) return null`). ~1.1 MB font data parsed on UI thread before first frame; splash hides only after fonts | `app/_layout.tsx:127-135, 195-197` | Med | Low-Med | Drop unused font weights; use `expo-splash-screen` embedded-font config so splash hides immediately |
| 9 | **`useNativeDriver: false` animations** on onboarding screens — JS-thread animations jank while lists filter | `app/(onboarding)/cities.tsx:172, 181` | Med | Low | Animate only transform/opacity, or wrap in Reanimated |
| 10 | **No server-side debounce** on city/district/state search filters (client-side re-filter on every keystroke; `newsKeys.search` exists but server search UI not located) | `app/(onboarding)/cities.tsx:231`, `hooks/useNews.ts:33` | Med | Low | Add 300 ms debounce wherever TextInput hits a search API |
| 11 | **Home FlatList `removeClippedSubviews={false}`** — full-screen image cards keep native views mounted | `app/(tabs)/index.tsx:698` | Med | Low | Try `true`, regression-test header overlay |
| 12 | **React Query cache is memory-only** — cold start on flaky network always needs a roundtrip; nothing offline | `services/queryClient.ts:5-15` | Med | Med | Add `@tanstack/react-query-persist-client` + AsyncStorage for feed/category keys |
| 13 | **`useRelativeTime` runs a per-card `setInterval(60s)`** — one timer + one re-render per visible card | `hooks/useRelativeTime.ts:37-41` | Low | Low | Single shared ticker (store/context) |
| 14 | **Category tab FlatList inline `renderItem`** — small list, minor | `app/(tabs)/index.tsx:504-541` | Low | Low | Extract + `useCallback` |
| 15 | **Potentially unused deps**: `expo-dev-client`, `react-dom`, `react-native-web`, `lottie-react-native`, `@hookform/resolvers`, `react-hook-form`, `zod`, `date-fns` — could not confirm lottie usage in `app/` or `components/` | `package.json:21,56,58-59,65,67` | Low | Low | Remove unused deps |
| 16 | **`shorts.tsx` silent analytics `fetch` has no timeout/abort** and bypasses axios session guards | `app/(tabs)/shorts.tsx:30-37` | Low | Low | Route through `apiClient` or add `AbortController` |

### Cannot verify from code — measure instead
- **Image payload sizes from your API**: fallback images are CDN-resized (`?w=800&q=80`), but backend article image URLs may be full-resolution. **Measure:** inspect `image_url` values in a real `/screens/home` response; if >150 KB each, add server-side resizing (Supabase Image Transformations or CDN).
- **Server search debounce**: `newsKeys.search` exists but UI usage was not located. Grep for `useSearchNews` and debounce the input.
- **Actual memory/OOM behavior**: requires `adb shell dumpsys meminfo` on a real 2 GB device after scrolling Shorts for 2 minutes.


---

## 3. Top 5 Quick Wins (< 1 hour each)

1. **Strip console in production** — removes all 98 console calls; zero source edits if Metro already strips them (verify with release build).
2. **Remove the `Text.render` global interceptor** — biggest per-render CPU win in the Telugu-heavy feed (`app/_layout.tsx:58-104`).
3. **Enable ProGuard/R8 + resource shrinking** — two lines in `gradle.properties`.
4. **Compress the 3 oversized PNGs** — saves ~2 MB install size.
5. **Cut initial feed `limit` from 50 → 15** — one-line change; instant first-paint win on slow networks (pair with pagination next).

---

## 4. Prioritized Roadmap

### Week 1 — Free wins, no behavior change
- Quick wins 1–5 above.
- Add `onEndReached` + `useInfiniteQuery` to home feed (pattern exists in `useNews.ts:168`).
- Try `removeClippedSubviews` on home feed; regression-test header overlay (`index.tsx:698`).

### Week 2 — Memory & offline
- Shorts memory diet: unmount off-screen WebViews, cap players (`shorts.tsx:63-160`).
- Persist React Query cache to AsyncStorage for feed/categories (`services/queryClient.ts`).
- Confirm backend sends resized images; add `?w=` transforms if Supabase-backed.
- Drop unused font weights & deps; audit lottie/hookform/zod usage (`package.json`).

### Later
- Consider enabling the **New Architecture** (`newArchEnabled: false` today) — measurable list gains on RN 0.76, needs full regression pass.
- Shared ticker for relative timestamps (`hooks/useRelativeTime.ts`).

---

## 5. Exact Code Changes — Top 5

### 5.1 Strip console in production (`babel.config.js`)
```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@constants': './constants',
            '@hooks': './hooks',
            '@services': './services',
            '@store': './store',
            '@types': './types',
            '@utils': './utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
      ...(process.env.NODE_ENV === 'production'
        ? ['transform-remove-console']
        : []),
    ],
  };
};
```
> `npm i -D babel-plugin-transform-remove-console`.  
> **Verify first:** Expo SDK 50+ strips most `console.*` calls in Metro release bundles. Run `npx expo export --platform android` and check `index.android.bundle` for `console.log`. If absent, skip this plugin.

### 5.2 Remove the global `Text` interceptor (`app/_layout.tsx:58-104`)
**Delete** lines 58–104:

```tsx
// ─── Global Text Interceptor ──────────────────────────────────────────────────
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    // ... ~45 lines of per-render StyleSheet.flatten ...
    return originalTextRender.call(this, newProps, ref);
  };
}
```

**Replace** with a one-time default font:

```tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(Text as any).defaultProps = (Text as any).defaultProps || {}
;(Text as any).defaultProps.style = {
  fontFamily: 'Poppins_400Regular',
  ...((Text as any).defaultProps.style || {}),
}
```

**Why:** The interceptor flattens every style object on every `<Text>` render — in a Telugu news feed that runs thousands of times per scroll session.

### 5.3 Enable R8 + resource shrinking (`android/gradle.properties`)
Add to `android/gradle.properties`:
```
android.enableProguardInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

### 5.4 Compress bundled assets (one-off script)
`sharp` is already in `devDependencies`. Run:

```js
// scripts/compress-assets.cjs
const sharp = require('sharp')
const fs = require('fs')

const targets = [
  ['assets/icon.png', 512],
  ['assets/logo.png', 512],
  ['assets/android-icon-foreground.png', 432],
]

for (const [file, maxWidth] of targets) {
  const buf = await sharp(file)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
  fs.writeFileSync(file, buf)
  console.log(`Compressed ${file}: ${buf.length} bytes`)
}
```
Expected: 944 KB + 837 KB + 589 KB → roughly <300 KB total.

### 5.5 Reduce first-paint payload (`app/(tabs)/index.tsx:39`)
```diff
-const HOME_SCREEN_PARAMS = { limit: 50 };
+const HOME_SCREEN_PARAMS = { limit: 15 }; // pair with onEndReached pagination
```

**Accompanying pagination sketch** — apply to `useHomeScreen` in `hooks/useScreens.ts`, mirroring `useNewsComments` (`useNews.ts:168`):

```ts
return useInfiniteQuery({
  queryKey: screensKeys.home(params),
  queryFn: ({ pageParam = 1 }) =>
    screensApi.getHome({ ...params, page: pageParam }),
  getNextPageParam: (last) =>
    last.feed?.has_more ? last.feed.page + 1 : undefined,
  initialPageParam: 1,
})
```

And in the FlatList (`app/(tabs)/index.tsx:678-701`):
```diff
   onRefresh={handleRefresh}
+  onEndReached={() => {
+    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
+  }}
+  onEndReachedThreshold={1.5}
 />
```

> Requires backend `page` support on `/screens/home`. If unsupported, this is a backend ticket — that is why fix #5 is listed as "pair with" rather than standalone.

---


---

## 6. How to Measure Before / After

| Fix | Metric | Tool |
|---|---|---|
| Feed pagination + smaller limit | Time-to-first-article; bytes of first `/screens/home` response | Flipper Network inspector / `adb logcat` + `Content-Length`; React Query devtools |
| Text interceptor removal | JS frame drops while scrolling feed; render count of `ImmersiveFeedCard` | React Profiler around FlatList; `adb shell gfxinfo com.hypernews.app framestats` |
| Console strip | JS bundle size | `npx expo export --platform android`, compare `index.android.bundle` bytes |
| ProGuard/R8 + asset compression | AAB/APK size | `bundletool get-size total` on AAB; Play Console "App size" |
| Font loading | Cold start time (splash → first frame) | `adb shell am start -W com.hypernews.app` (`totalTime`) × 10 cold starts |
| Shorts memory | RSS after 2 min of swiping shorts | `adb shell dumpsys meminfo com.hypernews.app`; `lowmemorykiller` in logcat |
| RQ persistence | Time-to-content on airplane-mode relaunch | Manual test + Perfetto startup trace |

---

## 7. Files Not Modified

Per your instruction, **no files were changed**. This report lists exact diffs above; apply them only after you approve.
