import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/Spacing';

// Article Cover Presets
const COVER_PRESETS = [
  { id: 'business', label: 'Business', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600' },
  { id: 'environment', label: 'Nature & Parks', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600' },
  { id: 'lifestyle', label: 'Food & Dining', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600' },
  { id: 'tech', label: 'Tech & Science', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600' },
  { id: 'sports', label: 'Sports & Event', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600' },
  { id: 'politics', label: 'News & Media', url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800' },
];

const CATEGORIES = [
  'Business',
  'Environment',
  'Lifestyle',
  'Politics',
  'Sports',
  'Technology',
  'Health',
  'Local',
];

interface CreateArticleModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (articleData: {
    headline: string;
    summary: string;
    category: string;
    sourceName: string;
    readingTime: string;
    imageUrl: string;
  }) => void;
}

export function CreateArticleModal({ isVisible, onClose, onSubmit }: CreateArticleModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const { height: screenHeight } = useWindowDimensions();

  // Form State
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [readingTime, setReadingTime] = useState('');
  const [category, setCategory] = useState('');

  // Dropdown Picker Overlay States
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [validationError, setValidationError] = useState('');

  const resetForm = () => {
    setHeadline('');
    setSummary('');
    setCoverImage('');
    setShowImagePicker(false);
    setSourceName('');
    setReadingTime('');
    setCategory('');
    setValidationError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectCover = (url: string) => {
    setCoverImage(url);
    setShowImagePicker(false);
  };

  const handleSubmit = () => {
    if (!coverImage) {
      setValidationError('Please select a cover photo.');
      return;
    }
    if (!headline.trim()) {
      setValidationError('Please enter a headline.');
      return;
    }
    if (!summary.trim()) {
      setValidationError('Please enter a summary or body.');
      return;
    }
    if (!category) {
      setValidationError('Please select a category.');
      return;
    }

    setValidationError('');

    onSubmit({
      headline,
      summary,
      category: category.toUpperCase(),
      sourceName: sourceName.trim() || 'Local Reporter',
      readingTime: readingTime.trim() || '3 min read',
      imageUrl: coverImage,
    });

    handleClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* Main Container */}
          <View style={[styles.mainContainer, { backgroundColor: colors.background, height: screenHeight * 0.9 }]}>

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(12, insets.top) }]}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Create News Article</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.formScroll, { paddingBottom: 180 }]}
            >
              {/* Validation Alert */}
              {validationError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color="#BA1A1A" />
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              ) : null}

              {/* Cover Photo */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Article Cover Photo</Text>
                {coverImage ? (
                  <View style={styles.coverPreviewContainer}>
                    <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
                    <TouchableOpacity
                      style={styles.changeCoverButton}
                      onPress={() => setShowImagePicker(!showImagePicker)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera" size={18} color="#FFFFFF" />
                      <Text style={styles.changeCoverText}>Change Cover</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.dashedUploadCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => setShowImagePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.uploadIconWrapper, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="image-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.uploadCardMainText, { color: colors.primary }]}>Tap to upload image</Text>
                    <Text style={styles.uploadCardSubText}>Select a cover theme from our presets</Text>
                  </TouchableOpacity>
                )}

                {/* Horizontal Cover Picker presets */}
                {showImagePicker && (
                  <View style={[styles.coverPresetContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.presetHeading, { color: colors.primary }]}>Select a Preset Theme Cover:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                      {COVER_PRESETS.map((preset) => (
                        <TouchableOpacity
                          key={preset.id}
                          style={[
                            styles.presetCard,
                            coverImage === preset.url && styles.presetCardActive,
                          ]}
                          onPress={() => handleSelectCover(preset.url)}
                          activeOpacity={0.7}
                        >
                          <Image source={{ uri: preset.url }} style={styles.presetImage} />
                          <View style={styles.presetLabelWrapper}>
                            <Text style={styles.presetLabel}>{preset.label}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Headline */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Headline / Title</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="What's the news headline?"
                  placeholderTextColor={colors.textTertiary}
                  value={headline}
                  onChangeText={(text: string) => {
                    setHeadline(text);
                    if (validationError) setValidationError('');
                  }}
                />
              </View>

              {/* Summary */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Article Body / Summary</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Describe what happened in detail for the local community..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={summary}
                  onChangeText={(text: string) => {
                    setSummary(text);
                    if (validationError) setValidationError('');
                  }}
                />
              </View>

              {/* Source & Read Time Row */}
              <View style={styles.rowLayout}>
                <View style={[styles.formGroup, styles.halfColumn]}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Source / Reporter</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Aura Herald"
                    placeholderTextColor={colors.textTertiary}
                    value={sourceName}
                    onChangeText={setSourceName}
                  />
                </View>

                <View style={[styles.formGroup, styles.halfColumn]}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Reading Time</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. 3 min read"
                    placeholderTextColor={colors.textTertiary}
                    value={readingTime}
                    onChangeText={setReadingTime}
                  />
                </View>
              </View>

              {/* Category Dropdown Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
                <TouchableOpacity
                  style={[styles.dropdownSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCategoryPicker(true);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: category ? colors.text : colors.textTertiary }]}>
                    {category || 'Select a category'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(20, insets.bottom + 8) }]}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>Publish News Article</Text>
              </TouchableOpacity>
              <Text style={[styles.footerWarningText, { color: colors.textSecondary }]}>
                Articles published will appear in your "My Articles" tab instantly. Please write responsibly.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Category Sheet Selector */}
        {showCategoryPicker && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 99 }]}>
            <TouchableOpacity
              style={styles.pickerOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={[styles.pickerSheet, { backgroundColor: colors.surface, maxHeight: screenHeight * 0.5 }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.pickerOptionsList}>
                  {CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.pickerOptionRow,
                        category === item && [styles.pickerOptionRowActive, { backgroundColor: colors.primaryLight }],
                      ]}
                      onPress={() => {
                        setCategory(item);
                        setShowCategoryPicker(false);
                        if (validationError) setValidationError('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerOptionLabel,
                          { color: colors.text },
                          category === item && [styles.pickerOptionLabelActive, { color: colors.primary }],
                        ]}
                      >
                        {item}
                      </Text>
                      {category === item ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.4)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mainContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0B1C30',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  headerSpacer: {
    width: 40,
  },
  formScroll: {
    padding: 20,
    gap: 20,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    borderColor: '#F8B4B4',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorText: {
    color: '#BA1A1A',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
  },
  formGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    paddingLeft: 4,
  },
  dashedUploadCard: {
    aspectRatio: 16 / 9,
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadCardMainText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  uploadCardSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
  },
  coverPreviewContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  coverPresetContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  presetHeading: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  presetsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  presetCard: {
    width: 100,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    borderColor: 'transparent',
    borderWidth: 2,
    position: 'relative',
  },
  presetCardActive: {
    borderColor: '#4648D4',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetLabelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  presetLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  textInput: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    borderWidth: 1,
  },
  textArea: {
    height: 100,
  },
  rowLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  halfColumn: {
    flex: 1,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  submitButton: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  footerWarningText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    paddingHorizontal: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  pickerOptionsList: {
    padding: 8,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pickerOptionRowActive: {},
  pickerOptionLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  pickerOptionLabelActive: {
    fontWeight: '600',
  },
});
