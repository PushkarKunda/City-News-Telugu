import { API_ROUTES } from './routes';
import { request } from './client';
import { usersApi } from './users';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface NewsLocation {
  city?: string;
  district?: string;
  state?: string;
}

export interface NewsEngagementDetail {
  // API returns these field names
  total_likes?: number;
  total_comments?: number;
  total_shares?: number;
  total_views?: number;
  unique_viewers?: number;
  avg_read_time?: number;

  // Also keep these for backward compatibility
  likes: number;
  comments: number;
  shares: number;
  views: number;
  user_liked: boolean;
}

export interface NewsArticle {
  news_uid: string;
  title: string;
  summary: string;
  image_url?: string;
  created_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  is_breaking: boolean;
  category_names: string[];
  location: NewsLocation;
  source: string;
  source_url?: string;
  source_name?: string;
  position?: number;
  ranking_score?: number;
  engagement?: NewsEngagementDetail;
}

import { Advertisement, SponsoredPost } from './content';


import { Category } from './categories';

export type FeedItemType = 'news' | 'ad' | 'sponsored' | 'event' | 'poll' | 'post';

export interface FeedItem {
  type: FeedItemType;
  data: NewsArticle | Advertisement | SponsoredPost;
  position: number;
  ranking_score?: number;
}

export interface FeedMetadata {
  total_items: number;
  returned_items: number;
  next_cursor: string | null;
  has_more: boolean;
  user_uid: string;
  hashtag_filter: string | null;
  feed_composition: {
    news: number;
    posts: number;
    ads: number;
    sponsored: number;
    events: number;
    polls: number;
  };
  ad_metadata: {
    ads_shown: number;
    premium_ad_shown: boolean;
    sponsored_shown: number;
    events_shown: number;
    polls_shown: number;
  };
  ranking_summary: {
    total_scored: number;
    top_score: number;
    avg_score: number;
  };
}

export interface NewsFeedResponse {
  items: FeedItem[];
  metadata: FeedMetadata;
}

export interface NewsFilters {
  cursor?: string;
  limit?: number;
  hashtag?: string;
  session_id?: string;
  include_ads?: boolean;
  include_sponsored?: boolean;
  include_events?: boolean;
  include_polls?: boolean;
  include_posts?: boolean;
  post_limit?: number;
}

export interface LocationNewsParams {
  state?: string;
  district?: string;
  city?: string;
  limit?: number;
}

