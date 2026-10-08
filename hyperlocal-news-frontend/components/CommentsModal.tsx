import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAppAlert } from '@/components/AppAlert';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useNewsComments, useAddComment, useDeleteComment, newsKeys } from '@/hooks/useNews';
import { NewsComment, CommentsPage } from '@/services/api/news';
import { useAuthStore } from '@/store/authStore';
import { useCommentCountStore } from '@/store/commentCountStore';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { formatTimeAgo } from '@/utils/formatters';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  newsUid: string;
}

// ─── Comment Row ──────────────────────────────────────────────────────────────

interface CommentItemProps {
  item: NewsComment;
  isOwner: boolean;
  onDelete: (id: number) => void;
  onRetry: (item: NewsComment) => void;
  onDismissFailed: (id: number) => void;
  colors: any;
  isDark: boolean;
  currentUser: any;
}

const CommentItem = React.memo(
  ({
    item,
    isOwner,
    onDelete,
    onRetry,
    onDismissFailed,
    colors,
    isDark,
    currentUser,
  }: CommentItemProps) => {
    const isSending = item.status === 'sending';
    const isFailed = item.status === 'failed';

    const isSelf =
      isOwner ||
      item.user_uid === '__optimistic__' ||
      (currentUser?.user_uid && item.user_uid === currentUser.user_uid);

    const authorName =
      (isSelf ? (currentUser?.name || currentUser?.user_name || 'You') : null) ||
      item.user_display_name ||
      item.user_name ||
      item.username ||
      item.author_name ||
      item.display_name ||
      item.full_name ||
      item.user?.display_name ||
      item.user?.name ||
      item.user?.username ||
      (item.user_uid && item.user_uid !== '__optimistic__'
        ? `User (${item.user_uid.slice(-4)})`
        : 'Reader');

    const avatarUri =
      (isSelf ? (currentUser?.profile_picture || currentUser?.avatar) : null) ||
      item.user_avatar ||
      item.user_profile_picture ||
      item.avatar ||
      item.profile_picture ||
      item.user?.avatar ||
      item.user?.profile_picture ||
      item.user?.user_avatar;

    const cleanName = (authorName || 'User').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    const initials =
      cleanName
        .split(/\s+/)
        .map((w: string) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

    const timeText = isSending
      ? 'Sending...'
      : item.time_ago || (item.created_at ? formatTimeAgo(item.created_at) : 'Just now');
    const contentText = item.comment_text || item.content || item.text || '';

    return (
      <View
        style={[
          styles.commentContainer,
          { borderBottomColor: colors.border },
          isSending && styles.sendingContainer,
          isFailed && (isDark ? styles.failedContainerDark : styles.failedContainerLight),
        ]}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={[styles.avatar, isSending && styles.avatarDimmed]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.primary + '20' },
              isSending && styles.avatarDimmed,
            ]}
          >
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initials}</Text>
          </View>
        )}

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text
              style={[styles.userName, { color: colors.text }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.25}
            >
              {authorName}
            </Text>

            {/* Status & Relative Time */}
            {isSending ? (
              <View style={styles.statusIndicatorRow}>
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.statusSpinner}
                />
                <Text style={[styles.sendingText, { color: colors.primary }]}>Sending...</Text>
              </View>
            ) : isFailed ? (
              <View style={styles.failedStatusRow}>
                <Ionicons name="alert-circle" size={13} color="#DC2626" style={{ marginRight: 3 }} />
                <Text style={styles.failedBadgeText}>Failed to send</Text>
              </View>
            ) : (
              Boolean(timeText) && (
                <Text
                  style={[styles.timeText, { color: colors.textTertiary }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {timeText}
                </Text>
              )
            )}
          </View>

          <Text
            style={[
              styles.commentText,
              { color: isFailed ? (isDark ? '#FCA5A5' : '#B91C1C') : colors.textSecondary },
            ]}
            maxFontSizeMultiplier={1.25}
          >
            {contentText}
          </Text>
        </View>

        {/* Action Buttons: Retry/Dismiss for failed, Delete for owner */}
        {isFailed ? (
          <View style={styles.failedActionsRow}>
            <TouchableOpacity
              onPress={() => onRetry(item)}
              style={[
                styles.retryBtn,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Retry sending comment"
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={12} color="#DC2626" style={{ marginRight: 2 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDismissFailed(item.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Discard comment"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : isSelf && !isSending ? (
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Delete comment"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

// ─── Modal ────────────────────────────────────────────────────────────────────

export const CommentsModal = ({ visible, onClose, newsUid }: CommentsModalProps) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { alert, AlertComponent } = useAppAlert();

  const [commentText, setCommentText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Shared synchronized comment count store
  const liveStoreCount = useCommentCountStore((s) => (newsUid ? s.counts[newsUid] : undefined));

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsComments(newsUid, visible && isFocused);

  const { mutate: addComment, isPending: isAdding } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();

  // Deduplicate and flatten comments from TanStack infinite query pages
  const comments = useMemo(() => {
    if (!data?.pages) return [];
    const seenConfirmedIds = new Set<string>();
    const seenConfirmedKeys = new Set<string>();

    // Pass 1: Collect all confirmed / server identifiers
    for (const page of data.pages) {
      if (!page?.comments) continue;
      for (const c of page.comments) {
        if (!c) continue;
        const isOptimistic = c.status === 'sending' || c.user_uid === '__optimistic__';
        if (!isOptimistic) {
          if (c.id != null) seenConfirmedIds.add(String(c.id));
          if (c.idempotency_key) seenConfirmedKeys.add(c.idempotency_key);
          const textKey = (c.comment_text || c.text || c.content || '').trim();
          if (textKey) seenConfirmedKeys.add(textKey);
        }
      }
    }

    // Pass 2: Build flattened list without duplicate optimistic or repeated items
    const list: NewsComment[] = [];
    const seenRenderIds = new Set<string>();
    const seenRenderKeys = new Set<string>();

    for (const page of data.pages) {
      if (!page?.comments) continue;
      for (const c of page.comments) {
        if (!c) continue;
        const textKey = (c.comment_text || c.text || c.content || '').trim();
        const idKey = c.id != null ? String(c.id) : null;
        const idemKey = c.idempotency_key;
        const isOptimistic = c.status === 'sending' || c.user_uid === '__optimistic__';

        // Skip optimistic comment if confirmed counterpart already exists in feed
        if (isOptimistic) {
          if (idemKey && seenConfirmedKeys.has(idemKey)) continue;
          if (textKey && seenConfirmedKeys.has(textKey)) continue;
          if (idemKey && seenRenderKeys.has('idem-' + idemKey)) continue;
          if (textKey && seenRenderKeys.has('opt-text-' + textKey)) continue;
          if (textKey) seenRenderKeys.add('opt-text-' + textKey);
          if (idemKey) seenRenderKeys.add('idem-' + idemKey);
        }

        // Deduplicate by string-normalized ID
        if (idKey) {
          if (seenRenderIds.has(idKey)) continue;
          seenRenderIds.add(idKey);
        }

        list.push(c);
      }
    }
    return list;
  }, [data]);

  // Sync comment count with global store from real fetched comments / server total
  useEffect(() => {
    if (!newsUid) return;
    const serverTotal = data?.pages?.[0]?.total;
    const countedComments = comments.filter((comment) => comment.status !== 'failed').length;
    const confirmedCount = typeof serverTotal === 'number'
      ? serverTotal
      : countedComments;

    if (data?.pages && data.pages.length > 0) {
      useCommentCountStore.getState().setCount(newsUid, confirmedCount);
    }
  }, [data, newsUid, comments.length]);

  // Requirement 4: Sheet header Comments (N) derived from list length / shared count
  const serverTotal = data?.pages?.[0]?.total;
  const totalCommentsCount = liveStoreCount ?? serverTotal ?? comments.filter((comment) => comment.status !== 'failed').length;

  // Restore saved draft when sheet opens
  useEffect(() => {
    if (visible && newsUid) {
      const draft = useCommentCountStore.getState().drafts[newsUid];
      if (draft && !commentText) {
        setCommentText(draft);
      }
    }
  }, [visible, newsUid]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const isSubmittingRef = useRef(false);

  const handlePostComment = () => {
    const textToSend = commentText.trim();
    if (!textToSend || isAdding || isSubmittingRef.current) return;

    // Login Check: preserve draft and prompt user to login if not authenticated
    if (!isAuthenticated) {
      useCommentCountStore.getState().setDraft(newsUid, textToSend);
      alert(
        'Sign in required',
        'Please sign in to post comments. Your comment draft has been saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              onClose();
              router.push('/(auth)/login');
            },
          },
        ],
        { icon: 'lock-closed-outline', iconColor: '#F59E0B' }
      );
      return;
    }

    isSubmittingRef.current = true;

    // Clear input field immediately and clear draft for smooth typing UX
    setCommentText('');
    useCommentCountStore.getState().clearDraft(newsUid);

    const tempId = Date.now();
    addComment(
      {
        uid: newsUid,
        comment_text: textToSend,
        tempId,
        userName: user?.name || user?.user_name || 'You',
        userAvatar: user?.profile_picture || user?.avatar || undefined,
      },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      }
    );

    // Auto-scroll list to the top so user immediately sees their comment
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const handleRetry = useCallback(
    (failedItem: NewsComment) => {
      addComment({
        uid: newsUid,
        comment_text: failedItem.comment_text,
        tempId: failedItem.id,
        idempotency_key: failedItem.idempotency_key,
        userName: user?.name || user?.user_name || 'You',
        userAvatar: user?.profile_picture || user?.avatar || undefined,
      });
      // Scroll to top
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    },
    [addComment, newsUid, user]
  );

  const handleDismissFailed = useCallback(
    (tempId: number) => {
      queryClient.setQueryData<{ pages: CommentsPage[]; pageParams: any[] }>(
        newsKeys.comments(newsUid),
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              comments: p.comments.filter((c) => c.id !== tempId),
            })),
          };
        }
      );
    },
    [queryClient, newsUid]
  );

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      alert('Delete Comment', 'Are you sure you want to delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteComment({ uid: newsUid, commentId });
          },
        },
      ], { icon: 'trash-outline', iconColor: '#EF4444' });
    },
    [deleteComment, newsUid]
  );

  const renderComment = useCallback(
    ({ item }: { item: NewsComment }) => {
      const isOwner = Boolean(
        user?.user_uid && (user.user_uid === item.user_uid || item.user_uid === '__optimistic__')
      );
      return (
        <CommentItem
          item={item}
          isOwner={isOwner}
          onDelete={handleDeleteComment}
          onRetry={handleRetry}
          onDismissFailed={handleDismissFailed}
          colors={colors}
          isDark={isDark}
          currentUser={user}
        />
      );
    },
    [user, handleDeleteComment, handleRetry, handleDismissFailed, colors, isDark]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.sheet,
              borderTopColor: isDark ? colors.borderGlass : colors.border,
              borderTopWidth: 1.5,
            },
          ]}
        >
          {/* Drag handle */}
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : colors.indicator },
            ]}
          />

          {/* Header with real-time count */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text
                style={[styles.headerTitle, { color: colors.text }]}
                maxFontSizeMultiplier={1.25}
              >
                Comments ({totalCommentsCount})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close comments"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isLoading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.25}>
                Couldn’t load comments.
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                style={[styles.retryBtn, { backgroundColor: colors.primary + '20', marginTop: 12 }]}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.retryBtnText, { color: colors.primary }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item, index) => String(item.id ?? `temp-${index}`)}
              renderItem={renderComment}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                    maxFontSizeMultiplier={1.25}
                  >
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              }
            />
          )}

          {/* Comment Input Bar with Safe Area */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.sheet,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(24, 23, 54, 0.9)' : colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              maxFontSizeMultiplier={1.25}
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!commentText.trim() || isAdding}
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary },
                (!commentText.trim() || isAdding) && styles.disabledBtn,
              ]}
              activeOpacity={0.8}
              accessibilityLabel="Send comment"
              accessibilityRole="button"
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {AlertComponent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 24,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    borderRadius: 8,
  },
  sendingContainer: {
    opacity: 0.65,
  },
  failedContainerLight: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  failedContainerDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarDimmed: {
    opacity: 0.7,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusSpinner: {
    transform: [{ scale: 0.7 }],
    marginRight: 4,
  },
  sendingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  failedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  failedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  failedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});



