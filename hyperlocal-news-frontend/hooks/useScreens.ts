// hooks/useScreens.ts
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { screensApi, HomeScreenResponse, ProfileScreenResponse, CommunityScreenResponse, ShortsScreenResponse, DiscoverScreenResponse, LocalScreenResponse, NotificationsScreenResponse } from '@/services/api/screens';
import { newsKeys } from '@/hooks/useNews';
import { postKeys } from '@/hooks/usePosts';
import { pollKeys } from '@/hooks/usePolls';
import { engagementKeys } from '@/hooks/useEngagement';
import { useAuthStore } from '@/store/authStore';
import { useIsFocused } from '@react-navigation/native';
import { useCommentCountStore } from '@/store/commentCountStore';

export const screenKeys = {
  home: (params?: any) => ['screens', 'home', params] as const,
  profile: ['screens', 'profile'] as const,
  // Existing detail/comment mutations invalidate this prefix as well.
  newsDetail: (uid: string | null) => [...newsKeys.single(uid!), 'screen'] as const,
  community: (params?: any) => ['screens', 'community', params] as const,
  shorts: (params?: any) => ['screens', 'shorts', params] as const,
  discover: (params?: any) => ['screens', 'discover', params] as const,
  local: (params?: any) => ['screens', 'local', params] as const,
  notifications: (params?: any) => ['screens', 'notifications', params] as const,
};

const SCREEN_STALE_TIME = 60 * 1000; // 60 seconds

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
export function useHomeScreen(params?: {
  cursor?: string;
  limit?: number;
  category_id?: number;
  category_slug?: string;
  language_id?: number;
  session_id?: string;
}) {
  const queryClient = useQueryClient();
  const updateCachedPreferences = useAuthStore((s) => s.updateCachedPreferences);

  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);

  const query = useQuery({
    queryKey: screenKeys.home(memoizedParams),
    queryFn: () => screensApi.getHome(memoizedParams),
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { categories, active_polls, feed, bookmarks, preferences } = query.data;

    // Seed Categories
    if (categories && Array.isArray(categories)) {
      queryClient.setQueryData(newsKeys.categories, categories);
    }

    // Seed Active Polls
    if (active_polls && Array.isArray(active_polls)) {
      queryClient.setQueryData(pollKeys.active, active_polls);
    }

    // Seed Feed
    if (feed && feed.items) {
      queryClient.setQueryData(newsKeys.feed(memoizedParams), feed);
    }

    // Seed Bookmarks
    if (bookmarks?.news) {
      queryClient.setQueryData(engagementKeys.bookmarks('news'), bookmarks.news);
    }
    if (bookmarks?.posts) {
      queryClient.setQueryData(engagementKeys.bookmarks('post'), bookmarks.posts);
    }

    // Seed Preferences in AuthStore only if different
    if (preferences) {
      const currentPrefs = useAuthStore.getState().cachedPreferences;
      const hasChanged =
        !currentPrefs ||
        currentPrefs.language !== preferences.language ||
        currentPrefs.language_name !== preferences.language_name ||
        currentPrefs.state_id !== preferences.state_id ||
        currentPrefs.district_id !== preferences.district_id ||
        currentPrefs.city_id !== preferences.city_id;

      if (hasChanged) {
        updateCachedPreferences({
          language: preferences.language,
          language_name: preferences.language_name,
          state_id: preferences.state_id ?? undefined,
          district_id: preferences.district_id ?? undefined,
          city_id: preferences.city_id ?? undefined,
          category_ids: preferences.category_ids ?? undefined,
        });
      }
    }
  }, [query.data, queryClient, memoizedParams, updateCachedPreferences]);

  return query;
}

