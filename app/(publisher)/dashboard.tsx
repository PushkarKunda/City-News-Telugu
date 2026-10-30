import React, { useState, useMemo } from 'react';
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { useCreateNews, useCategories } from '@/hooks/useNews';
import { useLanguagesList } from '@/hooks/useApi';
import { usersApi, type DashboardRecentNews } from '@/services/api/users';
import { useAuthStore } from '@/store/authStore';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { DashboardSkeleton } from '@/components/ui/SkeletonScreens';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { useAppAlert } from '@/components/AppAlert';
import { getUserFacingError } from '@/services/api/client';

const TABS = ['all', 'pending', 'published', 'rejected'] as const;
type TabKey = (typeof TABS)[number];

const TAB_CONFIG: Record<TabKey, { label: string; icon: string; color: string }> = {
  all: { label: 'All', icon: 'article', color: '#6567F1' },
  pending: { label: 'Pending', icon: 'hourglass-top', color: '#F59E0B' },
  published: { label: 'Published', icon: 'check-circle', color: '#10B981' },
  rejected: { label: 'Rejected', icon: 'cancel', color: '#EF4444' },
};

// Query key for the publisher's own dashboard data (/user/dashboardnew).
// Articles submitted from this screen invalidate it so the status refreshes.
const PUBLISHER_DASHBOARD_KEY = ['dashboardnew', 'publisher'];

const STATUS_CHIP: Record<
  DashboardRecentNews['status'],
  { label: string; bg: string; fg: string }
