import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { newsApi } from '@/services/api/news';
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
      userName?: string;
      userAvatar?: string;
    }) => newsApi.addComment(uid, { comment_text }),

    // Optimistic update — works with InfiniteData<CommentsPage>
    onMutate: async ({ uid, comment_text, userName, userAvatar }) => {
      await queryClient.cancelQueries({ queryKey: newsKeys.comments(uid) });

      // Snapshot the whole infinite data object for rollback.
      const previousData = queryClient.getQueryData(newsKeys.comments(uid));

      const optimisticComment: NewsComment = {
        id: Date.now(),           // temporary; replaced after server refetch
        user_uid: '__optimistic__',
        user_name: userName || 'You',
        user_avatar: userAvatar,
        comment_text,
        created_at: new Date().toISOString(),
        likes_count: 0,
      };

      // Prepend to the first page so it appears at the top of the list.
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
                  comments: [optimisticComment, ...p.comments],
                }
              : p
          );
          return { ...old, pages };
        }
      );

      return { previousData, uid };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(newsKeys.comments(context.uid), context.previousData);
      }
    },

    // Always refetch to replace the optimistic comment with the real one.
    onSettled: (_data, _err, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.comments(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
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

      return { previousData, uid };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(newsKeys.comments(context.uid), context.previousData);
      }
    },
    onSettled: (_data, _err, { uid }) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.comments(uid) });
      queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
    },
  });
}