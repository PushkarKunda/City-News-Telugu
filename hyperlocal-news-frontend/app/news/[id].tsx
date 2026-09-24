import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/Spacing';
import { useNewsArticle, useNewsEngagement, useLikeArticle, useUnlikeArticle, useRecordView, useRecordShare, useNewsComments } from '@/hooks/useNews';
import { usePostByUid, useLikePost, useSharePost } from '@/hooks/usePosts';
import { useCheckBookmark, useAddBookmark, useRemoveBookmark } from '@/hooks/useEngagement';
import { useQuery } from '@tanstack/react-query';
import { contentApi, Advertisement } from '@/services/api/content';
import { formatDate } from '@/utils/formatters';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import * as WebBrowser from 'expo-web-browser';
import { Share } from 'react-native';
import {
  resolveArticleImageUrl,
  resolveAdImageUrl,
  getCategoryFallbackImage,
  CURATED_FALLBACK_IMAGES,
} from '@/utils/imageResolver';

// Ad Card Component for injecting inside the article
const AdCard = ({ ad, colors }: { ad: Advertisement; colors: any }) => {
  const [adImg, setAdImg] = useState(() => resolveAdImageUrl(ad.image_url));
  useEffect(() => {
    setAdImg(resolveAdImageUrl(ad.image_url));
  }, [ad.image_url]);

  return (
    <View style={[styles.adCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.adDisclaimer, { color: colors.textTertiary }]}>Sponsored</Text>
      <Image
        source={{ uri: adImg }}
        style={styles.adImage}
        contentFit="cover"
        onError={() => setAdImg(CURATED_FALLBACK_IMAGES.ad_fallback)}
      />
      <View style={styles.adContent}>
        <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={2}>{ad.title}</Text>
        {ad.redirect_url ? (
          <TouchableOpacity style={[styles.adCtaButton, { backgroundColor: colors.primary }]} onPress={() => WebBrowser.openBrowserAsync(ad.redirect_url!)}>
            <Text style={styles.adCtaText}>Learn More</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default function NewsDetailScreen() {
  const { id, type } = useLocalSearchParams();
  const contentType = (type as 'news' | 'post') || 'news';
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const isPostType = contentType === 'post';

  // Load article or post dynamically based on contentType
  const { data: newsArticleData, isLoading: isLoadingNews } = useNewsArticle(!isPostType ? (id as string) : null);
  const { data: postData, isLoading: isLoadingPost } = usePostByUid(isPostType ? (id as string) : null);

  const isLoading = isPostType ? isLoadingPost : isLoadingNews;

  const article = useMemo(() => {
    if (isPostType && postData) {
      const p = postData as any;
      return {
        news_uid: p.post_uid,
        title: p.title || (p.content ? (p.content.length > 80 ? p.content.substring(0, 80) + '...' : p.content) : 'Community Post'),
        summary: p.content || '',
        image_url: p.image_url || p.images?.[0]?.image_url || undefined,
        created_at: p.created_at,
        views: p.views || 0,
        likes: p.like_count || p.likes || 0,
        comments: p.comment_count || p.comments || 0,
        shares: p.share_count || p.shares || 0,
        is_breaking: false,
        category_names: ['Community'],
        location: { district: p.location?.district || '' },
        source: p.user_display_name || p.user_name || 'Community Member',
      };
    }
    return newsArticleData;
  }, [isPostType, newsArticleData, postData]);
  const { data: engagement } = useNewsEngagement(id as string);
  const { data: bookmarkCheck } = useCheckBookmark(id as string, contentType);
  const { data: comments } = useNewsComments(id as string);

  // Fetch Ads
  const { data: ads = [] } = useQuery({
    queryKey: ['active-ads', 'detail'],
    queryFn: () => contentApi.getActiveAdvertisements(),
  });

  // Engagement Mutations
  const { mutate: recordView } = useRecordView();
  const { mutate: likeArticle } = useLikeArticle();
  const { mutate: unlikeArticle } = useUnlikeArticle();
  const { mutate: togglePostLike } = useLikePost();
  const { mutate: sharePostMutation } = useSharePost();
  const { mutate: addBookmark } = useAddBookmark();
  const { mutate: removeBookmark } = useRemoveBookmark();
  const { mutate: recordShare } = useRecordShare();

  const [isLiked, setIsLiked] = useState(false);

  // Record view on mount
  useEffect(() => {
    if (id && !isPostType) {
      recordView(id as string);
    }
  }, [id, isPostType]);

  const handleToggleLike = () => {
    if (!id) return;
    if (isPostType) {
      togglePostLike(id as string, { onSettled: () => setIsLiked(!isLiked) });
    } else {
      if (isLiked) {
        unlikeArticle(id as string, { onSettled: () => setIsLiked(false) });
      } else {
        likeArticle(id as string, { onSettled: () => setIsLiked(true) });
      }
    }
  };

  const handleToggleBookmark = () => {
    if (!id) return;
    if (bookmarkCheck?.is_bookmarked) {
      removeBookmark({ contentUid: id as string, contentType });
    } else {
      addBookmark({ contentUid: id as string, contentType });
    }
  };

  const handleShare = async () => {
    if (!id) return;
    if (isPostType) {
      sharePostMutation({ postUid: id as string, platform: 'native' });
    } else {
      recordShare({ uid: id as string, platform: 'general' });
    }
    try {
      await Share.share({
        message: `${article?.title || article?.summary || ''}\n\nShared via HyperLocal`,
        title: article?.title || 'HyperLocal Story',
      });
    } catch (_) {}
  };

  const handleOpenSource = () => {
    if (article?.source) {
      // Since the API doesn't return a source URL, we search Google for the source and title
      const query = encodeURIComponent(`${article.source} ${article.title}`);
      WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <LoadingSpinner fullScreen text="Loading story details..." colorScheme={colorScheme ?? 'light'} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', fontSize: 16 }}>Article not found</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          style={styles.backButton}
        >
          <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryName = article.category_names?.[0] || 'News';
  const adToInject = ads.length > 0 ? ads[0] : null;

  const resolvedHeroImage = useMemo(() => {
    return resolveArticleImageUrl({
      imageUrl: article.image_url,
      categoryNames: article.category_names,
      categoryName,
      title: article.title,
      isBreaking: article.is_breaking,
      itemType: contentType,
    });
  }, [article.image_url, article.category_names, categoryName, article.title, article.is_breaking, contentType]);

  const [heroImageUri, setHeroImageUri] = useState<string>(resolvedHeroImage);
  useEffect(() => {
    setHeroImageUri(resolvedHeroImage);
  }, [resolvedHeroImage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Immersive Top Bar */}
      <View style={[styles.topBar, { top: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.circularButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blur}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.circularButton} onPress={handleShare}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blur}>
              <Feather name="share" size={20} color="#FFF" />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circularButton, { marginLeft: Spacing.sm }]} onPress={handleToggleBookmark}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blur}>
              <MaterialIcons name={bookmarkCheck?.is_bookmarked ? "bookmark" : "bookmark-border"} size={24} color="#FFF" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Immersive Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            contentFit="cover"
            transition={500}
            cachePolicy="disk"
            onError={() => {
              const fallback = getCategoryFallbackImage(categoryName, article.is_breaking);
              if (heroImageUri !== fallback) {
                setHeroImageUri(fallback);
              }
            }}
          />
          <LinearGradient
            colors={['transparent', colors.surface]}
            style={styles.heroGradient}
          />
        </View>

        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          {/* Metadata Row */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{categoryName}</Text>
            </View>
          </View>

          {/* Premium Headline */}
          <Text style={[styles.headline, { color: colors.text }]}>
            {article.title}
          </Text>

          {/* Refined Byline */}
          <View style={[styles.byline, { borderBottomColor: colors.divider }]}>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {article.source || 'Editorial Team'}
              </Text>
              <Text style={[styles.publishedDate, { color: colors.textSecondary }]}>
                {formatDate(article.created_at)}
              </Text>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            <Text style={[styles.leadIn, { color: colors.text }]}>
              {article.summary}
            </Text>

            {/* Injected Full-Screen Ad Placeholder */}
            {adToInject && (
              <View style={{ marginVertical: Spacing.lg }}>
                <AdCard ad={adToInject} colors={colors} />
              </View>
            )}

            {/* Note: The current API only returns summary. If backend adds content, map it here. No dummy data. */}
          </View>

          {/* Source URL Footer */}
          <TouchableOpacity style={[styles.sourceFooter, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleOpenSource}>
            <Ionicons name="globe-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sourceFooterText, { color: colors.primary }]}>
              Read full story at {article.source || 'Source'}
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Bottom Engagement Bar */}
      <View style={[styles.engagementBar, { backgroundColor: colors.surfaceGlass, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
        {/* <TouchableOpacity style={styles.engagementItem} onPress={handleToggleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#EF4444" : colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>{engagement?.total_likes || article.likes || 0}</Text>
        </TouchableOpacity> */}

        {/* <TouchableOpacity style={styles.engagementItem} onPress={() => {}}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>{engagement?.total_comments || article.comments || 0}</Text>
        </TouchableOpacity> */}

        {/* <TouchableOpacity style={styles.engagementItem} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>{engagement?.total_shares || 0}</Text>
        </TouchableOpacity> */}

        {/* Likes */}
        <View style={styles.engagementItem}>
          <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
            {engagement?.likes || engagement?.total_likes || article?.likes || 0}
          </Text>
        </View>

        {/* Comments */}
        <View style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
            {engagement?.comments || engagement?.total_comments || article?.comments || 0}
          </Text>
        </View>

        {/* Shares */}
        <View style={styles.engagementItem}>
          <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
            {engagement?.shares || engagement?.total_shares || article?.shares || 0}
          </Text>
        </View>

        <TouchableOpacity style={styles.engagementItem} onPress={handleToggleBookmark}>
          <Ionicons name={bookmarkCheck?.is_bookmarked ? "bookmark" : "bookmark-outline"} size={24} color={bookmarkCheck?.is_bookmarked ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
  },
  heroContainer: {
    width: '100%',
    height: 420,
  },
  heroImage: {
    flex: 1,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    backgroundColor: 'inherit',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingTop: Spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: Spacing.sm,
  },
  readTime: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  headline: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 36,
    marginBottom: Spacing.xl,
    letterSpacing: -0.5,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.xl,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  publishedDate: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  followBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  articleBody: {
    marginTop: Spacing.sm,
  },
  leadIn: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 28,
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  bodyText: {
    fontSize: 17,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 28,
    letterSpacing: 0.3,
    marginBottom: Spacing.lg,
  },
  backButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  adCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adDisclaimer: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  adImage: {
    width: '100%',
    height: 200,
  },
  adContent: {
    padding: 16,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 12,
    lineHeight: 22,
  },
  adCtaButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  adCtaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  sourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceFooterText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  engagementBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    zIndex: 50,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
});