// ─── PROFILE SCREEN ──────────────────────────────────────────────────────────
export function useProfileScreen() {
  const queryClient = useQueryClient();
  const updateProfileLocal = useAuthStore((s) => s.updateProfileLocal);
  const userUid = useAuthStore((s) => s.user?.user_uid);
  const isFocused = useIsFocused();

  const query = useQuery({
    queryKey: [...screenKeys.profile, userUid || 'me'],
    queryFn: () => screensApi.getProfile(),
    enabled: isFocused,
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { user: profileUser, dashboard, posts, bookmarks, rewards } = query.data;

    // Update local profile store from user profile or dashboard
    const u = profileUser || dashboard?.user;
    if (u) {
      updateProfileLocal({
        user_uid: u.user_uid,
        name: u.name,
        user_name: u.user_name,
        email: u.email,
        phone: u.phone,
        phoneNumber: u.phone,
        gender: u.gender,
        date_of_birth: u.date_of_birth,
        avatar: u.profile_picture,
        profile_picture: u.profile_picture,
        isPublisher: (u.role ?? 0) >= 2 || Boolean(u.is_publisher),
        role: u.role,
        email_verified: u.email_verified,
        mobile_verified: u.mobile_verified,
        google_id: u.google_id,
        providers: u.providers,
        is_google_linked: u.is_google_linked,
        state: u.location?.state_name ?? u.state ?? (typeof u.location === 'string' ? u.location : null),
        district: u.location?.district_name ?? u.district,
        state_id: u.location?.state_id ?? u.state_id,
        district_id: u.location?.district_id ?? u.district_id,
        city_id: u.location?.city_id ?? u.city_id,
      });
    }

    // Seed Dashboard
    if (dashboard) {
      queryClient.setQueryData(['user', 'dashboard'], dashboard);
    }

    // Seed User Posts
    const effectiveUid = u?.user_uid || userUid;
    if (effectiveUid && posts && Array.isArray(posts)) {
      queryClient.setQueryData(postKeys.userPosts(effectiveUid), { posts, count: posts.length });
    }

    // Seed Bookmarks
    if (bookmarks?.news) {
      queryClient.setQueryData(engagementKeys.bookmarks('news'), bookmarks.news);
    }
    if (bookmarks?.posts) {
      queryClient.setQueryData(engagementKeys.bookmarks('post'), bookmarks.posts);
    }

    // Seed Rewards
    if (rewards) {
      queryClient.setQueryData(['rewards', 'summary'], rewards);
    }
  }, [query.data, queryClient, updateProfileLocal, userUid]);

  return query;
}

export function useNewsDetailScreen(uid: string | null) {
  const queryClient = useQueryClient();
  const userUid = useAuthStore((s) => s.user?.user_uid);
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: [...screenKeys.newsDetail(uid), userUid],
    enabled: Boolean(uid && userUid) && isFocused,
    staleTime: SCREEN_STALE_TIME,
    queryFn: async ({ signal }) => {
      const data = await screensApi.getNewsDetail(uid!, signal);
      if (signal.aborted) throw new Error('Screen request cancelled');
      if (data.article) queryClient.setQueryData(newsKeys.single(uid!), data.article);
      if (data.engagement) queryClient.setQueryData(newsKeys.engagement(uid!), data.engagement);
      if (data.bookmark) queryClient.setQueryData(engagementKeys.checkBookmark(uid!, 'news'), data.bookmark);
      if (data.comments) {
        const firstPage = data.comments;
        const updated = queryClient.setQueryData<any>(newsKeys.comments(uid!), (old: any) => {
          const local = (old?.pages ?? []).flatMap((page: any) => page.comments)
            .filter((comment: any) => comment.status === 'sending' || comment.status === 'failed');
          const total = firstPage.total + local.filter((comment: any) => comment.status === 'sending').length;
          const first = { ...firstPage, total, comments: [...local, ...firstPage.comments] };
          const previousFirst = (old?.pages?.[0]?.comments ?? [])
            .filter((comment: any) => comment.status !== 'sending' && comment.status !== 'failed');
          // Offset-based later pages are only valid while the first-page
          // boundary and total are unchanged. Otherwise restart pagination.
          const preservePages = old?.pages?.[0]?.total === total &&
            previousFirst.length === firstPage.comments.length &&
            previousFirst.every((comment: any, index: number) => comment.id === firstPage.comments[index].id);
          return {
            pages: [first, ...(preservePages ? old.pages.slice(1) : []).map((page: any) => ({
              ...page, total,
            }))],
            pageParams: preservePages ? old.pageParams : [1],
          };
        });
        useCommentCountStore.getState().setCount(uid!, updated.pages[0].total);
      }
      return data;
    },
  });
}

// ─── COMMUNITY SCREEN ────────────────────────────────────────────────────────
export function useCommunityScreen(params?: {
  limit?: number;
  cursor?: string;
}) {
  const queryClient = useQueryClient();
  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);

  const query = useQuery({
    queryKey: screenKeys.community(memoizedParams),
    queryFn: () => screensApi.getCommunity(memoizedParams),
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { feed, trending_hashtags, bookmarks } = query.data;

    // Seed Posts Feed
    if (feed && feed.posts) {
      queryClient.setQueryData(postKeys.feed(memoizedParams?.cursor || null), feed);
    }

    // Seed Trending Hashtags
    if (trending_hashtags && Array.isArray(trending_hashtags)) {
      queryClient.setQueryData(postKeys.trendingHashtags, trending_hashtags);
    }

    // Seed Bookmarks
    if (bookmarks && Array.isArray(bookmarks)) {
      queryClient.setQueryData(engagementKeys.bookmarks('post'), bookmarks);
    }
  }, [query.data, queryClient, memoizedParams]);

  return query;
}

