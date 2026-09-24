// hooks/useEngagement.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { engagementApi, ContentType } from '@/services/api/engagement';
import { useAuthStore } from '@/store/authStore';

export const engagementKeys = {
  bookmarks: (type: ContentType) =>
    ['engagement', 'bookmarks', type] as const,
  checkBookmark: (contentUid: string, type: ContentType) =>
    ['engagement', 'check-bookmark', type, contentUid] as const,
};

/**
 * GET /engagement/bookmarks
 * ✅ contentType is now REQUIRED parameter
 */
export function useBookmarks(contentType: ContentType) {
  return useQuery({
    queryKey: engagementKeys.bookmarks(contentType),
    queryFn: () => engagementApi.getBookmarks(contentType),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * GET /engagement/bookmarks/check
 * ✅ contentType is now REQUIRED parameter
 */
export function useCheckBookmark(
  contentUid: string | null,
  contentType: ContentType
) {
  return useQuery({
    queryKey: engagementKeys.checkBookmark(contentUid!, contentType),
    queryFn: () => {
      if (!contentUid) throw new Error('Content UID required');
      return engagementApi.checkBookmark(contentUid, contentType);
    },
    enabled: Boolean(contentUid),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * POST /engagement/bookmarks
 * ✅ contentType is now REQUIRED in the mutation payload
 */
export function useAddBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      contentUid,
      contentType
    }: {
      contentUid: string;
      contentType: ContentType; // ✅ REQUIRED
    }) => {
      if (!user?.user_uid) throw new Error('Not authenticated');
      return engagementApi.addBookmark(contentUid, contentType);
    },
    onMutate: async ({ contentUid, contentType }) => {
      await queryClient.cancelQueries({
        queryKey: engagementKeys.bookmarks(contentType),
      });
      await queryClient.cancelQueries({
        queryKey: engagementKeys.checkBookmark(contentUid, contentType),
      });

      const previousBookmarks = queryClient.getQueryData<any[]>(
        engagementKeys.bookmarks(contentType)
      );
      const previousCheck = queryClient.getQueryData(
        engagementKeys.checkBookmark(contentUid, contentType)
      );

      // Optimistic update
      queryClient.setQueryData(
        engagementKeys.checkBookmark(contentUid, contentType),
        { is_bookmarked: true }
      );

      if (previousBookmarks) {
        queryClient.setQueryData(
          engagementKeys.bookmarks(contentType),
          [...previousBookmarks, { content_uid: contentUid, content_type: contentType, id: Date.now() }]
        );
      }

      return { previousBookmarks, previousCheck, contentUid, contentType };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      if (context.previousBookmarks) {
        queryClient.setQueryData(
          engagementKeys.bookmarks(context.contentType),
          context.previousBookmarks
        );
      }
      if (context.previousCheck) {
        queryClient.setQueryData(
          engagementKeys.checkBookmark(context.contentUid, context.contentType),
          context.previousCheck
        );
      }
    },
    onSuccess: (_data, { contentType }) => {
      queryClient.invalidateQueries({
        queryKey: engagementKeys.bookmarks(contentType),
      });
    },
  });
}

/**
 * DELETE /engagement/bookmarks
 * ✅ contentType is now REQUIRED in the mutation payload
 */
export function useRemoveBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentUid,
      contentType
    }: {
      contentUid: string;
      contentType: ContentType; // ✅ REQUIRED
    }) => {
      return engagementApi.removeBookmark(contentUid, contentType);
    },
    onMutate: async ({ contentUid, contentType }) => {
      await queryClient.cancelQueries({
        queryKey: engagementKeys.bookmarks(contentType),
      });
      await queryClient.cancelQueries({
        queryKey: engagementKeys.checkBookmark(contentUid, contentType),
      });

      const previousBookmarks = queryClient.getQueryData<any[]>(
        engagementKeys.bookmarks(contentType)
      );
      const previousCheck = queryClient.getQueryData(
        engagementKeys.checkBookmark(contentUid, contentType)
      );

      // Optimistic update
      queryClient.setQueryData(
        engagementKeys.checkBookmark(contentUid, contentType),
        { is_bookmarked: false }
      );

      if (previousBookmarks) {
        queryClient.setQueryData(
          engagementKeys.bookmarks(contentType),
          previousBookmarks.filter((b: any) => b.content_uid !== contentUid)
        );
      }

      return { previousBookmarks, previousCheck, contentUid, contentType };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      if (context.previousBookmarks) {
        queryClient.setQueryData(
          engagementKeys.bookmarks(context.contentType),
          context.previousBookmarks
        );
      }
      if (context.previousCheck) {
        queryClient.setQueryData(
          engagementKeys.checkBookmark(context.contentUid, context.contentType),
          context.previousCheck
        );
      }
    },
    onSuccess: (_data, { contentType }) => {
      queryClient.invalidateQueries({
        queryKey: engagementKeys.bookmarks(contentType),
      });
    },
  });
}

export function useLike() {
  return useMutation({
    mutationFn: (newsUid: string) => engagementApi.like(newsUid),
  });
}

export function useUnlike() {
  return useMutation({
    mutationFn: (newsUid: string) => engagementApi.unlike(newsUid),
  });
}

export function useRecordView() {
  return useMutation({
    mutationFn: (newsUid: string) => engagementApi.recordView(newsUid),
  });
}

export function useRecordShare() {
  return useMutation({
    mutationFn: ({
      newsUid,
      platform,
    }: {
      newsUid: string;
      platform?: string;
    }) => engagementApi.recordShare(newsUid, platform),
  });
}