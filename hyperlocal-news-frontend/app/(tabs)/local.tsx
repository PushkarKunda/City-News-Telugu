import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAppTextScale } from '@/hooks/useAppTextScale';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LocalNewsCard, LocalNewsItem } from '@/components/LocalNewsCard';
import { useAuthStore } from '@/store/authStore';
import { useLocationNews } from '@/hooks/useNews';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatTimeAgo, formatNumber } from '@/utils/formatters';

const FILTERS = ['All Time', 'Today', 'This Week', 'Newest', 'Nearest'];

export default function LocalScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All Time');

  const scale = useAppTextScale();
  const scaledFontSize = (size: number) => ({ fontSize: size * scale });

  const user = useAuthStore(state => state.user);

  // Fetch live local news
  const { data: rawNews = [], isLoading: isLoadingNews } = useLocationNews({
    state: user?.state || '',
    district: user?.district || '',
  });

  // Filtered lists based on activeFilter
  const filteredNews = useMemo(() => {
    let list = [...rawNews];
    const now = Date.now();

    if (activeFilter === 'Today') {
      list = list.filter(item => {
        try {
          return (now - new Date(item.created_at).getTime()) < 24 * 3600 * 1000;
        } catch {
          return true;
        }
      });
    } else if (activeFilter === 'This Week') {
      list = list.filter(item => {
        try {
          return (now - new Date(item.created_at).getTime()) < 7 * 24 * 3600 * 1000;
        } catch {
          return true;
        }
      });
    } else if (activeFilter === 'Newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [rawNews, activeFilter]);

  // Buckets for today / yesterday news
  const { todayNews, yesterdayNews } = useMemo(() => {
    const today: LocalNewsItem[] = [];
    const yesterday: LocalNewsItem[] = [];
    const now = Date.now();

    filteredNews.forEach((article, idx) => {
      let isToday = false;
      let timeStr = 'Recently';
      try {
        const diffMs = now - new Date(article.created_at).getTime();
        if (diffMs < 24 * 3600 * 1000) {
          isToday = true;
        }
        timeStr = formatTimeAgo(article.created_at);
      } catch { }

      const mapped: LocalNewsItem = {
        id: article.news_uid,
        title: article.title,
        distance: article.location?.district || article.location?.city || '',
        timeAgo: timeStr,
        views: `${formatNumber(article.views || 0)} views`,
        imageUrl: article.image_url ?? '',
        variant: idx === 0 ? 'vertical' : 'horizontal',
      };

      if (isToday) {
        today.push(mapped);
      } else {
        yesterday.push(mapped);
      }
    });

    // Make sure we have at least one vertical card if today is empty
    if (today.length > 0) {
      today[0].variant = 'vertical';
      for (let i = 1; i < today.length; i++) {
        today[i].variant = 'horizontal';
      }
    }
    if (yesterday.length > 0) {
      yesterday[0].variant = 'vertical';
      for (let i = 1; i < yesterday.length; i++) {
        yesterday[i].variant = 'horizontal';
      }
    }

    return { todayNews: today, yesterdayNews: yesterday };
  }, [filteredNews]);

  const userLocationStr = user?.district
    ? `${user.district}, ${user.state || ''}`
    : 'Select Location';

  if (isLoadingNews) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <LoadingSpinner fullScreen text="Loading local stories..." colorScheme={colorScheme ?? 'light'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Local News</Text>
      </View>

      <View style={styles.headerLocationContainer}>
        <TouchableOpacity
          style={[styles.locationPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/settings-location')}
        >
          <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.text }, scaledFontSize(14)]}>{userLocationStr}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.textSecondary} style={styles.locationDropdownIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Filters Section */}
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.filterText,
                    { color: isActive ? '#FFF' : colors.textSecondary },
                    scaledFontSize(12)
                  ]}>
                    {filter}
                  </Text>
                  {filter === 'Newest' && (
                    <MaterialIcons name="arrow-downward" size={12} color={isActive ? '#FFF' : colors.textSecondary} style={{ marginLeft: 4 }} />
                  )}
                  {filter === 'Nearest' && (
                    <MaterialIcons name="near-me" size={12} color={isActive ? '#FFF' : colors.textSecondary} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Feed Content */}
        <View style={styles.feedContent}>
          {todayNews.length === 0 && yesterdayNews.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="map-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Local Stories</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                There are no published news articles in your selected district: {user?.district || 'your area'}.
              </Text>
            </View>
          ) : (
            <>
              {/* TODAY Section */}
              {todayNews.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }, scaledFontSize(12)]}>TODAY</Text>
                  <View style={styles.cardsContainer}>
                    {todayNews.map(item => (
                      <LocalNewsCard
                        key={item.id}
                        item={item}
                        onPress={() => {
                          router.push({ pathname: `/news/[id]`, params: { id: item.id, type: 'news' } });
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* YESTERDAY Section */}
              {yesterdayNews.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }, scaledFontSize(12)]}>YESTERDAY</Text>
                  <View style={styles.cardsContainer}>
                    {yesterdayNews.map(item => (
                      <LocalNewsCard
                        key={item.id}
                        item={item}
                        onPress={() => {
                          router.push({ pathname: `/news/[id]`, params: { id: item.id, type: 'news' } });
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 64,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerLeftButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  headerLocationContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  locationDropdownIcon: {
    marginLeft: 'auto',
  },
  scrollContent: {
    paddingBottom: 120, // Leave space for bottom tab bar
  },
  filtersWrapper: {
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardsContainer: {
    gap: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
});