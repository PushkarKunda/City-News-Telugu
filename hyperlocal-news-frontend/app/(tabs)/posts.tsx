import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { usePublicPostsFeed, useCreatePost, useTrendingHashtags } from '@/hooks/usePosts';
import { useBookmarks } from '@/hooks/useEngagement';
import { PostCard } from '@/components/PostCard';
import { PostCommentsModal } from '@/components/PostCommentsModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { useTabBarStore } from '@/store/tabBarStore';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';

type FilterCategory = 'all' | 'trending' | 'issues' | 'discussions' | 'events';

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
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const setTabBarVisible = useTabBarStore((s) => s.setVisible);

  // Always keep tab bar visible
  useEffect(() => {
    setTabBarVisible(true);
    const unsub = navigation.addListener('focus', () => {
      setTabBarVisible(true);
    });
    return unsub;
  }, [navigation, setTabBarVisible]);

  // ─── Filter & Search State ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // ─── Post Modal & Interaction State ────────────────────────────────────
  const [selectedPostUid, setSelectedPostUid] = useState<string | null>(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [newPostHashtags, setNewPostHashtags] = useState('');

  // ─── Data Queries ──────────────────────────────────────────────────────
  const { data: feedData, isLoading, isRefetching, refetch } = usePublicPostsFeed(30);
  const { data: trendingData } = useTrendingHashtags(10);
  const { data: postBookmarks = [] } = useBookmarks('post');
  const { mutate: createPost, isPending: isCreating } = useCreatePost();

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

  const allPosts = feedData?.posts || [];

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
          const issueKeywords = ['issue', 'problem', 'road', 'pothole', 'water', 'power', 'electricity', 'garbage', 'traffic', 'complaint', 'repair', 'broken', 'help'];
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

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleOpenComments = useCallback((postUid: string) => {
    setSelectedPostUid(postUid);
    setIsCommentsVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setIsCommentsVisible(false);
    setSelectedPostUid(null);
  }, []);

  const handleSelectHashtag = useCallback((tag: string) => {
    const clean = tag.replace(/^#/, '');
    setSelectedTag((prev) => (prev === clean ? null : clean));
  }, []);

  const openCreateModal = (opts?: { prefillTag?: string; prefillContent?: string }) => {
    if (opts?.prefillTag) {
      setNewPostHashtags(opts.prefillTag);
    }
    if (opts?.prefillContent) {
      setNewPostContent(opts.prefillContent);
    }
    setIsCreateModalOpen(true);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() && !newPostImageUrl.trim()) {
      Alert.alert('Empty Post', 'Please write something or provide an image link.');
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
          Alert.alert('Success', 'Your post has been published to the community!');
        },
        onError: (error: any) => {
          Alert.alert('Error', error?.message || 'Failed to create post. Please try again.');
        },
      }
    );
  };

  const userDistrict = user?.district || user?.state || 'Your Neighborhood';
  const userAvatar = user?.profile_picture && !isInvalidOrMockImageUrl(user.profile_picture)
    ? user.profile_picture
    : null;
  const userInitial = ((user as any)?.display_name || user?.name || user?.user_name || 'U').charAt(0).toUpperCase();

  // ─── Header Component (ListHeaderComponent) ───────────────────────────
  const renderListHeader = () => (
    <View style={styles.listHeaderWrapper}>
      {/* Active Hashtag Filter Banner (if selected) */}
      {selectedTag && (
        <View style={[styles.activeTagBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
          <View style={styles.activeTagLeft}>
            <Ionicons name="pricetag" size={15} color={colors.primary} />
            <Text style={[styles.activeTagText, { color: colors.primary }]}>
              Filtered by #{selectedTag}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedTag(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Inline Post Composer Card */}
      <View
        style={[
          styles.composerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowOpacity: isDark ? 0.45 : 0.05,
          },
        ]}
      >
        <View style={styles.composerTopRow}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.composerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.composerAvatarFallback, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.composerAvatarInitial, { color: colors.primary }]}>
                {userInitial}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.composerInputBox,
              {
                backgroundColor: isDark ? 'rgba(11, 11, 20, 0.7)' : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => openCreateModal()}
            activeOpacity={0.7}
          >
            <Text style={[styles.composerPlaceholder, { color: colors.textTertiary }]}>
              What's happening in your area? Share an update...
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick action shortcuts */}
        <View style={[styles.composerActionsBar, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.composerActionItem}
            onPress={() => openCreateModal()}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={18} color="#10B981" />
            <Text style={[styles.composerActionLabel, { color: colors.textSecondary }]}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.composerActionItem}
            onPress={() => openCreateModal({ prefillTag: '#LocalIssue' })}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
            <Text style={[styles.composerActionLabel, { color: colors.textSecondary }]}>Report Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.composerActionItem}
            onPress={() => openCreateModal({ prefillContent: 'Question for neighbors: ' })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#3B82F6" />
            <Text style={[styles.composerActionLabel, { color: colors.textSecondary }]}>Ask Local</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPostItem = useCallback(
    ({ item }: { item: any }) => (
      <PostCard
        post={item}
        onOpenComments={handleOpenComments}
        isBookmarked={bookmarkedPostUids.has(item.post_uid)}
        onSelectHashtag={handleSelectHashtag}
      />
    ),
    [handleOpenComments, bookmarkedPostUids, handleSelectHashtag]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ─── Persistent Top Community Header ────────────────────────────── */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 12) + 6,
          },
        ]}
      >
        <View style={styles.topHeaderMain}>
          <View style={styles.topHeaderTitleCol}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Community</Text>
            <View style={[styles.locationChip, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="location" size={12} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.primary }]} numberOfLines={1}>
                {userDistrict}
              </Text>
            </View>
          </View>

          <View style={styles.topHeaderActions}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                isSearchActive && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => {
                setIsSearchActive((v) => !v);
                if (isSearchActive) setSearchQuery('');
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSearchActive ? 'close' : 'search-outline'}
                size={20}
                color={isSearchActive ? colors.primary : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => refetch()}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar (expandable) */}
        {isSearchActive && (
          <View style={[styles.searchBarWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search posts, topics, members..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category Tabs Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
          style={styles.filterTabsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTabPill,
                  {
                    backgroundColor: isSelected ? colors.primary : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={styles.filterTabIcon}
                />
                <Text
                  style={[
                    styles.filterTabLabel,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Trending Hashtags Scroll Bar */}
        {rawTrendingList.length > 0 && (
          <View style={styles.trendingRowWrapper}>
            <View style={styles.trendingLabel}>
              <Ionicons name="flame" size={14} color="#EF4444" />
              <Text style={[styles.trendingLabelText, { color: colors.textTertiary }]}>Trending:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingTagsContent}
            >
              {rawTrendingList.map((tag) => {
                const isTagActive = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.trendingTagPill,
                      isTagActive && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleSelectHashtag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.trendingTagText,
                        { color: isTagActive ? '#FFFFFF' : colors.primary },
                      ]}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ─── Main Post Feed ─────────────────────────────────────────────── */}
      <View style={styles.feedContainer}>
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner fullScreen text="Loading community feed..." colorScheme={colorScheme ?? 'light'} />
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.post_uid || String(item.id)}
            renderItem={renderPostItem}
            ListHeaderComponent={renderListHeader}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.flatListContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={56} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery || selectedTag ? 'No matching posts found' : 'No posts in this category'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery || selectedTag
                    ? 'Try adjusting your search query or removing filters.'
                    : 'Be the first to share an update or question with your local community!'}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (searchQuery || selectedTag) {
                      setSearchQuery('');
                      setSelectedTag(null);
                      setActiveTab('all');
                    } else {
                      openCreateModal();
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>
                    {searchQuery || selectedTag ? 'Clear Filters' : 'Create First Post'}
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* ─── Floating Action Button (FAB) ───────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 72,
          },
        ]}
        onPress={() => openCreateModal()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ─── Comments Modal ─────────────────────────────────────────────── */}
      <PostCommentsModal
        visible={isCommentsVisible}
        onClose={handleCloseComments}
        postUid={selectedPostUid}
      />

      {/* ─── Create Post Modal ──────────────────────────────────────────── */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
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
                borderTopColor: isDark ? colors.borderGlass : colors.border,
                borderTopWidth: 1.5,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : colors.indicator },
              ]}
            />

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="create-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Community Post</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Author Preview */}
            <View style={styles.modalAuthorRow}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.modalAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.modalAvatarFallback, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.modalAvatarText, { color: colors.primary }]}>{userInitial}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.modalAuthorName, { color: colors.text }]}>
                  {(user as any)?.display_name || user?.name || user?.user_name || 'Local Neighbor'}
                </Text>
                <Text style={[styles.modalLocation, { color: colors.primary }]}>
                  📍 {userDistrict}
                </Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.modalBody}>
              <TextInput
                style={[
                  styles.postTextInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(24, 23, 54, 0.85)' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="What's happening in your area? Share news, updates, or report local issues..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={newPostContent}
                onChangeText={setNewPostContent}
                maxLength={500}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {newPostContent.length}/500
              </Text>

              <TextInput
                style={[
                  styles.imageInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(24, 23, 54, 0.85)' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Optional image link (https://...)"
                placeholderTextColor={colors.textTertiary}
                value={newPostImageUrl}
                onChangeText={setNewPostImageUrl}
              />

              <TextInput
                style={[
                  styles.imageInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(24, 23, 54, 0.85)' : '#F8FAFC',
                    borderColor: colors.border,
                    marginTop: 10,
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
                  <Text style={[styles.suggestedTagsLabel, { color: colors.textTertiary }]}>
                    Suggested:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagSuggestChips}>
                    {rawTrendingList.slice(0, 6).map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.suggestChip,
                          {
                            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(70, 72, 212, 0.08)',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => {
                          const tagWithHash = `#${tag}`;
                          if (!newPostHashtags.includes(tagWithHash)) {
                            setNewPostHashtags((prev) => (prev ? `${prev.trim()} ${tagWithHash}` : tagWithHash));
                          }
                        }}
                      >
                        <Text style={[styles.suggestChipText, { color: colors.textSecondary }]}>
                          +# {tag}
                        </Text>
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
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  isCreating && styles.disabledSubmit,
                ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    zIndex: 10,
  },
  topHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topHeaderTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 130,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterTabsScroll: {
    marginBottom: 6,
  },
  filterTabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabIcon: {
    marginRight: 5,
  },
  filterTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendingRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 4,
  },
  trendingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    gap: 2,
  },
  trendingLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendingTagsContent: {
    gap: 6,
    paddingRight: 16,
  },
  trendingTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendingTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingTop: 8,
  },
  listHeaderWrapper: {
    paddingBottom: 4,
  },
  activeTagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  composerCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  composerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  composerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  composerAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  composerInputBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    fontSize: 13,
  },
  composerActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
  },
  composerActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  composerActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 20,
  },
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
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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
    fontWeight: '500',
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
});
