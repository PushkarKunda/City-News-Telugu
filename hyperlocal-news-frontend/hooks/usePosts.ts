// hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, type Post, type PostComment } from '@/services/api/posts';

export const postKeys = {
  all: ['posts'] as const,
  feed: (cursor?: string | null) => ['posts', 'feed', cursor] as const,
  single: (postUid: string) => ['posts', 'single', postUid] as const,
  comments: (postUid: string) => ['posts', 'comments', postUid] as const,
  userPosts: (userUid: string) => ['posts', 'user', userUid] as const,
  trendingHashtags: ['posts', 'hashtags', 'trending'] as const,
  hashtagSuggestions: (query?: string) => ['posts', 'hashtags', 'suggestions', query] as const,
};

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * GET /posts/feed
 * Hook to fetch public posts feed
 */
export function usePublicPostsFeed(limit = 20, cursor: string | null = null) {
  return useQuery({
    queryKey: postKeys.feed(cursor),
    queryFn: () => postsApi.getPublicFeed(limit, cursor),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

/**
 * GET /posts/{post_uid}
 * Hook to fetch single post by post_uid
 */
export function usePostByUid(postUid: string | null) {
  return useQuery({
    queryKey: postKeys.single(postUid!),
    queryFn: () => postsApi.getById(postUid!),
    enabled: Boolean(postUid),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * GET /posts/user/{user_uid}
 * Hook to fetch posts by user_uid
 */
export function useUserPosts(userUid: string | null, limit = 20) {
  return useQuery({
    queryKey: postKeys.userPosts(userUid!),
    queryFn: () => postsApi.getUserPosts(userUid!, limit),
    enabled: Boolean(userUid),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * GET /posts/{post_uid}/comments
 * Hook to fetch comments for a post
 */
export function usePostComments(postUid: string | null) {
  return useQuery({
    queryKey: postKeys.comments(postUid!),
    queryFn: () => postsApi.getComments(postUid!),
    enabled: Boolean(postUid),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * GET /posts/hashtags/trending
 * Hook to fetch trending hashtags
 */
export function useTrendingHashtags(limit = 10) {
  return useQuery({
    queryKey: postKeys.trendingHashtags,
    queryFn: () => postsApi.getTrendingHashtags(limit),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * GET /posts/hashtags/suggestions
 * Hook to fetch hashtag suggestions
 */
export function useHashtagSuggestions(query?: string, limit = 10) {
  return useQuery({
    queryKey: postKeys.hashtagSuggestions(query),
    queryFn: () => postsApi.getHashtagSuggestions(query, limit),
    staleTime: 1000 * 60 * 5,
  });
}

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/**
 * POST /posts/
 * Hook to create a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      content: string | null;
      image_url?: string | null;
      video_url?: string | null;
      hashtags?: string[];
    }) => postsApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * PUT /posts/{post_uid}
 * Hook to update a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postUid,
      data,
    }: {
      postUid: string;
      data: { content?: string | null; image_url?: string | null; video_url?: string | null };
    }) => postsApi.updatePost(postUid, data),
    onSuccess: (_, { postUid }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.single(postUid) });
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * DELETE /posts/{post_uid}
 * Hook to delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postUid: string) => postsApi.deletePost(postUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * PATCH /posts/{post_uid}/hashtags
 * Hook to edit post hashtags
 */
export function useEditPostHashtags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postUid, hashtags }: { postUid: string; hashtags: string[] }) =>
      postsApi.editPostHashtags(postUid, hashtags),
    onSuccess: (_, { postUid }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.single(postUid) });
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * POST /posts/{post_uid}/like
 * Hook to toggle like on a post
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postUid: string) => postsApi.likePost(postUid),
    onSuccess: (data, postUid) => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * POST /posts/{post_uid}/comment
 * Hook to add a comment to a post
 */
export function useAddPostComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postUid, commentText }: { postUid: string; commentText: string }) =>
      postsApi.addComment(postUid, commentText),

    // Optimistic update: inject the new comment immediately so the user
    // sees it without waiting for the server round-trip.
    onMutate: async ({ postUid, commentText }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic data.
      await queryClient.cancelQueries({ queryKey: postKeys.comments(postUid) });

      // Snapshot the previous value for rollback on error.
      const previousComments = queryClient.getQueryData<any[]>(postKeys.comments(postUid));

      // Build an optimistic comment object that matches PostComment shape.
      const optimisticComment = {
        id: Date.now(), // temporary unique id
        post_uid: postUid,
        user_uid: '__optimistic__',
        user_name: 'You',
        comment_text: commentText,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<any[]>(postKeys.comments(postUid), (old) => [
        optimisticComment,
        ...(old ?? []),
      ]);

      return { previousComments, postUid };
    },

    // On error, roll back to the snapshot.
    onError: (_err, _vars, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(postKeys.comments(context.postUid), context.previousComments);
      }
    },

    // Always refetch after success or error to sync with the server.
    onSettled: (_data, _err, { postUid }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(postUid) });
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}


/**
 * POST /posts/{post_uid}/share
 * Hook to share a post
 */
export function useSharePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postUid, platform }: { postUid: string; platform?: string }) =>
      postsApi.sharePost(postUid, platform || 'native'),
    onSuccess: (_, { postUid }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
