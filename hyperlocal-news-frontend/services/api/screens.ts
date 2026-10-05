import { request } from './client';
import { API_ROUTES } from './routes';
import type { FeedItem, NewsArticle, NewsEngagementDetail, CommentsPage } from './news';
import type { BookmarkCheckResponse } from './engagement';
import type { Category } from './categories';
import type { Post } from './posts';
import type { DashboardResponse, UserPreferences } from './users';
import type { PublisherEligibilityResponse } from './auth';
import type { Advertisement } from './content';

export interface ActivePoll {
  id: number;
  poll_uid: string;
  question: string;
  options: string[] | Array<{ text: string; votes?: number }>;
  total_votes: number;
  expires_at: string | null;
  created_at: string | null;
  is_approved?: boolean;
}

export interface HomeScreenResponse {
  preferences: UserPreferences | null;
  categories: Category[] | null;
  active_polls: ActivePoll[] | null;
  feed: {
    items: FeedItem[];
    metadata?: any;
    next_cursor?: string | null;
    has_more?: boolean;
  } | null;
  bookmarks: {
    news: any[];
    posts: any[];
    news_uids: string[];
    post_uids: string[];
  } | null;
  errors: Record<string, string>;
}

export interface ProfileScreenResponse {
  user: any | null;
  dashboard: DashboardResponse | null;
  publisher_eligibility: PublisherEligibilityResponse | null;
  posts: Post[] | null;
  bookmarks: {
    news: any[];
    posts: any[];
  } | null;
  rewards: any | null;
  errors: Record<string, string>;
}

export interface CommunityScreenResponse {
  feed: {
    posts: Post[];
    has_more: boolean;
    next_cursor: string | null;
  } | null;
  trending_hashtags: Array<string | { tag: string; count?: number }> | null;
  bookmarks: any[] | null;
  errors: Record<string, string>;
}

export interface NewsDetailScreenResponse {
  article: NewsArticle | null;
  engagement: NewsEngagementDetail | null;
  bookmark: BookmarkCheckResponse | null;
  comments: CommentsPage | null;
  ads: Advertisement[] | null;
  errors: Record<string, string>;
}

export interface ShortsScreenResponse {
  shorts: {
    items: any[];
    has_more: boolean;
    next_cursor: string | null;
    total: number;
  } | null;
  ads: Advertisement[] | null;
  errors: Record<string, string>;
}

export interface DiscoverScreenResponse {
  trending_news: any[] | null;
  trending_hashtags: Array<string | { tag: string; count?: number }> | null;
  categories: Category[] | null;
  popular_news: any[] | null;
  districts: Array<{ id: number; name: string; state_id?: number }> | null;
  errors: Record<string, string>;
}

export interface LocalScreenResponse {
  news: {
    items: any[];
    has_more: boolean;
    next_cursor: string | null;
    count: number;
  } | null;
  location: {
    state?: string | null;
    district?: string | null;
    city?: string | null;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
  } | null;
  errors: Record<string, string>;
}

export interface NotificationsScreenResponse {
  notifications: {
    items: Array<{
      id: number | string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      created_at: string | null;
      link_url?: string | null;
    }>;
    total: number;
    has_next: boolean;
  } | null;
  unread_count: number | null;
  errors: Record<string, string>;
}

import { usersApi } from './users';
import { authApi } from './auth';
import { postsApi } from './posts';
import { engagementApi } from './engagement';
import { newsApi } from './news';
import { categoriesApi } from './categories';
import { pollsApi } from './polls';

