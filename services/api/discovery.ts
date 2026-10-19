import { request } from './client';
import { API_ROUTES } from './routes';
import { NewsArticle } from './news';
import type { Post } from './posts';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface DiscoveryHomeResponse {
  // Since we don't know the exact structure, we use any for now, 
  // but it usually contains sections like trending, categories, etc.
  [key: string]: any;
}

export interface Hashtag {
  name: string;
  count?: number;
  trending_score?: number;
}

// ─── Discovery API ──────────────────────────────────────────────────────────

export const discoveryApi = {
  /**
   * GET /discovery/home
   * Get Home Feed for Discovery tab
   */
  getDiscoveryHome: async (limit: number = 20): Promise<DiscoveryHomeResponse> => {
    return await request<DiscoveryHomeResponse>({
      url: API_ROUTES.discovery.home,
      method: 'GET',
      params: { limit },
    });
  },

  /**
   * GET /discovery/search
   * Unified Discovery Search
   */
  search: async (query: string, limit: number = 20): Promise<any[]> => {
    const res = await request<any>({
      url: API_ROUTES.discovery.search,
      method: 'GET',
      params: { query, limit },
    });
    if (res && Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && (Array.isArray(res.news) || Array.isArray(res.posts))) {
      return [...(res.news || []), ...(res.posts || [])];
    }
    return [];
  },

  /**
   * GET /discovery/category/{category_id}
   * Explore content by category with pagination
   */
  getCategoryExplore: async (categoryId: number, cursor: string | null = null, limit: number = 20): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.discovery.category(categoryId),
      method: 'GET',
      params: { cursor, limit },
    });
  },

  /**
   * GET /discovery/related
   * Related content for detail pages
   */
  getRelatedContent: async (contentUid: string, contentType: 'news' | 'post' = 'news', limit: number = 5): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.discovery.related,
      method: 'GET',
      params: { content_uid: contentUid, content_type: contentType, limit },
    });
  },

  /**
   * GET /discovery/trending
   * Quick trending refresh (news/discovery)
   */
  getTrending: async (limit: number = 10): Promise<NewsArticle[]> => {
    const res = await request<any>({
      url: API_ROUTES.discovery.trending,
      method: 'GET',
      params: { limit },
    });
    if (res && Array.isArray(res)) return res;
    if (res && Array.isArray(res.news)) return res.news;
    if (res && Array.isArray(res.articles)) return res.articles;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  },

  /**
   * GET /posts/hashtags/trending
   * Get trending hashtags
   */
  getTrendingHashtags: async (limit: number = 10): Promise<Hashtag[]> => {
    const res = await request<any>({
      url: API_ROUTES.discovery.trendingHashtags,
      method: 'GET',
      params: { limit },
    });
    return res?.hashtags || [];
  },

  /**
   * GET /posts/hashtags/suggestions
   * Get hashtag suggestions while typing
   */
  getHashtagSuggestions: async (query: string, limit: number = 10): Promise<Hashtag[]> => {
    const res = await request<any>({
      url: API_ROUTES.discovery.hashtagSuggestions,
      method: 'GET',
      params: { query, limit },
    });
    return res?.hashtags || [];
  },

  /**
   * GET /posts/hashtag/{hashtag_name}/posts
   * Get posts by hashtag
   */
  getPostsByHashtag: async (hashtagName: string, limit: number = 20): Promise<Post[]> => {
    return await request<Post[]>({
      url: API_ROUTES.discovery.byHashtag(hashtagName),
      method: 'GET',
      params: { limit },
    });
  },
};
