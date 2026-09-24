// app/(tabs)/menu-bookmarks.tsx

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

import { useBookmarks, useRemoveBookmark } from '@/hooks/useEngagement';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatTimeAgo, formatNumber } from '@/utils/formatters';
import { resolveArticleImageUrl } from '@/utils/imageResolver';
import type { ContentType } from '@/services/api/engagement';

interface MenuBookmarkItem {
  id: number;
  contentUid: string;
  contentType: ContentType;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  timeAgo: string;
  reads: string;
}

const CATEGORIES = [
  { label: 'All Items', value: 'all' },
  { label: 'News', value: 'news' },
  { label: 'Posts', value: 'post' },
];

export default function MenuBookmarksScreen() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ✅ Fetch BOTH news and posts bookmarks
  const { data: newsBookmarks = [], isLoading: isLoadingNews } = useBookmarks('news');
  const { data: postBookmarks = [], isLoading: isLoadingPosts } = useBookmarks('post');

  const { mutate: removeBookmarkMutate } = useRemoveBookmark();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const isLoading = isLoadingNews || isLoadingPosts;

  const toggleBookmark = (contentUid: string, contentType: ContentType) => {
    if (!contentUid) return;
    removeBookmarkMutate({
      contentUid,
      contentType
    });
  };

  // ✅ Fixed: Proper type narrowing with filter
  const bookmarks = useMemo((): MenuBookmarkItem[] => {
    const mappedNews: MenuBookmarkItem[] = newsBookmarks
      .map((bookmark) => {
        const article = (bookmark as any).content;
        if (!article) return null;

        const categoryName = article.category_names?.[0] || 'General';

        return {
          id: bookmark.id,
          contentUid: bookmark.content_uid || article.news_uid || article.id || String(bookmark.id),
          contentType: 'news' as ContentType,
          category: categoryName,
          title: article.title || 'Untitled',
          description: article.summary || '',
          imageUrl: resolveArticleImageUrl({
            imageUrl: article.image_url,
            categoryName,
            title: article.title,
            isBreaking: article.is_breaking,
          }),
          timeAgo: formatTimeAgo(article.created_at || bookmark.created_at),
          reads: `${formatNumber(article.views || 0)} reads`,
        };
      })
      .filter((item): item is MenuBookmarkItem => item !== null); // Type guard

    const mappedPosts: MenuBookmarkItem[] = postBookmarks
      .map((bookmark) => {
        const post = (bookmark as any).content;
        if (!post) return null;

        return {
          id: bookmark.id,
          contentUid: bookmark.content_uid || post.post_uid || post.id || String(bookmark.id),
          contentType: 'post' as ContentType,
          category: 'Community',
          title: post.title || post.content?.substring(0, 100) || 'Untitled',
          description: post.content || '',
          imageUrl: resolveArticleImageUrl({
            imageUrl: post.images?.[0]?.image_url || post.image_url,
            categoryName: 'Community',
            title: post.title || post.content,
            itemType: 'post',
          }),
          timeAgo: formatTimeAgo(post.created_at || bookmark.created_at),
          reads: `${formatNumber(post.views || 0)} views`,
        };
      })
      .filter((item): item is MenuBookmarkItem => item !== null); // ✅ Type guard

    return [...mappedNews, ...mappedPosts];
  }, [newsBookmarks, postBookmarks]);

  // ✅ Enhanced filtering - now type-safe
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const filterUpper = selectedCategory.toUpperCase();

      let matchesCategory = true;

      if (filterUpper === 'ALL') {
        matchesCategory = true;
      } else if (filterUpper === 'NEWS') {
        matchesCategory = item.contentType === 'news';
      } else if (filterUpper === 'POST') {
        matchesCategory = item.contentType === 'post';
      } else {
        const catUpper = item.category.toUpperCase();
        matchesCategory =
          catUpper === filterUpper ||
          (filterUpper === 'TECH' && (catUpper === 'TECH' || catUpper === 'TECHNOLOGY'));
      }

      return matchesSearch && matchesCategory;
    });
  }, [bookmarks, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <View style={[styles.container, {
        backgroundColor: isDark ? '#111122' : '#F8F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: insets.top
      }]}>
        <LoadingSpinner
          fullScreen
          text="Loading bookmarks..."
          colorScheme={colorScheme ?? 'light'}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? '#111122' : '#F8F9FF',
      paddingTop: insets.top
    }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E2E8F0' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.7}
            style={{ marginRight: 4 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Bookmarks ({filteredBookmarks.length})
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/discover')}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={[styles.searchInputContainer, {
            backgroundColor: isDark ? '#1A1A35' : '#EFF4FF'
          }]}>
            <Ionicons
              name="search"
              size={18}
              color={isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(70, 69, 84, 0.6)'}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search saved items..."
              placeholderTextColor={isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(70, 69, 84, 0.6)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor: isActive
                        ? '#6063EE'
                        : isDark
                          ? '#1A1A35'
                          : '#E5EEFF',
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isActive
                          ? '#FFFFFF'
                          : isDark
                            ? '#94A3B8'
                            : '#464554',
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bookmarks List */}
        {filteredBookmarks.length > 0 ? (
          <View style={styles.bookmarksList}>
            {filteredBookmarks.map((item) => {
              let categoryBg = 'rgba(70, 72, 212, 0.1)';
              let categoryColor = '#4648D4';
              const catUpper = item.category.toUpperCase();

              if (catUpper.includes('HEALTH')) {
                categoryBg = 'rgba(0, 106, 97, 0.1)';
                categoryColor = '#006A61';
              } else if (catUpper.includes('BUSINESS')) {
                categoryBg = 'rgba(185, 5, 56, 0.1)';
                categoryColor = '#B90538';
              } else if (catUpper.includes('COMMUNITY') || item.contentType === 'post') {
                categoryBg = 'rgba(255, 159, 10, 0.1)';
                categoryColor = '#FF9F0A';
              }

              if (isDark) {
                if (catUpper.includes('TECH') || catUpper.includes('TECHNOLOGY'))
                  categoryBg = 'rgba(70, 72, 212, 0.25)';
                if (catUpper.includes('HEALTH'))
                  categoryBg = 'rgba(0, 106, 97, 0.25)';
                if (catUpper.includes('BUSINESS'))
                  categoryBg = 'rgba(185, 5, 56, 0.25)';
                if (catUpper.includes('COMMUNITY') || item.contentType === 'post')
                  categoryBg = 'rgba(255, 159, 10, 0.25)';
              }

              return (
                <TouchableOpacity
                  key={`${item.contentType}-${item.id}`}
                  style={[
                    styles.articleCard,
                    {
                      backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                      borderColor: isDark ? '#2E2E48' : '#F0F3FA',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => router.push({
                    pathname: `/news/[id]`,
                    params: { id: item.contentUid, type: item.contentType }
                  })}
                >
                  {item.imageUrl && (
                    <View style={styles.cardImageContainer}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.cardImage}
                        contentFit="cover"
                      />
                    </View>
                  )}

                  <View style={styles.cardInfoContainer}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.categoryRow}>
                        <View style={[styles.contentTypeBadge, {
                          backgroundColor: item.contentType === 'news'
                            ? 'rgba(70, 72, 212, 0.1)'
                            : 'rgba(255, 159, 10, 0.1)'
                        }]}>
                          <Ionicons
                            name={item.contentType === 'news' ? 'newspaper-outline' : 'chatbubble-outline'}
                            size={12}
                            color={item.contentType === 'news' ? '#4648D4' : '#FF9F0A'}
                          />
                        </View>

                        <View style={[styles.categoryBadge, { backgroundColor: categoryBg }]}>
                          <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                            {item.category}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookmarkIconButton}
                        onPress={() => toggleBookmark(item.contentUid, item.contentType)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="bookmark" size={20} color="#4648D4" />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={[styles.articleDesc, {
                      color: isDark ? '#94A3B8' : '#464554'
                    }]} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={isDark ? '#94A3B8' : '#464554'}
                        />
                        <Text style={[styles.metaItemText, {
                          color: isDark ? '#94A3B8' : '#464554'
                        }]}>
                          {item.timeAgo}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="eye-outline"
                          size={14}
                          color={isDark ? '#94A3B8' : '#464554'}
                        />
                        <Text style={[styles.metaItemText, {
                          color: isDark ? '#94A3B8' : '#464554'
                        }]}>
                          {item.reads}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyIconWrapper, {
              backgroundColor: isDark
                ? 'rgba(70, 72, 212, 0.15)'
                : 'rgba(70, 72, 212, 0.08)'
            }]}>
              <Ionicons name="bookmark-outline" size={48} color="#4648D4" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Saved Items
            </Text>
            <Text style={[styles.emptySubtitle, {
              color: isDark ? '#94A3B8' : '#64748B'
            }]}>
              {searchQuery
                ? `No results match "${searchQuery}". Please try another keyword.`
                : 'Tap the bookmark icon on any news or posts to save them here.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins_700Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { padding: 8, borderRadius: 9999 },
  scrollContent: { paddingTop: 12 },
  searchSection: { paddingHorizontal: 20, marginBottom: 20 },
  searchInputContainer: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Poppins_500Medium' },
  filtersWrapper: { marginBottom: 24 },
  filtersScrollContent: { paddingHorizontal: 20, gap: 10 },
  chipButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
  chipText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  bookmarksList: { paddingHorizontal: 20, gap: 24 },
  articleCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: 'rgba(63, 63, 70, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  cardImageContainer: { height: 196.88, width: '100%' },
  cardImage: { width: '100%', height: '100%' },
  cardInfoContainer: { padding: 24 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contentTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.8,
  },
  bookmarkIconButton: { padding: 4 },
  articleTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    lineHeight: 28,
    marginBottom: 8,
  },
  articleDesc: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 22.75,
    marginBottom: 16,
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItemText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  emptyStateContainer: {
    paddingHorizontal: 32,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Poppins_700Bold' },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
});