export const screensApi = {
  getNewsDetail: (uid: string, signal?: AbortSignal): Promise<NewsDetailScreenResponse> => request({
    url: API_ROUTES.screens.newsDetail(uid), method: 'GET', signal,
  }),
  getHome: async (params?: {
    cursor?: string;
    limit?: number;
    category_id?: number;
    category_slug?: string;
    language_id?: number;
    session_id?: string;
  }): Promise<HomeScreenResponse> => {
    try {
      return await request<HomeScreenResponse>({
        url: API_ROUTES.screens.home,
        method: 'GET',
        params,
      });
    } catch (homeErr) {
      console.warn('[screensApi.getHome] /screens/home failed, falling back to modular endpoints:', homeErr);
      const [catRes, feedRes, pollRes] = await Promise.allSettled([
        categoriesApi.getAll(),
        newsApi.getFeed(params),
        pollsApi.getActivePolls(),
      ]);

      return {
        preferences: null,
        categories: catRes.status === 'fulfilled' ? catRes.value : [],
        active_polls: pollRes.status === 'fulfilled' ? (pollRes.value as any) : [],
        feed: feedRes.status === 'fulfilled' ? feedRes.value : { items: [] },
        bookmarks: null,
        errors: {},
      };
    }
  },

  getProfile: async (): Promise<ProfileScreenResponse> => {
    try {
      return await request<ProfileScreenResponse>({
        url: API_ROUTES.screens.profile,
        method: 'GET',
      });
    } catch (screenErr) {
      console.warn('[screensApi.getProfile] /screens/profile failed, falling back to modular endpoints:', screenErr);
      const [userRes, dashRes, eligRes, newsBmRes, postBmRes] = await Promise.allSettled([
        usersApi.me(),
        usersApi.dashboard({ detailed: true, page: 1, limit: 20, recent_limit: 5 }),
        authApi.checkPublisherEligibility(),
        engagementApi.getBookmarks('news'),
        engagementApi.getBookmarks('post'),
      ]);

      const user = userRes.status === 'fulfilled' ? userRes.value : null;
      const dashboard = dashRes.status === 'fulfilled' ? dashRes.value : null;
      const publisher_eligibility = eligRes.status === 'fulfilled' ? eligRes.value : null;
      const newsBookmarks = newsBmRes.status === 'fulfilled' ? (newsBmRes.value as any) ?? [] : [];
      const postBookmarks = postBmRes.status === 'fulfilled' ? (postBmRes.value as any) ?? [] : [];

      const uid = user?.user_uid || dashboard?.user?.user_uid;
      let userPosts: Post[] = [];
      if (uid) {
        try {
          const postsRes = await postsApi.getUserPosts(uid);
          userPosts = postsRes?.posts || [];
        } catch (postErr) {
          console.warn('[screensApi.getProfile] Failed to fetch user posts in fallback:', postErr);
        }
      }

      return {
        user,
        dashboard,
        publisher_eligibility,
        posts: userPosts,
        bookmarks: {
          news: Array.isArray(newsBookmarks) ? newsBookmarks : [],
          posts: Array.isArray(postBookmarks) ? postBookmarks : [],
        },
        rewards: null,
        errors: {},
      };
    }
  },

  getCommunity: async (params?: {
    limit?: number;
    cursor?: string;
  }): Promise<CommunityScreenResponse> => {
    try {
      return await request<CommunityScreenResponse>({
        url: API_ROUTES.screens.community,
        method: 'GET',
        params,
      });
    } catch (commErr) {
      console.warn('[screensApi.getCommunity] /screens/community failed, falling back to modular endpoints:', commErr);
      const [feedRes, trendingRes] = await Promise.allSettled([
        postsApi.getPublicFeed(params?.limit ?? 30, params?.cursor),
        postsApi.getTrendingHashtags(10),
      ]);

      return {
        feed: feedRes.status === 'fulfilled' ? feedRes.value : { posts: [], has_more: false, next_cursor: null },
        trending_hashtags: trendingRes.status === 'fulfilled' ? (trendingRes.value as any) : [],
        bookmarks: null,
        errors: {},
      };
    }
  },

  getShorts: async (params?: {
    language?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ShortsScreenResponse> => {
    return await request<ShortsScreenResponse>({
      url: API_ROUTES.screens.shorts,
      method: 'GET',
      params,
    });
  },

  getDiscover: async (params?: {
    state_id?: number;
    limit?: number;
  }): Promise<DiscoverScreenResponse> => {
    return await request<DiscoverScreenResponse>({
      url: API_ROUTES.screens.discover,
      method: 'GET',
      params,
    });
  },

  getLocal: async (params?: {
    state?: string;
    district?: string;
    city?: string;
    state_id?: number;
    district_id?: number;
    city_id?: number;
    limit?: number;
    cursor?: string;
  }): Promise<LocalScreenResponse> => {
    return await request<LocalScreenResponse>({
      url: API_ROUTES.screens.local,
      method: 'GET',
      params,
    });
  },

  getNotifications: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<NotificationsScreenResponse> => {
    return await request<NotificationsScreenResponse>({
      url: API_ROUTES.screens.notifications,
      method: 'GET',
      params,
    });
  },
};