export interface SearchNewsParams {
  q?: string;
  state_id?: number;
  district_id?: number;
  city_id?: number;
  category_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ─── CREATE/UPDATE PAYLOADS ────────────────────────────────────────────────

export interface CreateNewsPayload {
  title: string;
  summary: string;
  image_url?: string;
  language_id?: number;
  user_uid?: string; // Optional if auto-filled from auth
  city_id?: number;
  category_ids?: number[];
  source_url?: string;
  source_name?: string;
}

export interface UpdateNewsPayload {
  title?: string;
  summary?: string;
  image_url?: string;
  city_id?: number;
  category_ids?: number[];
  source_url?: string;
  source_name?: string;
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export interface NewsComment {
  id: number;
  user_uid: string;
  user_name: string;
  user_avatar?: string;
  comment_text: string;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
}

export interface CommentsPage {
  comments: NewsComment[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface CreateCommentPayload {
  comment_text: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

export const newsApi = {
  // ─── FEED & DISCOVERY ──────────────────────────────────────────────────

  /**
   * GET /news/v1/feed
   * Full mixed feed: news + ads + sponsored
   */
  getFeed: async (filters?: NewsFilters): Promise<NewsFeedResponse> => {
    try {
      return await request<NewsFeedResponse>({
        url: API_ROUTES.news.feed,
        method: 'GET',
        params: filters,
      });
    } catch (err: any) {
      // If user preferences are missing on the backend (404), create default preferences and retry once
      const isMissingPrefs =
        err?.response?.status === 404 ||
        err?.status === 404 ||
        err?.message?.includes('preferences') ||
        err?.response?.data?.detail?.includes('preferences');

      if (isMissingPrefs) {
        console.warn('[newsApi] User preferences missing on backend (404). Initializing default preferences...');
        try {
          await usersApi.savePreferences({
            language_id: 1, // Telugu
            state_id: 1, // Andhra Pradesh
            district_id: 2, // Bapatla
            city_id: 8, // Bapatla
            category_ids: [1, 2, 3, 4],
          });
          // Retry feed request with newly created preferences
          return await request<NewsFeedResponse>({
            url: API_ROUTES.news.feed,
            method: 'GET',
            params: filters,
          });
        } catch (retryErr) {
          console.error('[newsApi] Failed to recover feed after creating preferences:', retryErr);
        }
      }
      throw err;
    }
  },

  /**
   * GET /news/v1/news/:uid
   * Get single article
   */
  getById: async (uid: string): Promise<NewsArticle> => {
    const res = await request<any>({
      url: API_ROUTES.news.byId(uid),
      method: 'GET',
    });
    if (res && res.news) return res.news;
    if (res && res.article) return res.article;
    if (res && res.data && (res.data.title || res.data.news_uid)) return res.data;
    return res;
  },

  /**
   * GET /news/v1/news/breaking
   */
  getBreaking: async (): Promise<NewsArticle[]> => {
    return await request<NewsArticle[]>({
      url: API_ROUTES.news.breaking,
      method: 'GET',
    });
  },

  /**
   * GET /news/v1/news/location
   * Local news by state/district/city
   */
  getByLocation: async (params: LocationNewsParams): Promise<NewsArticle[]> => {
    return await request<NewsArticle[]>({
      url: API_ROUTES.news.byLocation,
      method: 'GET',
      params,
    });
  },

  /**
   * GET /news/v1/search
   * Search news with filters
   */
  search: async (params: SearchNewsParams): Promise<NewsArticle[]> => {
    return await request<NewsArticle[]>({
      url: API_ROUTES.news.search,
      method: 'GET',
      params,
    });
  },

  // ─── CATEGORIES ────────────────────────────────────────────────────────

  /**
   * GET /categories/all
   */
  getAllCategories: async (): Promise<Category[]> => {
    return await request<Category[]>({
      url: API_ROUTES.categories.all,
      method: 'GET',
    });
  },

  /**
   * GET /categories/:id/news
   */
  getNewsByCategory: async (categoryId: number): Promise<NewsArticle[]> => {
    return await request<NewsArticle[]>({
      url: API_ROUTES.categories.news(categoryId),
      method: 'GET',
    });
  },

  /**
   * GET /news/v1/news/analytics/trending
   */
  getTrending: async (): Promise<NewsArticle[]> => {
    const res = await request<any>({
      url: API_ROUTES.news.trending,
      method: 'GET',
    });
    if (res && Array.isArray(res)) return res;
    if (res && Array.isArray(res.news)) return res.news;
    if (res && Array.isArray(res.articles)) return res.articles;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  },

  /**
   * GET /news/v1/news/popular
   */
  getPopular: async (): Promise<NewsArticle[]> => {
    const res = await request<any>({
      url: API_ROUTES.news.popular,
      method: 'GET',
    });
    if (res && Array.isArray(res)) return res;
    if (res && Array.isArray(res.news)) return res.news;
    if (res && Array.isArray(res.articles)) return res.articles;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  },

  /**
   * GET /shorts/feed
   */
  getShorts: async (params?: { language?: string; limit?: number }): Promise<any[]> => {
    try {
      const res = await request<any>({
        url: API_ROUTES.news.shortsFeed,
        method: 'GET',
        params: {
          language: params?.language || 'te',
          limit: params?.limit || 20,
        },
      });
      const itemsList = Array.isArray(res)
        ? res
        : res && Array.isArray(res.items)
          ? res.items
          : [];
      return itemsList.map((item: any) => ({
        ...item,
        news_uid: item.video_id || String(item.id),
      }));
    } catch (err) {
      console.warn('[newsApi] getShorts API failed, trying legacy route:', err);
      try {
        const legacy = await request<any[]>({
          url: API_ROUTES.news.shorts,
          method: 'GET',
        });
        if (Array.isArray(legacy)) {
          return legacy.map((a: any) => ({
            id: a.id || Date.now(),
            video_id: a.news_uid || String(a.id),
            title: a.title || '',
            thumbnail_url: a.image_url || '',
            channel_title: a.source || 'News',
            video_url: a.image_url || '',
            views: a.views || 0,
            likes: a.likes || 0,
            published_at: a.published_at || new Date().toISOString(),
            source: 'app',
            news_uid: a.news_uid || String(a.id),
          }));
        }
      } catch (_) {}
      return [];
    }
  },

  /**
   * GET /news/v1/news/:uid/engagement
   */
  getEngagement: async (uid: string): Promise<NewsEngagementDetail> => {
    return await request<NewsEngagementDetail>({
      url: API_ROUTES.news.engagement(uid),
      method: 'GET',
    });
  },

  // ─── CREATE/UPDATE/DELETE (PUBLISHER) ──────────────────────────────────

  /**
   * POST /news/v1/news
   * Create new news article (Publishers only)
   * Returns: { success, message, news, status, next_steps }
   */
  create: async (payload: CreateNewsPayload): Promise<{
    success: boolean;
    message: string;
    news: NewsArticle;
    status: string;
    next_steps: string;
  }> => {
    return await request({
      url: API_ROUTES.news.create,
      method: 'POST',
      data: payload,
    });
  },

  /**
   * PUT /news/v1/news/:uid
   * Update existing article (Publisher only)
   */
  update: async (
    uid: string,
    payload: UpdateNewsPayload
  ): Promise<NewsArticle> => {
    return await request<NewsArticle>({
      url: API_ROUTES.news.byId(uid),
      method: 'PUT',
      data: payload,
    });
  },

  /**
   * DELETE /news/v1/user/news/:uid
   * Delete article (Publisher only)
   */
  delete: async (uid: string): Promise<void> => {
    await request({
      url: API_ROUTES.news.deleteNews(uid),
      method: 'DELETE',
    });
  },

  // ─── ENGAGEMENT ────────────────────────────────────────────────────────

  /**
   * POST /news/v1/user/news/:uid/like
   */
  like: async (uid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.like(uid), method: 'POST' });
  },

  /**
   * DELETE /news/v1/user/news/:uid/like
   */
  unlike: async (uid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.like(uid), method: 'DELETE' });
  },

