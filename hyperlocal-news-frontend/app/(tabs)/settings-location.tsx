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
  useWindowDimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useStatesList, useDistrictsList, useCitiesList } from '@/hooks/useApi';
import { usersApi } from '@/services/api/users';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;
const CARD_HEIGHT = 120;

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface LocationCardProps {
  name: string;
  code: string;
  isSelected: boolean;
  onPress: () => void;
  cardWidth: number;
}

function LocationCard({
  name,
  code,
  isSelected,
  onPress,
  cardWidth,
}: LocationCardProps) {
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
            styles.codeCircle,
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
              styles.codeText,
              { color: isSelected ? '#FFFFFF' : colors.primary },
            ]}
          >
            {code}
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
          numberOfLines={2}
        >
          {name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION DIVIDER
// ═══════════════════════════════════════════════════════════════════════════

function SectionDivider({
  title,
  colors,
}: {
  title: string;
  colors: any;
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={[sectionStyles.line, { backgroundColor: colors.border }]} />
      <View
        style={[
          sectionStyles.labelContainer,
          { backgroundColor: colors.primaryLight, borderColor: colors.primary },
        ]}
      >
        <Text style={[sectionStyles.labelText, { color: colors.primary }]}>
          {title}
        </Text>
      </View>
      <View style={[sectionStyles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1.5,
  },
  labelContainer: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.2,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsLocationScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const { fetchPreferences, updateCachedPreferences, cachedPreferences } =
    useAuthStore();

  // ─── API Data ──────────────────────────────────────────────────────────

  const { data: statesList = [], isLoading: isLoadingStates } = useStatesList();

  // ─── State ────────────────────────────────────────────────────────────

  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(
    null
  );
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

  const [initialStateId, setInitialStateId] = useState<number | null>(null);
  const [initialDistrictId, setInitialDistrictId] = useState<number | null>(
    null
  );
  const [initialCityId, setInitialCityId] = useState<number | null>(null);

  // ✅ Search is SEPARATE from pre-fill label
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Derived IDs for hooks ────────────────────────────────────────────

  const frontendStateId =
    statesList.find((s) => s.backendId === selectedStateId)?.id ?? null;
  const { data: districtsList = [] } = useDistrictsList(frontendStateId);

  const frontendDistrictId =
    districtsList.find((d) => d.backendId === selectedDistrictId)?.id ?? null;
  const { data: citiesList = [] } = useCitiesList(frontendDistrictId);

  // ─── Calculate Card Width ─────────────────────────────────────────────

  const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  // ─── Animations ───────────────────────────────────────────────────────

  const saveScale = useRef(new Animated.Value(1)).current;
  const gpsScale = useRef(new Animated.Value(1)).current;
  const searchBorderAnim = useRef(new Animated.Value(0)).current;

  // ─── Load Preferences ─────────────────────────────────────────────────

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = cachedPreferences ?? (await fetchPreferences());

        setSelectedStateId(prefs.state_id ?? null);
        setSelectedDistrictId(prefs.district_id ?? null);
        setSelectedCityId(prefs.city_id ?? null);

        setInitialStateId(prefs.state_id ?? null);
        setInitialDistrictId(prefs.district_id ?? null);
        setInitialCityId(prefs.city_id ?? null);

        // ✅ DO NOT pre-fill search query - keep it empty
        // so state grid shows all states
      } catch (error) {
        console.error('[SettingsLocation] Failed to load preferences:', error);
        Alert.alert('Error', 'Failed to load preferences. Please try again.');
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    if (!isLoadingStates) {
      loadPreferences();
    }
  }, [isLoadingStates]);

  // ─── Reset children when parent changes ──────────────────────────────

  useEffect(() => {
    if (selectedStateId !== initialStateId) {
      setSelectedDistrictId(null);
      setSelectedCityId(null);
    }
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedDistrictId !== initialDistrictId) {
      setSelectedCityId(null);
    }
  }, [selectedDistrictId]);

  // ─── Search border animation ──────────────────────────────────────────

  const searchBorderColor = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  // ─── GPS Handler ──────────────────────────────────────────────────────

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
          setSelectedStateId(matchedState.backendId);
          setSelectedDistrictId(null);
          setSelectedCityId(null);
          setSearchQuery('');
        } else {
          const telangana = statesList.find((s) => s.id === 'ts');
          if (telangana) {
            setSelectedStateId(telangana.backendId);
            setSelectedDistrictId(null);
            setSelectedCityId(null);
          }
          Alert.alert(
            'Location Detected',
            `Detected: ${stateName || 'Unknown'}. Defaulting to Telangana.`
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Could not fetch your location. Please select manually.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  // ─── Save Handler ─────────────────────────────────────────────────────

  const handleSave = async () => {
    const hasChanges =
      selectedStateId !== initialStateId ||
      selectedDistrictId !== initialDistrictId ||
      selectedCityId !== initialCityId;

    if (!hasChanges) {
      router.push('/(tabs)/settings');
      return;
    }

    if (!selectedStateId) {
      Alert.alert('Error', 'Please select a state');
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
        language_id: prefs.language_id ?? null,
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        city_id: selectedCityId,
        category_ids: prefs.category_ids ?? null,
      });

      updateCachedPreferences({
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        city_id: selectedCityId,
      });

      Alert.alert('Success', 'Location updated successfully!', [
        { text: 'OK', onPress: () => router.push('/(tabs)/settings') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update location');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filtered States (only filter when user types) ────────────────────

  const filteredStates =
    searchQuery.trim().length > 0
      ? statesList.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
      : statesList; // ✅ Show ALL states when search is empty

  // ─── Render Rows Helper ───────────────────────────────────────────────

  const renderGridRows = (
    items: Array<{ backendId: number; name: string; code?: string }>,
    selectedId: number | null,
    onSelect: (id: number) => void
  ) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      rows.push(
        <View key={`row-${i}`} style={styles.gridRow}>
          <LocationCard
            name={left.name}
            code={left.code ?? left.name.substring(0, 3).toUpperCase()}
            isSelected={selectedId === left.backendId}
            onPress={() => onSelect(left.backendId)}
            cardWidth={cardWidth}
          />
          {right ? (
            <LocationCard
              name={right.name}
              code={right.code ?? right.name.substring(0, 3).toUpperCase()}
              isSelected={selectedId === right.backendId}
              onPress={() => onSelect(right.backendId)}
              cardWidth={cardWidth}
            />
          ) : (
            <View style={{ width: cardWidth }} />
          )}
        </View>
      );
    }
    return rows;
  };

  // ─── Loading ──────────────────────────────────────────────────────────

  if (isLoadingStates || isLoadingPreferences) {
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
          text="Loading locations..."
          colorScheme={colorScheme ?? 'light'}
        />
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

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
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/settings');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Location
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search + GPS */}
      <View style={styles.searchWrapper}>
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
            onFocus={() => {
              setIsSearchFocused(true);
              Animated.timing(searchBorderAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }}
            onBlur={() => {
              setIsSearchFocused(false);
              Animated.timing(searchBorderAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* GPS Button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          onPressIn={() =>
            Animated.spring(gpsScale, {
              toValue: 0.95,
              useNativeDriver: true,
              tension: 180,
              friction: 12,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(gpsScale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 180,
              friction: 12,
            }).start()
          }
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
              isLocating && { opacity: 0.6 },
            ]}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="locate-outline"
                size={20}
                color={colors.primary}
              />
            )}
            <Text style={[styles.gpsButtonText, { color: colors.primary }]}>
              {isLocating ? 'Locating...' : 'Use current location'}
            </Text>
          </Animated.View>
        </Pressable>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STATES SECTION ── */}
        <SectionDivider title="SELECT STATE" colors={colors} />
        {filteredStates.length > 0 ? (
          renderGridRows(
            filteredStates,
            selectedStateId,
            (id) => {
              setSelectedStateId(id);
              setSelectedDistrictId(null);
              setSelectedCityId(null);
            }
          )
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={40}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No states found
            </Text>
          </View>
        )}

        {/* ── DISTRICTS SECTION (only AP/TS) ── */}
        {selectedStateId && districtsList.length > 0 && (
          <>
            <SectionDivider title="SELECT DISTRICT" colors={colors} />
            {renderGridRows(
              districtsList,
              selectedDistrictId,
              (id) => {
                setSelectedDistrictId(id);
                setSelectedCityId(null);
              }
            )}
          </>
        )}

        {/* ── CITIES SECTION ── */}
        {selectedDistrictId && citiesList.length > 0 && (
          <>
            <SectionDivider title="SELECT CITY" colors={colors} />
            {renderGridRows(citiesList, selectedCityId, setSelectedCityId)}
          </>
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
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.4,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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
  codeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
  },
  cardName: {
    fontSize: 12,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
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