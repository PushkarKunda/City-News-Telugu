// hooks/usePolls.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollsApi, PollItem, VotePayload } from '@/services/api/polls';

export const pollKeys = {
  active: ['polls', 'active'] as const,
  votedMap: ['polls', 'votedMap'] as const,
};

export function useActivePolls() {
  return useQuery({
    queryKey: pollKeys.active,
    queryFn: () => pollsApi.getActivePolls(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useLocalVotedPolls() {
  return useQuery({
    queryKey: pollKeys.votedMap,
    queryFn: () => pollsApi.getLocalVotedPolls(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VotePayload) => pollsApi.castVote(payload),
    onMutate: async (newVote) => {
      // Optimistically update voted map
      queryClient.setQueryData(
        pollKeys.votedMap,
        (old: Record<string, number> | undefined) => ({
          ...(old || {}),
          [newVote.poll_uid]: newVote.option_index,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.votedMap });
    },
  });
}
