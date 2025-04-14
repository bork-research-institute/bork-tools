import { useQuery } from '@tanstack/react-query';
import { tweetService } from '../services/tweets';

export function useTrendingTweets(limit = 50) {
  return useQuery({
    queryKey: ['trending-tweets', limit],
    queryFn: () => tweetService.getTrendingTweets(limit),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}

export function useNewsTweets(limit = 50) {
  return useQuery({
    queryKey: ['news-tweets', limit],
    queryFn: () => tweetService.getNewsTweets(limit),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}
