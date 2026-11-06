import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAuthStore } from '@/store/authStore';
import { postKeys, useCreatePost } from '@/hooks/usePosts';
import { postsApi } from '@/services/api/posts';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';
import { compressImage } from '@/services/image';
import { uploadImageToSupabaseNews } from '@/services/supabase';
import { getUserFacingError } from '@/services/api';
import { useAppAlert } from '@/components/AppAlert';
import InitialsAvatar from '@/components/InitialsAvatar';

type ComposerType = 'text' | 'photo' | 'issue' | 'question';

const DEFAULT_TRENDING_TAGS = ['Hyderabad', 'LocalIssues', 'CivicNews', 'RoadSafety', 'CommunityHelp'];

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (response: any) => void;
  suggestedTags?: string[];
}

export function CreatePostModal({
  visible,
  onClose,
  onCreated,
  suggestedTags = [],
}: CreatePostModalProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { alert, AlertComponent } = useAppAlert();

  const userDistrict = useAuthStore((s) => s.user?.district || s.user?.state || 'Your Neighborhood');
  const userAvatar = useAuthStore((s) => s.user?.profile_picture);
  const userName = useAuthStore(
    (s) => (s.user as any)?.display_name || s.user?.name || s.user?.user_name || 'Neighbor'
  );

  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { data: trendingData } = useQuery({
    queryKey: postKeys.trendingHashtags,
    queryFn: () => postsApi.getTrendingHashtags(10),
    staleTime: 1000 * 60 * 5,
    enabled: visible,
  });
  const effectiveTags =
    suggestedTags.length > 0
      ? suggestedTags
      : (trendingData?.hashtags && trendingData.hashtags.length > 0
          ? trendingData.hashtags
          : DEFAULT_TRENDING_TAGS);

  const [composerType, setComposerType] = useState<ComposerType>('text');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handlePickImage = async () => {
    if (isUploadingImage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission Denied', 'Please allow photo access to upload an image.', [{ text: 'OK' }], { icon: 'lock-closed-outline', iconColor: '#F59E0B' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setIsUploadingImage(true);
      const compressed = await compressImage(result.assets[0].uri, {
        width: 1280,
        compress: 0.8,
      });
      const publicUrl = await uploadImageToSupabaseNews(compressed.uri, 'posts');
      setImageUrl(publicUrl);
    } catch (err) {
      console.warn('[CreatePostModal] Image upload failed:', err);
      alert('Upload Failed', getUserFacingError(err, 'Could not upload image. Please try again.'), [{ text: 'OK' }], { icon: 'alert-circle', iconColor: '#EF4444' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const resetForm = () => {
    setComposerType('text');
    setContent('');
    setImageUrl('');
    setHashtags('');
  };

  const handleClose = () => {
    if (isCreating || isUploadingImage) return;
    onClose();
  };

  const handleCreatePost = () => {
    if (!content.trim() && !imageUrl.trim()) {
      alert('Empty Post', 'Please write something or provide an image link.', [{ text: 'OK' }], { icon: 'alert-circle', iconColor: '#F59E0B' });
      return;
    }

    const inputTags = hashtags
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);

    const contentTags = (content.match(/#[a-zA-Z0-9_]+/g) || []).map((tag) =>
      tag.replace(/^#/, '').trim()
    );

    const mergedHashtags = Array.from(new Set([...inputTags, ...contentTags]));

    createPost(
      {
        content: content.trim() || null,
        image_url: imageUrl.trim() || null,
        hashtags: mergedHashtags.length > 0 ? mergedHashtags : undefined,
      },
      {
        onSuccess: (response) => {
          resetForm();
          onClose();
          onCreated?.(response);
          alert('Success', 'Your post has been published to the community!', [{ text: 'OK' }], { icon: 'checkmark-circle', iconColor: '#10B981' });
        },
        onError: (error: any) => {
          alert('Error', getUserFacingError(error, 'Failed to create post. Please try again.'), [{ text: 'OK' }], { icon: 'alert-circle', iconColor: '#EF4444' });
        },
      }
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleClose}
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
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                <Text style={[styles.composerModeLabel, { color: composerType === 'text' ? '#6366F1' : colors.textSecondary }, composerType === 'text' && { fontWeight: '700' }]}>Text</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'photo' && styles.composerModeItemActive]}
                onPress={() => setComposerType('photo')}
              >
                <Ionicons name="image-outline" size={16} color={composerType === 'photo' ? '#10B981' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, { color: composerType === 'photo' ? '#10B981' : colors.textSecondary }, composerType === 'photo' && { fontWeight: '700' }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'issue' && styles.composerModeItemActive]}
                onPress={() => {
                  setComposerType('issue');
                  if (!hashtags.includes('#LocalIssue')) {
                    setHashtags((prev) => (prev ? `${prev.trim()} #LocalIssue` : '#LocalIssue'));
                  }
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color={composerType === 'issue' ? '#F59E0B' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, { color: composerType === 'issue' ? '#F59E0B' : colors.textSecondary }, composerType === 'issue' && { fontWeight: '700' }]}>Report Issue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.composerModeItem, composerType === 'question' && styles.composerModeItemActive]}
                onPress={() => {
                  setComposerType('question');
                  if (!content.startsWith('Question for neighbors:')) {
                    setContent('Question for neighbors: ');
                  }
                }}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={composerType === 'question' ? '#3B82F6' : colors.textSecondary} />
                <Text style={[styles.composerModeLabel, { color: composerType === 'question' ? '#3B82F6' : colors.textSecondary }, composerType === 'question' && { fontWeight: '700' }]}>Ask Local</Text>
              </TouchableOpacity>
            </View>

            {/* Author Preview */}
            <View style={styles.modalAuthorRow}>
              <InitialsAvatar
                uri={userAvatar && !isInvalidOrMockImageUrl(userAvatar) ? userAvatar : null}
                name={userName}
                size={36}
                backgroundColor={colors.primaryLight}
                textColor={colors.primary}
                textStyle={{ fontWeight: '700' }}
                style={styles.modalAvatar}
              />
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
                value={content}
                onChangeText={setContent}
                maxLength={500}
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {content.length}/500
              </Text>

              {composerType === 'photo' && (
                <View style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.imageUploadBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                    activeOpacity={0.7}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                    )}
                    <Text style={[styles.imageUploadBtnText, { color: colors.primary }]}>
                      {isUploadingImage
                        ? 'Uploading image...'
                        : imageUrl
                        ? 'Change uploaded photo'
                        : 'Upload image from gallery'}
                    </Text>
                  </TouchableOpacity>

                  {imageUrl.trim().length > 0 && (
                    <View style={styles.uploadedImageWrap}>
                      <Image
                        source={{ uri: imageUrl.trim() }}
                        style={styles.uploadedImagePreview}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setImageUrl('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <TextInput
                    style={[
                      styles.imageInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        marginTop: 8,
                      },
                    ]}
                    placeholder="…or paste an Image URL (https://...)"
                    placeholderTextColor={colors.textTertiary}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                  />
                </View>
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
                value={hashtags}
                onChangeText={setHashtags}
              />

              {/* Quick Tag Suggestions */}
              {effectiveTags.length > 0 && (
                <View style={styles.tagSuggestionsRow}>
                  <Text style={[styles.suggestedTagsLabel, { color: colors.textTertiary }]}>Suggested:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagSuggestChips}>
                    {Array.from(
                      new Set(
                        effectiveTags
                          .map((tag) => String(tag).replace(/^#/, '').trim())
                          .filter(Boolean)
                      )
                    )
                      .slice(0, 6)
                      .map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.suggestChip, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.border }]}
                          onPress={() => {
                            const tagWithHash = `#${tag}`;
                            if (!hashtags.includes(tagWithHash)) {
                              setHashtags((prev) => (prev ? `${prev.trim()} ${tagWithHash}` : tagWithHash));
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
                onPress={handleClose}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  imageUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  imageUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  uploadedImageWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImagePreview: {
    width: '100%',
    height: 180,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
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
});