  /**
   * POST /news/v1/user/news/:uid/view
   */
  recordView: async (uid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.view(uid), method: 'POST' });
  },

  /**
   * POST /news/v1/user/news/:uid/share
   */
  recordShare: async (uid: string, platform?: string): Promise<void> => {
    await request({
      url: API_ROUTES.news.share(uid),
      method: 'POST',
      data: { platform },
    });
  },

  // ─── COMMENTS ──────────────────────────────────────────────────────────

  /**
   * GET /news/v1/news/:uid/comments?page=1&limit=20
   * Returns paginated comments with has_more flag.
   */
  getComments: async (uid: string, page = 1, limit = 20): Promise<CommentsPage> => {
    try {
      const res = await request<any>({
        url: API_ROUTES.news.comments(uid),
        method: 'GET',
        params: { page, limit },
      });

      // Normalise to CommentsPage regardless of server response shape
      let items: NewsComment[] = [];
      let total = 0;

      if (Array.isArray(res)) {
        items = res;
        total = res.length;
      } else if (res && Array.isArray(res.comments)) {
        items = res.comments;
        total = res.total ?? res.total_count ?? res.count ?? items.length;
      } else if (res && Array.isArray(res.items)) {
        items = res.items;
        total = res.total ?? items.length;
      } else if (res && Array.isArray(res.data)) {
        items = res.data;
        total = res.total ?? items.length;
      }

      const has_more = items.length === limit;

      return { comments: items, page, limit, total, has_more };
    } catch (err) {
      console.warn('[newsApi] getComments failed:', err);
      return { comments: [], page, limit, total: 0, has_more: false };
    }
  },

  /**
   * POST /news/v1/user/news/:uid/comment
   * Body: { comment_text: string }
   * Returns: string (success message)
   */
  addComment: async (
    uid: string,
    payload: CreateCommentPayload
  ): Promise<any> => {
    try {
      return await request<any>({
        url: API_ROUTES.news.comment(uid),
        method: 'POST',
        data: payload,
      });
    } catch (err: any) {
      // Backend resiliency:
      // The backend successfully writes the news comment to Postgres,
      // but returns HTTP 500 when points calculation/notification fails.
      const is500 = err?.response?.status === 500 || err?.status === 500;
      if (is500) {
        console.warn('[newsApi] Comment POST returned 500, verifying database persistence...');
        try {
          await new Promise((resolve) => setTimeout(resolve, 250));
          let page = await newsApi.getComments(uid, 1, 10);
          let found = page.comments.some((c) => c.comment_text === payload.comment_text);
          if (!found) {
            await new Promise((resolve) => setTimeout(resolve, 350));
            page = await newsApi.getComments(uid, 1, 10);
            found = page.comments.some((c) => c.comment_text === payload.comment_text);
          }
          if (found) {
            console.log('[newsApi] Comment verified in DB despite backend 500 error.');
            return { success: true, message: 'Comment posted successfully' };
          }
        } catch (checkErr) {
          console.warn('[newsApi] Comment persistence check error:', checkErr);
        }
      }
      throw err;
    }
  },

  /**
   * DELETE /news/v1/user/news/:uid/comment/:id
   */
  deleteComment: async (uid: string, commentId: number): Promise<void> => {
    await request({
      url: API_ROUTES.news.deleteComment(uid, commentId),
      method: 'DELETE',
    });
  },
};