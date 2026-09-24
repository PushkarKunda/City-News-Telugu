import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ViewToken,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useNewsShorts } from '@/hooks/useNews';
import { useQuery } from '@tanstack/react-query';
import { contentApi, Advertisement } from '@/services/api/content';
import { injectAdsIntoFeed, isAdvertisement } from '@/hooks/feedInjection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTabBarStore } from '@/store/tabBarStore';

type ShortFeedItem = any;

const ShortAdCard = React.memo(({ item, itemHeight }: { item: { type: 'ad'; data: Advertisement }; itemHeight: number }) => {
  return (
    <View style={[styles.itemContainer, { height: itemHeight, backgroundColor: '#000' }]}>
      <Image source={{ uri: item.data.image_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[styles.bottomGradient, { paddingBottom: 40 }]}>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{item.data.title}</Text>
          {item.data.redirect_url && (
            <TouchableOpacity style={styles.adCtaButton}>
              <Text style={styles.adCtaText}>Learn More</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.adDisclaimer}>Sponsored</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

const ShortsProgressBar = React.memo(({ progress }: { progress: number }) => (
  <View style={styles.progressBarContainer}>
    <View style={styles.progressBarBackground}>
      <View style={[styles.progressBarFill, { width: `${progress.toFixed(1)}%` as any }]} />
    </View>
  </View>
));

// ─── YouTube Short Card ─────────────────────────────────────────────────────
// Loads the actual YouTube Shorts page (not /embed/) inside a WebView.
// The /shorts/ page plays natively in WebView without embedding restrictions.
const YouTubeShortCard = React.memo(({ item, isActive, shouldLoad, itemHeight, onToggleFooter }: { item: any; isActive: boolean; shouldLoad: boolean; itemHeight: number; onToggleFooter?: () => void }) => {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);

  const channelTitle = item.channel_title || item.source_name || item.source || 'Telugu Shorts';
  const avatarLetter = channelTitle.charAt(0).toUpperCase();

  const shortsUrl = `https://www.youtube.com/shorts/${item.video_id}`;

  const lastProgressRef = useRef(0);
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'progress' && typeof data.progress === 'number') {
        const p = Math.min(100, Math.max(0, data.progress));
        if (Math.abs(p - lastProgressRef.current) >= 1) {
          lastProgressRef.current = p;
          setProgress(p);
        }
      }
    } catch (e) {}
  }, []);

  return (
    <View style={[styles.itemContainer, { height: itemHeight }]}>
      {isActive && shouldLoad ? (
        <WebView
          source={{ uri: shortsUrl }}
          style={styles.backgroundImage}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onMessage={handleMessage}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
          injectedJavaScript={`
            // Auto-unmute YouTube video (runs for first 2 seconds then self-terminates)
            let unmuteChecks = 0;
            const unmuteInterval = setInterval(() => {
              unmuteChecks++;
              try {
                const v = document.querySelector('video');
                if (v) {
                  v.muted = false;
                  v.volume = 1.0;
                }
                const unmuteBtns = document.querySelectorAll(
                  '.ytp-unmute, .player-controls-middle, [aria-label*="unmute" i], [aria-label*="Unmute" i], .reel-player-overlay-mute-button, .sound-icon, .ytp-mute-button'
                );
                unmuteBtns.forEach(btn => {
                  try { btn.click(); } catch(e) {}
                });
              } catch(e) {}
              if (unmuteChecks >= 8) clearInterval(unmuteInterval);
            }, 250);

            // Hide YouTube UI elements & unmute overlay button completely
            const style = document.createElement('style');
            style.textContent = \`
              ytm-mobile-topbar-renderer,
              .mobile-topbar-header,
              ytm-pivot-bar-renderer,
              .page-container > :not(ytm-shorts),
              header, .header,
              .ytm-autonav-bar,
              #guide-button,
              ytm-comments-entry-point-header-renderer,
              .reel-player-overlay-actions,
              .player-controls-top,
              .player-controls-middle,
              .player-controls-bottom,
              ytm-shorts-player-controls,
              .ytp-unmute,
              .ytp-mute-button,
              .reel-player-overlay-mute-button,
              .sound-icon,
              .volume-icon,
              [aria-label*="unmute" i],
              [aria-label*="Unmute" i],
              .navigation-container,
              .slim-owner,
              .bottom-bar { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
              body { background: #000 !important; overflow: hidden !important; }
            \`;
            document.head.appendChild(style);

            // Report video progress every 500ms back to React Native
            setInterval(() => {
              try {
                const v = document.querySelector('video');
                if (v && v.duration > 0) {
                  const pct = (v.currentTime / v.duration) * 100;
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', progress: pct }));
                }
              } catch(e) {}
            }, 500);

            true;
          `}
          onShouldStartLoadWithRequest={(request) => {
            // Prevent navigation away from the shorts page
            if (request.url.includes('/shorts/') || request.url.includes('youtube.com')) {
              return true;
            }
            return false;
          }}
        />
      ) : (
        <Image
          source={{ uri: item.thumbnail_url || `https://img.youtube.com/vi/${item.video_id}/maxresdefault.jpg` }}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
        />
      )}

      {/* Background Tap Handler to toggle footer (only when tapping background) */}
      {onToggleFooter && (
        <TouchableWithoutFeedback onPress={onToggleFooter}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      )}

      {/* Right Interaction Stack */}
      <View style={styles.rightStack} pointerEvents="box-none">
        <View style={styles.actionItem}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.plusIconContainer}>
              <MaterialIcons name="add" size={12} color="white" />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="heart" size={32} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>{item.likes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="eye-outline" size={28} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>{item.views || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <MaterialIcons name="reply" size={32} color="white" style={[styles.iconShadow, { transform: [{ scaleX: -1 }] }]} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="bookmark-outline" size={28} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Info Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + Spacing.xl }]}
        pointerEvents="box-none"
      >
        <View style={styles.infoContainer}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channelTitle}
          </Text>
          <Text style={styles.title} numberOfLines={3}>
            {item.title}
          </Text>
        </View>

        {/* Dynamic Progress Bar */}
        <ShortsProgressBar progress={progress} />
      </LinearGradient>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.shouldLoad === nextProps.shouldLoad &&
    prevProps.itemHeight === nextProps.itemHeight &&
    (prevProps.item.video_id || prevProps.item.news_uid) === (nextProps.item.video_id || nextProps.item.news_uid)
  );
});

