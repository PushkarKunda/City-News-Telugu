import { QueryClient } from '@tanstack/react-query';
import { invalidateSession } from './session';
import { useCommentCountStore } from '@/store/commentCountStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchIntervalInBackground: false,
    },
    mutations: { retry: 1 },
  },
});

export function clearSessionCache(client = queryClient) {
  // clear() cancels in-flight queries before removing their data.
  client.clear();
  useCommentCountStore.setState({ counts: {}, drafts: {} });
}

type SessionState = { user: { user_uid: string } | null; isAuthenticated: boolean };
type SessionStore = {
  getState: () => SessionState;
  subscribe: (listener: (state: SessionState) => void) => () => void;
};

export function bindSessionCache(store: SessionStore, client = queryClient) {
  let previous = store.getState();
  return store.subscribe((state) => {
    if (state.user?.user_uid !== previous.user?.user_uid ||
        state.isAuthenticated !== previous.isAuthenticated) {
      invalidateSession();
      clearSessionCache(client);
    }
    previous = state;
  });
}