> = {
  approved: { label: 'Published', bg: '#DCFCE7', fg: '#16A34A' },
  pending: { label: 'Pending Review', bg: '#FEF3C7', fg: '#B45309' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', fg: '#DC2626' },
};

/**
 * Format large numbers compactly for the engagement strip (1234 → 1.2K).
 */
const formatCount = (n: number | undefined | null): string => {
  const v = n ?? 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
};

export default function PublisherDashboard() {
  const { alert, AlertComponent } = useAppAlert();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cachedPreferences = useAuthStore((state) => state.cachedPreferences);

  // ─── Publishing language ─────────────────────────────────────────────────
  // The backend only lets a publisher publish in their PREFERRED language
  // (GET /user/preferences/me). Using the author's preferred language from
  // cached preferences rather than a hardcoded default is what makes the
  // POST /news/v1/news request pass the backend language check.
  const { data: categories } = useCategories();
  const { data: languages } = useLanguagesList();
  const publishingLanguageId =
    cachedPreferences?.language_id ?? (user as any)?.language_id ?? 1;
  const publishingLanguageCode =
    languages?.find((lang) => lang.backendId === publishingLanguageId)?.id ?? 'te';

  const { mutate: createArticleMutate } = useCreateNews();
  const queryClient = useQueryClient();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const handleCreateNewsArticle = (data: any) => {
    // Prefer the category ID selected from the live backend list; fall back
    // to name matching for the legacy hardcoded flow.
    const categoryId =
      typeof data.categoryId === 'number' && data.categoryId > 0
        ? data.categoryId
        : (() => {
            const categoryName = String(data.category || '').trim().toLowerCase();
            return categories?.find(
              (cat) => cat.name.trim().toLowerCase() === categoryName
            )?.id;
          })();

    createArticleMutate(
      {
        title: data.headline,
        summary: data.summary || '',
        language_id: publishingLanguageId,
        ...(categoryId ? { category_ids: [categoryId] } : {}),
        image_url: data.imageUrl || undefined,
      },
      {
        onSuccess: () => {
          alert('Submitted!', 'Your news article has been submitted for review.');
          setIsCreateModalVisible(false);
          // Refresh the "My Articles" list & status counts
          queryClient.invalidateQueries({ queryKey: PUBLISHER_DASHBOARD_KEY });
        },
        onError: (err: any) => {
          alert('Error', getUserFacingError(err, 'Failed to publish article.'));
        },
      }
    );
  };

  // The publisher's OWN dashboard data — news_stats (real counts) and
  // recent_news (their own articles with real moderation status). Never map
  // the global feed here; it contains everyone's articles.
  const { data: dashboard, isLoading: isLoadingDashboard, isError: isLoadingDashboardError, isRefetching, refetch: refetchDashboard } = useQuery({
    queryKey: PUBLISHER_DASHBOARD_KEY,
    queryFn: () =>
      // detailed=false: we only need news_stats + recent_news here — the
      // detailed post listing is irrelevant for this screen and bloats the call.
      usersApi.dashboard({ detailed: false, recent_limit: 50 }),
    staleTime: 1000 * 30, // 30 s
    retry: 1, // fail fast into the visible Retry UI instead of hanging
  });

  // The publisher's OWN news items. The backend wraps the list inside an
  // object: recent_news = { items: [...], total, has_more }. Extract `items`
  // and defensively accept a direct array too.
  const recentNewsPage = dashboard?.recent_news ?? null;
  const myNews: DashboardRecentNews[] = useMemo(() => {
    if (Array.isArray(recentNewsPage)) return recentNewsPage;
    if (recentNewsPage && Array.isArray(recentNewsPage.items)) {
      return recentNewsPage.items;
    }
    return [];
  }, [recentNewsPage]);

  const newsStats = dashboard?.news_stats ?? null;

  const articleMap: Record<TabKey, DashboardRecentNews[]> = useMemo(
    () => ({
      all: myNews,
      pending: myNews.filter((n) => n.status === 'pending'),
      published: myNews.filter((n) => n.status === 'approved'),
      rejected: myNews.filter((n) => n.status === 'rejected'),
    }),
    [myNews]
  );

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const currentList = articleMap[activeTab];

  const stats = [
    { label: 'Total', value: newsStats?.total ?? 0, icon: 'article', color: '#6567F1' },
    { label: 'Pending', value: newsStats?.pending ?? 0, icon: 'hourglass-top', color: '#F59E0B' },
    { label: 'Published', value: newsStats?.approved ?? 0, icon: 'check-circle', color: '#10B981' },
    { label: 'Rejected', value: newsStats?.rejected ?? 0, icon: 'cancel', color: '#EF4444' },
  ];

  const renderArticleItem = ({ item }: { item: DashboardRecentNews }) => {
    const chip = STATUS_CHIP[item.status];
    return (
      <View style={[styles.articleCard, { backgroundColor: colors.surface }]}>
        <View style={styles.articleHeader}>
          <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.statusChipText, { color: chip.fg }]}>
              {chip.label}
            </Text>
          </View>
        </View>

        <View style={styles.articleBodyRow}>
          {item.image_url ? (
            <ExpoImage
              source={{ uri: item.image_url }}
              style={styles.articleThumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <View style={styles.articleBodyText}>
            {item.rejection_reason ? (
              <Text style={[styles.rejectionReason, { color: '#DC2626' }]} numberOfLines={2}>
                Reason: {item.rejection_reason}
              </Text>
            ) : null}
            <Text style={[styles.articleSummary, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.summary ?? ''}
            </Text>
          </View>
        </View>

        <View style={styles.articleMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="visibility" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {formatCount(item.views)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="thumb-up" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {formatCount(item.likes)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="chat-bubble-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {formatCount(item.comments)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {item.time_ago || (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoadingDashboard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <DashboardSkeleton colorScheme={colorScheme ?? 'light'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Publisher Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {(user?.name ?? dashboard?.user?.name) ?? 'Publisher'}
            {dashboard?.user?.role_name ? ` • ${dashboard.user.role_name}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => refetchDashboard()}
          disabled={isRefetching}
          style={[styles.backButton, { marginRight: 4, opacity: isRefetching ? 0.5 : 1 }]}
          accessibilityLabel="Refresh publisher dashboard"
        >
          <MaterialIcons
            name={isRefetching ? 'hourglass-empty' : 'refresh'}
            size={22}
            color={colors.text}
          />
        </Pressable>
        <Pressable
          style={[styles.fabSmall, { backgroundColor: colors.primary }]}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* ── Stats Row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconBg, { backgroundColor: stat.color + '18' }]}>
              <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Engagement strip (reach from the publisher's own articles) ── */}
      {newsStats ? (
        <View style={[styles.engagementStrip, { backgroundColor: colors.surface }]}>
          {(
            [
              { key: 'views', icon: 'visibility', value: newsStats.engagement?.views },
              { key: 'likes', icon: 'thumb-up', value: newsStats.engagement?.likes },
              { key: 'comments', icon: 'chat-bubble-outline', value: newsStats.engagement?.comments },
              { key: 'shares', icon: 'share', value: newsStats.engagement?.shares },
            ] as const
          ).map((m) => (
            <View key={m.key} style={styles.engagementItem}>
              <MaterialIcons name={m.icon as any} size={16} color={colors.primary} />
              <Text style={[styles.engagementValue, { color: colors.text }]}>
                {formatCount(m.value)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Tabs ── */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            const config = TAB_CONFIG[tab];
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? config.color + '18' : 'transparent',
                    borderColor: isActive ? config.color : colors.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={config.icon as any}
                  size={16}
                  color={isActive ? config.color : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? config.color : colors.textSecondary },
                  ]}
                >
                  {config.label} ({articleMap[tab].length})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Article List ── */}
      {isLoadingDashboardError ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="cloud-off" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Couldn't load your articles
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Please check your connection and try again.
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => refetchDashboard()}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : currentList.length > 0 ? (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.news_uid}
          renderItem={renderArticleItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No articles here</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {activeTab === 'all'
              ? 'Start writing your first article!'
              : `You have no ${activeTab} articles.`}
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Write Article</Text>
          </Pressable>
        </View>
      )}
      <CreateArticleModal
        isVisible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreateNewsArticle}
        categories={categories?.map((cat) => ({ id: cat.id, name: cat.name }))}
        languageCode={publishingLanguageCode}
      />
      {AlertComponent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  backButton: { padding: 4 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  fabSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  statCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 90,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },

  // Engagement strip
  engagementStrip: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementValue: { fontSize: 14, fontWeight: '700' },

  // Tabs
  tabsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  // Article cards
  listContent: { padding: 16, gap: 12 },
  articleCard: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  articleBodyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  articleThumbnail: {
    width: 76,
    height: 58,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  articleBodyText: { flex: 1, gap: 4 },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  articleTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  articleSummary: { fontSize: 13, lineHeight: 19 },
  rejectionReason: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  articleMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
