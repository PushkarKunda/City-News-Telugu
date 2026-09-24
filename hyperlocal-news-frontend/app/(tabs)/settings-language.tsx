import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguagesList } from '@/hooks/useApi';
import { usersApi } from '@/services/api/users';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;
const CARD_HEIGHT = 130;

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface LanguageCardProps {
  name: string;
  glyph: string;
  isSelected: boolean;
  onPress: () => void;
  cardWidth: number;
}

function LanguageCard({
  name,
  glyph,
  isSelected,
  onPress,
  cardWidth,
}: LanguageCardProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.94,
          useNativeDriver: true,
          tension: 180,
          friction: 12,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 180,
          friction: 12,
        }).start()
      }
      onPress={onPress}
      style={{ width: cardWidth, height: CARD_HEIGHT }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: isSelected
              ? isDark
                ? '#2A2A4D'
                : '#E6E7FB'
              : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
            shadowOpacity: isSelected ? 0.15 : 0.06,
            elevation: isSelected ? 3 : 2,
            transform: [{ scale }],
          },
        ]}
      >
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.glyphCircle,
            {
              backgroundColor: isSelected
                ? colors.primary
                : isDark
                  ? '#2A2A3C'
                  : '#F1F5F9',
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.glyphText,
              { color: isSelected ? '#FFFFFF' : colors.primary },
            ]}
          >
            {glyph}
          </Text>
        </View>
        <Text
          style={[
            styles.cardName,
            {
              color: isSelected ? colors.primary : colors.text,
              fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium',
              fontWeight: isSelected ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsLanguageScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { fetchPreferences, updateCachedPreferences, cachedPreferences } =
    useAuthStore();

  const { data: languagesList = [], isLoading: isLoadingLanguages } =
    useLanguagesList();

  const [selectedLanguageId, setSelectedLanguageId] = useState<number | null>(
    null
  );
  const [initialLanguageId, setInitialLanguageId] = useState<number | null>(
    null
  );
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveScale = useRef(new Animated.Value(1)).current;

  // ✅ Calculate exact pixel card width
  const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  // ─── Load Preferences ──────────────────────────────────────────────────

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = cachedPreferences ?? (await fetchPreferences());
        console.log('[SettingsLanguage] prefs:', prefs);
        console.log('[SettingsLanguage] languagesList:', languagesList);
        let langId = prefs.language_id ?? null;
        if (!langId && prefs.language && languagesList.length > 0) {
          langId = languagesList.find((l: any) => l.id === prefs.language)?.backendId ?? null;
        }
        setSelectedLanguageId(langId);
        setInitialLanguageId(langId);
      } catch (error) {
        console.error('[SettingsLanguage] Failed to load preferences:', error);
        Alert.alert('Error', 'Failed to load preferences. Please try again.');
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    // ✅ Wait for languagesList to be loaded before setting preferences
    // so that the selected card renders correctly
    if (!isLoadingLanguages) {
      loadPreferences();
    }
  }, [isLoadingLanguages]);

  // ─── Save Handler ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (selectedLanguageId === initialLanguageId) {
      router.push('/(tabs)/settings');
      return;
    }

    if (selectedLanguageId === null) {
      Alert.alert('Error', 'Please select a language');
      return;
    }

    const prefs = cachedPreferences;
    if (!prefs) {
      Alert.alert('Error', 'Preferences not loaded. Please try again.');
      return;
    }

    setIsSaving(true);

    try {
      await usersApi.updatePreferences({
        language_id: selectedLanguageId,
        state_id: prefs.state_id ?? null,
        district_id: prefs.district_id ?? null,
        city_id: prefs.city_id ?? null,
        category_ids: prefs.category_ids ?? null,
      });

      updateCachedPreferences({ language_id: selectedLanguageId });

      Alert.alert('Success', 'Language updated successfully!', [
        { text: 'OK', onPress: () => router.push('/(tabs)/settings') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update language');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────

  if (isLoadingLanguages || isLoadingPreferences) {
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
          text="Loading languages..."
          colorScheme={colorScheme ?? 'light'}
        />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View
        style={[
          styles.purpleBlur,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(70, 72, 212, 0.12)'
                : 'rgba(70, 72, 212, 0.04)',
          },
        ]}
      />
      <View
        style={[
          styles.tealBlur,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(0, 106, 97, 0.12)'
                : 'rgba(0, 106, 97, 0.04)',
          },
        ]}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.headerLeftButton,
            { backgroundColor: 'rgba(70, 72, 212, 0.05)' },
          ]}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Language
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleSection}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select your preferred language to read stories
        </Text>
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ✅ Section Header */}
        <View style={[styles.sectionHeaderRow, { borderColor: colors.border }]}>
          <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
            AVAILABLE LANGUAGES
          </Text>
          <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ✅ Grid rows - guaranteed 2 per row */}
        {Array.from(
          { length: Math.ceil(languagesList.length / 2) },
          (_, rowIndex) => {
            const leftItem = languagesList[rowIndex * 2];
            const rightItem = languagesList[rowIndex * 2 + 1];
            return (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                <LanguageCard
                  name={leftItem.name}
                  glyph={leftItem.glyph ?? ''}
                  isSelected={selectedLanguageId === leftItem.backendId}
                  onPress={() => setSelectedLanguageId(leftItem.backendId)}
                  cardWidth={cardWidth}
                />
                {rightItem ? (
                  <LanguageCard
                    name={rightItem.name}
                    glyph={rightItem.glyph ?? ''}
                    isSelected={selectedLanguageId === rightItem.backendId}
                    onPress={() => setSelectedLanguageId(rightItem.backendId)}
                    cardWidth={cardWidth}
                  />
                ) : (
                  <View style={{ width: cardWidth }} />
                )}
              </View>
            );
          }
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 24,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <Pressable
            style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            onPressIn={() =>
              Animated.spring(saveScale, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 180,
                friction: 12,
              }).start()
            }
            onPressOut={() =>
              Animated.spring(saveScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 180,
                friction: 12,
              }).start()
            }
            disabled={isSaving}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  purpleBlur: {
    position: 'absolute',
    right: -39,
    top: -98,
    width: 156,
    height: 393.59,
    borderRadius: 9999,
    zIndex: -1,
  },
  tealBlur: {
    position: 'absolute',
    left: -19.5,
    bottom: -49.19,
    width: 117,
    height: 295.19,
    borderRadius: 9999,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerLeftButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  headerSpacer: { width: 40 },
  subtitleSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  // ✅ Section divider with text
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.4,
  },
  // ✅ Row-based grid
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  glyphCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  glyphText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  cardName: {
    fontSize: 13,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#4648D4',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});