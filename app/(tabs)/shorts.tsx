import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Linking,
  FlatList,
  ViewToken,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useShortsScreen } from '@/hooks/useScreens';
import { Advertisement } from '@/services/api/content';
import { injectAdsIntoFeed, isAdvertisement } from '@/hooks/feedInjection';
import { ShortsSkeleton } from '@/components/ui/SkeletonScreens';
import { Ionicons } from '@expo/vector-icons';

type ShortFeedItem = any;

// ─── Silent analytics ─────────────────────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
function trackView(videoId: string) {
  try {
    fetch(`${API_BASE}/news/${encodeURIComponent(videoId)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch {}
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function resolveYouTubeId(item: any): string | null {
  if (!item) return null;
  const raw =
    item.video_id ||
    item.youtube_id ||
    item.youtubeId ||
    item.videoId ||
    item.video_url ||
    item.url;
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const match = raw.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/v\/)([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : raw.trim();
}

function isYouTubeItem(item: any): boolean {
  if (!item || isAdvertisement(item)) return false;
  if (item.video_id || item.youtube_id || item.youtubeId || item.source === 'youtube') return true;
  const url = item.video_url || item.url;
  return typeof url === 'string' && /(?:youtube\.com|youtu\.be)/i.test(url);
}

// ─── YouTube IFrame Player page ───────────────────────────────────────────────
// One page for the whole screen. The native side switches videos with
// `loadVideoById` instead of reloading YouTube for every swipe.
const YOUTUBE_PLAYER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    #player iframe { width: 100% !important; height: 100% !important; border: 0; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    (function () {
      var player = null;
      var playerReady = false;
      var pendingVideoId = null;
      var wantPlaying = true;
      var muted = false;

      function post(payload) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
      }

      function applyAudio() {
        if (!playerReady) return;
        try {
          if (muted) {
            player.mute();
          } else {
            player.unMute();
            player.setVolume(100);
          }
        } catch (e) {}
      }

      function loadVideo(id) {
        if (!id) return;
        if (!playerReady || !player || !player.loadVideoById) {
          pendingVideoId = id;
          return;
        }
        pendingVideoId = null;
        try {
          player.loadVideoById({ videoId: id, startSeconds: 0 });
          applyAudio();
          if (wantPlaying) { player.playVideo(); } else { player.pauseVideo(); }
        } catch (e) {
          post({ type: 'error', code: 'load' });
        }
      }

      function setPlaying(shouldPlay) {
        wantPlaying = !!shouldPlay;
        if (!playerReady) return;
        try {
          if (wantPlaying) { player.playVideo(); } else { player.pauseVideo(); }
        } catch (e) {}
      }

      function setMuted(isMuted) {
        muted = !!isMuted;
        applyAudio();
      }

      window.__ytLoadVideo = loadVideo;
      window.__ytSetPlaying = setPlaying;
      window.__ytSetMuted = setMuted;

      window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('player', {
          width: '100%',
          height: '100%',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1,
            enablejsapi: 1,
            origin: 'https://www.youtube.com'
          },
          events: {
            onReady: function () {
              playerReady = true;
              applyAudio();
              post({ type: 'ready' });
              if (pendingVideoId) {
                loadVideo(pendingVideoId);
              } else {
                setPlaying(wantPlaying);
              }
            },
            onStateChange: function (event) {
              post({ type: 'state', state: event.data });
              // Shorts loop: restart from the beginning when a clip ends.
              if (event.data === 0) {
                try { player.seekTo(0, true); } catch (e) {}
                if (wantPlaying) { try { player.playVideo(); } catch (e) {} }
              }
            },
            onError: function (event) {
              post({ type: 'error', code: event.data });
            }
          }
        });
      };

      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    })();
  </script>
</body>
</html>`;

const YOUTUBE_SOURCE = { html: YOUTUBE_PLAYER_HTML, baseUrl: 'https://www.youtube.com' };

const YOUTUBE_ERROR_MESSAGES: Record<string, string> = {
  '2': 'This video has an invalid parameter.',
  '5': 'This video cannot be played in the HTML5 player.',
  '100': 'This video was not found or is private.',
  '101': 'The owner does not allow this video to be embedded.',
  '150': 'The owner does not allow this video to be embedded.',
  load: 'The video could not be loaded.',
  player: 'The player could not be loaded.',
};

// ─── Ad Card ──────────────────────────────────────────────────────────────────
const ShortAdCard = React.memo(({ item, itemHeight }: {
  item: { type: 'ad'; data: Advertisement }; itemHeight: number;
}) => (
  <View style={[styles.itemContainer, { height: itemHeight, backgroundColor: '#000' }]}>
    <Image source={{ uri: item.data.image_url, headers: { Accept: 'image/webp,image/*;q=0.8' } }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
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
ShortAdCard.displayName = 'ShortAdCard';

// ─── YouTube Thumbnail Placeholder ────────────────────────────────────────────
// The actual video is painted by the single shared WebView at screen level.
// This card only shows a poster while the player is hidden (scroll / buffering)
// and provides the tap target for play/pause.
const YouTubeThumbCard = React.memo(({ item, videoId, isActive, itemHeight, onTogglePlay }: {
  item: any; videoId: string | null; isActive: boolean; itemHeight: number; onTogglePlay: () => void;
}) => {
  const thumbnailUri =
    item.thumbnail_url ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '');

  return (
    <View style={[styles.itemContainer, { height: itemHeight }]}>
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.thumbnailFallback]}>
          <Ionicons name="logo-youtube" size={48} color="#333" />
        </View>
      )}
      <View style={styles.thumbnailDimmer} />

      {isActive && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onTogglePlay}
          accessibilityRole="button"
          accessibilityLabel="Play or pause video"
        />
      )}

      <View style={styles.ytCardBadge} pointerEvents="none">
        <Ionicons name="logo-youtube" size={12} color="#FFF" />
        <Text style={styles.ytCardBadgeText}>YouTube</Text>
      </View>
    </View>
  );
}, (prev, next) => (
  prev.isActive === next.isActive &&
  prev.itemHeight === next.itemHeight &&
  prev.videoId === next.videoId &&
  prev.onTogglePlay === next.onTogglePlay
));
YouTubeThumbCard.displayName = 'YouTubeThumbCard';

