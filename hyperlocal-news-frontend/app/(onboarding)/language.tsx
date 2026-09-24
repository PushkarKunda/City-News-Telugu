import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  DimensionValue,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router'; // Added usePathname
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguagesList } from '@/hooks/useApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LanguageCardProps {
  name: string;
  glyph: string;
  isSelected: boolean;
  onPress: () => void;
  width?: DimensionValue;
  marginRight?: DimensionValue;
  marginBottom?: DimensionValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function LanguageCard({
  name,
  glyph,
  isSelected,
  onPress,
  width,
  marginRight,
  marginBottom,
}: LanguageCardProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.cardContainer, { width, marginRight, marginBottom }]}
    >
      <Animated.View
        style={[
          styles.languageCard,
          isSelected ? styles.languageCardSelected : styles.languageCardUnselected,
          {
            backgroundColor: isSelected
              ? isDark
                ? '#2A2A4D'
                : '#E6E7FB'
              : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
          { transform: [{ scale }] },
        ]}
      >
        {/* Selection Indicator */}
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: 'transparent' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        )}

        {/* Language Glyph Circle */}
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

        {/* Language Name */}
        <Text
          style={[
            styles.languageName,
            { color: isSelected ? colors.primary : colors.text },
            isSelected && styles.languageNameSelected,
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

export default function LanguageScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const pathname = usePathname(); // ✅ Added

  // ✅ Detect edit mode vs new user onboarding
  const isEditMode = pathname.includes('edit-profile');

  // ─── API & State ───────────────────────────────────────────────────────────

  const { data: languagesList = [], isLoading } = useLanguagesList();

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en'); // ✅ Default 'en'
  const [isSaving, setIsSaving] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  // ─── Initialize Language (Edit mode only fetches from API) ────────────────

  useEffect(() => {
    if (!languagesList.length) return;

    // ✅ New user onboarding → use default, no API call needed
    if (!isEditMode) {
      setSelectedLanguage('en');
      return;
    }

    // ✅ Edit mode → fetch and pre-fill saved preference
    const loadPreferences = async () => {
      try {
        const prefs = await usersApi.getPreferences();
        if (prefs.language_name) {
          const matched = languagesList.find(
            (l) => l.name.toLowerCase() === prefs.language_name?.toLowerCase()
          );
          setSelectedLanguage(matched?.id ?? 'en');
        } else {
          setSelectedLanguage('en');
        }
      } catch (error) {
        console.error('[LanguageScreen] Failed to load preferences:', error);
        setSelectedLanguage('en');
      }
    };

    loadPreferences();
  }, [languagesList, isEditMode]);

  // ─── Button Animations ─────────────────────────────────────────────────────

  const handleContinuePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  const handleContinuePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  // ─── Continue Handler ──────────────────────────────────────────────────────

  // FIXED: Store data locally, no API call
  const handleContinue = async () => {
    if (!selectedLanguage) {
      Alert.alert('Language Required', 'Please select a language to continue.');
      return;
    }

    const matchedLanguage = languagesList.find((l) => l.id === selectedLanguage);
    if (!matchedLanguage) {
      Alert.alert('Error', 'Selected language not found');
      return;
    }

    // Store in authStore onboarding data
    const { setOnboardingData } = useAuthStore.getState();
    setOnboardingData({ language_id: matchedLanguage.backendId });

    // Navigate to next step
    router.push('/(onboarding)/location');
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
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

  // ─── No Languages Found ────────────────────────────────────────────────────

  if (languagesList.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            No languages available
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            Please check your internet connection
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Background Blur Effects */}
      <View
        style={[
          styles.purpleBlur,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(70, 72, 212, 0.12)'
                : 'rgba(70, 72, 212, 0.05)',
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
                : 'rgba(0, 106, 97, 0.05)',
          },
        ]}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerSpacer} />

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
              color: colorScheme === 'dark' ? '#818CF8' : colors.primary,
            }}
          >
            Local
          </Text>
          <Text
            style={{
              color: colorScheme === 'dark' ? '#818CF8' : colors.primary,
              fontFamily: 'Poppins_700Bold',
            }}
          >
            .
          </Text>
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Headline Section */}
        <View style={styles.headlineSection}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Choose your language
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select your preferred language to read stories.
          </Text>
        </View>

        {/* Language Grid */}
        <View style={styles.gridContainer}>
          {languagesList.map((language, index) => {
            const marginRight = index % 2 === 0 ? '6%' : '0%';
            return (
              <LanguageCard
                key={language.id}
                name={language.name}
                glyph={language.glyph ?? ''}
                isSelected={selectedLanguage === language.id}
                onPress={() => setSelectedLanguage(language.id)}
                width="47%"
                marginRight={marginRight}
                marginBottom={16}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            style={[
              styles.continueButton,
              (!selectedLanguage || isSaving) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            onPressIn={handleContinuePressIn}
            onPressOut={handleContinuePressOut}
            disabled={!selectedLanguage || isSaving}
          >
            {isSaving ? (
              <LoadingSpinner size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFF"
                  style={styles.continueIcon}
                />
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  purpleBlur: {
    position: 'absolute',
    right: -39,
    top: -98,
    width: 156,
    height: 393.59,
    borderRadius: 9999,
    backgroundColor: 'rgba(70, 72, 212, 0.05)',
    zIndex: -1,
  },
  tealBlur: {
    position: 'absolute',
    left: -19.5,
    bottom: -49.19,
    width: 117,
    height: 295.19,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 106, 97, 0.05)',
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 196, 215, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4648D4',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  headlineSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.64,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#464554',
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '47.5%',
    height: 130,
  },
  languageCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  languageCardSelected: {
    backgroundColor: '#E6E7FB',
    borderColor: '#4648D4',
    borderStyle: 'solid',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  languageCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(199, 196, 215, 0.3)',
    borderStyle: 'solid',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    zIndex: 1,
  },
  glyphCircle: {
    width: 52,
    height: 52,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E6E7FB',
  },
  glyphText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  languageName: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  languageNameSelected: {
    color: '#4648D4',
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: '#F8F9FF',
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#B0B0C0',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 28,
  },
  continueIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
});