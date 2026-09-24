// services/api/engagement.ts

import { API_ROUTES } from './routes';
import { request } from './client';
import type { NewsArticle, NewsComment, CreateCommentPayload } from './news';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ContentType = 'news' | 'post' | 'event' | 'poll';

export interface Bookmark {
  id: number;
  user_uid: string;
  content_type: ContentType;
  content_uid: string;
  created_at: string;
  news?: NewsArticle; // Keep for backward compatibility if needed
  post?: any;
  content?: NewsArticle | any; // Actual field returned by the backend
}

export interface BookmarksListResponse {
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
  items: Bookmark[];
}

export interface BookmarkCheckResponse {
  is_bookmarked: boolean;
  bookmark_id?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

export const engagementApi = {

  // ─── BOOKMARKS ──────────────────────────────────────────────────────────

  /**
   * GET /engagement/bookmarks?content_type=news&limit=50&offset=0
   * ✅ contentType is now required parameter, no default
   */
  getBookmarks: async (
    contentType: ContentType,
    limit: number = 50,
    offset: number = 0
  ): Promise<Bookmark[]> => {
    const response = await request<BookmarksListResponse>({
      url: API_ROUTES.engagement.bookmarks,
      method: 'GET',
      params: { content_type: contentType, limit, offset },
    });
    return response.items ?? [];
  },

  /**
   * POST /engagement/bookmarks
   * { content_type, content_uid }
   * ✅ contentType is now required parameter
   */
  addBookmark: async (
    contentUid: string,
    contentType: ContentType
  ): Promise<Bookmark> => {
    return await request<Bookmark>({
      url: API_ROUTES.engagement.bookmarks,
      method: 'POST',
      data: {
        content_type: contentType,
        content_uid: contentUid,
      },
    });
  },

  /**
   * DELETE /engagement/bookmarks?content_type=news&content_uid=xxx
   * ✅ contentType is now required parameter
   */
  removeBookmark: async (
    contentUid: string,
    contentType: ContentType
  ): Promise<void> => {
    await request({
      url: API_ROUTES.engagement.bookmarks,
      method: 'DELETE',
      params: {
        content_type: contentType,
        content_uid: contentUid,
      },
    });
  },

  /**
   * GET /engagement/bookmarks/check?content_type=news&content_uid=xxx
   * ✅ contentType is now required parameter
   */
  checkBookmark: async (
    contentUid: string,
    contentType: ContentType
  ): Promise<BookmarkCheckResponse> => {
    return await request<BookmarkCheckResponse>({
      url: API_ROUTES.engagement.checkBookmark,
      method: 'GET',
      params: {
        content_type: contentType,
        content_uid: contentUid,
      },
    });
  },

  // ─── LIKES ──────────────────────────────────────────────────────────────

  like: async (newsUid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.like(newsUid), method: 'POST' });
  },

  unlike: async (newsUid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.like(newsUid), method: 'DELETE' });
  },

  // ─── VIEWS & SHARES ─────────────────────────────────────────────────────

  recordView: async (newsUid: string): Promise<void> => {
    await request({ url: API_ROUTES.news.view(newsUid), method: 'POST' });
  },

  recordShare: async (newsUid: string, platform?: string): Promise<void> => {
    await request({
      url: API_ROUTES.news.share(newsUid),
      method: 'POST',
      data: { platform },
    });
  },
};

export type { NewsComment, CreateCommentPayload } from './news';