import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { type Post } from '@/services/api/posts';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLikePost, useSharePost } from '@/hooks/usePosts';
import { useAddBookmark, useRemoveBookmark } from '@/hooks/useEngagement';
import { formatTimeAgo } from '@/utils/formatters';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';

interface PostCardProps {
  post: Post;
  onOpenComments: (postUid: string) => void;
  isBookmarked?: boolean;
  onSelectHashtag?: (hashtag: string) => void;
  containerHeight?: number;
  onToggleHeaderFooter?: () => void;
}

const PostCardInner: React.FC<PostCardProps> = ({
  post,
  onOpenComments,
  isBookmarked: initialBookmarked = false,
  onSelectHashtag,
}) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [liked, setLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [imageError, setImageError] = useState(false);

  // Micro-animation spring values
  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

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

  const hasValidImage = Boolean(post.image_url && !isInvalidOrMockImageUrl(post.image_url) && !imageError);

  const { mutate: toggleLike } = useLikePost();
  const { mutate: sharePostMutation } = useSharePost();
  const { mutate: addBookmark } = useAddBookmark();
  const { mutate: removeBookmark } = useRemoveBookmark();

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    triggerScaleAnimation(likeScale, 1.4);

    toggleLike(post.post_uid, {
      onError: () => {
        setLiked(!newLiked);
        setLikeCount((prev) => (!newLiked ? prev + 1 : Math.max(0, prev - 1)));
      },
    });
  };

  const handleShare = async () => {
    try {
      triggerScaleAnimation(shareScale, 1.25);
      setShareCount((prev) => prev + 1);
      sharePostMutation({ postUid: post.post_uid, platform: 'native' });

      await Share.share({
        message: `${post.content || ''}\n\nShared via HyperLocal Community`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleBookmarkToggle = () => {
    const nextState = !bookmarked;
    setBookmarked(nextState);
    triggerScaleAnimation(bookmarkScale, 1.35);

    if (nextState) {
      addBookmark({ contentUid: post.post_uid, contentType: 'post' });
    } else {
      removeBookmark({ contentUid: post.post_uid, contentType: 'post' });
    }
  };

  const userDisplayName = post.user_display_name || post.user_name || 'Community Member';
  const userHandle = post.user_name ? `@${post.user_name}` : '';
  const formattedTime = post.created_at ? formatTimeAgo(post.created_at) : (post.time_ago || '');
  const initialLetter = userDisplayName.charAt(0).toUpperCase() || 'U';

  // Extract hashtags
  const displayHashtags = (() => {
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
    } else if (typeof rawHashtags === 'string' && rawHashtags.trim()) {
      try {
        const parsed = JSON.parse(rawHashtags);
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => tagsSet.add(String(t).trim().replace(/^#/, '')));
        } else {
          rawHashtags.split(/[\s,]+/).forEach((t) => {
            if (t.trim()) tagsSet.add(t.trim().replace(/^#/, ''));
          });
        }
      } catch {
        rawHashtags.split(/[\s,]+/).forEach((t) => {
          if (t.trim()) tagsSet.add(t.trim().replace(/^#/, ''));
        });
      }
    }

    if (post.content) {
      const matched = post.content.match(/#[a-zA-Z0-9_]+/g);
      if (matched) {
        matched.forEach((t) => tagsSet.add(t.replace(/^#/, '').trim()));
      }
    }

    return Array.from(tagsSet).filter(Boolean);
  })();

  const avatarHasValidUrl = post.user_profile_picture && !isInvalidOrMockImageUrl(post.user_profile_picture);

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowOpacity: isDark ? 0.45 : 0.06,
        },
      ]}
    >
      {/* ─── Header: Author Info & Bookmark ──────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.authorSection}>
          {avatarHasValidUrl ? (
            <Image
              source={{ uri: post.user_profile_picture! }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {initialLetter}
              </Text>
            </View>
          )}

          <View style={styles.authorMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                {userDisplayName}
              </Text>
              {Boolean(formattedTime) && (
                <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>
                  {' '}• {formattedTime}
                </Text>
              )}
            </View>
            {Boolean(userHandle) && (
              <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                {userHandle}
              </Text>
            )}
          </View>
        </View>

        {/* Top Single Bookmark Action with micro-animation */}
        <TouchableOpacity
          style={[
            styles.bookmarkButton,
            {
              backgroundColor: bookmarked
                ? colors.primaryLight
                : isDark
                ? 'rgba(99, 102, 241, 0.12)'
                : 'rgba(0,0,0,0.04)',
              borderColor: bookmarked ? colors.primary : colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={handleBookmarkToggle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? colors.primary : colors.textTertiary}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ─── Post Content Text ────────────────────────────────────────────── */}
      {Boolean(post.content) && (
        <Text style={[styles.postContent, { color: colors.text }]}>
          {post.content}
        </Text>
      )}

      {/* ─── Contained Media Container (16:9 ratio, no full-bleed stretch) ── */}
      {hasValidImage && (
        <View style={[styles.mediaContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Image
            source={{ uri: post.image_url! }}
            style={styles.postImage}
            contentFit="cover"
            transition={250}
            cachePolicy="disk"
            onError={() => setImageError(true)}
          />
        </View>
      )}

      {/* ─── Hashtags Wrapped Row ─────────────────────────────────────────── */}
      {displayHashtags.length > 0 && (
        <View style={styles.hashtagRow}>
          {displayHashtags.slice(0, 6).map((tag, idx) => (
            <TouchableOpacity
              key={`${tag}-${idx}`}
              style={[
                styles.hashtagChip,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(14, 165, 233, 0.08)',
                  borderColor: isDark ? colors.border : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
              onPress={() => onSelectHashtag?.(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hashtagText, { color: isDark ? '#A5B4FC' : colors.primary }]}>
                #{tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── Engagement Footer Bar ────────────────────────────────────────── */}
      <View style={[styles.footerBar, { borderTopColor: colors.divider }]}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#EF4444' : colors.textSecondary}
            />
          </Animated.View>
          <Text
            style={[
              styles.actionLabel,
              { color: liked ? '#EF4444' : colors.textSecondary },
            ]}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onOpenComments(post.post_uid || String(post.id))}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
            {post.comment_count || 0}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: shareScale }] }}>
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.textSecondary}
            />
          </Animated.View>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
            {shareCount > 0 ? shareCount : 'Share'}
          </Text>
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
    prev.isBookmarked === next.isBookmarked
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '75%',
  },
  timeAgo: {
    fontSize: 12,
  },
  userHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  bookmarkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 6,
  },
  mediaContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  hashtagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
