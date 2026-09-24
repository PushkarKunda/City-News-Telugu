import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategoriesAll } from '@/hooks/useApi';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore'; // ✅ Added
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MIN_SELECTIONS = 3;

// ─── Topic Style Map ───────────────────────────────────────────────────────

const TOPIC_STYLES: Record<string, {
  iconName: any;
  iconType: 'feather' | 'ionicons';
  iconColor: string;
  iconBg: string;
  selectedBg: string;
  span?: boolean;
}> = {
  technology: { iconName: 'monitor', iconType: 'feather', iconColor: '#6063ee', iconBg: 'rgba(96,99,238,0.06)', selectedBg: '#DDDEFC' },
  tech: { iconName: 'monitor', iconType: 'feather', iconColor: '#6063ee', iconBg: 'rgba(96,99,238,0.06)', selectedBg: '#DDDEFC' },
  sports: { iconName: 'basketball-outline', iconType: 'ionicons', iconColor: '#4648d4', iconBg: 'rgba(70,72,212,0.06)', selectedBg: '#D8D9F7' },
  music: { iconName: 'music', iconType: 'feather', iconColor: '#E11D48', iconBg: 'rgba(225,29,72,0.06)', selectedBg: '#F4D1DE' },
  art: { iconName: 'brush-outline', iconType: 'ionicons', iconColor: '#4648d4', iconBg: 'rgba(70,72,212,0.06)', selectedBg: '#D8D9F7' },
  travel: { iconName: 'compass', iconType: 'feather', iconColor: '#006A61', iconBg: 'rgba(0,106,97,0.06)', selectedBg: '#CBDFE3' },
  food: { iconName: 'restaurant-outline', iconType: 'ionicons', iconColor: '#6063ee', iconBg: 'rgba(96,99,238,0.06)', selectedBg: '#DDDEFC' },
  gaming: { iconName: 'game-controller-outline', iconType: 'ionicons', iconColor: '#006A61', iconBg: 'rgba(0,106,97,0.06)', selectedBg: '#CBDFE3' },
  wellness: { iconName: 'heart', iconType: 'feather', iconColor: '#E11D48', iconBg: 'rgba(225,29,72,0.06)', selectedBg: '#F4D1DE', span: true },
  design: { iconName: 'color-palette-outline', iconType: 'ionicons', iconColor: '#006A61', iconBg: 'rgba(0,106,97,0.06)', selectedBg: '#CBDFE3' },
  business: { iconName: 'briefcase', iconType: 'feather', iconColor: '#4648d4', iconBg: 'rgba(70,72,212,0.06)', selectedBg: '#D8D9F7' },
  politics: { iconName: 'flag-outline', iconType: 'ionicons', iconColor: '#E11D48', iconBg: 'rgba(225,29,72,0.06)', selectedBg: '#F4D1DE' },
  entertainment: { iconName: 'film', iconType: 'feather', iconColor: '#6063ee', iconBg: 'rgba(96,99,238,0.06)', selectedBg: '#DDDEFC' },
};

const DEFAULT_STYLE = {
  iconName: 'star-outline' as const,
  iconType: 'ionicons' as const,
  iconColor: '#4648d4',
  iconBg: 'rgba(70,72,212,0.06)',
  selectedBg: '#D8D9F7',
};

