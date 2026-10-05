import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Share,
  Animated,
  Platform,
  AppStateStatus,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { type Post } from '@/services/api/posts';
import { followApi } from '@/services/api/follow';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLikePost, useSharePost } from '@/hooks/usePosts';
import { useAddBookmark, useRemoveBookmark } from '@/hooks/useEngagement';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';

export interface PostCardProps {
  post: Post;
  itemHeight: number;
  isActive: boolean;
  isFocused: boolean;
  appState: AppStateStatus;
  isBookmarked?: boolean;
  onOpenComments: (postUid: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
  onToggleUI?: () => void;
  currentUserId?: string | null;
  commentCountOverride?: number;
  bottomOffset?: number;
}

/**
 * Strips trailing hashtags from caption text for display.
 * Hashtags in the middle of sentences are kept intact.
 * Trailing hashtags with Telugu / unicode characters and punctuation are removed.
 */
export function stripTrailingHashtags(text?: string | null): string {
  if (!text) return '';
  let str = text.trim();
  // Match trailing hashtags at the end of the text
  // Supports alphanumeric, underscores, and Telugu unicode range \u0C00-\u0C7F
  const trailingHashtagRegex = /[\s,.]*#[a-zA-Z0-9_\u0C00-\u0C7F]+[\s,.]*$/;
  while (trailingHashtagRegex.test(str)) {
    str = str.replace(trailingHashtagRegex, '').trim();
  }
  return str;
}

/**
 * Format compact count for action rail labels (e.g. 1.2K).
 * Hides count when 0 or undefined.
 */
export function formatCompactCount(num?: number | null): string {
  if (!num || num <= 0) return '';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(num);
}

// ─── Text-Only Post Gradient Palette ──────────────────────────────────────────
const TEXT_GRADIENTS: [string, string, ...string[]][] = [
  ['#1e1b4b', '#312e81', '#4338ca'], // Indigo velvet
  ['#09090b', '#18181b', '#27272a'], // Deep dark graphite
  ['#042f2e', '#115e59', '#0d9488'], // Deep emerald teal
  ['#3b0764', '#581c87', '#6b21a8'], // Royal twilight purple
  ['#1c1917', '#44403c', '#78716c'], // Warm dusk slate
  ['#450a0a', '#7f1d1d', '#991b1b'], // Crimson dusk
  ['#082f49', '#075985', '#0284c7'], // Midnight sapphire
  ['#31102f', '#4a154b', '#701a75'], // Berry magenta
];

function getGradientForPost(id: string | number): [string, string, ...string[]] {
  const str = String(id || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TEXT_GRADIENTS.length;
  return TEXT_GRADIENTS[idx];
}

const PostCardInner: React.FC<PostCardProps> = ({
  post,
  itemHeight,
  isActive,
  isFocused,
  appState,
  isBookmarked: initialBookmarked = false,
  onOpenComments,
  onSelectHashtag,
  onToggleUI,
  currentUserId,
  commentCountOverride,
  bottomOffset = 22,
}) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // ─── Engagement States ──────────────────────────────────────────────────────
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  // Sync state if post props change
  useEffect(() => {
    setLiked(Boolean(post.is_liked));
    setLikeCount(post.like_count || 0);
    setShareCount(post.share_count || 0);
  }, [post.is_liked, post.like_count, post.share_count]);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  // Image resolution & fallbacks
  const [imageError, setImageError] = useState(false);
  const [imageUri, setImageUri] = useState(post.image_url);
  useEffect(() => {
    setImageUri(post.image_url);
    setImageError(false);
  }, [post.image_url]);

  const hasVideo = Boolean(
    post.video_url &&
    post.video_url.trim().length > 0 &&
    !isInvalidOrMockImageUrl(post.video_url)
  );

  const hasValidImage = Boolean(
    !hasVideo &&
    imageUri &&
    imageUri.trim().length > 0 &&
    !isInvalidOrMockImageUrl(imageUri) &&
    !imageError
  );

  const isMediaPost = hasVideo || hasValidImage;

  // ─── Video Playback ────────────────────────────────────────────────────────
  const playing = isActive && isFocused && appState === 'active';
  const player = useVideoPlayer(
    hasVideo && playing && post.video_url ? { uri: post.video_url } : null,
    (p) => {
      p.loop = true;
      p.muted = true;
      p.staysActiveInBackground = false;
    }
  );

  useEffect(() => {
    if (!player) return;
    if (playing) {
      player.muted = true;
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);

  // ─── Micro-Animations ──────────────────────────────────────────────────────
  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const doubleTapHeartAnim = useRef(new Animated.Value(0)).current;
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  const triggerScaleAnimation = (anim: Animated.Value, peak = 1.35) => {
    Animated.sequence([
      Animated.spring(anim, {
        toValue: peak,
        speed: 50,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        speed: 40,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fireHeartMicroAnimation = () => {
    setShowDoubleTapHeart(true);
    doubleTapHeartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(doubleTapHeartAnim, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(doubleTapHeartAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDoubleTapHeart(false);
    });
  };

  // ─── API Mutations ─────────────────────────────────────────────────────────
  const { mutate: toggleLike } = useLikePost();
  const { mutate: sharePostMutation } = useSharePost();
  const { mutate: addBookmark } = useAddBookmark();
  const { mutate: removeBookmark } = useRemoveBookmark();

  // Optimistic Like Handler
  const handleLike = useCallback((forceLike = false) => {
    if (forceLike && liked) {
      // Just re-trigger micro animation
      triggerScaleAnimation(likeScale, 1.4);
      return;
    }

    const nextLiked = forceLike ? true : !liked;
    const countDiff = nextLiked ? 1 : -1;

    setLiked(nextLiked);
    setLikeCount((prev) => Math.max(0, prev + countDiff));
    triggerScaleAnimation(likeScale, 1.4);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    toggleLike(post.post_uid, {
      onError: () => {
        // Rollback on failure
        setLiked(!nextLiked);
        setLikeCount((prev) => Math.max(0, prev - countDiff));
      },
    });
  }, [liked, post.post_uid, toggleLike, likeScale]);

  // Optimistic Bookmark Handler
  const handleBookmarkToggle = useCallback(() => {
    const nextState = !bookmarked;
    setBookmarked(nextState);
    triggerScaleAnimation(bookmarkScale, 1.35);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (nextState) {
      addBookmark(
        { contentUid: post.post_uid, contentType: 'post' },
        {
          onError: () => setBookmarked(!nextState),
        }
      );
    } else {
      removeBookmark(
        { contentUid: post.post_uid, contentType: 'post' },
        {
          onError: () => setBookmarked(!nextState),
        }
      );
    }
  }, [bookmarked, post.post_uid, addBookmark, removeBookmark, bookmarkScale]);

  // Share Handler
  const handleShare = useCallback(async () => {
    try {
      triggerScaleAnimation(shareScale, 1.25);
      setShareCount((prev) => prev + 1);
      sharePostMutation({ postUid: post.post_uid, platform: 'native' });

      const shareUrl = `https://citynewstelugu.com/posts/${post.post_uid}`;
      await Share.share({
        message: `${post.content ? post.content + '\n\n' : ''}Check out this post on City News Telugu:\n${shareUrl}`,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  }, [post.post_uid, post.content, sharePostMutation, shareScale]);

  // Follow author handler
  const handleFollowToggle = useCallback(async () => {
    if (!post.user_uid || post.user_uid === currentUserId) return;
    const next = !isFollowing;
    setIsFollowing(next);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (next) {
        await followApi.followUser(post.user_uid);
      } else {
        await followApi.unfollowUser(post.user_uid);
      }
    } catch {
      setIsFollowing(!next);
    }
  }, [post.user_uid, currentUserId, isFollowing]);

  // ─── Double-Tap Detection ──────────────────────────────────────────────────
  const lastTapRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardPress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap confirmed! Cancel pending single tap
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      handleLike(true);
      fireHeartMicroAnimation();
    } else {
      // Possible single tap: wait to verify no second tap occurs
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = setTimeout(() => {
        onToggleUI?.();
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
  }, [handleLike, onToggleUI]);

  // Clean up single tap timeout
  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  // ─── Post Metadata Parsing ─────────────────────────────────────────────────
  const userDisplayName = post.user_display_name || post.user_name || 'Community Member';
  const userHandle = post.user_name ? `@${post.user_name}` : '';
  const formattedTime = useRelativeTime(post.created_at, { isActive, language: 'en' });
  const initialLetter = userDisplayName.charAt(0).toUpperCase() || 'U';
  const avatarHasValidUrl = post.user_profile_picture && !isInvalidOrMockImageUrl(post.user_profile_picture);
  const canFollow = Boolean(post.user_uid && currentUserId && post.user_uid !== currentUserId);

  // Extract hashtags (including Telugu unicode block \u0C00-\u0C7F)
  const displayHashtags = useMemo(() => {
    const tagsSet = new Set<string>();
    const rawHashtags: any = post.hashtags || (post as any).tags || (post as any).hashtag_list;
    if (Array.isArray(rawHashtags)) {
      rawHashtags.forEach((t) => {
        if (typeof t === 'string' && t.trim()) {
          tagsSet.add(t.trim().replace(/^#/, ''));
        } else if (typeof t === 'object' && t !== null && 'name' in t) {
          tagsSet.add(String((t as any).name).trim().replace(/^#/, ''));
        } else if (t != null) {
          tagsSet.add(String(t).trim().replace(/^#/, ''));
        }
      });
    }

    if (post.content) {
      const matched = post.content.match(/#[a-zA-Z0-9_\u0C00-\u0C7F]+/g);
      if (matched) {
        matched.forEach((t) => tagsSet.add(t.replace(/^#/, '').trim()));
      }
    }
    return Array.from(tagsSet).filter(Boolean);
  }, [post.hashtags, post.content]);

  // Strip trailing hashtags for display when tags are shown as chips; keep sentence-internal hashtags
  const displayCaption = useMemo(() => {
    if (displayHashtags.length > 0) {
      return stripTrailingHashtags(post.content);
    }
    return post.content || '';
  }, [post.content, displayHashtags.length]);

  const [showAllTags, setShowAllTags] = useState(false);
  useEffect(() => {
    setShowAllTags(false);
  }, [post.post_uid]);

  const activeCommentCount = commentCountOverride ?? (post.comment_count || 0);
  const compactLikeCount = formatCompactCount(likeCount);
  const compactCommentCount = formatCompactCount(activeCommentCount);
  const compactShareCount = formatCompactCount(shareCount);

  const gradientPalette = useMemo(
    () => getGradientForPost(post.post_uid || post.id),
    [post.post_uid, post.id]
  );
  const gradientEndColor = gradientPalette[gradientPalette.length - 1] || '#0B1120';
  const cardBackgroundColor = isMediaPost ? '#0B1120' : gradientEndColor;

  return (
    <View style={[styles.pageWrapper, { height: itemHeight, backgroundColor: cardBackgroundColor }]}>
      {/* ─── Background Layer: Full-Bleed Media or Deterministic Gradient ── */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCardPress}>
        {hasVideo ? (
          <View style={StyleSheet.absoluteFillObject}>
            {playing ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <Image
                source={{
                  uri: post.thumbnail_url || post.image_url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080',
                  headers: { Accept: 'image/webp,image/*;q=0.8' },
                }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                cachePolicy="disk"
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(11, 17, 32, 0.35)', 'rgba(11, 17, 32, 0.75)', '#0B1120']}
              style={styles.bottomGradient}
              pointerEvents="none"
            />
          </View>
        ) : hasValidImage ? (
          <View style={StyleSheet.absoluteFillObject}>
            <Image
              source={{ uri: imageUri!, headers: { Accept: 'image/webp,image/*;q=0.8' } }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={250}
              cachePolicy="disk"
              onError={() => {
                if (imageUri === post.image_url && post.original_image_url && post.original_image_url !== imageUri) {
                  setImageUri(post.original_image_url);
                } else {
                  setImageError(true);
                }
              }}
            />
            <LinearGradient
              colors={['transparent', 'rgba(11, 17, 32, 0.35)', 'rgba(11, 17, 32, 0.75)', '#0B1120']}
              style={styles.bottomGradient}
              pointerEvents="none"
            />
          </View>
        ) : (
          // Text-Only Post: Rich Hashed Gradient Background
          <View style={StyleSheet.absoluteFillObject}>
            <LinearGradient
              colors={gradientPalette}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Subtle dark bottom vignette */}
            <LinearGradient
              colors={['transparent', 'rgba(11, 17, 32, 0.25)', gradientEndColor]}
              style={styles.bottomGradient}
              pointerEvents="none"
            />

            {/* Centered Large Typography for Text-Only Post */}
            <View style={styles.textOnlyCenterContainer} pointerEvents="box-none">
              <Text
                style={styles.textOnlyHeadline}
                numberOfLines={isTextExpanded ? undefined : 6}
                ellipsizeMode="tail"
              >
                {displayCaption || post.content || ''}
              </Text>
              {(displayCaption || post.content || '').length > 150 && (
                <TouchableOpacity
                  style={styles.textExpanderPill}
                  onPress={() => setIsTextExpanded((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textExpanderPillLabel}>
                    {isTextExpanded ? 'Show Less' : 'Read More...'}
                  </Text>
                  <Ionicons
                    name={isTextExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Pressable>

      {/* ─── Centered Double-Tap Animated Heart ──────────────────────────── */}
      {showDoubleTapHeart && (
        <Animated.View
          style={[
            styles.doubleTapHeartWrapper,
            {
              transform: [
                {
                  scale: doubleTapHeartAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [0, 1.35, 1],
                  }),
                },
              ],
              opacity: doubleTapHeartAnim,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={100} color="#EF4444" style={styles.heartShadow} />
        </Animated.View>
      )}

      {/* ─── Bottom-Left Overlay (Author Meta, Caption, Tags) ─────────────── */}
      <View style={[styles.bottomLeftOverlay, { bottom: bottomOffset }]} pointerEvents="box-none">
        {/* Author Avatar & Handle */}
        <View style={styles.authorRow}>
          <View style={styles.avatarWrapper}>
            {avatarHasValidUrl ? (
              <Image
                source={{ uri: post.user_profile_picture! }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>{initialLetter}</Text>
              </View>
            )}

            {/* Follow "+" Badge */}
            {canFollow && (
              <TouchableOpacity
                style={[
                  styles.followBadge,
                  isFollowing && { backgroundColor: '#10B981' },
                ]}
                onPress={handleFollowToggle}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={isFollowing ? 'Following' : 'Follow author'}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'add'}
                  size={12}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorDisplayName} numberOfLines={1}>
                {userDisplayName}
              </Text>
              {Boolean(formattedTime) && (
                <Text style={styles.postTimeText}> • {formattedTime}</Text>
              )}
            </View>
            {Boolean(userHandle) && (
              <Text style={styles.authorUserHandle} numberOfLines={1}>
                {userHandle}
              </Text>
            )}
          </View>
        </View>

        {/* Media Post Caption (max 3 lines with expander, trailing hashtags stripped) */}
        {isMediaPost && Boolean(displayCaption) && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsCaptionExpanded((prev) => !prev)}
            style={styles.captionContainer}
          >
            <Text
              style={styles.captionText}
              numberOfLines={isCaptionExpanded ? undefined : 3}
            >
              {displayCaption}
            </Text>
            {Boolean(displayCaption && displayCaption.length > 90) && (
              <Text style={styles.captionMoreTag}>
                {isCaptionExpanded ? ' Show less' : ' ...more'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Hashtags / Tag Chips: at most 3, plus +N chip for the rest, tappable to filter */}
        {displayHashtags.length > 0 && (
          <View style={styles.hashtagChipsContainer}>
            {(showAllTags ? displayHashtags : displayHashtags.slice(0, 3)).map((tag, idx) => (
              <TouchableOpacity
                key={`${tag}-${idx}`}
                style={styles.hashtagPill}
                onPress={() => onSelectHashtag?.(tag)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter by #${tag}`}
              >
                <Text style={styles.hashtagPillText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
            {!showAllTags && displayHashtags.length > 3 && (
              <TouchableOpacity
                style={[styles.hashtagPill, styles.hashtagMorePill]}
                onPress={() => setShowAllTags(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${displayHashtags.length - 3} more tags`}
              >
                <Text style={styles.hashtagPillText}>+{displayHashtags.length - 3}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ─── Right-Side Action Rail (44px Targets, 16px Gap) ───────────────── */}
      <View style={[styles.rightActionRail, { bottom: bottomOffset }]} pointerEvents="box-none">
        {/* 1. Like */}
        <TouchableOpacity
          style={styles.actionButtonContainer}
          onPress={() => handleLike()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={liked ? `Liked, ${likeCount} likes` : `Like, ${likeCount} likes`}
        >
          <View style={[styles.actionIconCircle, liked && styles.actionIconCircleActive]}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#EF4444' : '#FFFFFF'}
              />
            </Animated.View>
          </View>
          {Boolean(compactLikeCount) && (
            <Text style={[styles.actionCountLabel, liked && { color: '#EF4444' }]}>
              {compactLikeCount}
            </Text>
          )}
        </TouchableOpacity>

        {/* 2. Comment */}
        <TouchableOpacity
          style={styles.actionButtonContainer}
          onPress={() => onOpenComments(post.post_uid || String(post.id))}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${activeCommentCount} comments`}
        >
          <View style={styles.actionIconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
          </View>
          {Boolean(compactCommentCount) && (
            <Text style={styles.actionCountLabel}>{compactCommentCount}</Text>
          )}
        </TouchableOpacity>

        {/* 3. Share */}
        <TouchableOpacity
          style={styles.actionButtonContainer}
          onPress={handleShare}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Share, ${shareCount} shares`}
        >
          <View style={styles.actionIconCircle}>
            <Animated.View style={{ transform: [{ scale: shareScale }] }}>
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            </Animated.View>
          </View>
          {Boolean(compactShareCount) && (
            <Text style={styles.actionCountLabel}>{compactShareCount}</Text>
          )}
        </TouchableOpacity>

        {/* 4. Bookmark (No text label, filled icon when saved) */}
        <TouchableOpacity
          style={styles.actionButtonContainer}
          onPress={handleBookmarkToggle}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Saved to bookmarks' : 'Save to bookmarks'}
        >
          <View style={[styles.actionIconCircle, bookmarked && styles.actionIconCircleBookmarked]}>
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={bookmarked ? '#F59E0B' : '#FFFFFF'}
              />
            </Animated.View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const PostCard = React.memo(PostCardInner, (prev, next) => {
  return (
    prev.post.post_uid === next.post.post_uid &&
    prev.post.like_count === next.post.like_count &&
    prev.post.comment_count === next.post.comment_count &&
    prev.post.share_count === next.post.share_count &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isActive === next.isActive &&
    prev.isFocused === next.isFocused &&
    prev.appState === next.appState &&
    prev.itemHeight === next.itemHeight &&
    prev.commentCountOverride === next.commentCountOverride &&
    prev.bottomOffset === next.bottomOffset
  );
});

const styles = StyleSheet.create({
  pageWrapper: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0B1120',
    position: 'relative',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '46%',
  },

  // ─── Double Tap Heart Animation ───────────────────────────────────────────
  doubleTapHeartWrapper: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },

  // ─── Text-Only Post Styling ───────────────────────────────────────────────
  textOnlyCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingBottom: 90,
  },
  textOnlyHeadline: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 38,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    paddingVertical: 4,
  },
  textExpanderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textExpanderPillLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Bottom-Left Overlay ──────────────────────────────────────────────────
  bottomLeftOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    right: 76, // Leaves space for the 44px right action rail
    zIndex: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  authorMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  authorDisplayName: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flexShrink: 1,
  },
  postTimeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    flexShrink: 0,
    marginLeft: 4,
  },
  authorUserHandle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 1,
  },
  captionContainer: {
    marginBottom: 8,
    paddingVertical: 2,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingVertical: 1,
  },
  captionMoreTag: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  hashtagChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  hashtagPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hashtagMorePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
    borderColor: 'rgba(129, 140, 248, 0.45)',
  },
  hashtagPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ─── Right-Side Action Rail ───────────────────────────────────────────────
  rightActionRail: {
    position: 'absolute',
    right: 12,
    bottom: 22,
    gap: 16,
    alignItems: 'center',
    zIndex: 25,
  },
  actionButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  actionIconCircleBookmarked: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  actionCountLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
