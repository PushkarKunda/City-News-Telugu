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
    DimensionValue,
    Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useCitiesList } from '@/hooks/useApi';
import { usersApi } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CityCardProps {
    name: string;
    isSelected: boolean;
    onPress: () => void;
    width?: DimensionValue;
    marginRight?: DimensionValue;
    marginBottom?: DimensionValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// CITY CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function CityCard({
    name,
    isSelected,
    onPress,
    width,
    marginRight,
    marginBottom,
}: CityCardProps) {
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
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
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
                {/* City Icon */}
                <View
                    style={[
                        styles.iconCircle,
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
                    <Ionicons
                        name="location"
                        size={24}
                        color={isSelected ? '#FFFFFF' : colors.primary}
                    />
                </View>

                {/* City Name */}
                <Text
                    style={[
                        styles.cityName,
                        { color: isSelected ? colors.primary : colors.text },
                        isSelected && styles.cityNameSelected,
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
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function CitiesScreen() {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { state, district } = useLocalSearchParams<{
        state?: string;
        district?: string;
    }>();

    // ─── API & State ───────────────────────────────────────────────────────────

    const { data: cities = [], isLoading } = useCitiesList(district ?? null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const buttonScale = useRef(new Animated.Value(1)).current;
    const searchBorderAnim = useRef(new Animated.Value(0)).current;

    // ─── Auto-select First City ────────────────────────────────────────────────

    useEffect(() => {
        if (cities.length > 0 && !selectedCity) {
            setSelectedCity(cities[0].id);
        }
    }, [cities]);

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

    // ─── Continue Handler ──────────────────────────────────────────────────────

    // FIXED: Store data locally, no API call
    const handleContinue = () => {
        if (!selectedCity) {
            Alert.alert('City Required', 'Please select your city to continue.');
            return;
        }

        const matchedCity = cities.find((city) => city.id === selectedCity);
        if (!matchedCity) {
            Alert.alert('Error', 'Selected city not found');
            return;
        }

        // Store in authStore onboarding data
        const { setOnboardingData } = useAuthStore.getState();
        setOnboardingData({ city_id: matchedCity.backendId });

        // Navigate to interests
        router.push('/(onboarding)/interests');
    };

    // ─── Filtered Cities ───────────────────────────────────────────────────────

    const filteredCities = cities.filter((city) =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                    text="Loading cities..."
                    colorScheme={colorScheme ?? 'light'}
                />
            </View>
        );
    }

    // ─── No Cities Found ───────────────────────────────────────────────────────

    if (cities.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <View style={styles.errorContainer}>
                    <Ionicons
                        name="alert-circle-outline"
                        size={64}
                        color={colors.textSecondary}
                    />
                    <Text style={[styles.errorText, { color: colors.text }]}>
                        No cities found
                    </Text>
                    <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
                        Please go back and select a different district
                    </Text>
                    <TouchableOpacity
                        style={[styles.backButtonAlt, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Background Blurs */}
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

            {/* Header Bar */}
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

            {/* Scrollable Content */}
            <ScrollView
                style={[styles.scrollView, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero Title */}
                <View style={styles.headlineSection}>
                    <Text style={[styles.mainTitle, { color: colors.text }]}>
                        Select your city
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Get ultra-local news and updates from your city.
                    </Text>
                </View>

                {/* Search Input */}
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
                            placeholder="Search city..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                        />
                    </Animated.View>
                </View>

                {/* Cities Grid */}
                <View style={styles.citiesSection}>
                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                        CITIES IN YOUR DISTRICT
                    </Text>

                    <View style={styles.gridContainer}>
                        {filteredCities.map((city, index) => {
                            const marginRight = index % 2 === 0 ? '6%' : '0%';
                            return (
                                <CityCard
                                    key={city.id}
                                    name={city.name}
                                    isSelected={selectedCity === city.id}
                                    onPress={() => setSelectedCity(city.id)}
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
                            (!selectedCity || isSaving) && styles.continueButtonDisabled,
                        ]}
                        onPress={handleContinue}
                        onPressIn={handleContinuePressIn}
                        onPressOut={handleContinuePressOut}
                        disabled={!selectedCity || isSaving}
                    >
                        {isSaving ? (
                            <LoadingSpinner size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.continueButtonText}>Continue to Interests</Text>
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
    searchContainer: {
        marginBottom: 32,
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
    citiesSection: {
        gap: 16,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#767586',
        fontFamily: 'Poppins_600SemiBold',
        letterSpacing: 1.2,
        textAlign: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cardContainer: {
        width: '47.5%',
        height: 120,
    },
    card: {
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
    cardSelected: {
        backgroundColor: '#E6E7FB',
        borderColor: '#4648D4',
        borderStyle: 'solid',
        shadowColor: '#4648D4',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 3,
    },
    cardUnselected: {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(199, 196, 215, 0.3)',
        borderStyle: 'solid',
    },
    iconCircle: {
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
    cityName: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'Poppins_500Medium',
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    cityNameSelected: {
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
        marginBottom: 24,
    },
    backButtonAlt: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#4648D4',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
    },
});