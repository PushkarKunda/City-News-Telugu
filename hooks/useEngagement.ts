import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { engagementApi, ContentType } from '@/services/api/engagement';
import { useAuthStore } from '@/store/authStore';
import { assertCurrentSession, getSessionVersion, isCurrentSession } from '@/services/session';
import { updateNewsLikeData } from '@/services/newsLikes';

export const engagementKeys = {
  bookmarks: (type: ContentType, userUid?: string) =>
    ['engagement', 'bookmarks', type, userUid] as const,
  checkBookmark: (contentUid: string, type: ContentType, userUid?: string) =>
    ['engagement', 'check-bookmark', type, contentUid, userUid] as const,
};

export function useBookmarks(contentType: ContentType, enabled = true) {
  const userUid = useAuthStore((state) => state.user?.user_uid);
  return useQuery({
    queryKey: engagementKeys.bookmarks(contentType, userUid),
    queryFn: () => engagementApi.getBookmarks(contentType),
    enabled: enabled && Boolean(userUid),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCheckBookmark(contentUid: string | null, contentType: ContentType, enabled = true) {
  const userUid = useAuthStore((state) => state.user?.user_uid);
  return useQuery({
    queryKey: engagementKeys.checkBookmark(contentUid!, contentType, userUid),
    queryFn: () => engagementApi.checkBookmark(contentUid!, contentType),
    enabled: enabled && Boolean(contentUid && userUid),
    staleTime: 1000 * 60 * 5,
  });
}

function useBookmarkMutation(remove: boolean) {
  const queryClient = useQueryClient();
  const userUid = useAuthStore((state) => state.user?.user_uid);
  type Variables = { contentUid: string; contentType: ContentType };
  type Context = {
    previousBookmarks: any[] | undefined;
    previousCheck: unknown;
    listKey: readonly unknown[];
    checkKey: readonly unknown[];
    version: number;
  };

  return useMutation<void, unknown, Variables, Context>({
    retry: false,
    mutationFn: async ({ contentUid, contentType }) => {
      if (!userUid) throw new Error('Please sign in to save bookmarks.');
      if (remove) {
        await engagementApi.removeBookmark(contentUid, contentType);
      } else {
        await engagementApi.addBookmark(contentUid, contentType);
      }
    },
    onMutate: async ({ contentUid, contentType }) => {
      const version = getSessionVersion();
      const listKey = engagementKeys.bookmarks(contentType, userUid);
      const checkKey = engagementKeys.checkBookmark(contentUid, contentType, userUid);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: checkKey }),
        queryClient.cancelQueries({ queryKey: ['screens', 'home'] }),
        queryClient.cancelQueries({ queryKey: ['screens', 'community'] }),
        queryClient.cancelQueries({ queryKey: ['screens', 'profile'] }),
        queryClient.cancelQueries({ queryKey: ['news', 'single', contentUid] }),
      ]);
      assertCurrentSession(version);
      const previousBookmarks = queryClient.getQueryData<any[]>(listKey);
      const previousCheck = queryClient.getQueryData(checkKey);
      queryClient.setQueryData(checkKey, { is_bookmarked: !remove });
      const filtered = (previousBookmarks ?? []).filter((b) => b.content_uid !== contentUid);
      queryClient.setQueryData(listKey, remove ? filtered : [
        ...filtered, { content_uid: contentUid, content_type: contentType, id: Date.now() },
      ]);
      return { previousBookmarks, previousCheck, listKey, checkKey, version };
    },
    onError: (_error, _variables, context) => {
      if (!context || !isCurrentSession(context.version)) return;
      queryClient.setQueryData(context.listKey, context.previousBookmarks ?? []);
      queryClient.setQueryData(context.checkKey, context.previousCheck ?? { is_bookmarked: remove });
    },
    onSettled: (_data, _error, { contentType, contentUid }, context) => {
      if (!context || !isCurrentSession(context.version)) return;
      void queryClient.invalidateQueries({ queryKey: engagementKeys.bookmarks(contentType, userUid) });
      void queryClient.invalidateQueries({ queryKey: engagementKeys.checkBookmark(contentUid, contentType, userUid) });
      void queryClient.invalidateQueries({ queryKey: ['screens', 'home'] });
      void queryClient.invalidateQueries({ queryKey: ['screens', 'profile'] });
      void queryClient.invalidateQueries({ queryKey: ['screens', 'community'] });
      if (contentType === 'news') {
        void queryClient.invalidateQueries({ queryKey: ['news', 'single', contentUid] });
      }
    },
  });
}

export function useAddBookmark() { return useBookmarkMutation(false); }
export function useRemoveBookmark() { return useBookmarkMutation(true); }

function useNewsLikeMutation(liked: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    // Retrying a state-changing request can repeat an already-committed action.
    retry: false,
    mutationFn: (newsUid: string) => liked ? engagementApi.like(newsUid) : engagementApi.unlike(newsUid),
    onMutate: async () => {
      const version = getSessionVersion();
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['news'] }),
        queryClient.cancelQueries({ queryKey: ['screens', 'home'] }),
      ]);
      assertCurrentSession(version);
      return { version };
    },
    onSuccess: (_data, newsUid, context) => {
      if (!context || !isCurrentSession(context.version)) return;
      queryClient.setQueriesData({ queryKey: ['news'] }, (data) => updateNewsLikeData(data, newsUid, liked));
      queryClient.setQueriesData({ queryKey: ['screens', 'home'] }, (data) => updateNewsLikeData(data, newsUid, liked));
    },
    onSettled: (_data, _error, newsUid, context) => {
      if (!context || !isCurrentSession(context.version)) return;
      void queryClient.invalidateQueries({ queryKey: ['news', 'single', newsUid] });
      void queryClient.invalidateQueries({ queryKey: ['news', 'engagement', newsUid] });
      void queryClient.invalidateQueries({ queryKey: ['news', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['news', 'category'] });
      void queryClient.invalidateQueries({ queryKey: ['screens', 'home'] });
    },
  });
}

export function useLike() { return useNewsLikeMutation(true); }
export function useUnlike() { return useNewsLikeMutation(false); }

export function useRecordView() {
  return useMutation({ mutationFn: (newsUid: string) => engagementApi.recordView(newsUid) });
}

export function useRecordShare() {
  return useMutation({
    mutationFn: ({ newsUid, platform }: { newsUid: string; platform?: string }) =>
      engagementApi.recordShare(newsUid, platform),
  });
}
