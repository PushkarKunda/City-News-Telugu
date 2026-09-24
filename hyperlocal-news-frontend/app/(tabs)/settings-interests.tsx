import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useCategoriesAll } from '@/hooks/useApi';
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

const getCategoryIcon = (name: string, slug: string): string => {
    const map: Record<string, string> = {
        politics: 'flag-outline',
        sports: 'football-outline',
        cricket: 'trophy-outline',
        technology: 'hardware-chip-outline',
        business: 'briefcase-outline',
        finance: 'cash-outline',
        economy: 'trending-up-outline',
        entertainment: 'film-outline',
        cinema: 'film-outline',
        movies: 'film-outline',
        health: 'heart-outline',
        medical: 'medkit-outline',
        science: 'flask-outline',
        education: 'school-outline',
        crime: 'warning-outline',
        weather: 'partly-sunny-outline',
        international: 'globe-outline',
        world: 'globe-outline',
        lifestyle: 'leaf-outline',
        food: 'restaurant-outline',
        travel: 'airplane-outline',
        environment: 'earth-outline',
        agriculture: 'flower-outline',
        culture: 'musical-notes-outline',
        religion: 'book-outline',
        auto: 'car-outline',
        automobile: 'car-outline',
        fashion: 'shirt-outline',
        real_estate: 'home-outline',
        realestate: 'home-outline',
        regional: 'map-outline',
        local: 'location-outline',
        national: 'flag-outline',
        opinion: 'chatbubble-outline',
        editorial: 'create-outline',
        government: 'business-outline',
    };
    const slugKey = slug?.toLowerCase().replace(/-/g, '_');
    const nameKey = name?.toLowerCase().replace(/\s+/g, '_');
    return map[slugKey] || map[nameKey] || 'newspaper-outline';
};

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CARD
// ═══════════════════════════════════════════════════════════════════════════

interface CategoryCardProps {
    name: string;
    slug: string;
    color?: string;
    isSelected: boolean;
    onPress: () => void;
    cardWidth: number;
}

