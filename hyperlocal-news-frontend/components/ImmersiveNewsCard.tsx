import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Alert,
  Animated,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  NewsArticle,
  FeedItem,
} from '@/services/api/news';
import { Advertisement, SponsoredPost } from '@/services/api/content';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import {
  useLike,
  useUnlike,
  useRecordShare,
  useAddBookmark,
  useRemoveBookmark,
} from '@/hooks/useEngagement';
import { useLikePost, useSharePost } from '@/hooks/usePosts';
import { useAuthStore } from '@/store/authStore';
import { formatTimeAgo } from '@/utils/formatters';
import { useRecordView } from '@/hooks/useNews';
import {
  resolveArticleImageUrl,
  resolveAdImageUrl,
  resolveSponsoredImageUrl,
  getCategoryFallbackImage,
  CURATED_FALLBACK_IMAGES,
} from '@/utils/imageResolver';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

interface ImmersiveFeedCardProps {
  item: FeedItem;
  containerHeight: number;
  bookmarkedNewsUids?: Set<string>;
  isBookmarked?: boolean;
  isActive?: boolean;
  onOpenComments?: (uid: string) => void;
  onToggleUI?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// AD CARD
// ═══════════════════════════════════════════════════════════════════════════

const AdCard = React.memo(
  ({
    item,
    containerHeight,
    colors,
    isDark,
  }: {
    item: Advertisement;
    containerHeight: number;
    colors: any;
    isDark: boolean;
  }) => {
    const handleAdClick = () => {
      if (item.redirect_url) {
        WebBrowser.openBrowserAsync(item.redirect_url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    };

    const resolvedAdImg = resolveAdImageUrl(item.image_url);
    const [adImg, setAdImg] = useState(resolvedAdImg);
    useEffect(() => {
      setAdImg(resolvedAdImg);
    }, [resolvedAdImg]);

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { height: containerHeight }]}
        activeOpacity={0.95}
        onPress={handleAdClick}
      >
        <Image
          source={{ uri: adImg }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          onError={() => setAdImg(CURATED_FALLBACK_IMAGES.ad_fallback)}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.adGradient}
        >
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>AD</Text>
          </View>

          <Text style={styles.adTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <TouchableOpacity
            style={[
              styles.adCtaButton,
              {
                backgroundColor:
                  item.priority === 'premium' ? '#F59E0B' : '#6366F1',
              },
            ]}
            onPress={handleAdClick}
            activeOpacity={0.85}
          >
            <Text style={styles.adCtaText}>{item.cta_text}</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SPONSORED CARD
// ═══════════════════════════════════════════════════════════════════════════

const SponsoredCard = React.memo(
  ({
    item,
    containerHeight,
    colors,
    isDark,
    onToggleUI,
  }: {
    item: SponsoredPost;
    containerHeight: number;
    colors: any;
    isDark: boolean;
    onToggleUI?: () => void;
  }) => {
    const handleSponsoredClick = () => {
      if (item.cta_url) {
        WebBrowser.openBrowserAsync(item.cta_url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    };

    const resolvedSponsoredImg = resolveSponsoredImageUrl(item.image_url);
    const [sponsoredImg, setSponsoredImg] = useState(resolvedSponsoredImg);
    useEffect(() => {
      setSponsoredImg(resolvedSponsoredImg);
    }, [resolvedSponsoredImg]);

    return (
      <View
        style={[
          styles.cardContainer,
          { height: containerHeight, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.95}
          onPress={onToggleUI}
        >
          <Image
            source={{ uri: sponsoredImg }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            onError={() => setSponsoredImg(CURATED_FALLBACK_IMAGES.sponsored_fallback)}
          />
          <View style={styles.sponsoredBadge}>
            <MaterialIcons name="campaign" size={12} color="#fff" />
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.contentContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.textWrapper}>
            <Text style={[styles.sponsorName, { color: colors.primary }]}>
              {item.sponsor_name || 'Sponsored'}
            </Text>
            <Text
              style={[styles.headline, { color: colors.text }]}
              numberOfLines={3}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.summaryText, { color: colors.textSecondary }]}
              numberOfLines={5}
            >
              {item.content}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sponsoredCtaButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleSponsoredClick}
            activeOpacity={0.85}
          >
            <Text style={styles.sponsoredCtaText}>{item.cta_text}</Text>
            <Ionicons name="open-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// NEWS CARD
// ═══════════════════════════════════════════════════════════════════════════

const NewsCard = React.memo(
  ({
    item,
    itemType,
    containerHeight,
    isBookmarked,
    isActive = false,
    colors,
    isDark,
    onOpenComments,
    onToggleUI,
  }: {
    item: NewsArticle;
    itemType: 'news' | 'post';
    containerHeight: number;
    isBookmarked: boolean;
    isActive?: boolean;
    colors: any;
    isDark: boolean;
    onOpenComments?: (uid: string) => void;
    onToggleUI?: () => void;
  }) => {
    const { user } = useAuthStore();

    const contentUid = item.news_uid || (item as any).post_uid || (item as any).id;

    const { mutate: like } = useLike();
    const { mutate: unlike } = useUnlike();
    const { mutate: togglePostLike } = useLikePost();
    const { mutate: sharePostMutation } = useSharePost();
    const { mutate: addBookmark } = useAddBookmark();
    const { mutate: removeBookmark } = useRemoveBookmark();
    const { mutate: recordShare } = useRecordShare();
    const { mutate: recordView } = useRecordView();

    // Local optimistic like state
    const [liked, setLiked] = React.useState(false);
    const [likeCount, setLikeCount] = React.useState(item.likes ?? 0);

    // Micro-animation spring values
    const likeScale = useRef(new Animated.Value(1)).current;
    const bookmarkScale = useRef(new Animated.Value(1)).current;

    const triggerSpring = (anim: Animated.Value, peak = 1.35) => {
      Animated.sequence([
        Animated.spring(anim, { toValue: peak, speed: 50, bounciness: 12, useNativeDriver: true }),
        Animated.spring(anim, { toValue: 1, speed: 40, bounciness: 8, useNativeDriver: true }),
      ]).start();
    };

    const hasRecordedViewRef = React.useRef(false);

    React.useEffect(() => {
      // Record view only when the card is actively in view (lazy view recording)
      if (isActive && contentUid && itemType === 'news' && !hasRecordedViewRef.current) {
        hasRecordedViewRef.current = true;
        recordView(contentUid);
      }
    }, [isActive, contentUid, itemType, recordView]);

    const handleToggleLike = () => {
      if (!contentUid) return;
      const nextLiked = !liked;
      setLiked(nextLiked);
      setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));
      triggerSpring(likeScale, 1.4);

      if (itemType === 'post') {
        togglePostLike(contentUid, {
          onError: () => {
            setLiked(!nextLiked);
            setLikeCount((c) => (!nextLiked ? c + 1 : Math.max(0, c - 1)));
          },
        });
      } else {
        if (nextLiked) {
          like(contentUid, {
            onError: () => {
              setLiked(false);
              setLikeCount((c) => Math.max(0, c - 1));
            },
          });
        } else {
          unlike(contentUid, {
            onError: () => {
              setLiked(true);
              setLikeCount((c) => c + 1);
            },
          });
        }
      }
    };

    const handleToggleBookmark = () => {
      if (!contentUid) return;
      triggerSpring(bookmarkScale, 1.35);
      if (isBookmarked) {
        removeBookmark({ contentUid, contentType: itemType });
      } else {
        addBookmark({ contentUid, contentType: itemType });
      }
    };

    const handleShare = async () => {
      try {
        if (contentUid) {
          if (itemType === 'post') {
            sharePostMutation({ postUid: contentUid, platform: 'native' });
          } else {
            recordShare({ newsUid: contentUid, platform: 'general' });
          }
        }
        await Share.share({
          message: `${displayTitle}\n\n${displaySummary}\n\nShared via HyperLocal`,
          title: displayTitle,
        });
      } catch (_) { }
    };


    const categoryName = item.category_names?.[0] || (itemType === 'post' ? 'Community' : 'News');
    const displayTitle = item.title || (item as any).content || 'Community Post';
    const displaySummary = item.summary || ((item as any).content && (item as any).content !== displayTitle ? (item as any).content : '') || '';
    const rawImage = item.image_url || (item as any).images?.[0]?.image_url || (item as any).imageUrl;

    const resolvedImage = useMemo(() => {
      return resolveArticleImageUrl({
        imageUrl: rawImage,
        categoryNames: item.category_names,
        categoryName,
        title: displayTitle,
        isBreaking: item.is_breaking,
        itemType,
      });
    }, [rawImage, item.category_names, categoryName, displayTitle, item.is_breaking, itemType]);

    const [imgSrc, setImgSrc] = useState(resolvedImage);
    useEffect(() => {
      setImgSrc(resolvedImage);
    }, [resolvedImage]);

    const displaySource = item.source_name || item.source || (item as any).user_display_name || (item as any).user_name || 'HyperLocal';

    const hasSourceLink = Boolean(item.source_url);
    const actionIconColor = isDark ? '#A5B4FC' : '#464554';
    const actionBg = isDark ? 'rgba(24, 23, 54, 0.88)' : '#E5EEFF';
    const actionBorder = isDark ? { borderWidth: 1, borderColor: colors.border } : {};

    // Source link: show if there's a source URL or at least a source name (use Google search as fallback)
    const hasSource = Boolean(item.source_url || item.source_name || item.source);
    const handleOpenSource = () => {
      if (item.source_url) {
        WebBrowser.openBrowserAsync(item.source_url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      } else {
        // Fallback: search Google for source + title
        const query = encodeURIComponent(`${item.source_name || item.source || ''} ${displayTitle}`);
        WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${query}`, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    };

    const handleMoreOptions = () => {
      const options = [];
      if (hasSource) {
        options.push({
          text: 'Open Source Website',
          onPress: handleOpenSource,
        });
      }
      options.push({
        text: 'Share Article',
        onPress: handleShare,
      });
      options.push({
        text: 'Cancel',
        style: 'cancel' as const,
      });
      Alert.alert(
        displayTitle || 'Options',
        'Choose an action',
        options
      );
    };

    return (
      <View
        style={[
          styles.cardContainer,
          { height: containerHeight, backgroundColor: colors.background },
        ]}
      >
        {/* Top 46% Image — tapping toggles header and footer */}
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.95}
          onPress={onToggleUI}
        >
          <Image
            source={{ uri: imgSrc }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            cachePolicy="disk"
            recyclingKey={imgSrc}
            priority={isActive ? 'high' : 'normal'}
            onError={() => {
              const fallback = getCategoryFallbackImage(categoryName, item.is_breaking);
              if (imgSrc !== fallback) {
                setImgSrc(fallback);
              }
            }}
          />

          {/* Category tag */}
          <View style={[styles.categoryTag, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>

          {/* Breaking badge */}
          {item.is_breaking && (
            <View style={styles.breakingBadge}>
              <View style={styles.breakingDot} />
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
          )}
        </TouchableOpacity>

          {/* Bottom 56% Content */}
          <View
            style={[
              styles.contentContainer,
              { backgroundColor: colors.background },
            ]}
          >
            {/* Headline + summary — tapping toggles header/footer without redirecting */}
            <TouchableOpacity
              style={styles.textWrapper}
              activeOpacity={0.95}
              onPress={onToggleUI}
            >
              <Text
                style={[styles.headline, { color: colors.text }]}
                numberOfLines={3}
              >
                {displayTitle}
              </Text>
              <Text
                style={[styles.summaryText, { color: colors.textSecondary }]}
                numberOfLines={6}
              >
                {displaySummary}
              </Text>
            </TouchableOpacity>

            {/* Footer — no navigation, only source link + action buttons */}
            <View style={styles.footerWrapper}>

              {/* Source link — always visible if article has a source */}
              {hasSource && (
                <TouchableOpacity
                  style={[
                    styles.sourceLink,
                    {
                      backgroundColor: isDark ? 'rgba(24, 23, 54, 0.85)' : '#F1F5F9',
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={handleOpenSource}
                  activeOpacity={0.8}
                >
                  <Ionicons name="link-outline" size={13} color={colors.primary} />
                  <Text
                    style={[styles.sourceLinkText, { color: isDark ? '#A5B4FC' : colors.primary }]}
                    numberOfLines={1}
                  >
                    {item.source_name || item.source || item.source_url}
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={13}
                    color={isDark ? '#A5B4FC' : colors.primary}
                  />
                </TouchableOpacity>
              )}

              <View
                style={[styles.divider, { backgroundColor: colors.divider }]}
              />

              <View style={styles.footerRow}>
                {/* Source & time */}
                <View style={styles.metaContainer}>
                  <Ionicons
                    name="globe-outline"
                    size={14}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.sourceText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.source_name || item.source || 'HyperLocal'}
                  </Text>
                  <Text style={[styles.dotSep, { color: colors.textTertiary }]}>
                    ·
                  </Text>
                  <Text
                    style={[styles.timeText, { color: colors.textTertiary }]}
                  >
                    {formatTimeAgo(item.created_at)}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {/* Views */}
                  <View style={styles.actionBtnWrapper}>
                    <View style={[styles.actionBtn, { backgroundColor: actionBg }, actionBorder]}>
                      <Ionicons name="eye-outline" size={16} color={actionIconColor} />
                    </View>
                    <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                      {item.engagement?.total_views ?? item.views ?? 0}
                    </Text>
                  </View>

                  {/* Comment */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={() => contentUid && onOpenComments?.(contentUid)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionBtn, { backgroundColor: actionBg }, actionBorder]}>
                      <Ionicons name="chatbubble-outline" size={16} color={actionIconColor} />
                    </View>
                    <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                      {item.engagement?.total_comments ?? item.comments ?? 0}
                    </Text>
                  </TouchableOpacity>

                  {/* Like */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleToggleLike}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[{ transform: [{ scale: likeScale }] }]}>
                      <View style={[styles.actionBtn, { backgroundColor: actionBg }, actionBorder]}>
                        <Ionicons
                          name={liked ? 'heart' : 'heart-outline'}
                          size={16}
                          color={liked ? '#EF4444' : actionIconColor}
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Share */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleShare}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionBtn, { backgroundColor: actionBg }, actionBorder]}>
                      <Ionicons
                        name="share-social-outline"
                        size={16}
                        color={actionIconColor}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Bookmark */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleToggleBookmark}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[{ transform: [{ scale: bookmarkScale }] }]}>
                      <View style={[styles.actionBtn, { backgroundColor: actionBg }, actionBorder]}>
                        <Ionicons
                          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                          size={16}
                          color={isBookmarked ? '#FFAC33' : actionIconColor}
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
    );
  },
  (prev, next) =>
    prev.containerHeight === next.containerHeight &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isActive === next.isActive &&
    prev.isDark === next.isDark &&
    prev.onToggleUI === next.onToggleUI &&
    (prev.item.news_uid || (prev.item as any).post_uid || (prev.item as any).id) ===
      (next.item.news_uid || (next.item as any).post_uid || (next.item as any).id)
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT - Routes to correct card based on type
// ═══════════════════════════════════════════════════════════════════════════

export const ImmersiveFeedCard = React.memo(
  ({
    item,
    containerHeight,
    bookmarkedNewsUids,
    isBookmarked: explicitIsBookmarked,
    isActive = false,
    onOpenComments,
    onToggleUI,
  }: ImmersiveFeedCardProps) => {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    if (item.type === 'ad') {
      return (
        <AdCard
          item={item.data as Advertisement}
          containerHeight={containerHeight}
          colors={colors}
          isDark={isDark}
        />
      );
    }

    if (item.type === 'sponsored') {
      return (
        <SponsoredCard
          item={item.data as SponsoredPost}
          containerHeight={containerHeight}
          colors={colors}
          isDark={isDark}
          onToggleUI={onToggleUI}
        />
      );
    }

    const newsItem = item.data as NewsArticle;
    const itemUid = newsItem.news_uid || (newsItem as any).post_uid || (newsItem as any).id;
    const isBookmarked =
      explicitIsBookmarked !== undefined
        ? explicitIsBookmarked
        : bookmarkedNewsUids
          ? bookmarkedNewsUids.has(String(itemUid))
          : false;

    return (
      <NewsCard
        item={newsItem}
        itemType={item.type === 'post' ? 'post' : 'news'}
        containerHeight={containerHeight}
        isBookmarked={isBookmarked}
        isActive={isActive}
        colors={colors}
        isDark={isDark}
        onOpenComments={onOpenComments}
        onToggleUI={onToggleUI}
      />
    );
  },
  (prev, next) =>
    prev.containerHeight === next.containerHeight &&
    prev.isActive === next.isActive &&
    prev.isBookmarked === next.isBookmarked &&
    prev.bookmarkedNewsUids === next.bookmarkedNewsUids &&
    prev.item.position === next.item.position &&
    prev.onToggleUI === next.onToggleUI &&
    ((prev.item.data as any)?.news_uid || (prev.item.data as any)?.post_uid || (prev.item.data as any)?.id) ===
      ((next.item.data as any)?.news_uid || (next.item.data as any)?.post_uid || (next.item.data as any)?.id)
);

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: '46%',
    position: 'relative',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // ── Ad ──────────────────────────────────────────────────────────────────
  adGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    justifyContent: 'flex-end',
    padding: 24,
    gap: 12,
  },
  adBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  adBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.5,
  },
  adTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 30,
  },
  adCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  adCtaText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── Sponsored ───────────────────────────────────────────────────────────
  sponsoredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sponsoredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  sponsorName: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sponsoredCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  sponsoredCtaText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── News ────────────────────────────────────────────────────────────────
  categoryTag: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  breakingBadge: {
    position: 'absolute',
    top: 36,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  breakingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  breakingText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
  },
  contentContainer: {
    height: '54%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  textWrapper: {
    flex: 1,
  },
  headline: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 10,
    lineHeight: 28,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
  },
  footerWrapper: {
    marginTop: 'auto',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  sourceLinkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sourceText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    maxWidth: 100,
  },
  dotSep: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  }
});