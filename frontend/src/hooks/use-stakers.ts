import { useInfiniteQuery } from '@tanstack/react-query';
import type { StakersProfileResponse } from '../types/responses/stakers-profile-response';

interface UseStakersOptions {
  enabled?: boolean;
}

async function fetchStakers({ pageParam }: { pageParam?: unknown }) {
  const params = new URLSearchParams();
  if (pageParam && typeof pageParam === 'string') {
    params.set('cursor', pageParam);
  }

  const response = await fetch(`/api/stakers?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch stakers');
  }

  return response.json() as Promise<StakersProfileResponse>;
}

export function useStakers(options: UseStakersOptions = {}) {
  return useInfiniteQuery<StakersProfileResponse>({
    queryKey: ['stakers'],
    queryFn: fetchStakers,
    getNextPageParam: (lastPage) => {
      if (!lastPage.result.hasMore) {
        return undefined;
      }
      return lastPage.result.cursor;
    },
    initialPageParam: undefined,
    ...options,
  });
}