const resolveTopicStyle = (slug: string, name: string) => {
  return (
    TOPIC_STYLES[slug] ??
    TOPIC_STYLES[name.toLowerCase()] ??
    TOPIC_STYLES[slug.split('-')[0]] ??
    DEFAULT_STYLE
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function InterestsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const isEditMode = pathname.includes('edit-profile');

  // ─── API Data ──────────────────────────────────────────────────────────────

  const { data: categoriesList = [], isLoading: isLoadingCategories } = useCategoriesAll();

  // ─── State ─────────────────────────────────────────────────────────────────

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const cardScaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  // ─── Map Categories to Topics ──────────────────────────────────────────────

  const mappedTopics = categoriesList.map((category) => {
    const style = resolveTopicStyle(category.slug, category.name);
    return {
      id: String(category.id),
      backendId: category.id, // ✅ NEW: Store backend ID
      slug: category.slug,
      name: category.name,
      description: category.description,
      ...style,
    };
  });

  // ─── Load Saved Preferences (Edit mode only) ──────────────────────────────

  useEffect(() => {
    if (!isEditMode) {
      setIsLoadingPrefs(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const prefs = await usersApi.getPreferences();
        if (prefs.category_ids?.length) {
          setSelectedTopics(prefs.category_ids.map(String));
        }
      } catch (error) {
        console.error('[InterestsScreen] Failed to load preferences:', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, [isEditMode]);

  // ─── Animation Helpers ─────────────────────────────────────────────────────

  const getOrCreateAnim = (id: string): Animated.Value => {
    if (!cardScaleAnims[id]) {
      cardScaleAnims[id] = new Animated.Value(1);
    }
    return cardScaleAnims[id];
  };

  const handleCardPressIn = (id: string) => {
    Animated.spring(getOrCreateAnim(id), {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  const handleCardPressOut = (id: string) => {
    Animated.spring(getOrCreateAnim(id), {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  // ─── Toggle Topic ──────────────────────────────────────────────────────────

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  // ─── Button Animation ──────────────────────────────────────────────────────

  const animateButton = (toValue: number) => {
    Animated.spring(buttonScale, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // ─── Continue Handler ──────────────────────────────────────────────────────
  // ✅ FIXED: Store locally only, no API call

  const handleContinue = () => {
    if (selectedTopics.length < MIN_SELECTIONS) {
      Alert.alert(
        'Selection Required',
        `Please select at least ${MIN_SELECTIONS} interests to continue.`
      );
      return;
    }

    // ✅ Convert selected topic IDs (strings) to backend IDs (numbers)
    const selectedBackendIds = selectedTopics
      .map((topicId) => {
        const topic = mappedTopics.find((t) => t.id === topicId);
        return topic?.backendId;
      })
      .filter((id): id is number => id !== undefined);

    if (selectedBackendIds.length === 0) {
      Alert.alert('Error', 'No valid categories selected');
      return;
    }

    // ✅ Store in authStore onboarding data
    const { setOnboardingData } = useAuthStore.getState();
    setOnboardingData({ category_ids: selectedBackendIds });

    // ✅ Navigate to setup feed (which calls completeOnboarding)
    router.push('/(onboarding)/setup-feed');
  };

  // ─── Derived State ─────────────────────────────────────────────────────────

  const isButtonDisabled = selectedTopics.length < MIN_SELECTIONS;

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoadingCategories || isLoadingPrefs) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <LoadingSpinner
          fullScreen
          text="Loading interests..."
          colorScheme={colorScheme ?? 'light'}
        />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  let singleItemCount = 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontSize: 24, letterSpacing: -0.3 },
          ]}
        >
          <Text style={{ fontFamily: 'Poppins_700Bold' }}>Hyper</Text>
          <Text
            style={{
              fontFamily: 'Poppins_500Medium',
              color: isDark ? '#818CF8' : colors.primary,
            }}
          >
            Local
          </Text>
          <Text
            style={{
              color: isDark ? '#818CF8' : colors.primary,
              fontFamily: 'Poppins_700Bold',
            }}
          >
            .
          </Text>
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Main Content */}
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={styles.headlineSection}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            What are you{'\n'}interested in?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select at least {MIN_SELECTIONS} to customize your feed
          </Text>
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          {mappedTopics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            const scale = getOrCreateAnim(topic.id);
            const isSpan = !!topic.span;
            const marginRight = isSpan
              ? '0%'
              : singleItemCount++ % 2 === 0
                ? '6%'
                : '0%';

            return (
              <Pressable
                key={topic.id}
                onPressIn={() => handleCardPressIn(topic.id)}
                onPressOut={() => handleCardPressOut(topic.id)}
                onPress={() => toggleTopic(topic.id)}
                style={[
                  isSpan ? styles.bentoCardSpan : styles.bentoCardSingle,
                  { width: isSpan ? '100%' : '47%', marginRight, marginBottom: 16 },
                ]}
              >
                <Animated.View
                  style={[
                    styles.cardInner,
                    isSelected
                      ? [
                        styles.cardSelected,
                        {
                          backgroundColor: isDark ? '#2A2A4D' : topic.selectedBg,
                          borderColor: topic.iconColor,
                          shadowColor: topic.iconColor,
                        },
                      ]
                      : [
                        styles.cardUnselected,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ],
                    { transform: [{ scale }] },
                  ]}
                >
                  {isSpan ? (
                    <View style={styles.spanRow}>
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: isSelected
                              ? topic.iconColor
                              : topic.iconBg,
                          },
                        ]}
                      >
                        {topic.iconType === 'feather' ? (
                          <Feather
                            name={topic.iconName}
                            size={20}
                            color={isSelected ? '#FFF' : topic.iconColor}
                          />
                        ) : (
                          <Ionicons
                            name={topic.iconName}
                            size={20}
                            color={isSelected ? '#FFF' : topic.iconColor}
                          />
                        )}
                      </View>

                      <View style={styles.spanTextContainer}>
                        <View style={styles.spanTitleRow}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {topic.name}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={topic.iconColor}
                            />
                          )}
                        </View>
                        {topic.description && (
                          <Text
                            style={[styles.cardDesc, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {topic.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.singleLayout}>
                      <View style={styles.singleTopRow}>
                        <View
                          style={[
                            styles.iconContainer,
                            {
                              backgroundColor: isSelected
                                ? topic.iconColor
                                : topic.iconBg,
                            },
                          ]}
                        >
                          {topic.iconType === 'feather' ? (
                            <Feather
                              name={topic.iconName}
                              size={20}
                              color={isSelected ? '#FFF' : topic.iconColor}
                            />
                          ) : (
                            <Ionicons
                              name={topic.iconName}
                              size={20}
                              color={isSelected ? '#FFF' : topic.iconColor}
                            />
                          )}
                        </View>
                      </View>

                      <View style={styles.singleTitleRow}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                          {topic.name}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={topic.iconColor}
                          />
                        )}
                      </View>
                    </View>
                  )}
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark
              ? 'rgba(17,17,34,0.95)'
              : 'rgba(248,249,255,0.95)',
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.activeStepIndicator} />
          <View
            style={[styles.inactiveStepIndicator, { backgroundColor: colors.border }]}
          />
          <View
            style={[styles.inactiveStepIndicator, { backgroundColor: colors.border }]}
          />
        </View>

        {/* Selected Count Badge */}
        {selectedTopics.length > 0 && (
          <View style={styles.selectionBadge}>
            <Text style={[styles.selectionBadgeText, { color: colors.primary }]}>
              {selectedTopics.length} selected
              {selectedTopics.length < MIN_SELECTIONS
                ? ` · ${MIN_SELECTIONS - selectedTopics.length} more needed`
                : ' · Ready!'}
            </Text>
          </View>
        )}

        {/* Continue Button */}
        <Animated.View
          style={[styles.buttonWrapper, { transform: [{ scale: buttonScale }] }]}
        >
          <Pressable
            style={[
              styles.continueButton,
              isButtonDisabled
                ? styles.continueButtonDisabled
                : styles.continueButtonActive,
            ]}
            onPressIn={() => animateButton(0.96)}
            onPressOut={() => animateButton(1)}
            onPress={handleContinue}
            disabled={isButtonDisabled}
          >
            <Text style={styles.continueButtonText}>
              {selectedTopics.length < MIN_SELECTIONS
                ? `Select ${MIN_SELECTIONS - selectedTopics.length} more`
                : 'Continue'}
            </Text>
            <Feather
              name="chevron-right"
              size={16}
              color="#FFF"
              style={styles.btnChevron}
            />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES (unchanged)
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    height: 64,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FF',
  },
  backButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4648D4',
    fontFamily: 'Poppins_700Bold',
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 180,
  },
  headlineSection: {
    marginBottom: 40,
    width: '100%',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.64,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#464554',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  bentoCardSingle: {
    height: 140,
  },
  bentoCardSpan: {
    width: '100%',
    height: 100,
  },
  cardInner: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
  },
  cardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(199,196,215,0.3)',
  },
  cardSelected: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  singleLayout: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  singleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  singleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  spanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    height: '100%',
  },
  spanTextContainer: {
    flex: 1,
  },
  spanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#464554',
    fontFamily: 'Poppins_400Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(199,196,215,0.3)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    gap: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepIndicator: {
    backgroundColor: '#4648D4',
    width: 40,
    height: 6,
    borderRadius: 3,
  },
  inactiveStepIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectionBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  buttonWrapper: {
    width: '100%',
  },
  continueButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#A5A6F6',
  },
  continueButtonActive: {
    backgroundColor: '#4648D4',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: 'Poppins_600SemiBold',
  },
  btnChevron: {
    marginTop: 1,
  },
});