// ─── Native Video Short Card (for non-YouTube content) ──────────────────────
const NativeVideoItem = React.memo(({ item, isActive, shouldLoad, itemHeight, onToggleFooter }: { item: any; isActive: boolean; shouldLoad: boolean; itemHeight: number; onToggleFooter?: () => void }) => {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(isActive && (item.video_url || item.image_url) ? { uri: item.video_url || item.image_url } : null, player => {
    player.loop = true;
    player.muted = false;
  });

  React.useEffect(() => {
    if (player) {
      player.muted = false;
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isActive, player]);

  React.useEffect(() => {
    if (!isActive || !player) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      try {
        if (player.duration > 0) {
          const pct = (player.currentTime / player.duration) * 100;
          setProgress(Math.min(100, Math.max(0, pct)));
        }
      } catch (e) {}
    }, 500);
    return () => clearInterval(interval);
  }, [isActive, player]);

  const channelTitle = item.channel_title || item.source_name || item.source || 'Telugu Shorts';
  const avatarLetter = channelTitle.charAt(0).toUpperCase();

  return (
    <View style={[styles.itemContainer, { height: itemHeight }]}>
      <VideoView
        player={player}
        style={styles.backgroundImage}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Background Touch Layer to toggle footer */}
      {onToggleFooter && (
        <TouchableWithoutFeedback onPress={onToggleFooter}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      )}

      {/* Right Interaction Stack */}
      <View style={styles.rightStack} pointerEvents="box-none">
        <View style={styles.actionItem}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.plusIconContainer}>
              <MaterialIcons name="add" size={12} color="white" />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="heart" size={32} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>{item.likes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="eye-outline" size={28} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>{item.views || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <MaterialIcons name="reply" size={32} color="white" style={[styles.iconShadow, { transform: [{ scaleX: -1 }] }]} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="bookmark-outline" size={28} color="white" style={styles.iconShadow} />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Info Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + Spacing.xl }]}
        pointerEvents="box-none"
      >
        <View style={styles.infoContainer}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channelTitle}
          </Text>
          <Text style={styles.title} numberOfLines={3}>
            {item.title}
          </Text>
        </View>

        {/* Dynamic Progress Bar */}
        <ShortsProgressBar progress={progress} />
      </LinearGradient>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.shouldLoad === nextProps.shouldLoad &&
    prevProps.itemHeight === nextProps.itemHeight &&
    (prevProps.item.video_id || prevProps.item.news_uid) === (nextProps.item.video_id || nextProps.item.news_uid)
  );
});

