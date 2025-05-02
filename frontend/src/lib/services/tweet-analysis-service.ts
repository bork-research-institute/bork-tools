import { supabaseClient } from '@/lib/config/client-supabase';
import type { TweetAnalysis } from '@/types/tweets-analysis';

export async function fetchRecentTweetsForTicker(
  ticker: string,
  tokenAddress: string,
): Promise<TweetAnalysis[]> {
  const { data, error } = await supabaseClient
    .from('tweets_analysis')
    .select('*')
    .eq('ticker', ticker)
    .eq('token_address', tokenAddress)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    // Optionally log or handle error
    return [];
  }
  return data as TweetAnalysis[];
}
