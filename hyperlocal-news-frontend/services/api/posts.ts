// services/api/posts.ts
import { API_ROUTES } from './routes';
import { request } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Post {
  id: number;
  post_uid: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  user_uid: string;
  user_name: string;
  user_display_name: string;
  user_profile_picture: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  time_ago: string;
  hashtags: string[];
  is_liked: boolean;
}

export interface PostComment {
  id: number;
  post_uid: string;
  user_uid: string;
  user_name: string;
  user_avatar?: string | null;
  comment_text: string;
  created_at: string;
  likes_count?: number;
  is_liked?: boolean;
}

export interface PostFeedResponse {
  posts: Post[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface UserPostsResponse {
  user: {
    user_uid: string;
    user_name: string;
    display_name: string;
    profile_picture: string | null;
  };
  posts: Post[];
  total: number;
}

export interface TrendingHashtagsResponse {
  hashtags: string[];
}

export interface HashtagSuggestionsResponse {
  hashtags: string[];
}

export interface CreatePostResponse {
  success: boolean;
  message: string;
  post: {
    post_uid: string;
    content: string | null;
    image_url: string | null;
    video_url: string | null;
    hashtags: string[];
    created_at: string;
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const postsApi = {
  /**
   * POST /posts/
   * Create a new post
   */
  createPost: async (data: {
    content: string | null;
    image_url?: string | null;
    video_url?: string | null;
    hashtags?: string[];
  }): Promise<CreatePostResponse> => {
    return await request<CreatePostResponse>({
      url: API_ROUTES.posts.create,
      method: 'POST',
      data,
    });
  },

  /**
   * GET /posts/feed
   * Get public feed with pagination
   */
  getPublicFeed: async (limit = 20, cursor: string | null = null): Promise<PostFeedResponse> => {
    return await request<PostFeedResponse>({
      url: API_ROUTES.posts.feed,
      method: 'GET',
      params: {
        limit,
        cursor,
      },
    });
  },

  /**
   * GET /posts/{post_uid}
   * Get single post by post_uid
   */
  getById: async (postUid: string): Promise<Post> => {
    return await request<Post>({
      url: API_ROUTES.posts.byId(postUid),
      method: 'GET',
    });
  },

  /**
   * PUT /posts/{post_uid}
   * Update a post
   */
  updatePost: async (
    postUid: string,
    data: {
      content?: string | null;
      image_url?: string | null;
      video_url?: string | null;
    }
  ): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.posts.updatePost(postUid),
      method: 'PUT',
      data,
    });
  },

  /**
   * DELETE /posts/{post_uid}
   * Delete a post
   */
  deletePost: async (postUid: string): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.posts.deletePost(postUid),
      method: 'DELETE',
    });
  },

  /**
   * GET /posts/user/{user_uid}
   * Get posts by specific user (user_uid)
   */
  getUserPosts: async (userUid: string, limit = 20): Promise<UserPostsResponse> => {
    return await request<UserPostsResponse>({
      url: API_ROUTES.posts.userPosts(userUid),
      method: 'GET',
      params: {
        limit,
      },
    });
  },

  /**
   * PATCH /posts/{post_uid}/hashtags
   * Edit hashtags of a post (Moderator+)
   */
  editPostHashtags: async (postUid: string, hashtags: string[]): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.posts.editHashtags(postUid),
      method: 'PATCH',
      data: hashtags,
    });
  },

  /**
   * POST /posts/{post_uid}/like
   * Like/Unlike a post
   */
  likePost: async (postUid: string): Promise<{ liked: boolean; like_count: number }> => {
    return await request<{ liked: boolean; like_count: number }>({
      url: API_ROUTES.posts.like(postUid),
      method: 'POST',
    });
  },

  /**
   * POST /posts/{post_uid}/comment
   * Add comment to post
   */
  addComment: async (postUid: string, commentText: string): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.posts.comment(postUid),
      method: 'POST',
      data: {
        comment_text: commentText,
      },
    });
  },

  /**
   * GET /posts/{post_uid}/comments
   * Get comments for a post
   */
  getComments: async (postUid: string, limit = 20, offset = 0): Promise<PostComment[]> => {
    try {
      const res = await request<any>({
        url: API_ROUTES.posts.comments(postUid),
        method: 'GET',
        params: {
          limit,
          offset,
        },
      });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.comments)) return res.comments;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (err) {
      console.warn('Error fetching post comments:', err);
      return [];
    }
  },

  /**
   * POST /posts/{post_uid}/share
   * Share a post to external platforms
   */
  sharePost: async (postUid: string, platform: string | null = null): Promise<any> => {
    return await request<any>({
      url: API_ROUTES.posts.share(postUid),
      method: 'POST',
      data: {
        platform,
      },
    });
  },

  /**
   * GET /posts/hashtags/trending
   * Get trending hashtags
   */
  getTrendingHashtags: async (limit = 10): Promise<TrendingHashtagsResponse> => {
    return await request<TrendingHashtagsResponse>({
      url: API_ROUTES.posts.trendingHashtags,
      method: 'GET',
      params: {
        limit,
      },
    });
  },

  /**
   * GET /posts/hashtags/suggestions
   * Get hashtag suggestions
   */
  getHashtagSuggestions: async (query?: string, limit = 10): Promise<HashtagSuggestionsResponse> => {
    return await request<HashtagSuggestionsResponse>({
      url: API_ROUTES.posts.hashtagSuggestions,
      method: 'GET',
      params: {
        query,
        limit,
      },
    });
  },
};