export default function ShortsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'Following' | 'For You'>('Following');
  const [activeIndex, setActiveIndex] = useState(0);
  const [listHeight, setListHeight] = useState(height);
  const setTabBarVisible = useTabBarStore((s) => s.setVisible);

  // ─── Animation & Touch ──────────────────────────────────────────────────
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const toggleFooter = useCallback(() => {
    const isVisible = useTabBarStore.getState().visible;
    setTabBarVisible(!isVisible);
  }, [setTabBarVisible]);

  // ─── Data ──────────────────────────────────────────────────────────────
  const { data: rawShorts = [], isLoading: isLoadingShorts } = useNewsShorts('te');
  const { data: ads = [], isLoading: isLoadingAds } = useQuery({
    queryKey: ['active-ads', 'shorts'],
    queryFn: () => contentApi.getActiveAdvertisements(),
  });

  const shortsFeed = useMemo(() => {
    return injectAdsIntoFeed(rawShorts, ads, 5);
  }, [rawShorts, ads]);

  const isLoading = isLoadingShorts || isLoadingAds;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderVideoItem = useCallback(({ item, index }: { item: ShortFeedItem; index: number }) => {
    const isCardActive = isFocused && index === activeIndex;
    const shouldLoad = isFocused && Math.abs(index - activeIndex) <= 1;

    if (isAdvertisement(item)) {
      return <ShortAdCard item={item} itemHeight={listHeight} />;
    }

    // YouTube content → plays in-app via WebView
    const isYouTube = Boolean(item.video_id || item.source === 'youtube');
    if (isYouTube) {
      return (
        <YouTubeShortCard
          item={item}
          isActive={isCardActive}
          shouldLoad={shouldLoad}
          itemHeight={listHeight}
          onToggleFooter={toggleFooter}
        />
      );
    }

    // Native video content
    return (
      <NativeVideoItem
        item={item}
        isActive={isCardActive}
        shouldLoad={shouldLoad}
        itemHeight={listHeight}
        onToggleFooter={toggleFooter}
      />
    );
  }, [activeIndex, isFocused, listHeight, toggleFooter]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: listHeight,
      offset: listHeight * index,
      index,
    }),
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
    <View
      style={styles.container}
      onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
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
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        bounces={false}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
      />

      {/* Top Bar Static Overlay */}
      <View
        style={[
          styles.topGradient,
          {
            paddingTop: insets.top + Spacing.sm,
          },
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.75)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.topBar}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity onPress={() => setActiveTab('Following')} style={styles.tabItem}>
              <Text style={[styles.tabText, activeTab === 'Following' && styles.activeTabText]}>Following</Text>
              {activeTab === 'Following' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('For You')} style={styles.tabItem}>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  itemContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: Spacing.sm,
    height: 48,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    marginBottom: 4,
  },
  activeTabText: {
    color: '#FFF',
  },
  activeTabIndicator: {
    height: 2,
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 1,
  },
  rightStack: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 40,
    alignItems: 'center',
    gap: Spacing.xl,
    zIndex: 10,
  },
  actionItem: {
    alignItems: 'center',
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.semiBold,
    marginTop: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  avatarContainer: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4648D4',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'] * 2,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  infoContainer: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
  },
  channelTitle: {
    color: '#38BDF8',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bold,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFF',
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.fonts.bold,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    zIndex: 100,
    elevation: 10,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4648D4',
  },
  darkLoaderContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adCtaButton: {
    marginTop: 12,
    backgroundColor: '#4648D4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  },
  adCtaText: {
    color: '#FFF',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
  },
  adDisclaimer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: Typography.sizes.xs,
    marginTop: 8,
    fontFamily: Typography.fonts.medium,
  },
});