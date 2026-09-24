import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
  DimensionValue,
} from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router'; // Added usePathname
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useLanguagesList, useStatesList } from '@/hooks/useApi';
import { usersApi } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { scaleFontSize } from '@/utils/responsive';
import { shouldShowDistrictCity } from '@/services/api/location';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface StateCardProps {
  name: string;
  code: string;
  isSelected: boolean;
  onPress: () => void;
  width?: DimensionValue;
  marginRight?: DimensionValue;
  marginBottom?: DimensionValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function StateCard({
  name,
  code,
  isSelected,
  onPress,
  width,
  marginRight,
  marginBottom,
}: StateCardProps) {
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
      style={[styles.regionCardContainer, { width, marginRight, marginBottom }]}
    >
      <Animated.View
        style={[
          styles.regionCard,
          isSelected ? styles.regionCardSelected : styles.regionCardUnselected,
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
        <View
          style={[
            styles.flagCircle,
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
              styles.stateCodeText,
              { color: isSelected ? '#FFFFFF' : colors.primary },
            ]}
          >
            {code}
          </Text>
        </View>
        <Text
          style={[
            styles.regionName,
            { color: isSelected ? colors.primary : colors.text },
            isSelected && styles.regionNameSelected,
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

export default function LocationScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const pathname = usePathname(); // Added

  // Detect edit mode vs new user onboarding
  const isEditMode = pathname.includes('edit-profile');

  // ─── API & State ───────────────────────────────────────────────────────────

  const { data: statesList = [], isLoading } = useStatesList();
  const { data: languagesList = [] } = useLanguagesList();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ts'); // Default 'ts'
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const gpsScale = useRef(new Animated.Value(1)).current;
  const searchBorderAnim = useRef(new Animated.Value(0)).current;

  // ─── Load User Preferences (Edit mode only fetches from API) ──────────────

  useEffect(() => {
    if (!statesList.length) return;

    // New user onboarding → use default, no API call needed
    if (!isEditMode) {
      setSelectedState('ts'); // Default Telangana
      return;
    }

    // Edit mode → fetch and pre-fill saved preference
    const loadPreferences = async () => {
      try {
        const prefs = await usersApi.getPreferences();

        if (prefs.state_name) {
          const matched = statesList.find(
            (s) => s.name.toLowerCase() === prefs.state_name?.toLowerCase()
          );
          if (matched) {
            setSelectedState(matched.id);
            setSearchQuery(matched.name);
            return;
          }
        }

        // Fallback to default
        setSelectedState('ts');
      } catch (error) {
        console.error('[LocationScreen] Failed to load preferences:', error);
        setSelectedState('ts');
      }
    };

    loadPreferences();
  }, [statesList, isEditMode]);

  // ─── Search Animations ─────────────────────────────────────────────────────

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchBorderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.timing(searchBorderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

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

  const handleGpsPressIn = () => {
    Animated.spring(gpsScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  const handleGpsPressOut = () => {
    Animated.spring(gpsScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  // ─── GPS Location Handler ──────────────────────────────────────────────────

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need location access to find your current state.'
        );
        return;
      }

      setIsLocating(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const reverseGeocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocoded && reverseGeocoded.length > 0) {
        const address = reverseGeocoded[0];
        const stateName = address.region || '';

        const matchedState = statesList.find(
          (s) =>
            s.name.toLowerCase().includes(stateName.toLowerCase()) ||
            stateName.toLowerCase().includes(s.name.toLowerCase())
        );

        if (matchedState) {
          setSelectedState(matchedState.id);
          setSearchQuery(matchedState.name);
        } else {
          setSelectedState('ts');
          setSearchQuery('Telangana');
          Alert.alert(
            'Location Detected',
            `We detected you are in ${stateName || 'another region'}. Defaulting to Telangana.`
          );
        }
      } else {
        setSelectedState('ts');
        setSearchQuery('Telangana');
      }
    } catch (error) {
      console.error('[LocationScreen] GPS error:', error);
      Alert.alert(
        'Location Error',
        'Could not fetch your current location. Please select your state manually.'
      );
      setSelectedState('ts');
      setSearchQuery('Telangana');
    } finally {
      setIsLocating(false);
    }
  };

  // ─── State Selection Handler ───────────────────────────────────────────────

  const handleSelectState = (stateId: string) => {
    setSelectedState(stateId);
    const state = statesList.find((s) => s.id === stateId);
    if (state) {
      setSearchQuery(state.name);
    }
  };

  // ─── Continue Handler ──────────────────────────────────────────────────────

  // FIXED: Store data locally, no API call
  const handleContinue = () => {
    if (!selectedState) {
      Alert.alert('State Required', 'Please select your state to continue.');
      return;
    }

    const matchedState = statesList.find((s) => s.id === selectedState);
    if (!matchedState) {
      Alert.alert('Error', 'Selected state not found');
      return;
    }

    // Store in authStore onboarding data
    const { setOnboardingData, onboardingData } = useAuthStore.getState();
    setOnboardingData({ state_id: matchedState.backendId });

    // Derive language code synchronously from the language the user picked
    // onboardingData.language_id is set in language.tsx before navigating here
    const selectedLang = languagesList.find(
      (l) => l.backendId === onboardingData.language_id
    );
    const languageCode = selectedLang?.id ?? null; // e.g. 'te', 'en', 'hi'

    // Check if district/city selection is needed
    // Only Telugu users need district/city for AP/TS
    const needsDistrictCity = shouldShowDistrictCity(
      languageCode,
      matchedState.id === 'ap' ? 1 : matchedState.id === 'ts' ? 2 : null
    );

    if (needsDistrictCity) {
      // Telugu + AP/TS → go to districts
      router.push({
        pathname: '/(onboarding)/districts',
        params: { state: selectedState },
      });
    } else {
      // English/Hindi → set district/city to null and skip to interests
      setOnboardingData({ district_id: null, city_id: null });
      router.push('/(onboarding)/interests');
    }
  };

  // ─── Filtered States ───────────────────────────────────────────────────────

  const filteredStates = statesList.filter(
    (state) =>
      state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      state.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchBorderColor = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

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
          text="Loading states..."
          colorScheme={colorScheme ?? 'light'}
        />
      </View>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
        {/* Hero Titles */}
        <View style={styles.headlineSection}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            Where are you?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Get news and updates tailored to your region.
          </Text>
        </View>

        {/* Search Bar & GPS Button */}
        <View style={styles.searchContainer}>
          <Animated.View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: searchBorderColor,
                shadowOpacity: isSearchFocused ? 0.15 : 0.05,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search state..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
          </Animated.View>

          {/* GPS Button */}
          <Pressable
            onPress={handleUseCurrentLocation}
            onPressIn={handleGpsPressIn}
            onPressOut={handleGpsPressOut}
            disabled={isLocating}
          >
            <Animated.View
              style={[
                styles.gpsButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale: gpsScale }],
                },
                isLocating && styles.gpsButtonDisabled,
              ]}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate-outline" size={20} color={colors.primary} />
              )}
              <Text style={[styles.gpsButtonText, { color: colors.primary }]}>
                {isLocating ? 'Locating...' : 'Use current location'}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        {/* States Grid */}
        <View style={styles.popularSection}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            INDIAN STATES
          </Text>

          <View style={styles.gridContainer}>
            {filteredStates.map((state, index) => {
              const marginRight = index % 2 === 0 ? '6%' : '0%';
              return (
                <StateCard
                  key={state.id}
                  name={state.name}
                  code={state.code}
                  isSelected={selectedState === state.id}
                  onPress={() => handleSelectState(state.id)}
                  width="47%"
                  marginRight={marginRight}
                  marginBottom={16}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            style={[
              styles.continueButton,
              (!selectedState || isSaving) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            onPressIn={handleContinuePressIn}
            onPressOut={handleContinuePressOut}
            disabled={!selectedState || isSaving}
          >
            {isSaving ? (
              <LoadingSpinner size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Get Started</Text>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scaleFontSize(20),
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
    fontSize: scaleFontSize(32),
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.64,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '400',
    color: '#464554',
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: scaleFontSize(24),
  },
  searchContainer: {
    gap: 16,
    marginBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(70, 72, 212, 0.08)',
    height: 56,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(70, 72, 212, 0.15)',
  },
  gpsButtonDisabled: {
    opacity: 0.6,
  },
  gpsButtonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: '#4648D4',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.4,
  },
  popularSection: {
    gap: 16,
  },
  sectionHeader: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#767586',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  regionCardContainer: {
    height: 120,
  },
  regionCard: {
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
  regionCardSelected: {
    backgroundColor: '#E6E7FB',
    borderColor: '#4648D4',
    borderStyle: 'solid',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  regionCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(199, 196, 215, 0.3)',
    borderStyle: 'solid',
  },
  flagCircle: {
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
  stateCodeText: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  regionName: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  regionNameSelected: {
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
    fontSize: scaleFontSize(20),
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: scaleFontSize(28),
  },
});