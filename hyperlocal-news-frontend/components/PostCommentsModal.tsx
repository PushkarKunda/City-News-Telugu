import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { usePostComments, useAddPostComment } from '@/hooks/usePosts';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { formatTimeAgo } from '@/utils/formatters';

interface PostCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postUid: string | null;
}

const PostCommentItem = React.memo(({ item, colors }: any) => {
  const avatarUri = item.user_avatar || item.user_profile_picture || item.avatar || 'https://placehold.co/100x100/E2E8F0/1E293B?text=User';
  const authorName = item.user_display_name || item.user_name || item.username || item.author_name || 'Community Member';
  const timeText = item.time_ago || (item.created_at ? formatTimeAgo(item.created_at) : '');
  const contentText = item.comment_text || item.content || item.text || '';

  return (
    <View style={[styles.commentContainer, { borderBottomColor: colors.border }]}>
      <Image
        source={{ uri: avatarUri }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {authorName}
          </Text>
          {Boolean(timeText) && (
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>
              {timeText}
            </Text>
          )}
        </View>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>
          {contentText}
        </Text>
      </View>
    </View>
  );
});

export const PostCommentsModal = ({ visible, onClose, postUid }: PostCommentsModalProps) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { user } = useAuthStore();

  const [commentText, setCommentText] = useState('');

  const { data: comments = [], isLoading, refetch } = usePostComments(postUid);
  const { mutate: addComment, isPending: isAdding } = useAddPostComment();

  // Refetch comments every time the modal opens so newly posted comments are visible.
  useEffect(() => {
    if (visible && postUid) {
      refetch();
    }
  }, [visible, postUid, refetch]);

  const handlePostComment = () => {
    if (!postUid || !commentText.trim()) return;
    addComment(
      { postUid, commentText: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText('');
        },
        onError: (error: any) => {
          Alert.alert('Error', 'Failed to post comment. ' + (error?.message || 'Please try again.'));
        },
      }
    );
  };

  const renderComment = useCallback(({ item }: { item: any }) => {
    return <PostCommentItem item={item} colors={colors} />;
  }, [colors]);

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
          {/* Subtle drag handle */}
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : colors.indicator },
            ]}
          />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Comments ({comments.length})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item, index) => String(item.id ?? index)}
              renderItem={renderComment}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              }
            />
          )}

          {/* Comment Input */}
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.sheet, borderTopColor: colors.border },
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
    height: '72%',
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
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
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
  },
  timeText: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 19,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
