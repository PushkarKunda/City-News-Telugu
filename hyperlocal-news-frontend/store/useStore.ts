// store/useStore.ts
import { create } from 'zustand';
import { useAuthStore, User } from '@/store/authStore';
import { usersApi } from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PublisherRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface AppState {
  // ─── User ───────────────────────────────────────────────────────────────
  user: User | null;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;

  // ─── Bookmarks ───────────────────────────────────────────────────────────
  bookmarkedArticleIds: string[];
  toggleBookmark: (articleId: string) => void;

  // ─── Publisher ───────────────────────────────────────────────────────────
  publisherRequestStatus: PublisherRequestStatus;
  requestPublisherAccess: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // ─── User ─────────────────────────────────────────────────────────────────

  user: null,

  loadUser: async () => {
    try {
      const serverUser = await usersApi.me();
      // ✅ Sync with authStore user type
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        set({ user: authUser });
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      set({ user: null });
    }
  },

  setUser: (user) => set({ user }),

  // ─── Bookmarks ────────────────────────────────────────────────────────────

  bookmarkedArticleIds: [],

  toggleBookmark: (articleId) =>
    set((state) => ({
      bookmarkedArticleIds: state.bookmarkedArticleIds.includes(articleId)
        ? state.bookmarkedArticleIds.filter((id) => id !== articleId)
        : [...state.bookmarkedArticleIds, articleId],
    })),

  // ─── Publisher ────────────────────────────────────────────────────────────

  publisherRequestStatus: 'none',

  requestPublisherAccess: () =>
    set((state) => {
      const { user } = state;
      if (user?.isPublisher || state.publisherRequestStatus !== 'none') {
        return state;
      }
      return { publisherRequestStatus: 'pending' };
    }),
}));
