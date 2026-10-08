import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Animated,
  Linking,
  Platform,
  Clipboard,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppAlert } from '@/components/AppAlert';
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
import { useShallow } from 'zustand/react/shallow';
import { formatTimeAgo, calculateTeluguReadTime, getArticleTimestamp } from '@/utils/formatters';
import { useRecordView } from '@/hooks/useNews';
import { useReaderFontStore } from '@/store/readerFontStore';
import { useCommentCountStore } from '@/store/commentCountStore';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { PollCard } from './PollCard';
import { SwipeHint } from './SwipeHint';
import { TELUGU_FONT_STACK } from '@/constants/Typography';
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
        delayPressIn={80}
        onPress={handleAdClick}
      >
        <Image
          source={{ uri: adImg, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          onError={() => setAdImg(adImg === resolvedAdImg && item.original_image_url && item.original_image_url !== adImg
            ? item.original_image_url : CURATED_FALLBACK_IMAGES.ad_fallback)}
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

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isNarrow = screenWidth < 400;
    const isShortScreen = screenHeight < 700 || containerHeight < 700;
    const sidePadding = isNarrow ? 16 : 20;
    const imageHeight = Math.round(containerHeight * (isShortScreen ? 0.35 : 0.42));

    return (
      <View
        style={[
          styles.cardContainer,
          { height: containerHeight, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[styles.imageContainer, { height: imageHeight }]}
          activeOpacity={0.95}
          delayPressIn={80}
          onPress={onToggleUI}
        >
          <Image
            source={{ uri: sponsoredImg, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            onError={() => setSponsoredImg(sponsoredImg === resolvedSponsoredImg && item.original_image_url && item.original_image_url !== sponsoredImg
              ? item.original_image_url : CURATED_FALLBACK_IMAGES.sponsored_fallback)}
          />
          <View style={styles.sponsoredBadge}>
            <MaterialIcons name="campaign" size={12} color="#fff" />
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.contentContainer,
            {
              backgroundColor: colors.background,
              paddingHorizontal: sidePadding,
              paddingTop: isShortScreen ? 12 : 16,
              paddingBottom: Math.max(insets.bottom, 10) + (isShortScreen ? 4 : 8),
            },
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
    commentCount: propCommentCount,
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
    commentCount?: number;
    onOpenComments?: (uid: string) => void;
    onToggleUI?: () => void;
  }) => {
    const { alert, AlertComponent } = useAppAlert();
    const {
      fontSizeLevel,
      headlineSize,
      bodySize,
      headlineLineHeight,
      bodyLineHeight,
      openModal,
    } = useReaderFontStore(
      useShallow((s) => ({
        fontSizeLevel: s.fontSizeLevel,
        headlineSize: s.headlineSize,
        bodySize: s.bodySize,
        headlineLineHeight: s.headlineLineHeight,
        bodyLineHeight: s.bodyLineHeight,
        openModal: s.openModal,
      }))
    );

    const contentUid = item.news_uid || (item as any).post_uid || (item as any).id;

    const { mutate: like } = useLike();
    const { mutate: unlike } = useUnlike();
    const { mutate: togglePostLike } = useLikePost();
    const { mutate: sharePostMutation } = useSharePost();
    const { mutate: addBookmark } = useAddBookmark();
    const { mutate: removeBookmark } = useRemoveBookmark();
    const { mutate: recordShare } = useRecordShare();
    const { mutate: recordView } = useRecordView();

    // Start from the server-provided state so a refresh does not make an
    // already-liked story appear unliked.
    const serverLiked = Boolean(
      (item as any).user_liked ??
      (item as any).is_liked ??
      item.engagement?.user_liked
    );
    const [liked, setLiked] = React.useState(serverLiked);
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
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
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
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
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
        const newsLink = item.source_url || (contentUid ? `https://citynewstelugu.com/news/${contentUid}` : '');
        const shareMsg = [
          displayTitle,
          displaySummary,
          newsLink,
          'Shared via City News Telugu',
        ].filter(Boolean).join('\n\n');

        await Share.share({
          message: shareMsg,
          title: displayTitle,
          url: newsLink || undefined,
        });
      } catch (_) { }
    };

    const handleCopyLink = () => {
      const link = item.source_url || (contentUid ? `https://citynewstelugu.com/news/${contentUid}` : '');
      if (!link) {
        alert('No link', 'This story does not have a link to copy yet.');
        return;
      }
      Clipboard.setString(link);
      if (contentUid) {
        if (itemType === 'post') {
          sharePostMutation({ postUid: contentUid, platform: 'copy_link' });
        } else {
          recordShare({ newsUid: contentUid, platform: 'copy_link' });
        }
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      alert('Link copied', 'The story link is on your clipboard.');
    };

    const handleWhatsAppShare = async () => {
      try {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (contentUid) {
          if (itemType === 'post') {
            sharePostMutation({ postUid: contentUid, platform: 'whatsapp' });
          } else {
            recordShare({ newsUid: contentUid, platform: 'whatsapp' });
          }
        }
        const link = item.source_url || (contentUid ? `https://citynewstelugu.com/news/${contentUid}` : '');
        const message = [displayTitle, displaySummary, link, 'Shared via City News Telugu']
          .filter(Boolean)
          .join('\n\n');
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Share.share({ message, title: displayTitle });
        }
      } catch (_) {
        handleShare();
      }
    };

    const handleWhatsAppStatusShare = async () => {
      try {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        if (contentUid) {
          if (itemType === 'post') {
            sharePostMutation({ postUid: contentUid, platform: 'whatsapp_status' });
          } else {
            recordShare({ newsUid: contentUid, platform: 'whatsapp_status' });
          }
        }

        const newsLink = item.source_url || (contentUid ? `https://citynewstelugu.com/news/${contentUid}` : '');
        const statusMessage = `⚡ *ముఖ్యాంశాలు* (Key Highlights)\n\n📌 *${displayTitle}*\n\n${displaySummary}\n\n📱 *సిటీ న్యూస్ తెలుగు* (City News Telugu)\n👉 మరిన్ని తాజా వివరాలు: ${newsLink}\n\n#CityNewsTelugu #TeluguNews`.trim();

        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(statusMessage)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);

        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Share.share({
            message: statusMessage,
            title: displayTitle,
          });
        }
      } catch (_) {
        handleShare();
      }
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

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const isUnder360 = screenWidth < 360;
    const isNarrow = screenWidth < 400;
    const isShortScreen = screenHeight < 700 || containerHeight < 700;
    const sidePadding = isNarrow ? 16 : 20;

    // Hero image scales: ~35% on short screens (<700px), ~42% on standard screens
    const imageHeight = Math.round(containerHeight * (isShortScreen ? 0.35 : 0.42));

    // Telugu breathing room: ~1.65 for headline, ~1.75 for description
    const adjustedHeadlineSize = isUnder360 ? Math.max(18, headlineSize - 2) : headlineSize;
    const adjustedHeadlineLineHeight = Math.max(
      headlineLineHeight,
      Math.round(adjustedHeadlineSize * (isUnder360 ? 1.6 : 1.65))
    );
    const headlineLines = isShortScreen ? 2 : (fontSizeLevel === 'xlarge' ? 2 : 3);

    const adjustedBodySize = isUnder360 ? Math.max(13, bodySize - 2) : bodySize;
    const adjustedBodyLineHeight = Math.max(
      bodyLineHeight,
      Math.round(adjustedBodySize * (isUnder360 ? 1.7 : 1.75))
    );
    const summaryLines = isShortScreen
      ? (fontSizeLevel === 'xlarge' ? 3 : 4)
      : (fontSizeLevel === 'xlarge' ? 3 : (fontSizeLevel === 'large' ? 4 : 5));

    // Estimated read time (~150 words/min for Telugu, min 1 min)
    const readTimeContent = (item as any).full_content || (item as any).content || `${displayTitle} ${displaySummary}`;
    const readTime = useMemo(() => calculateTeluguReadTime(readTimeContent), [readTimeContent]);

    // View count formatting: compact numbers (63K, 1.2M) under 360px or > 5 digits. Add "views" only if there is room.
    const rawViews = item.engagement?.total_views ?? item.views ?? 0;
    const numViews = typeof rawViews === 'number' ? rawViews : parseInt(String(rawViews).replace(/,/g, ''), 10) || 0;
    const hasViews = numViews > 0;
    const formatViewsCount = (count: number, isSmall: boolean): string => {
      let countStr: string;
      if (count >= 1000000) {
        countStr = (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      } else if (isSmall || count >= 100000) {
        if (count >= 1000) {
          countStr = (count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
        } else {
          countStr = count.toString();
        }
      } else {
        countStr = count.toLocaleString();
      }

      // Add the "views" word only if there is room (screen >= 360px)
      return isSmall ? countStr : `${countStr} views`;
    };
    const formattedViews = formatViewsCount(numViews, isUnder360);

    // Relative time label placed directly above the bookmark button
    // Calculated strictly from the article's published timestamp (published_at, pubDate, created_at, etc.)
    const articleTimestamp = getArticleTimestamp(item);
    const relativeTime = useRelativeTime(articleTimestamp, { isActive });
    const timeLabelContent = useMemo(() => {
      // If timestamp is missing or invalid, hide the time label completely (no gap, no NaN)
      if (!relativeTime) return '';
      // On screens under 360px, show only relativeTime (e.g. 2m ago) directly above bookmark button
      if (isUnder360 || !readTime) return relativeTime;
      // On screens >= 360px where it fits on one line:
      return `${relativeTime} · ${readTime}`;
    }, [relativeTime, readTime, isUnder360]);

    // Action buttons sizing & touch targets (smaller buttons on screens under 360px)
    const btnSize = isUnder360 ? 36 : (isNarrow ? 40 : 44);
    const iconSize = isUnder360 ? 17 : 20;
    const actionGap = isUnder360 ? 6 : 8;
    const hitSlopValue = { top: 6, bottom: 6, left: 4, right: 4 };

    const liveCommentCount = useCommentCountStore((s) => (contentUid ? s.counts[contentUid] : undefined));
    const effectiveCommentCount = propCommentCount !== undefined
      ? propCommentCount
      : (liveCommentCount !== undefined
          ? liveCommentCount
          : (item.engagement?.total_comments ?? item.comments ?? 0));

    useEffect(() => {
      if (contentUid) {
        const initial = item.engagement?.total_comments ?? item.comments;
        if (typeof initial === 'number') {
          useCommentCountStore.getState().setInitialCount(contentUid, initial);
        }
      }
    }, [contentUid, item.engagement?.total_comments, item.comments]);

    const showCommentCount =
      !isUnder360 &&
      (!isNarrow ||
        (typeof effectiveCommentCount === 'number'
          ? effectiveCommentCount > 0
          : Boolean(effectiveCommentCount && effectiveCommentCount !== '0')));

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
      options.push({
        text: 'Text Size Settings (Aa)',
        onPress: () => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openModal();
        },
      });
      options.push({
        text: 'Share on WhatsApp',
        onPress: handleWhatsAppShare,
      });
      options.push({
        text: 'Share to WhatsApp Status (ముఖ్యాంశాలు)',
        onPress: handleWhatsAppStatusShare,
      });
      options.push({
        text: 'Copy link',
        onPress: handleCopyLink,
      });
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
      alert(
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
        {/* Top Hero Image — scales responsively with screen height */}
        <TouchableWithoutFeedback onPress={onToggleUI}>
          <View style={[styles.imageContainer, { height: imageHeight }]}>
            <Image
              source={{ uri: imgSrc, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
              style={styles.image}
              contentFit="cover"
              transition={150}
              cachePolicy="disk"
              recyclingKey={imgSrc}
              priority={isActive ? 'high' : 'normal'}
              onError={() => {
                if (imgSrc === resolvedImage && item.original_image_url && item.original_image_url !== imgSrc) {
                  setImgSrc(item.original_image_url);
                  return;
                }
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

            {/* Aa Font Size Control button */}
            <TouchableOpacity
              style={[
                styles.fontToggleBtn,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.92)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.1)',
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openModal();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
              accessibilityLabel="Text size settings"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.fontToggleText,
                  { color: fontSizeLevel !== 'medium' ? colors.primary : colors.text },
                ]}
              >
                {fontSizeLevel === 'small' ? 'A-' : fontSizeLevel === 'large' ? 'A+' : fontSizeLevel === 'xlarge' ? 'XL' : 'Aa'}
              </Text>
            </TouchableOpacity>

            {/* Breaking badge */}
            {item.is_breaking && (
              <View
                style={[
                  styles.breakingBadge,
                  { top: Math.max(insets.top + 6, 20) },
                ]}
              >
                <View style={styles.breakingDot} />
                <Text style={styles.breakingText}>BREAKING</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Content Container (flex: 1, pinned footer) */}
        <View
          style={[
            styles.contentContainer,
            {
              backgroundColor: colors.background,
              paddingHorizontal: sidePadding,
              paddingTop: isShortScreen ? 12 : 16,
              paddingBottom: (insets.bottom || 0) + (isShortScreen ? 10 : 12),
            },
          ]}
        >
          {/* Middle Text Area: flex: 1, minHeight: 0, overflow: hidden */}
          <TouchableWithoutFeedback onPress={onToggleUI}>
            <View style={styles.textWrapper}>
              <TouchableOpacity
                onPress={hasSource ? handleOpenSource : onToggleUI}
                activeOpacity={hasSource ? 0.75 : 1}
                accessibilityRole={hasSource ? 'link' : undefined}
                accessibilityLabel={displayTitle}
              >
                <Text
                  style={[
                    styles.headline,
                    {
                      color: colors.text,
                      fontSize: adjustedHeadlineSize,
                      lineHeight: adjustedHeadlineLineHeight,
                      marginBottom: isShortScreen ? 6 : 8,
                    },
                  ]}
                  numberOfLines={headlineLines}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.25}
                >
                  {displayTitle}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.summaryText,
                  {
                    color: colors.textSecondary,
                    fontSize: adjustedBodySize,
                    lineHeight: adjustedBodyLineHeight,
                  },
                ]}
                numberOfLines={summaryLines}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.25}
              >
                {displaySummary}
              </Text>
            </View>
          </TouchableWithoutFeedback>

          {/* First Launch Animated Swipe Hint - positioned cleanly above footer text and buttons */}
          {isActive && itemType === 'news' && (
            <SwipeHint bottomOffset={isShortScreen ? 70 : 80} />
          )}

          {/* Footer pinned at bottom */}
          <View style={styles.footerWrapper}>
            {/* Time label row: small 2m ago text placed directly above the bookmark button, right-aligned */}
            {Boolean(timeLabelContent) && (
              <View style={styles.timeLabelRow}>
                <Text
                  style={[
                    styles.timeLabelText,
                    {
                      color: colors.textTertiary,
                      fontSize: isUnder360 ? 11 : 12,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {timeLabelContent}
                </Text>
              </View>
            )}

            {/* Single thin divider line between date label and action row */}
            <View
              style={[
                styles.footerDivider,
                {
                  backgroundColor: colors.divider,
                  marginTop: Boolean(timeLabelContent) ? 8 : 0,
                  marginBottom: 12,
                },
              ]}
            />

            {/* Action row (bottom footer): display flex, space-between, 100% width */}
            <View
              style={[
                styles.actionRow,
                !hasViews && { justifyContent: 'flex-end' },
              ]}
            >
              {/* Left: small eye icon (16px, muted) + view count plain text */}
              {hasViews && (
                <View style={styles.viewsContainer}>
                  <Ionicons
                    name="eye-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.eyeIcon}
                  />
                  <Text
                    style={[
                      styles.viewsText,
                      {
                        color: colors.textSecondary,
                        fontSize: isUnder360 ? 11 : 12,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={1.2}
                  >
                    {formattedViews}
                  </Text>
                </View>
              )}

              {/* Right: comment, like, share, bookmark buttons in that order, 8px gap */}
              <View
                style={[
                  styles.actionsRow,
                  { gap: actionGap },
                ]}
              >
                  {/* Comment */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={() => contentUid && onOpenComments?.(contentUid)}
                    activeOpacity={0.7}
                    hitSlop={hitSlopValue}
                    accessibilityLabel="Comments"
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.actionBtn,
                        {
                          width: btnSize,
                          height: btnSize,
                          borderRadius: btnSize / 2,
                          backgroundColor: actionBg,
                        },
                        actionBorder,
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={iconSize}
                        color={actionIconColor}
                      />
                    </View>
                    {showCommentCount && (
                      <Text
                        style={[
                          styles.actionCount,
                          {
                            color: colors.textSecondary,
                            fontSize: isUnder360 ? 10 : 11,
                          },
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {typeof effectiveCommentCount === 'number'
                          ? effectiveCommentCount.toLocaleString()
                          : effectiveCommentCount}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Like */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleToggleLike}
                    activeOpacity={0.7}
                    hitSlop={hitSlopValue}
                    accessibilityLabel="Like"
                    accessibilityRole="button"
                  >
                    <Animated.View
                      style={[{ transform: [{ scale: likeScale }] }]}
                    >
                      <View
                        style={[
                          styles.actionBtn,
                          {
                            width: btnSize,
                            height: btnSize,
                            borderRadius: btnSize / 2,
                            backgroundColor: actionBg,
                          },
                          actionBorder,
                        ]}
                      >
                        <Ionicons
                          name={liked ? 'heart' : 'heart-outline'}
                          size={iconSize}
                          color={liked ? '#EF4444' : actionIconColor}
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* General Share */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleShare}
                    activeOpacity={0.7}
                    hitSlop={hitSlopValue}
                    accessibilityLabel="Share"
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.actionBtn,
                        {
                          width: btnSize,
                          height: btnSize,
                          borderRadius: btnSize / 2,
                          backgroundColor: actionBg,
                        },
                        actionBorder,
                      ]}
                    >
                      <Ionicons
                        name="share-social-outline"
                        size={iconSize}
                        color={actionIconColor}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Bookmark */}
                  <TouchableOpacity
                    style={styles.actionBtnWrapper}
                    onPress={handleToggleBookmark}
                    activeOpacity={0.7}
                    hitSlop={hitSlopValue}
                    accessibilityLabel="Bookmark"
                    accessibilityRole="button"
                  >
                    <Animated.View
                      style={[{ transform: [{ scale: bookmarkScale }] }]}
                    >
                      <View
                        style={[
                          styles.actionBtn,
                          {
                            width: btnSize,
                            height: btnSize,
                            borderRadius: btnSize / 2,
                            backgroundColor: actionBg,
                          },
                          actionBorder,
                        ]}
                      >
                        <Ionicons
                          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                          size={iconSize}
                          color={isBookmarked ? '#FFAC33' : actionIconColor}
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          {AlertComponent}
        </View>
    );
  },
  (prev, next) =>
    prev.containerHeight === next.containerHeight &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isActive === next.isActive &&
    prev.isDark === next.isDark &&
    prev.onToggleUI === next.onToggleUI &&
    prev.commentCount === next.commentCount &&
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

    if (item.type === 'poll') {
      return (
        <PollCard
          item={item.data as any}
          containerHeight={containerHeight}
          onToggleUI={onToggleUI}
        />
      );
    }

    const newsItem = item.data as NewsArticle;
    const itemUid = newsItem?.news_uid || (newsItem as any)?.post_uid || (newsItem as any)?.id;
    const cardCommentCount = useCommentCountStore((s) => (itemUid ? s.counts[itemUid] : undefined));
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
        commentCount={cardCommentCount}
        onOpenComments={onOpenComments}
        onToggleUI={onToggleUI}
      />
    );
  },
  (prev, next) => {
    if (prev.item.type !== next.item.type) return false;
    if (prev.containerHeight !== next.containerHeight) return false;
    if (prev.isActive !== next.isActive) return false;
    if (prev.isBookmarked !== next.isBookmarked) return false;
    if (prev.bookmarkedNewsUids !== next.bookmarkedNewsUids) return false;
    if (prev.onToggleUI !== next.onToggleUI) return false;
    const prevUid =
      (prev.item.data as any)?.news_uid ||
      (prev.item.data as any)?.post_uid ||
      (prev.item.data as any)?.poll_uid ||
      (prev.item.data as any)?.id;
    const nextUid =
      (next.item.data as any)?.news_uid ||
      (next.item.data as any)?.post_uid ||
      (next.item.data as any)?.poll_uid ||
      (next.item.data as any)?.id;
    if (prevUid !== nextUid) return false;
    if (prevUid) {
      const counts = useCommentCountStore.getState().counts;
      if (counts[prevUid] !== undefined) {
        const itemComments = (prev.item.data as any)?.engagement?.total_comments ?? (prev.item.data as any)?.comments;
        if (counts[prevUid] !== itemComments) {
          return false;
        }
      }
    }
    return prev.item.data === next.item.data;
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    maxWidth: '100%',
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
  fontToggleBtn: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontToggleText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
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
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    justifyContent: 'space-between',
  },
  textWrapper: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  headline: {
    fontFamily: TELUGU_FONT_STACK.bold,
    fontWeight: 'normal',
    paddingVertical: 4,
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? {
          display: '-webkit-box' as any,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden' as any,
        }
      : {}),
  },
  summaryText: {
    fontFamily: TELUGU_FONT_STACK.regular,
    fontWeight: 'normal',
    paddingVertical: 4,
    ...(Platform.OS === 'web'
      ? {
          display: '-webkit-box' as any,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden' as any,
        }
      : {}),
  },
  footerWrapper: {
    marginTop: 'auto',
    width: '100%',
  },
  footerDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
  timeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  timeLabelText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
    ...(Platform.OS === 'web'
      ? {
          whiteSpace: 'nowrap' as any,
        }
      : {}),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  viewsContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  eyeIcon: {
    flexShrink: 0,
  },
  viewsText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
    ...(Platform.OS === 'web'
      ? {
          whiteSpace: 'nowrap' as any,
          overflow: 'hidden' as any,
          textOverflow: 'ellipsis' as any,
        }
      : {}),
  },
  actionsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 2,
  },
});
