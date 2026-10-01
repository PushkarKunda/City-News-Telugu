import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { newsApi } from '@/services/api/news';
import { useCommentCountStore } from '@/store/commentCountStore';
import type {
  NewsFilters,
  LocationNewsParams,
  CreateNewsPayload,
  UpdateNewsPayload,
  CommentsPage,
  NewsComment,
} from '@/services/api/news';


// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const newsKeys = {
  all: ['news'] as const,
  feed: (filters?: NewsFilters) => ['news', 'feed', filters] as const,
  categories: ['news', 'categories'] as const,
  categoryNews: (id: number) => ['news', 'category', id] as const,
  locationNews: (params: LocationNewsParams) =>
    ['news', 'location', params] as const,
  breaking: ['news', 'breaking'] as const,
  trending: ['news', 'trending'] as const,
  popular: ['news', 'popular'] as const,
  shorts: ['news', 'shorts'] as const,
  single: (uid: string) => ['news', 'single', uid] as const,
  engagement: (uid: string) => ['news', 'engagement', uid] as const,
  comments: (uid: string) => ['news', 'comments', uid] as const,
  search: (query: string) => ['news', 'search', query] as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES - FEED & DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /news/v1/feed
 * Full mixed feed: news + ads + sponsored
 */
export function useNewsFeed(filters?: NewsFilters) {
  return useQuery({
    queryKey: newsKeys.feed(filters),
    queryFn: () => newsApi.getFeed({ limit: 20, ...filters }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * GET /categories/all
 */
export function useCategories() {
  return useQuery({
    queryKey: newsKeys.categories,
    queryFn: () => newsApi.getAllCategories(),
    staleTime: 1000 * 60 * 60,
    select: (data) =>
      data
        .filter((cat) => cat.is_active)
        .sort((a, b) => a.display_order - b.display_order),
  });
}

/**
 * GET /categories/:id/news
 */
export function useCategoryNews(categoryId: number | null) {
  return useQuery({
    queryKey: newsKeys.categoryNews(categoryId!),
    queryFn: () => newsApi.getNewsByCategory(categoryId!),
    enabled: categoryId !== null && categoryId > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * GET /news/v1/news/location
 */
export function useLocationNews(params: LocationNewsParams) {
  return useQuery({
    queryKey: newsKeys.locationNews(params),
    queryFn: () => newsApi.getByLocation(params),
    enabled: Boolean(params.state || params.district || params.city),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * GET /news/v1/news/breaking
 */
export function useBreakingNews() {
  return useQuery({
    queryKey: newsKeys.breaking,
    queryFn: () => newsApi.getBreaking(),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * GET /news/v1/news/analytics/trending
 */
export function useTrendingNews() {
  return useQuery({
    queryKey: newsKeys.trending,
    queryFn: () => newsApi.getTrending(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * GET /news/v1/news/popular
 */
export function usePopularNews() {
  return useQuery({
    queryKey: newsKeys.popular,
    queryFn: () => newsApi.getPopular(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * GET /shorts/feed
 */
export function useNewsShorts(language: string = 'te') {
  return useQuery({
    queryKey: [...newsKeys.shorts, language],
    queryFn: () => newsApi.getShorts({ language, limit: 20 }),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * GET /news/v1/news/:uid
 */
export function useNewsArticle(uid: string | null) {
  return useQuery({
    queryKey: newsKeys.single(uid!),
    queryFn: () => newsApi.getById(uid!),
    enabled: Boolean(uid),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * GET /news/v1/news/:uid/engagement
 */
export function useNewsEngagement(uid: string | null) {
  return useQuery({
    queryKey: newsKeys.engagement(uid!),
    queryFn: () => newsApi.getEngagement(uid!),
    enabled: Boolean(uid),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * GET /news/v1/news/:uid/comments  — infinite / paginated
 *
 * Returns pages of CommentsPage. The UI flattens pages into a single list
 * and calls fetchNextPage() via FlatList onEndReached.
 */
export function useNewsComments(uid: string | null) {
  return useInfiniteQuery<CommentsPage, Error>({
    queryKey: newsKeys.comments(uid!),
    queryFn: ({ pageParam }) =>
      newsApi.getComments(uid!, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    enabled: Boolean(uid),
    staleTime: 1000 * 30, // 30 s
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS - CREATE/UPDATE/DELETE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /news/v1/news
 */
export function useCreateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNewsPayload) => newsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}

/**
 * PUT /news/v1/news/:uid
 */
export function useUpdateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      payload,
    }: {
      uid: string;
      payload: UpdateNewsPayload;
    }) => newsApi.update(uid, payload),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}

/**
 * DELETE /news/v1/user/news/:uid
 */
export function useDeleteNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) => newsApi.delete(uid),
    onSuccess: (_, uid) => {
      queryClient.removeQueries({ queryKey: newsKeys.single(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.all });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS - ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /news/v1/user/news/:uid/like
 */
export function useLikeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) => newsApi.like(uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
    },
  });
}

/**
 * DELETE /news/v1/user/news/:uid/like
 */
export function useUnlikeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) => newsApi.unlike(uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
    },
  });
}

/**
 * POST /news/v1/user/news/:uid/view
 */
export function useRecordView() {
  return useMutation({
    mutationFn: (uid: string) => newsApi.recordView(uid),
  });
}

/**
 * POST /news/v1/user/news/:uid/share
 */
export function useRecordShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, platform }: { uid: string; platform?: string }) =>
      newsApi.recordShare(uid, platform),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
    },
  });
}

/**
 * POST /news/v1/user/news/:uid/comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      comment_text,
    }: {
      uid: string;
      comment_text: string;
      tempId?: number;
      userName?: string;
      userAvatar?: string;
    }) => newsApi.addComment(uid, { comment_text }),

    // Optimistic update — works with InfiniteData<CommentsPage>
    onMutate: async ({ uid, comment_text, tempId, userName, userAvatar }) => {
      await queryClient.cancelQueries({ queryKey: newsKeys.comments(uid) });

      // Snapshot the whole infinite data object for rollback.
      const previousData = queryClient.getQueryData(newsKeys.comments(uid));
      const targetTempId = tempId || Date.now();

      // Instantly update shared count store across cards, headers, and detail screens
      useCommentCountStore.getState().incrementCount(uid);

      const optimisticComment: NewsComment = {
        id: targetTempId,
        user_uid: '__optimistic__',
        user_name: userName || 'You',
        user_avatar: userAvatar,
        comment_text,
        created_at: new Date().toISOString(),
        likes_count: 0,
        status: 'sending',
      };

      // Prepend to the first page so it appears at the top of the list immediately.
      queryClient.setQueryData<{ pages: CommentsPage[]; pageParams: any[] }>(
        newsKeys.comments(uid),
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) {
            return {
              pages: [
                {
                  comments: [optimisticComment],
                  page: 1,
                  limit: 20,
                  total: 1,
                  has_more: false,
                },
              ],
              pageParams: [1],
            };
          }
          const pages = old.pages.map((p, i) =>
            i === 0
              ? {
                  ...p,
                  total: (p.total || 0) + 1,
                  comments: [
                    optimisticComment,
                    ...p.comments.filter((c) => c.id !== targetTempId),
                  ],
                }
              : p
          );
          return { ...old, pages };
        }
      );

      // Optimistically update engagement cache for the article
      queryClient.setQueryData(newsKeys.engagement(uid), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total_comments: (old.total_comments || old.comments || 0) + 1,
          comments: (old.comments || 0) + 1,
        };
      });

      return { previousData, uid, tempId: targetTempId };
    },

    onSuccess: (res, vars, context) => {
      const tempId = context?.tempId || vars.tempId;
      const realId = res?.id || res?.data?.id || res?.comment?.id;
      const realCreatedAt = res?.created_at || res?.data?.created_at || res?.comment?.created_at;

      // Sync confirmed count with shared store if returned by backend
      const confirmedCount = res?.comments_count ?? res?.data?.comments_count;
      if (typeof confirmedCount === 'number') {
        useCommentCountStore.getState().setCount(vars.uid, confirmedCount);
      }

      // Replace the optimistic comment with confirmed real comment
      queryClient.setQueryData<{ pages: CommentsPage[]; pageParams: any[] }>(
        newsKeys.comments(vars.uid),
        (old) => {
          if (!old || !old.pages) return old;
          const pages = old.pages.map((p) => ({
            ...p,
            comments: p.comments.map((c) => {
              if (c.id === tempId) {
                return {
                  ...c,
                  id: realId || c.id,
                  created_at: realCreatedAt || c.created_at,
                  status: 'sent' as const,
                };
              }
              return c;
            }),
          }));
          return { ...old, pages };
        }
      );
    },

    onError: (_err, vars, context) => {
      // Roll back global count
      useCommentCountStore.getState().decrementCount(vars.uid);

      // Mark the comment as failed so user can tap Retry
      const tempId = context?.tempId || vars.tempId;
      queryClient.setQueryData<{ pages: CommentsPage[]; pageParams: any[] }>(
        newsKeys.comments(vars.uid),
        (old) => {
          if (!old || !old.pages) return old;
          const pages = old.pages.map((p) => ({
            ...p,
            total: Math.max(0, (p.total || 1) - 1),
            comments: p.comments.map((c) => {
              if (c.id === tempId) {
                return {
                  ...c,
                  status: 'failed' as const,
                };
              }
              return c;
            }),
          }));
          return { ...old, pages };
        }
      );

      // Revert engagement count
      queryClient.setQueryData(newsKeys.engagement(vars.uid), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total_comments: Math.max(0, (old.total_comments || old.comments || 1) - 1),
          comments: Math.max(0, (old.comments || 1) - 1),
        };
      });
    },

    onSettled: (_data, _err, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });
    },
  });
}

/**
 * DELETE /news/v1/user/news/:uid/comment/:id
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, commentId }: { uid: string; commentId: number }) =>
      newsApi.deleteComment(uid, commentId),
    onMutate: async ({ uid, commentId }) => {
      await queryClient.cancelQueries({ queryKey: newsKeys.comments(uid) });
      const previousData = queryClient.getQueryData(newsKeys.comments(uid));

      // Decrement shared count store
      useCommentCountStore.getState().decrementCount(uid);

      queryClient.setQueryData<{ pages: CommentsPage[]; pageParams: any[] }>(
        newsKeys.comments(uid),
        (old) => {
          if (!old || !old.pages) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            total: Math.max(0, (page.total || 1) - 1),
            comments: page.comments.filter((c) => c.id !== commentId),
          }));
          return { ...old, pages };
        }
      );

      queryClient.setQueryData(newsKeys.engagement(uid), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total_comments: Math.max(0, (old.total_comments || old.comments || 1) - 1),
          comments: Math.max(0, (old.comments || 1) - 1),
        };
      });

      return { previousData, uid };
    },
    onSuccess: (res, vars) => {
      const confirmedCount = res?.comments_count;
      if (typeof confirmedCount === 'number') {
        useCommentCountStore.getState().setCount(vars.uid, confirmedCount);
      }
    },
    onError: (_err, vars, context) => {
      useCommentCountStore.getState().incrementCount(vars.uid);
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(newsKeys.comments(context.uid), context.previousData);
      }
    },
    onSettled: (_data, _err, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.comments(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });
    },
  });
}