// ─── Native Video Short Card ──────────────────────────────────────────────────
const NativeVideoItem = React.memo(({ item, isActive, isFocused, appState, shouldLoad, itemHeight }: {
  item: any; isActive: boolean; isFocused: boolean; appState: AppStateStatus; shouldLoad: boolean; itemHeight: number;
}) => {
  const [progress, setProgress] = useState(0);
  const trackFiredRef = useRef(false);
  const playing = isActive && isFocused && appState === 'active';

  const player = useVideoPlayer(
    playing && (item.video_url || item.image_url) ? { uri: item.video_url || item.image_url } : null,
    (p) => { p.loop = true; p.muted = false; p.staysActiveInBackground = false; }
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
      } catch {}
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
            source={{ uri: item.thumbnail_url || `https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg`, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
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
  prev.appState === next.appState &&
  prev.shouldLoad === next.shouldLoad &&
  prev.itemHeight === next.itemHeight &&
  (prev.item.video_id || prev.item.news_uid) === (next.item.video_id || next.item.news_uid)
));
NativeVideoItem.displayName = 'NativeVideoItem';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ShortsScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  // ── Single source of truth for page height ───────────────────────────────
  // The tab navigator already reserves space for the tab bar via tabBarStyle
  // in screenOptions, so the container's onLayout height already excludes it.
  // We must NOT subtract the tab bar height again — that caused a black gap.
  // The absolutely-positioned TabBar floats over the bottom of the content,
  // which is the standard pattern for fullscreen feeds (Reels/Shorts style).
  const [containerHeight, setContainerHeight] = useState(windowHeight);
  const listHeight = Math.max(1, containerHeight);

  // Scroll state: the shared player is hidden while the feed is moving so it
  // never paints over a neighbouring card. Thumbnails take over during the swipe.
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimerRef = useRef<any>(null);

  const beginScrolling = useCallback(() => {
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
    setIsScrolling(true);
  }, []);

  const endScrollingSoon = useCallback(() => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      setIsScrolling(false);
    }, 140);
  }, []);

  const endScrollingNow = useCallback(() => {
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
    setIsScrolling(false);
  }, []);

  useEffect(() => () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
  }, []);

  // ── Shared YouTube player state ──────────────────────────────────────────
  const youTubeWebViewRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytPlayerState, setYtPlayerState] = useState<number>(-1);
  const [ytPaused, setYtPaused] = useState(false);
  const [ytMuted, setYtMuted] = useState(false);
  const ytPlayerStateRef = useRef<number>(-1);
  const trackedYouTubeIdRef = useRef<string | null>(null);

  // Single aggregate endpoint for Shorts Screen (1 call vs 2 calls)
  const {
    data: shortsScreenData,
    isLoading: isLoadingShortsAggregate,
    isError: isErrorShorts,
    refetch: refetchShorts,
  } = useShortsScreen({ language: 'te' });

  const shortsFeed = useMemo(
    () => injectAdsIntoFeed(shortsScreenData?.shorts?.items ?? [], shortsScreenData?.ads ?? [], 5),
    [shortsScreenData]
  );
  const isLoading = isLoadingShortsAggregate;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index || 0);
  }, []);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), []);

  const activeItem = shortsFeed[activeIndex];
  const activeVideoId = useMemo(
    () => (isYouTubeItem(activeItem) ? resolveYouTubeId(activeItem) : null),
    [activeItem]
  );

  const hasYouTubeItems = useMemo(
    () => shortsFeed.some((item: ShortFeedItem) => isYouTubeItem(item)),
    [shortsFeed]
  );

  // Chrome is visible whenever the settled page is a YouTube short.
  const youtubeChromeVisible = Boolean(activeVideoId) && !isScrolling && isFocused && appState === 'active';
  // The WebView itself is only painted once the player page is ready.
  const playerVisible = youtubeChromeVisible && !ytError && ytReady;

  const injectYouTube = useCallback((js: string) => {
    try {
      youTubeWebViewRef.current?.injectJavaScript(`${js} true;`);
    } catch {}
  }, []);

  const handleYouTubeMessage = useCallback((event: WebViewMessageEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (payload?.type === 'ready') {
      setYtReady(true);
      setYtError(null);
      setYtPlayerState(-1);
      ytPlayerStateRef.current = -1;
    } else if (payload?.type === 'state') {
      const nextState = typeof payload.state === 'number' ? payload.state : -1;
      ytPlayerStateRef.current = nextState;
      setYtPlayerState(nextState);
    } else if (payload?.type === 'error') {
      const key = String(payload.code);
      setYtError(YOUTUBE_ERROR_MESSAGES[key] ?? 'This video cannot be played here.');
    }
  }, []);

  const retryYouTube = useCallback(() => {
    setYtError(null);
    setYtReady(false);
    setYtPlayerState(-1);
    ytPlayerStateRef.current = -1;
    setYtPaused(false);
    try {
      youTubeWebViewRef.current?.reload();
    } catch {}
  }, []);

  const openActiveOnYouTube = useCallback(() => {
    if (!activeVideoId) return;
    Linking.openURL(`https://www.youtube.com/shorts/${activeVideoId}`).catch(() => {});
  }, [activeVideoId]);

  const handleTogglePlay = useCallback(() => {
    // If the embed isn't actually playing (autoplay was blocked, video ended,
    // or it is paused), a tap should start it. Otherwise it pauses.
    if (ytPlayerStateRef.current !== 1) {
      setYtPaused(false);
      injectYouTube('window.__ytSetPlaying && window.__ytSetPlaying(true);');
    } else {
      setYtPaused(true);
    }
  }, [injectYouTube]);

  // Load the settled video into the shared player. We intentionally do not
  // switch while scrolling, so fast swipes don't hammer the iframe API.
  useEffect(() => {
    if (!ytReady || !activeVideoId || isScrolling) return;
    injectYouTube(`window.__ytLoadVideo && window.__ytLoadVideo(${JSON.stringify(activeVideoId)});`);
  }, [activeVideoId, isScrolling, ytReady, injectYouTube]);

  // Play only while the short is actually on screen and the app is awake.
  useEffect(() => {
    if (!ytReady) return;
    const shouldPlay = playerVisible && !ytPaused;
    injectYouTube(`window.__ytSetPlaying && window.__ytSetPlaying(${shouldPlay});`);
  }, [ytReady, playerVisible, ytPaused, activeVideoId, injectYouTube]);

  useEffect(() => {
    if (!ytReady) return;
    injectYouTube(`window.__ytSetMuted && window.__ytSetMuted(${ytMuted});`);
  }, [ytReady, ytMuted, injectYouTube]);

  // Each new short starts playing.
  useEffect(() => {
    setYtPaused(false);
  }, [activeVideoId]);

  // Silent view tracking after 3 s of visible playback.
  useEffect(() => {
    if (!activeVideoId || !playerVisible || ytPaused) return;
    const timer = setTimeout(() => {
      if (trackedYouTubeIdRef.current !== activeVideoId) {
        trackedYouTubeIdRef.current = activeVideoId;
        trackView(activeVideoId);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeVideoId, playerVisible, ytPaused]);

  const renderVideoItem = useCallback(({ item, index }: { item: ShortFeedItem; index: number }) => {
    if (isAdvertisement(item)) return <ShortAdCard item={item} itemHeight={listHeight} />;

    const isCardActive = index === activeIndex;
    // Pre-load one ahead/behind but only play the active one when focused
    const shouldLoad = Math.abs(index - activeIndex) <= 1;

    if (isYouTubeItem(item)) {
      return (
        <YouTubeThumbCard
          item={item}
          videoId={resolveYouTubeId(item)}
          isActive={isCardActive}
          itemHeight={listHeight}
          onTogglePlay={handleTogglePlay}
        />
      );
    }
    return (
      <NativeVideoItem
        item={item}
        isActive={isCardActive}
        isFocused={isFocused}
        appState={appState}
        shouldLoad={shouldLoad}
        itemHeight={listHeight}
      />
    );
  }, [activeIndex, isFocused, appState, listHeight, handleTogglePlay]);

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
        <ShortsSkeleton />
      </View>
    );
  }

  if (isErrorShorts || shortsFeed.length === 0) {
    return (
      <View style={styles.darkLoaderContainer}>
        <Ionicons name="videocam-off-outline" size={56} color="#666" />
        <Text style={styles.emptyTitle}>
          {isErrorShorts ? 'Failed to load shorts' : 'No shorts available'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isErrorShorts
            ? 'Check your connection and try again.'
            : 'Check back later for new video shorts.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchShorts()}>
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showBuffering = !ytError && (ytPlayerState === -1 || ytPlayerState === 3);
  const showPausedIcon = ytPaused || ytPlayerState === 5;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setContainerHeight(h);
      }}
    >
      <FlatList
        style={{ height: listHeight, flexGrow: 0, flexShrink: 0 }}
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
        onScrollBeginDrag={beginScrolling}
        onMomentumScrollBegin={beginScrolling}
        onScrollEndDrag={endScrollingSoon}
        onMomentumScrollEnd={endScrollingNow}
      />

      {/* One shared YouTube embed player for the whole feed. Mounted once and
          fed video IDs through loadVideoById — never reloads the page. */}
      {hasYouTubeItems && (
        <View
          style={[styles.youtubeLayer, { opacity: playerVisible ? 1 : 0 }]}
          pointerEvents="none"
        >
          <WebView
            ref={youTubeWebViewRef}
            source={YOUTUBE_SOURCE}
            style={styles.youtubeWebView}
            pointerEvents="none"
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsFullscreenVideo={false}
            setSupportMultipleWindows={false}
            onMessage={handleYouTubeMessage}
            onError={() => setYtError(YOUTUBE_ERROR_MESSAGES.player)}
            onHttpError={() => setYtError(YOUTUBE_ERROR_MESSAGES.player)}
          />
        </View>
      )}

      {youtubeChromeVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* YouTube badge */}
          <View style={[styles.ytTopBadge, { top: insets.top + 12 }]} pointerEvents="none">
            <Ionicons name="logo-youtube" size={13} color="#FFF" />
            <Text style={styles.ytTopBadgeText}>YouTube</Text>
          </View>

          {/* Right-side actions */}
          <View style={[styles.ytSideActions, { bottom: insets.bottom + 84 }]}>
            <TouchableOpacity
              style={styles.ytActionBtn}
              activeOpacity={0.8}
              onPress={() => setYtMuted((m) => !m)}
              accessibilityRole="button"
              accessibilityLabel={ytMuted ? 'Unmute video' : 'Mute video'}
            >
              <Ionicons name={ytMuted ? 'volume-mute' : 'volume-high'} size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ytActionBtn}
              activeOpacity={0.8}
              onPress={openActiveOnYouTube}
              accessibilityRole="button"
              accessibilityLabel="Open in YouTube"
            >
              <Ionicons name="open-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Title / channel */}
          {activeItem && (activeItem.title || activeItem.channel_name || activeItem.author) && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={[styles.ytMetaGradient, { paddingBottom: insets.bottom + 74 }]}
              pointerEvents="none"
            >
              {activeItem.title ? (
                <Text style={styles.ytMetaTitle} numberOfLines={2}>{activeItem.title}</Text>
              ) : null}
              {(activeItem.channel_name || activeItem.author) ? (
                <Text style={styles.ytMetaChannel} numberOfLines={1}>
                  {activeItem.channel_name || activeItem.author}
                </Text>
              ) : null}
            </LinearGradient>
          )}

          {/* Buffering */}
          {showBuffering && !ytPaused && (
            <View style={styles.ytLoadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.ytLoadingText}>Loading video…</Text>
            </View>
          )}

          {/* Paused indicator — taps pass through to the card below */}
          {showPausedIcon && (
            <View style={styles.ytPausedOverlay} pointerEvents="none">
              <View style={styles.ytPausedCircle}>
                <Ionicons name="play" size={34} color="#FFF" />
              </View>
            </View>
          )}

          {/* Embed error fallback */}
          {ytError && (
            <View style={styles.ytErrorWrap} pointerEvents="box-none">
              <View style={styles.ytErrorCard}>
                <Ionicons name="alert-circle-outline" size={30} color="#F59E0B" />
                <Text style={styles.ytErrorTitle}>Can't play this video here</Text>
                <Text style={styles.ytErrorText}>{ytError}</Text>
                <View style={styles.ytErrorActions}>
                  <TouchableOpacity
                    style={styles.ytErrorPrimary}
                    activeOpacity={0.85}
                    onPress={openActiveOnYouTube}
                  >
                    <Ionicons name="logo-youtube" size={16} color="#FFF" />
                    <Text style={styles.ytErrorPrimaryText}>Open in YouTube</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ytErrorSecondary}
                    activeOpacity={0.85}
                    onPress={retryYouTube}
                  >
                    <Ionicons name="refresh" size={16} color="#FFF" />
                    <Text style={styles.ytErrorSecondaryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The list reserves space inside this container for the absolute tab bar.
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
  thumbnailFallback: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  thumbnailDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  // YouTube shared player layer
  youtubeLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  youtubeWebView: {
    flex: 1,
    backgroundColor: '#000',
  },

  ytCardBadge: {
    position: 'absolute',
    left: 14,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ytCardBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: Typography.fonts.semiBold,
  },

  ytTopBadge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ytTopBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: Typography.fonts.semiBold,
  },

  ytSideActions: {
    position: 'absolute',
    right: 14,
    gap: 10,
    alignItems: 'center',
  },
  ytActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  ytMetaGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 72,
  },
  ytMetaTitle: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: Typography.fonts.semiBold,
  },
  ytMetaChannel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 3,
    fontFamily: Typography.fonts.medium,
  },

  ytLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ytLoadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: Typography.fonts.medium,
  },

  ytPausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytPausedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingLeft: 4,
  },

  ytErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  ytErrorCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(18,18,18,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ytErrorTitle: {
    color: '#FFF',
    fontSize: 15,
    marginTop: 10,
    fontFamily: Typography.fonts.bold,
    textAlign: 'center',
  },
  ytErrorText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
    fontFamily: Typography.fonts.regular,
    textAlign: 'center',
  },
  ytErrorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  ytErrorPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF0033',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  ytErrorPrimaryText: {
    color: '#FFF',
    fontSize: 12.5,
    fontFamily: Typography.fonts.semiBold,
  },
  ytErrorSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  ytErrorSecondaryText: {
    color: '#FFF',
    fontSize: 12.5,
    fontFamily: Typography.fonts.semiBold,
  },

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

  darkLoaderContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#999',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4648D4',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