function CategoryCard({
    name,
    slug,
    color,
    isSelected,
    onPress,
    cardWidth,
}: CategoryCardProps) {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const scale = useRef(new Animated.Value(1)).current;

    const categoryColor = color || colors.primary;
    const iconName = getCategoryIcon(name, slug);

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
                    styles.categoryCard,
                    {
                        backgroundColor: isSelected
                            ? isDark
                                ? '#2A2A4D'
                                : '#E6E7FB'
                            : colors.card,
                        borderColor: isSelected ? categoryColor : colors.border,
                        shadowOpacity: isSelected ? 0.15 : 0.06,
                        elevation: isSelected ? 3 : 2,
                        transform: [{ scale }],
                    },
                ]}
            >
                {isSelected && (
                    <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={categoryColor} />
                    </View>
                )}
                <View
                    style={[
                        styles.iconCircle,
                        {
                            backgroundColor: isSelected
                                ? categoryColor
                                : isDark
                                    ? '#2A2A3C'
                                    : '#F1F5F9',
                            borderColor: isSelected ? categoryColor : colors.border,
                        },
                    ]}
                >
                    <Ionicons
                        name={iconName as any}
                        size={22}
                        color={isSelected ? '#FFFFFF' : categoryColor}
                    />
                </View>
                <Text
                    style={[
                        styles.categoryName,
                        {
                            color: isSelected ? categoryColor : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                            fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium',
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
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsInterestsScreen() {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();

    const { fetchPreferences, updateCachedPreferences, cachedPreferences } =
        useAuthStore();

    const { data: categoriesList = [], isLoading: isLoadingCategories } =
        useCategoriesAll();

    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [initialCategories, setInitialCategories] = useState<number[]>([]);
    const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const saveScale = useRef(new Animated.Value(1)).current;

    // ✅ Exact pixel card width
    const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

    // ─── Load Preferences ──────────────────────────────────────────────────

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const prefs = cachedPreferences ?? (await fetchPreferences());
                const categoryIds = prefs.category_ids ?? [];
                setSelectedCategories(categoryIds);
                setInitialCategories(categoryIds);
            } catch (error) {
                console.error('[SettingsInterests] Failed to load preferences:', error);
                Alert.alert('Error', 'Failed to load preferences. Please try again.');
            } finally {
                setIsLoadingPreferences(false);
            }
        };

        if (!isLoadingCategories) {
            loadPreferences();
        }
    }, [isLoadingCategories]);

    // ─── Toggle ────────────────────────────────────────────────────────────

    const toggleCategory = useCallback((categoryId: number) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    }, []);

    // ─── Save Handler ──────────────────────────────────────────────────────

    const handleSave = async () => {
        const hasChanges =
            JSON.stringify([...selectedCategories].sort((a, b) => a - b)) !==
            JSON.stringify([...initialCategories].sort((a, b) => a - b));

        if (!hasChanges) {
            router.push('/(tabs)/settings');
            return;
        }

        if (selectedCategories.length === 0) {
            Alert.alert(
                'Select Interests',
                'Please select at least one interest to continue.'
            );
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
                state_id: prefs.state_id ?? null,
                district_id: prefs.district_id ?? null,
                city_id: prefs.city_id ?? null,
                category_ids: selectedCategories,
            });

            updateCachedPreferences({ category_ids: selectedCategories });

            Alert.alert('Success', 'Your interests have been updated!', [
                { text: 'OK', onPress: () => router.push('/(tabs)/settings') },
            ]);
        } catch (error: any) {
            Alert.alert(
                'Error',
                error?.message || 'Failed to update interests. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Loading ───────────────────────────────────────────────────────────

    if (isLoadingCategories || isLoadingPreferences) {
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
                    Interests
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Subtitle + Badge */}
            <View style={styles.subtitleSection}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Pick topics you love to personalize your feed
                </Text>
                {selectedCategories.length > 0 && (
                    <View
                        style={[styles.countBadge, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.countBadgeText}>
                            {selectedCategories.length} selected
                        </Text>
                    </View>
                )}
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
                {/* Section Divider */}
                <View style={styles.sectionHeaderRow}>
                    <View
                        style={[styles.sectionLine, { backgroundColor: colors.border }]}
                    />
                    <View
                        style={[
                            styles.sectionLabelContainer,
                            {
                                backgroundColor: colors.primaryLight,
                                borderColor: colors.primary,
                            },
                        ]}
                    >
                        <Text
                            style={[styles.sectionLabelText, { color: colors.primary }]}
                        >
                            ALL CATEGORIES
                        </Text>
                    </View>
                    <View
                        style={[styles.sectionLine, { backgroundColor: colors.border }]}
                    />
                </View>

                {categoriesList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="newspaper-outline"
                            size={48}
                            color={colors.textTertiary}
                        />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No categories available
                        </Text>
                    </View>
                ) : (
                    // ✅ Guaranteed 2-per-row using row rendering
                    Array.from(
                        { length: Math.ceil(categoriesList.length / 2) },
                        (_, rowIndex) => {
                            const left = categoriesList[rowIndex * 2];
                            const right = categoriesList[rowIndex * 2 + 1];
                            return (
                                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                                    <CategoryCard
                                        name={left.name}
                                        slug={left.slug}
                                        color={left.color}
                                        isSelected={selectedCategories.includes(left.id)}
                                        onPress={() => toggleCategory(left.id)}
                                        cardWidth={cardWidth}
                                    />
                                    {right ? (
                                        <CategoryCard
                                            name={right.name}
                                            slug={right.slug}
                                            color={right.color}
                                            isSelected={selectedCategories.includes(right.id)}
                                            onPress={() => toggleCategory(right.id)}
                                            cardWidth={cardWidth}
                                        />
                                    ) : (
                                        <View style={{ width: cardWidth }} />
                                    )}
                                </View>
                            );
                        }
                    )
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
        gap: 10,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        lineHeight: 20,
    },
    countBadge: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    countBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
    },
    scrollContent: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionLine: {
        flex: 1,
        height: 1.5,
    },
    sectionLabelContainer: {
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 9999,
        borderWidth: 1.5,
    },
    sectionLabelText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 1.2,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: CARD_GAP,
    },
    categoryCard: {
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
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderWidth: 2,
        overflow: 'hidden',
    },
    categoryName: {
        fontSize: 13,
        letterSpacing: 0.4,
        textAlign: 'center',
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
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