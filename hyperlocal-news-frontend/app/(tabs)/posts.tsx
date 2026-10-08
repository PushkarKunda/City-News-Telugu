import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ViewToken,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import {
  usePublicPostsFeed,
  useInfinitePublicPostsFeed,
  useCreatePost,
  useTrendingHashtags,
} from '@/hooks/usePosts';
import { useBookmarks } from '@/hooks/useEngagement';
import { useCommunityScreen } from '@/hooks/useScreens';
import { PostCard } from '@/components/PostCard';
import { PostCommentsModal } from '@/components/PostCommentsModal';
import { useAuthStore } from '@/store/authStore';
import { useTabBarStore } from '@/store/tabBarStore';
import { useImmersiveChrome } from '@/hooks/useImmersiveChrome';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';
import { type Post } from '@/services/api/posts';
import { useAppAlert } from '@/components/AppAlert';

type FilterCategory = 'all' | 'trending' | 'issues' | 'discussions' | 'events';

const POSTS_HINT_SHOWN_KEY = '@city_news_posts_chrome_hint_shown';

const FILTER_TABS: { key: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'trending', label: 'Trending', icon: 'flame-outline' },
  { key: 'issues', label: 'Local Issues', icon: 'alert-circle-outline' },
  { key: 'discussions', label: 'Discussions', icon: 'chatbubbles-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
];

