import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useReaderFontStore,
  FontSizeLevel,
  FONT_SIZE_CONFIGS,
} from '@/store/readerFontStore';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Colors } from '@/constants/Colors';
import { TELUGU_FONT_STACK } from '@/constants/Typography';

interface FontSizeModalProps {
  visible: boolean;
  onClose: () => void;
}

const FONT_LEVELS: FontSizeLevel[] = ['small', 'medium', 'large', 'xlarge'];

export const FontSizeModal = React.memo(({ visible, onClose }: FontSizeModalProps) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const {
    fontSizeLevel,
    headlineSize,
    bodySize,
    headlineLineHeight,
    bodyLineHeight,
    setFontSizeLevel,
  } = useReaderFontStore();

  const handleSelectLevel = (level: FontSizeLevel) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setFontSizeLevel(level);
  };

  const isSmallScreen = screenWidth < 360;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDark ? '#161726' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  paddingBottom: Math.max(insets.bottom, 16) + 8,
                },
              ]}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandleContainer}>
                <View
                  style={[
                    styles.dragHandle,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' },
                  ]}
                />
              </View>

              {/* Sheet Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                  <View
                    style={[
                      styles.headerIconBadge,
                      { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(70, 72, 212, 0.1)' },
                    ]}
                  >
                    <Text style={[styles.headerIconText, { color: colors.primary }]}>Aa</Text>
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                      Font Size (ఫాంట్ పరిమాణం)
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                      Adjust reading size for headlines & stories
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                  ]}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close font size settings"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Live Preview Box */}
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isDark ? 'rgba(24, 25, 41, 0.7)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.previewBadge}>
                  <Text style={[styles.previewBadgeText, { color: colors.primary }]}>
                    LIVE PREVIEW (ముందస్తు వీక్షణ)
                  </Text>
                </View>

                {/* Preview Headline */}
                <Text
                  style={[
                    styles.previewHeadline,
                    {
                      color: colors.text,
                      fontSize: headlineSize,
                      lineHeight: headlineLineHeight,
                    },
                  ]}
                  numberOfLines={2}
                >
                  ప్రజా సంక్షేమం & అభివృద్ధి పనులు
                </Text>

                {/* Preview Description */}
                <Text
                  style={[
                    styles.previewBody,
                    {
                      color: colors.textSecondary,
                      fontSize: bodySize,
                      lineHeight: bodyLineHeight,
                    },
                  ]}
                  numberOfLines={2}
                >
                  రాష్ట్రవ్యాప్తంగా చేపట్టిన తాజా కార్యక్రమాలు, సమగ్ర కథనాలు మరియు విశ్లేషణలను స్పష్టంగా చదవండి.
                </Text>
              </View>

              {/* 4 Font Size Selection Options */}
              <View style={styles.optionsRow}>
                {FONT_LEVELS.map((level) => {
                  const cfg = FONT_SIZE_CONFIGS[level];
                  const isSelected = fontSizeLevel === level;

                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(99, 102, 241, 0.18)'
                              : 'rgba(70, 72, 212, 0.08)'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.04)'
                              : '#F1F5F9',
                          borderColor: isSelected
                            ? colors.primary
                            : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleSelectLevel(level)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${cfg.label} text size`}
                    >
                      {/* Visual 'A' size indicator */}
                      <View style={styles.aIconBox}>
                        <Text
                          style={[
                            styles.aIndicator,
                            {
                              fontSize: level === 'small' ? 14 : level === 'medium' ? 16 : level === 'large' ? 19 : 22,
                              color: isSelected ? colors.primary : colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          A
                        </Text>
                      </View>

                      {/* Size Label */}
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {isSmallScreen ? cfg.label.slice(0, 2) : cfg.label}
                      </Text>

                      {/* Telugu Sub-label */}
                      <Text
                        style={[
                          styles.optionTeluguLabel,
                          {
                            color: isSelected ? colors.primary : colors.textTertiary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {cfg.teluguLabel}
                      </Text>

                      {/* Default pill badge */}
                      {cfg.badge && (
                        <View
                          style={[
                            styles.defaultBadge,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.textTertiary,
                            },
                          ]}
                        >
                          <Text style={styles.defaultBadgeText}>{cfg.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Done Button */}
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Done (పూర్తయింది)</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 8,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  previewBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 16,
  },
  previewBadge: {
    marginBottom: 6,
  },
  previewBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  previewHeadline: {
    fontFamily: TELUGU_FONT_STACK.bold,
    marginBottom: 6,
    paddingVertical: 2,
  },
  previewBody: {
    fontFamily: TELUGU_FONT_STACK.regular,
    paddingVertical: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    position: 'relative',
    minHeight: 82,
  },
  aIconBox: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  aIndicator: {
    fontFamily: 'Poppins_700Bold',
  },
  optionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  optionTeluguLabel: {
    fontSize: 10,
    fontFamily: TELUGU_FONT_STACK.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  defaultBadge: {
    position: 'absolute',
    top: -6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 8,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  doneBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
