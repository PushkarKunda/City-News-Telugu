import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { discoveryApi } from '@/services/api/discovery';

// ─── QUERY KEYS ─────────────────────────────────────────────────────────────

export const discoveryKeys = {
  all: ['discovery'] as const,
  home: (limit: number) => ['discovery', 'home', limit] as const,
  search: (query: string, limit: number) => ['discovery', 'search', query, limit] as const,
  category: (categoryId: number) => ['discovery', 'category', categoryId] as const,
  related: (uid: string, type: string) => ['discovery', 'related', uid, type] as const,
  trending: (limit: number) => ['discovery', 'trending', limit] as const,
  trendingHashtags: (limit: number) => ['discovery', 'trendingHashtags', limit] as const,
  hashtagSuggestions: (query: string, limit: number) => ['discovery', 'hashtagSuggestions', query, limit] as const,
  postsByHashtag: (hashtag: string) => ['discovery', 'postsByHashtag', hashtag] as const,
};

// ─── HOOKS ──────────────────────────────────────────────────────────────────

export function useDiscoveryHome(limit: number = 20) {
  return useQuery({
    queryKey: discoveryKeys.home(limit),
    queryFn: () => discoveryApi.getDiscoveryHome(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDiscoverySearch(query: string, limit: number = 20) {
  return useQuery({
    queryKey: discoveryKeys.search(query, limit),
    queryFn: () => discoveryApi.search(query, limit),
    enabled: Boolean(query.trim()),
    staleTime: 1000 * 60,
  });
}

export function useCategoryExplore(categoryId: number, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.category(categoryId),
    queryFn: ({ pageParam }) => discoveryApi.getCategoryExplore(categoryId, pageParam as string | null, limit),
    initialPageParam: null,
    getNextPageParam: (lastPage: any) => lastPage?.next_cursor || undefined,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRelatedContent(uid: string, type: 'news' | 'post' = 'news', limit: number = 5) {
  return useQuery({
    queryKey: discoveryKeys.related(uid, type),
    queryFn: () => discoveryApi.getRelatedContent(uid, type, limit),
    enabled: Boolean(uid),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTrendingDiscovery(limit: number = 10) {
  return useQuery({
    queryKey: discoveryKeys.trending(limit),
    queryFn: () => discoveryApi.getTrending(limit),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTrendingHashtags(limit: number = 10) {
  return useQuery({
    queryKey: discoveryKeys.trendingHashtags(limit),
    queryFn: () => discoveryApi.getTrendingHashtags(limit),
    staleTime: 1000 * 60 * 5,
  });
}

export function useHashtagSuggestions(query: string, limit: number = 10) {
  return useQuery({
    queryKey: discoveryKeys.hashtagSuggestions(query, limit),
    queryFn: () => discoveryApi.getHashtagSuggestions(query, limit),
    enabled: query.length > 0,
    staleTime: 1000 * 60,
  });
}

export function usePostsByHashtag(hashtag: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.postsByHashtag(hashtag),
    queryFn: ({ pageParam }) => discoveryApi.getPostsByHashtag(hashtag, limit), // Update API for cursor if needed
    initialPageParam: null,
    getNextPageParam: (lastPage: any) => lastPage?.next_cursor || undefined,
    staleTime: 1000 * 60 * 2,
  });
}
