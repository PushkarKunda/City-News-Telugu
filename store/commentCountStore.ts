import { create } from 'zustand';

interface CommentCountState {
  /**
   * Live comment counts indexed by news/post uid
   */
  counts: Record<string, number>;

  /**
   * Preserved drafts indexed by news/post uid
   */
  drafts: Record<string, string>;

  /**
   * Initialize count if not yet tracked
   */
  setInitialCount: (uid: string, count: number) => void;

  /**
   * Get the current count for a given uid, falling back to article's count
   */
  getCount: (uid: string, fallbackCount: number) => number;

  /**
   * Increment count by 1 (used on optimistic comment add)
   */
  incrementCount: (uid: string, fallback?: number) => void;

  /**
   * Decrement count by 1 (used on rollback or delete)
   */
  decrementCount: (uid: string) => void;

  /**
   * Explicitly set the count (e.g. from server response)
   */
  setCount: (uid: string, count: number) => void;

  /**
   * Synchronize count from server or list
   */
  syncCount: (uid: string, count: number) => void;

  /**
   * Save draft text for an article (preserves text during login flow)
   */
  setDraft: (uid: string, text: string) => void;

  /**
   * Clear saved draft
   */
  clearDraft: (uid: string) => void;
}

export const useCommentCountStore = create<CommentCountState>((set, get) => ({
  counts: {},
  drafts: {},

  setInitialCount: (uid: string, count: number) => {
    if (get().counts[uid] === undefined) {
      set((state) => ({ counts: { ...state.counts, [uid]: Math.max(0, count) } }));
    }
  },

  getCount: (uid: string, fallbackCount: number) => {
    const val = get().counts[uid];
    return typeof val === 'number' ? val : fallbackCount;
  },

  incrementCount: (uid: string, fallback?: number) => {
    set((state) => {
      const current = state.counts[uid] !== undefined ? state.counts[uid] : (fallback ?? 0);
      return { counts: { ...state.counts, [uid]: current + 1 } };
    });
  },

  decrementCount: (uid: string) => {
    set((state) => {
      const current = state.counts[uid] ?? 1;
      return { counts: { ...state.counts, [uid]: Math.max(0, current - 1) } };
    });
  },

  setCount: (uid: string, count: number) => {
    set((state) => ({ counts: { ...state.counts, [uid]: Math.max(0, count) } }));
  },

  syncCount: (uid: string, count: number) => {
    set((state) => ({ counts: { ...state.counts, [uid]: Math.max(0, count) } }));
  },

  setDraft: (uid: string, text: string) => {
    set((state) => ({ drafts: { ...state.drafts, [uid]: text } }));
  },

  clearDraft: (uid: string) => {
    set((state) => {
      const { [uid]: _, ...rest } = state.drafts;
      return { drafts: rest };
    });
  },
}));
