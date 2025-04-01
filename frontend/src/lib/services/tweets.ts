import { supabaseClient } from '../config/client-supabase';

export interface TweetAnalysis {
  id: string;
  tweet_id: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  impact_score: number;
  content_relevance: number;
  content_quality: number;
  content_engagement: number;
  content_authenticity: number;
  content_value_add: number;
  created_at: string;
  permanent_url: string;
  username: string;
  name: string;
  likes: number;
  retweets: number;
  replies: number;
  type: string;
  media_type?: string;
  media_url?: string;
  photos: string[];
}

export interface TrendingTweet extends TweetAnalysis {
  aggregate_score: number;
  is_news: boolean;
}

export type ScoreFilter =
  | 'impact_score'
  | 'content_relevance'
  | 'content_quality'
  | 'content_engagement'
  | 'content_authenticity'
  | 'content_value_add'
  | 'aggregate';

const calculateWeightedScore = (score: number, confidence: number) => {
  return Math.min(Math.round(score * 100 * confidence), 100);
};

export const tweetService = {
  async getTrendingTweets(
    _timeframe = '24h',
    scoreFilter: ScoreFilter = 'aggregate',
    limit = 10,
    newsOnly = false,
  ): Promise<TrendingTweet[]> {
    try {
      let query = supabaseClient
        .from('tweet_analysis')
        .select(`
          *,
          tweets!tweet_analysis_tweet_id_fkey (
            text,
            permanent_url,
            username,
            name,
            likes,
            retweets,
            replies,
            media_type,
            media_url,
            photos
          )
        `)
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      // For news tweets, only get type='news'
      // For non-news tweets, get everything except type='news'
      if (newsOnly) {
        query = query.eq('type', 'news');
      } else {
        query = query.neq('type', 'news');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tweet analysis:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const processedTweets = data
        .map((row) => {
          const tweet = row.tweets;
          if (!tweet) {
            return null;
          }

          const weightedScores = {
            impact_score: calculateWeightedScore(
              row.impact_score,
              row.confidence,
            ),
            content_relevance: calculateWeightedScore(
              row.content_relevance,
              row.confidence,
            ),
            content_quality: calculateWeightedScore(
              row.content_quality,
              row.confidence,
            ),
            content_engagement: calculateWeightedScore(
              row.content_engagement,
              row.confidence,
            ),
            content_authenticity: calculateWeightedScore(
              row.content_authenticity,
              row.confidence,
            ),
            content_value_add: calculateWeightedScore(
              row.content_value_add,
              row.confidence,
            ),
          };

          // Process photos array to extract URLs
          const photos = Array.isArray(tweet.photos)
            ? tweet.photos
                .map((photo: { url: string }) => photo.url)
                .filter(Boolean)
            : [];

          return {
            ...row,
            ...weightedScores,
            content: tweet.text,
            permanent_url: tweet.permanent_url,
            username: tweet.username,
            name: tweet.name,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            media_type: tweet.media_type,
            media_url: tweet.media_url,
            photos,
            is_news: row.type === 'news',
            aggregate_score: Math.round(
              Object.values(weightedScores).reduce((a, b) => a + b, 0) / 6,
            ),
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (scoreFilter === 'aggregate') {
            return b.aggregate_score - a.aggregate_score;
          }
          return b[scoreFilter] - a[scoreFilter];
        })
        .slice(0, limit);

      return processedTweets;
    } catch (error) {
      console.error('Unexpected error fetching trending tweets:', error);
      return [];
    }
  },
};