// ─── SHORTS SCREEN ───────────────────────────────────────────────────────────
export function useShortsScreen(params?: {
  language?: string;
  limit?: number;
  cursor?: string;
}) {
  const queryClient = useQueryClient();
  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);
  const language = memoizedParams?.language || 'te';

  const query = useQuery({
    queryKey: screenKeys.shorts(memoizedParams),
    queryFn: () => screensApi.getShorts(memoizedParams),
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { shorts, ads } = query.data;

    // Seed Shorts Feed
    if (shorts?.items && Array.isArray(shorts.items)) {
      queryClient.setQueryData([...newsKeys.shorts, language], shorts.items);
    }

    // Seed Ads
    if (ads && Array.isArray(ads)) {
      queryClient.setQueryData(['active-ads', 'shorts'], ads);
    }
  }, [query.data, queryClient, language]);

  return query;
}

// ─── DISCOVER SCREEN ─────────────────────────────────────────────────────────
export function useDiscoverScreen(params?: {
  state_id?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();
  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);

  const query = useQuery({
    queryKey: screenKeys.discover(memoizedParams),
    queryFn: () => screensApi.getDiscover(memoizedParams),
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { trending_news, trending_hashtags, categories, popular_news, districts } = query.data;

    // Seed Trending News
    if (trending_news && Array.isArray(trending_news)) {
      queryClient.setQueryData(newsKeys.trending, trending_news);
    }

    // Seed Trending Hashtags
    if (trending_hashtags && Array.isArray(trending_hashtags)) {
      queryClient.setQueryData(postKeys.trendingHashtags, trending_hashtags);
      queryClient.setQueryData(['discovery', 'trendingHashtags', 10], trending_hashtags);
    }

    // Seed Categories
    if (categories && Array.isArray(categories)) {
      queryClient.setQueryData(newsKeys.categories, categories);
      queryClient.setQueryData(['categories', 'all'], categories);
    }

    // Seed Popular News
    if (popular_news && Array.isArray(popular_news)) {
      queryClient.setQueryData(newsKeys.popular, popular_news);
    }

    // Seed Districts
    if (districts && Array.isArray(districts)) {
      queryClient.setQueryData(['districts', memoizedParams?.state_id], districts);
    }
  }, [query.data, queryClient, memoizedParams]);

  return query;
}

// ─── LOCAL SCREEN ────────────────────────────────────────────────────────────
export function useLocalScreen(params?: {
  state?: string;
  district?: string;
  city?: string;
  state_id?: number;
  district_id?: number;
  city_id?: number;
  limit?: number;
  cursor?: string;
}) {
  const queryClient = useQueryClient();
  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);

  const query = useQuery({
    queryKey: screenKeys.local(memoizedParams),
    queryFn: () => screensApi.getLocal(memoizedParams),
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { news } = query.data;

    if (news?.items && Array.isArray(news.items)) {
      queryClient.setQueryData(newsKeys.locationNews({
        state: memoizedParams?.state,
        district: memoizedParams?.district,
        city: memoizedParams?.city,
        limit: memoizedParams?.limit,
      }), news.items);
    }
  }, [query.data, queryClient, memoizedParams]);

  return query;
}

// ─── NOTIFICATIONS SCREEN ────────────────────────────────────────────────────
export function useNotificationsScreen(params?: {
  limit?: number;
  offset?: number;
}) {
  const queryClient = useQueryClient();
  const userUid = useAuthStore((state) => state.user?.user_uid);
  const isFocused = useIsFocused();
  const paramsKey = JSON.stringify(params || {});
  const memoizedParams = useMemo(() => params, [paramsKey]);

  const query = useQuery({
    queryKey: [...screenKeys.notifications(memoizedParams), userUid],
    queryFn: () => screensApi.getNotifications(memoizedParams),
    enabled: Boolean(userUid) && isFocused,
    staleTime: SCREEN_STALE_TIME,
  });

  const lastSeededRef = useRef<any>(null);

  useEffect(() => {
    if (!query.data || lastSeededRef.current === query.data) return;
    lastSeededRef.current = query.data;

    const { notifications, unread_count } = query.data;

    // Seed Notifications List
    if (notifications?.items && Array.isArray(notifications.items)) {
      queryClient.setQueryData(['notifications', 'list', userUid], notifications.items);
    }

    // Seed Unread Count
    if (typeof unread_count === 'number') {
      queryClient.setQueryData(['notifications', 'unread-count', userUid], { count: unread_count });
    }
  }, [query.data, queryClient, userUid]);

  return query;
}