export default function PostsScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { alert, AlertComponent } = useAppAlert();

  // ─── Zustand v5 fine-grained selectors (prevent re-render loops) ───────────
  const currentUserId = useAuthStore((s) => s.user?.user_uid);
  const userDistrict = useAuthStore((s) => s.user?.district || s.user?.state || 'Your Neighborhood');
  const userAvatar = useAuthStore((s) => s.user?.profile_picture);
  const userName = useAuthStore((s) => (s.user as any)?.display_name || s.user?.name || s.user?.user_name || 'Neighbor');

  // AppState tracking for auto-pausing video
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  // ─── Single Source of Truth for Page Height ───────────────────────────────
  // Because the bar now hides, size each page from the list container's measured
  // onLayout height, with NO tab bar height subtracted, the same way Home does.
  // This also removes the empty black band at the bottom.
  const measuredTabBarHeight = useTabBarStore((s) => s.height);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : (Platform.OS === 'android' ? 16 : 0));
  const fallbackTabBarHeight = 58 + bottomInset;
  const effectiveTabBarHeight = measuredTabBarHeight > 0 ? measuredTabBarHeight : fallbackTabBarHeight;
  const contentBottomOffset = effectiveTabBarHeight + 16;
  const [containerHeight, setContainerHeight] = useState(0);
  const pageHeight = Math.max(1, containerHeight);

  // ─── Feed & Queries ────────────────────────────────────────────────────────
  const {
    data: communityScreenData,
    isLoading: isLoadingCommunityAggregate,
    refetch: refetchCommunityScreen,
  } = useCommunityScreen({ limit: 30 });

  const {
    data: infiniteFeedData,
    isLoading: isLoadingInfinite,
    isRefetching,
    refetch: refetchFeed,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isError: isFeedError,
  } = useInfinitePublicPostsFeed(20);

  const { data: trendingData } = useTrendingHashtags(10);
  const { data: postBookmarks = [] } = useBookmarks('post');
  const { mutate: createPost, isPending: isCreating } = useCreatePost();

  const isLoading = (isLoadingCommunityAggregate && isLoadingInfinite) || containerHeight === 0;

  const refetch = useCallback(() => {
    refetchCommunityScreen();
    refetchFeed();
  }, [refetchCommunityScreen, refetchFeed]);

  // Aggregate all pages of posts
  const allPosts: Post[] = useMemo(() => {
    if (infiniteFeedData?.pages) {
      const flattened = infiniteFeedData.pages.flatMap((page) => page?.posts || []);
      if (flattened.length > 0) return flattened;
    }
    return communityScreenData?.feed?.posts || [];
  }, [infiniteFeedData, communityScreenData]);

  const bookmarkedPostUids = useMemo(
    () => new Set(postBookmarks.map((b: any) => b.content_uid || b.post_uid)),
    [postBookmarks]
  );

  const rawTrendingList: string[] = useMemo(() => {
    const list = (trendingData as any)?.hashtags || (Array.isArray(trendingData) ? trendingData : []);
    if (list && list.length > 0) {
      return list.map((item: any) =>
        typeof item === 'string' ? item.replace(/^#/, '') : String(item?.tag || item?.name || item).replace(/^#/, '')
      );
    }
    return ['Hyderabad', 'LocalIssues', 'CivicNews', 'RoadSafety', 'CommunityHelp'];
  }, [trendingData]);

  // ─── Filter & Search State ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Filter posts based on active category, search query, and selected tag
  const filteredPosts = useMemo(() => {
    let result = [...allPosts];

    // Filter by selected tag
    if (selectedTag) {
      const cleanTag = selectedTag.toLowerCase().replace(/^#/, '');
      result = result.filter((p) => {
        const text = (p.content || '').toLowerCase();
        const tags = (p.hashtags || []).map((t) => String(t).toLowerCase().replace(/^#/, ''));
        return text.includes(`#${cleanTag}`) || text.includes(cleanTag) || tags.includes(cleanTag);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const content = (p.content || '').toLowerCase();
        const author = (p.user_display_name || p.user_name || '').toLowerCase();
        return content.includes(q) || author.includes(q);
      });
    }

    // Filter by Category Tab
    switch (activeTab) {
      case 'trending':
        result.sort((a, b) => {
          const scoreA = (a.like_count || 0) * 2 + (a.comment_count || 0) * 3 + (a.share_count || 0);
          const scoreB = (b.like_count || 0) * 2 + (b.comment_count || 0) * 3 + (b.share_count || 0);
          return scoreB - scoreA;
        });
        break;

      case 'issues':
        result = result.filter((p) => {
          const text = (p.content || '').toLowerCase();
          const issueKeywords = [
            'issue', 'problem', 'road', 'pothole', 'water', 'power',
            'electricity', 'garbage', 'traffic', 'complaint', 'repair', 'broken', 'help',
          ];
          return issueKeywords.some((kw) => text.includes(kw));
        });
        break;

      case 'discussions':
        result = result.filter((p) => {
          const text = (p.content || '').toLowerCase();
          return text.includes('?') || text.includes('discussion') || text.includes('opinion') || text.includes('think') || text.includes('anyone');
        });
        break;

      case 'events':
        result = result.filter((p) => {
          const text = (p.content || '').toLowerCase();
          const eventKeywords = ['event', 'meetup', 'festival', 'celebration', 'fair', 'exhibition', 'schedule', 'venue'];
          return eventKeywords.some((kw) => text.includes(kw));
        });
        break;

      case 'all':
      default:
        break;
    }

    return result;
  }, [allPosts, activeTab, searchQuery, selectedTag]);

  // ─── Paging & Viewability ──────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Post>>(null);
  const lastActiveIndexRef = useRef(0);

  // Preload next/prev page's images
  useEffect(() => {
    if (filteredPosts.length === 0) return;
    const nextItem = filteredPosts[activeIndex + 1];
    if (nextItem?.image_url && !isInvalidOrMockImageUrl(nextItem.image_url)) {
      Image.prefetch(nextItem.image_url);
    }
    const prevItem = filteredPosts[activeIndex - 1];
    if (prevItem?.image_url && !isInvalidOrMockImageUrl(prevItem.image_url)) {
      Image.prefetch(prevItem.image_url);
    }
  }, [activeIndex, filteredPosts]);

  // Reset to first post when changing filter chip or search
  const handleTabChange = useCallback((key: FilterCategory) => {
    setActiveTab(key);
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  // ─── Modal & Sheet States ──────────────────────────────────────────────────
  const [selectedPostUid, setSelectedPostUid] = useState<string | null>(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [commentCountDeltas, setCommentCountDeltas] = useState<Record<string, number>>({});

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [composerType, setComposerType] = useState<'text' | 'photo' | 'issue' | 'question'>('text');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [newPostHashtags, setNewPostHashtags] = useState('');

  // ─── Animation & Visibility (via shared useImmersiveChrome hook) ───────────
  const isModalOpen = isCommentsVisible || isCreateModalOpen || isSearchActive;
  const {
    isShown: isChromeShown,
    show: showChrome,
    hide: hideChrome,
    toggle: toggleChrome,
    headerAnim,
    headerOpacity,
  } = useImmersiveChrome({
    autoHideDelayMs: 2500,
    isModalOpen,
  });

  const hideChromeRef = useRef(hideChrome);
  hideChromeRef.current = hideChrome;
  const showChromeRef = useRef(showChrome);
  showChromeRef.current = showChrome;

  // ─── One-Time Hint for Hidden Menu ─────────────────────────────────────────
  const [showMenuHint, setShowMenuHint] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintDismissedRef = useRef(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissMenuHint = useCallback(() => {
    if (hintDismissedRef.current) return;
    hintDismissedRef.current = true;
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    Animated.timing(hintOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowMenuHint(false);
    });
    AsyncStorage.setItem(POSTS_HINT_SHOWN_KEY, 'true').catch(() => {});
  }, [hintOpacity]);

  const dismissMenuHintRef = useRef(dismissMenuHint);
  dismissMenuHintRef.current = dismissMenuHint;

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(POSTS_HINT_SHOWN_KEY)
      .then((val) => {
        if (!val && isMounted) {
          setShowMenuHint(true);
          Animated.timing(hintOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          hintTimerRef.current = setTimeout(() => {
            dismissMenuHintRef.current();
          }, 3000);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [hintOpacity]);

  const handleToggleUI = useCallback(() => {
    dismissMenuHintRef.current();
    toggleChrome();
  }, [toggleChrome]);

  // ─── Paging & Viewability ──────────────────────────────────────────────────
  // Stable viewable items changed handler: when user swipes to a new post, hide header overlay and tab bar
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const nextIndex = viewableItems[0].index;
        if (nextIndex !== lastActiveIndexRef.current) {
          lastActiveIndexRef.current = nextIndex;
          setActiveIndex(nextIndex);
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          // Dismiss one-time menu hint on first swipe
          dismissMenuHintRef.current();
          // Auto-hide header overlay and tab bar when user swipes between posts
          hideChromeRef.current?.();
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // ─── Comments & Real-Time Count Overrides ──────────────────────────────────
  const handleOpenComments = useCallback((postUid: string) => {
    setSelectedPostUid(postUid);
    setIsCommentsVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setIsCommentsVisible(false);
    setSelectedPostUid(null);
  }, []);

  const handleCommentAdded = useCallback((postUid: string) => {
    setCommentCountDeltas((prev) => ({
      ...prev,
      [postUid]: (prev[postUid] || 0) + 1,
    }));
  }, []);

  const handleSelectHashtag = useCallback((tag: string) => {
    const clean = tag.replace(/^#/, '');
    setSelectedTag((prev) => (prev === clean ? null : clean));
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const openCreateModal = (mode: 'text' | 'photo' | 'issue' | 'question' = 'text', opts?: { prefillTag?: string; prefillContent?: string }) => {
    setComposerType(mode);
    if (opts?.prefillTag) setNewPostHashtags(opts.prefillTag);
    if (opts?.prefillContent) setNewPostContent(opts.prefillContent);
    setIsCreateModalOpen(true);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() && !newPostImageUrl.trim()) {
      alert('Empty Post', 'Please write something or provide an image link.', [{ text: 'OK' }], { icon: 'alert-circle', iconColor: '#F59E0B' });
      return;
    }

    const inputTags = newPostHashtags
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);

    const contentTags = (newPostContent.match(/#[a-zA-Z0-9_]+/g) || []).map((tag) =>
      tag.replace(/^#/, '').trim()
    );

    const mergedHashtags = Array.from(new Set([...inputTags, ...contentTags]));

    createPost(
      {
        content: newPostContent.trim() || null,
        image_url: newPostImageUrl.trim() || null,
        hashtags: mergedHashtags.length > 0 ? mergedHashtags : undefined,
      },
      {
        onSuccess: () => {
          setNewPostContent('');
          setNewPostImageUrl('');
          setNewPostHashtags('');
          setIsCreateModalOpen(false);
          alert('Success', 'Your post has been published to the community!', [{ text: 'OK' }], { icon: 'checkmark-circle', iconColor: '#10B981' });
          refetch();
        },
        onError: (error: any) => {
          alert('Error', error?.message || 'Failed to create post. Please try again.', [{ text: 'OK' }], { icon: 'alert-circle', iconColor: '#EF4444' });
        },
      }
    );
  };

  // ─── Infinite Scroll Load More ─────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ─── Stable renderItem & Layouts ───────────────────────────────────────────
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight]
  );

  const keyExtractor = useCallback((item: Post, index: number) => {
    return item.post_uid || `post-${item.id || index}`;
  }, []);

  const renderPostItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const isCardActive = index === activeIndex;
      const isBookmarked = bookmarkedPostUids.has(item.post_uid);
      const delta = commentCountDeltas[item.post_uid] || 0;
      const countOverride = delta > 0 ? (item.comment_count || 0) + delta : undefined;

      return (
        <PostCard
          post={item}
          itemHeight={pageHeight}
          isActive={isCardActive}
          isFocused={isFocused}
          appState={appState}
          isBookmarked={isBookmarked}
          onOpenComments={handleOpenComments}
          onSelectHashtag={handleSelectHashtag}
          onToggleUI={handleToggleUI}
          currentUserId={currentUserId}
          commentCountOverride={countOverride}
          bottomOffset={contentBottomOffset}
        />
      );
    },
    [
      activeIndex,
      isFocused,
      appState,
      pageHeight,
      bookmarkedPostUids,
      commentCountDeltas,
      handleOpenComments,
      handleSelectHashtag,
      handleToggleUI,
      currentUserId,
      contentBottomOffset,
    ]
  );

  const userInitial = userName.charAt(0).toUpperCase();

  // ─── Header Overlay Interpolations ─────────────────────────────────────────
  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 0],
  });

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && Math.abs(h - containerHeight) > 1) {
          setContainerHeight(h);
        }
      }}
    >
      <StatusBar style="light" />

      {/* ─── Translucent Top Header Overlay ───────────────────────────────── */}
      <Animated.View
        style={[
          styles.headerOverlay,
          {
            paddingTop: Math.max(insets.top, 14),
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        pointerEvents={isChromeShown ? 'box-none' : 'none'}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.48)', 'rgba(0,0,0,0.0)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Top Header Row: Community Title + Neighborhood Pill + Search */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Community</Text>
            <View style={styles.neighborhoodPill}>
              <Ionicons name="location" size={12} color="#60A5FA" />
              <Text style={styles.neighborhoodPillText} numberOfLines={1}>
                {userDistrict}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.searchIconButton,
                isSearchActive && { backgroundColor: 'rgba(255, 255, 255, 0.28)' },
              ]}
              onPress={() => {
                setIsSearchActive((v) => !v);
                if (isSearchActive) setSearchQuery('');
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSearchActive ? 'close' : 'search'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Input (toggled open) */}
        {isSearchActive && (
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={15} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search posts, topics, members..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filter Chips Horizontal Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTabPill,
                  isSelected && styles.filterTabPillActive,
                ]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}
                  style={styles.filterTabIcon}
                />
                <Text
                  style={[
                    styles.filterTabLabel,
                    isSelected && styles.filterTabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Hashtag Filter Indicator */}
        {selectedTag && (
          <View style={styles.activeTagBanner}>
            <View style={styles.activeTagLeft}>
              <Ionicons name="pricetag" size={13} color="#60A5FA" />
              <Text style={styles.activeTagText}>#{selectedTag}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTag(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* ─── Main Paged FlatList Feed ─────────────────────────────────────── */}
      {isLoading ? (
        // Full-Screen Skeleton Loading State
        <View style={[styles.skeletonContainer, { height: pageHeight || '100%' }]}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.skeletonText}>Loading community feed...</Text>
        </View>
      ) : isFeedError && filteredPosts.length === 0 ? (
        // Error State with Retry
        <View style={[styles.errorStateContainer, { height: pageHeight }]}>
          <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load posts</Text>
          <Text style={styles.errorSubtitle}>Please check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPosts.length === 0 ? (
        // Friendly Empty State
        <View style={[styles.emptyContainer, { height: pageHeight }]}>
          <Ionicons name="chatbubbles-outline" size={60} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyTitle}>
            {searchQuery || selectedTag ? 'No matching posts found' : 'No posts in your area yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedTag
              ? 'Try adjusting your search query or removing filters.'
              : 'Be the first to share an update, question, or news with your local community!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateButton}
            onPress={() => {
              if (searchQuery || selectedTag) {
                setSearchQuery('');
                setSelectedTag(null);
                setActiveTab('all');
              } else {
                openCreateModal('text');
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateButtonText}>
              {searchQuery || selectedTag ? 'Clear Filters' : 'Create post'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={{ height: pageHeight, flexGrow: 0, flexShrink: 0 }}
          data={filteredPosts}
          keyExtractor={keyExtractor}
          renderItem={renderPostItem}
          pagingEnabled
          snapToInterval={pageHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          windowSize={3}
          removeClippedSubviews
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FFFFFF"
              colors={['#6366F1']}
            />
          }
        />
      )}

      {/* ─── One-Time Hint for Hidden Menu (Above Action Area) ── */}
      {showMenuHint && (
        <Animated.View
          style={[
            styles.menuHintContainer,
            {
              bottom: contentBottomOffset + 140,
              opacity: hintOpacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.menuHintPill}
            onPress={dismissMenuHint}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel="Tap to show menu"
            accessibilityHint="Tap anywhere to reveal navigation bar and header"
          >
            <Ionicons name="sparkles" size={13} color="#818CF8" />
            <Text style={styles.menuHintText}>Tap to show menu</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── Floating Composer Button (Above Tab Bar, Out of Action Rail) ── */}
      <Animated.View
        style={[
          styles.floatingComposerButton,
          {
            bottom: contentBottomOffset,
            left: 18, // Placed on bottom-left, completely away from the right action rail!
            opacity: headerOpacity,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
              {
                scale: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
        pointerEvents={isChromeShown ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.floatingTouchable}
          onPress={() => openCreateModal('text')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.floatingGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Comments Bottom Sheet ───────────────────────────────────────── */}
      <PostCommentsModal
        visible={isCommentsVisible}
        onClose={handleCloseComments}
        postUid={selectedPostUid}
        onCommentAdded={handleCommentAdded}
      />

      {/* ─── Composer Sheet Modal ────────────────────────────────────────── */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCreateModalOpen(false)}
          />

          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.sheet,
                borderTopColor: colors.border,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.indicator }]} />

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="create-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Community Post</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Composer Type Switcher (Photo, Report Issue, Ask Local, Text) */}
            <View style={styles.composerModeBar}>
              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'text' && styles.composerModeItemActive]}
                onPress={() => setComposerType('text')}
              >
                <Ionicons name="text-outline" size={16} color={composerType === 'text' ? '#6366F1' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, composerType === 'text' && { color: '#6366F1', fontWeight: '700' }]}>Text</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'photo' && styles.composerModeItemActive]}
                onPress={() => setComposerType('photo')}
              >
                <Ionicons name="image-outline" size={16} color={composerType === 'photo' ? '#10B981' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, composerType === 'photo' && { color: '#10B981', fontWeight: '700' }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'issue' && styles.composerModeItemActive]}
                onPress={() => {
                  setComposerType('issue');
                  if (!newPostHashtags.includes('#LocalIssue')) {
                    setNewPostHashtags((prev) => (prev ? `${prev.trim()} #LocalIssue` : '#LocalIssue'));
                  }
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color={composerType === 'issue' ? '#F59E0B' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, composerType === 'issue' && { color: '#F59E0B', fontWeight: '700' }]}>Report Issue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'question' && styles.composerModeItemActive]}
                onPress={() => {
                  setComposerType('question');
                  if (!newPostContent.startsWith('Question for neighbors:')) {
                    setNewPostContent('Question for neighbors: ');
                  }
                }}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={composerType === 'question' ? '#3B82F6' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, composerType === 'question' && { color: '#3B82F6', fontWeight: '700' }]}>Ask Local</Text>
              </TouchableOpacity>
            </View>

            {/* Author Preview */}
            <View style={styles.modalAuthorRow}>
              {userAvatar && !isInvalidOrMockImageUrl(userAvatar) ? (
                <Image source={{ uri: userAvatar }} style={styles.modalAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.modalAvatarFallback, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.modalAvatarText, { color: colors.primary }]}>{userInitial}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.modalAuthorName, { color: colors.text }]}>{userName}</Text>
                <Text style={[styles.modalLocation, { color: colors.primary }]}>📍 {userDistrict}</Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.modalBody}>
              <TextInput
                style={[
                  styles.postTextInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={
                  composerType === 'issue'
                    ? 'Describe the issue (e.g. road pothole, streetlight, garbage)...'
                    : composerType === 'question'
                    ? 'Ask your local neighbors a question...'
                    : "What's happening in your area? Share an update with neighbors..."
                }
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={newPostContent}
                onChangeText={setNewPostContent}
                maxLength={500}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {newPostContent.length}/500
              </Text>

              {composerType === 'photo' && (
                <TextInput
                  style={[
                    styles.imageInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      marginBottom: 10,
                    },
                  ]}
                  placeholder="Image URL (https://...)"
                  placeholderTextColor={colors.textTertiary}
                  value={newPostImageUrl}
                  onChangeText={setNewPostImageUrl}
                />
              )}

              <TextInput
                style={[
                  styles.imageInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Hashtags (e.g. #civic #roads #events)"
                placeholderTextColor={colors.textTertiary}
                value={newPostHashtags}
                onChangeText={setNewPostHashtags}
              />

              {/* Quick Tag Suggestions */}
              {rawTrendingList.length > 0 && (
                <View style={styles.tagSuggestionsRow}>
                  <Text style={[styles.suggestedTagsLabel, { color: colors.textTertiary }]}>Suggested:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagSuggestChips}>
                    {rawTrendingList.slice(0, 6).map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.suggestChip, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.border }]}
                        onPress={() => {
                          const tagWithHash = `#${tag}`;
                          if (!newPostHashtags.includes(tagWithHash)) {
                            setNewPostHashtags((prev) => (prev ? `${prev.trim()} ${tagWithHash}` : tagWithHash));
                          }
                        }}
                      >
                        <Text style={[styles.suggestChipText, { color: colors.primary }]}>+#{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, isCreating && styles.disabledSubmit]}
                onPress={handleCreatePost}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Publish Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {AlertComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    overflow: 'hidden',
  },

  // ─── Translucent Top Header Overlay ─────────────────────────────────────────
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  neighborhoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 3,
  },
  neighborhoodPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 130,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  filterChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  filterTabPillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  filterTabIcon: {
    marginRight: 4,
  },
  filterTabLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeTagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  activeTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── Loading & States ──────────────────────────────────────────────────────
  skeletonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
  },
  skeletonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 14,
  },
  errorStateContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0B1120',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#6366F1',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0B1120',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#6366F1',
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ─── Floating Action Button (FAB) ──────────────────────────────────────────
  floatingComposerButton: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    zIndex: 90,
  },
  floatingTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    overflow: 'hidden',
  },
  floatingGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Create Post Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderTopWidth: 1.5,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  composerModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 6,
  },
  composerModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  composerModeItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  composerModeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  modalAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalLocation: {
    fontSize: 12,
    marginTop: 1,
  },
  modalBody: {
    marginVertical: 12,
  },
  postTextInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  imageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
  },
  tagSuggestionsRow: {
    marginTop: 10,
  },
  suggestedTagsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  tagSuggestChips: {
    gap: 6,
  },
  suggestChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggestChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledSubmit: {
    opacity: 0.6,
  },

  // ─── One-Time Menu Hint Pill ───────────────────────────────────────────────
  menuHintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 95,
  },
  menuHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuHintText: {
    color: '#E0E7FF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
