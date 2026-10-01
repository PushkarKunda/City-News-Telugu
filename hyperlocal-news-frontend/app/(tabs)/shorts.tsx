import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useNewsShorts } from '@/hooks/useNews';
import { useQuery } from '@tanstack/react-query';
import { contentApi, Advertisement } from '@/services/api/content';
import { injectAdsIntoFeed, isAdvertisement } from '@/hooks/feedInjection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ShortFeedItem = any;

// ─── Silent analytics ─────────────────────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
function trackView(videoId: string) {
  try {
    fetch(`${API_BASE}/news/${encodeURIComponent(videoId)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch (_) {}
}

// ─── Ad Card ──────────────────────────────────────────────────────────────────
const ShortAdCard = React.memo(({ item, itemHeight }: {
  item: { type: 'ad'; data: Advertisement }; itemHeight: number;
}) => (
  <View style={[styles.itemContainer, { height: itemHeight, backgroundColor: '#000' }]}>
    <Image source={{ uri: item.data.image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[styles.bottomGradient, { paddingBottom: 40 }]}>
      <View style={styles.adInfoContainer}>
        <Text style={styles.adTitle} numberOfLines={2}>{item.data.title}</Text>
        {item.data.redirect_url && (
          <TouchableOpacity style={styles.adCtaButton}>
            <Text style={styles.adCtaText}>Learn More</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.adDisclaimer}>Sponsored</Text>
      </View>
    </LinearGradient>
  </View>
));

// ─── YouTube Short Card ───────────────────────────────────────────────────────
// Full-screen WebView. No app overlay on top — YouTube's own UI is the only
// interaction surface (like / share / save / comments / subscribe).
const YouTubeShortCard = React.memo(({ item, isActive, isFocused, shouldLoad, itemHeight }: {
  item: any; isActive: boolean; isFocused: boolean; shouldLoad: boolean; itemHeight: number;
}) => {
  const trackFiredRef = useRef(false);
  const webViewRef = useRef<any>(null);

  // Silent view tracking: fire after 3 s of active playback
  useEffect(() => {
    if (!isActive || !isFocused) { trackFiredRef.current = false; return; }
    const timer = setTimeout(() => {
      if (!trackFiredRef.current && item.video_id) {
        trackFiredRef.current = true;
        trackView(item.video_id);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, isFocused, item.video_id]);

  // Pause / mute when screen loses focus (tab switch, back press, etc.)
  useEffect(() => {
    if (!webViewRef.current) return;
    const js = isFocused && isActive
      ? `(function(){ var v=document.querySelector('video'); if(v){ v.play(); v.muted=false; } })(); true;`
      : `(function(){ var v=document.querySelector('video'); if(v){ v.pause(); v.muted=true; } })(); true;`;
    try { webViewRef.current.injectJavaScript(js); } catch (_) {}
  }, [isActive, isFocused]);

  const shortsUrl = `https://www.youtube.com/shorts/${item.video_id}`;

  // We only strip YouTube's global navigation chrome.
  // The Shorts interaction panel (like/share/save/comments) is left untouched.
  const injectedCSS = `
    ytm-mobile-topbar-renderer,
    .mobile-topbar-header,
    ytm-pivot-bar-renderer,
    header.mobile-topbar-header,
    #guide-button,
    .navigation-container,
    .ytm-autonav-bar { display: none !important; }
    html, body {
      background: #000 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;

  const injectedJS = `
    (function() {
      // Auto-unmute — tries for ~2 s then stops
      var checks = 0;
      var iv = setInterval(function() {
        checks++;
        try {
          var v = document.querySelector('video');
          if (v) { v.muted = false; v.volume = 1.0; }
          document.querySelectorAll('[aria-label*="unmute" i],[aria-label*="Unmute" i],.ytp-mute-button')
            .forEach(function(b){ try{ b.click(); }catch(e){} });
        } catch(e) {}
        if (checks >= 8) clearInterval(iv);
      }, 250);

      var s = document.createElement('style');
      s.textContent = ${JSON.stringify(injectedCSS)};
      document.head.appendChild(s);

      true;
    })();
  `;

  return (
    <View style={[styles.itemContainer, { height: itemHeight }]}>
      {isActive && shouldLoad ? (
        <WebView
          ref={webViewRef}
          source={{ uri: shortsUrl }}
          style={StyleSheet.absoluteFillObject}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          scrollEnabled
          setSupportMultipleWindows={false}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
          injectedJavaScript={injectedJS}
          onShouldStartLoadWithRequest={(req) =>
            req.url.includes('youtube.com') || req.url.includes('youtu.be')
          }
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.thumbnailContainer]}>
          <Image
            source={{ uri: item.thumbnail_url || `https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg` }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={150}
            cachePolicy="disk"
          />
          <View style={styles.thumbnailDimmer} />
        </View>
      )}
    </View>
  );
}, (prev, next) => (
  prev.isActive === next.isActive &&
  prev.isFocused === next.isFocused &&
  prev.shouldLoad === next.shouldLoad &&
  prev.itemHeight === next.itemHeight &&
  (prev.item.video_id || prev.item.news_uid) === (next.item.video_id || next.item.news_uid)
));

// ─── Native Video Short Card ──────────────────────────────────────────────────
const NativeVideoItem = React.memo(({ item, isActive, isFocused, shouldLoad, itemHeight }: {
  item: any; isActive: boolean; isFocused: boolean; shouldLoad: boolean; itemHeight: number;
}) => {
  const [progress, setProgress] = useState(0);
  const trackFiredRef = useRef(false);
  const playing = isActive && isFocused;

  const player = useVideoPlayer(
    playing && (item.video_url || item.image_url) ? { uri: item.video_url || item.image_url } : null,
    (p) => { p.loop = true; p.muted = false; }
  );

  useEffect(() => {
    if (!player) return;
    if (playing) {
      player.muted = false;
      player.play();
    } else {
      player.muted = true;
      player.pause();
    }
  }, [playing, player]);

  useEffect(() => {
    if (!playing || !player) { setProgress(0); return; }
    const interval = setInterval(() => {
      try {
        if (player.duration > 0) {
          setProgress(Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100)));
        }
      } catch (e) {}
    }, 500);
    return () => clearInterval(interval);
  }, [playing, player]);

  useEffect(() => {
    if (!playing) { trackFiredRef.current = false; return; }
    const timer = setTimeout(() => {
      if (!trackFiredRef.current && (item.video_id || item.news_uid)) {
        trackFiredRef.current = true;
        trackView(item.video_id || item.news_uid);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [playing, item.video_id, item.news_uid]);

  return (
    <View style={[styles.itemContainer, { height: itemHeight }]}>
      {playing && shouldLoad ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.thumbnailContainer]}>
          <Image
            source={{ uri: item.thumbnail_url || `https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg` }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="disk"
          />
          <View style={styles.thumbnailDimmer} />
        </View>
      )}
      {playing && (
        <View style={styles.progressBarContainer} pointerEvents="none">
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress.toFixed(1)}%` as any }]} />
          </View>
        </View>
      )}
    </View>
  );
}, (prev, next) => (
  prev.isActive === next.isActive &&
  prev.isFocused === next.isFocused &&
  prev.shouldLoad === next.shouldLoad &&
  prev.itemHeight === next.itemHeight &&
  (prev.item.video_id || prev.item.news_uid) === (next.item.video_id || next.item.news_uid)
));

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ShortsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { height: windowHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'Following' | 'For You'>('Following');
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Single source of truth for page height ───────────────────────────────
  // The tab bar is position:absolute so the screen content View always spans
  // the full window height — onLayout gives windowHeight, not windowHeight-tabBar.
  // We initialise to windowHeight so the FlatList is visible immediately on
  // first render (no black-screen / reel-not-playing on mount). onLayout then
  // confirms or adjusts the value for devices with unusual insets.
  const [listHeight, setListHeight] = useState(windowHeight);

  const { data: rawShorts = [], isLoading: isLoadingShorts } = useNewsShorts('te');
  const { data: ads = [], isLoading: isLoadingAds } = useQuery({
    queryKey: ['active-ads', 'shorts'],
    queryFn: () => contentApi.getActiveAdvertisements(),
  });

  const shortsFeed = useMemo(() => injectAdsIntoFeed(rawShorts, ads, 5), [rawShorts, ads]);
  const isLoading = isLoadingShorts || isLoadingAds;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index || 0);
  }, []);

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const renderVideoItem = useCallback(({ item, index }: { item: ShortFeedItem; index: number }) => {
    const isCardActive = index === activeIndex;
    // Pre-load one ahead/behind but only play the active one when focused
    const shouldLoad = Math.abs(index - activeIndex) <= 1;

    if (isAdvertisement(item)) return <ShortAdCard item={item} itemHeight={listHeight} />;

    const isYouTube = Boolean(item.video_id || item.source === 'youtube');
    if (isYouTube) {
      return (
        <YouTubeShortCard
          item={item}
          isActive={isCardActive}
          isFocused={isFocused}
          shouldLoad={shouldLoad}
          itemHeight={listHeight}
        />
      );
    }
    return (
      <NativeVideoItem
        item={item}
        isActive={isCardActive}
        isFocused={isFocused}
        shouldLoad={shouldLoad}
        itemHeight={listHeight}
      />
    );
  }, [activeIndex, isFocused, listHeight]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: listHeight, offset: listHeight * index, index }),
    [listHeight]
  );

  const keyExtractor = useCallback((item: ShortFeedItem, index: number) => {
    if (isAdvertisement(item)) return `ad-${item.data.ad_id}-${index}`;
    return item.video_id ? `yt-${item.video_id}` : item.news_uid || String(item.id || index);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.darkLoaderContainer}>
        <LoadingSpinner fullScreen text="Loading shorts..." colorScheme="dark" color="#4648D4" />
      </View>
    );
  }

  return (
    // flex:1 — Expo Router already constrains this to the space above the tab bar.
    // overflow:hidden clips any video content that would otherwise bleed under the bar.
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        // Accept any positive measurement. This is the authoritative page height.
        if (h > 0) setListHeight(h);
      }}
    >
      <FlatList
          data={shortsFeed}
          keyExtractor={keyExtractor}
          renderItem={renderVideoItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={listHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          bounces={false}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={false}
          contentContainerStyle={styles.flatListContent}
        />

      {/* Following / For You tabs — rendered above the video with a dark scrim */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 4 }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.tabsContainer} pointerEvents="box-none">
            <TouchableOpacity onPress={() => setActiveTab('Following')} style={styles.tabItem} activeOpacity={0.8}>
              <Text style={[styles.tabText, activeTab === 'Following' && styles.activeTabText]}>Following</Text>
              {activeTab === 'Following' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('For You')} style={styles.tabItem} activeOpacity={0.8}>
              <Text style={[styles.tabText, activeTab === 'For You' && styles.activeTabText]}>For You</Text>
              {activeTab === 'For You' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // flex:1 — Expo Router constrains this to the space above the tab bar.
  // overflow:hidden prevents any video content from bleeding under the nav bar.
  // No paddingBottom / marginBottom here — the tab bar is a separate sibling.
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  // Zero padding on the FlatList's scroll content
  flatListContent: {
    padding: 0,
    margin: 0,
  },

  // Each paged item: explicit height is set inline (= listHeight).
  // overflow:hidden clips the WebView so it never paints outside its box.
  // Solid black background prevents the next item from showing through.
  itemContainer: { width: '100%', overflow: 'hidden', backgroundColor: '#000' },

  thumbnailContainer: { backgroundColor: '#111' },
  thumbnailDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  // "Following / For You" top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    height: 52,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  tabText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  activeTabText: { color: '#FFF' },
  activeTabIndicator: { height: 2, backgroundColor: '#FFF', width: '100%', borderRadius: 1 },

  // Ad card gradient
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  adInfoContainer: { marginBottom: Spacing.md, maxWidth: '80%' },
  adTitle: {
    color: '#FFF',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  adCtaButton: {
    marginTop: 12,
    backgroundColor: '#4648D4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  adCtaText: { color: '#FFF', fontFamily: Typography.fonts.bold, fontSize: Typography.sizes.sm },
  adDisclaimer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: Typography.sizes.xs,
    marginTop: 8,
    fontFamily: Typography.fonts.medium,
  },

  // Native video thin progress bar
  progressBarContainer: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    zIndex: 100,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#4648D4', borderRadius: 2 },

  darkLoaderContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
});
