import { supabaseClient } from '../config/client-supabase';

export type ScoreFilter =
  | 'aggregate'
  | 'impact_score'
  | 'relevance'
  | 'clarity'
  | 'authenticity'
  | 'value_add'
  | 'engagement_score';

export interface TweetAnalysis {
  id: string;
  tweet_id: string;
  type: string;
  format: string;
  sentiment: string;
  confidence: number;
  content_summary: string;
  topics: string[];
  entities: string[];
  // Quality metrics
  relevance: number;
  clarity: number;
  authenticity: number;
  value_add: number;
  // Engagement metrics
  likes: number;
  replies: number;
  retweets: number;
  // Timestamps and metadata
  created_at: string;
  analyzed_at: string;
  author_username: string;
  marketing_summary: string;
  is_spam: boolean;
  spam_score: number;
}

export interface TrendingTweet extends TweetAnalysis {
  aggregate_score: number;
  engagement_score: number;
  impact_score: number;
  permanent_url: string;
  name: string;
  username: string;
  content: string;
  photos: string[];
}

// Calculate engagement score based on weighted metrics
const calculateEngagementScore = (tweet: TweetAnalysis): number => {
  const totalEngagement =
    tweet.likes * 1 + // 1 point per like
    tweet.retweets * 2 + // 2 points per retweet
    tweet.replies * 3; // 3 points per reply

  // Normalize to 0-100 scale
  // Assuming a "perfect" tweet might get 1000 weighted engagement points
  return Math.min(Math.round((totalEngagement / 1000) * 100), 100);
};

// Calculate aggregate score based on all metrics
const calculateAggregateScore = (tweet: TweetAnalysis): number => {
  const engagementScore = calculateEngagementScore(tweet);

  // Convert quality metrics to 0-100 scale and average with engagement score
  const score = Math.round(
    (engagementScore +
      tweet.relevance * 100 +
      tweet.clarity * 100 +
      tweet.authenticity * 100 +
      tweet.value_add * 100) /
      5,
  );

  return Math.min(score, 100);
};

const processTweet = (tweet: TweetAnalysis): TrendingTweet => {
  const engagementScore = calculateEngagementScore(tweet);
  const aggregateScore = calculateAggregateScore(tweet);

  // Convert quality metrics to 0-100 scale
  const processedTweet = {
    ...tweet,
    relevance: tweet.relevance * 100,
    clarity: tweet.clarity * 100,
    authenticity: tweet.authenticity * 100,
    value_add: tweet.value_add * 100,
    engagement_score: engagementScore,
    aggregate_score: aggregateScore,
    impact_score: Math.round(tweet.value_add * 100),
    permanent_url: `https://twitter.com/${tweet.author_username}/status/${tweet.tweet_id}`,
    name: tweet.author_username,
    username: tweet.author_username,
    content: tweet.content_summary,
    photos: [], // We'll add media handling in the query
  };

  return processedTweet;
};

export const tweetService = {
  async getTrendingTweets(limit = 50): Promise<TrendingTweet[]> {
    try {
      const { data, error } = await supabaseClient
        .from('tweet_analysis')
        .select(`
          *,
          tweet:tweet_id (
            text,
            media_url,
            photos
          )
        `)
        .eq('is_spam', false)
        .neq('type', 'news')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trending tweets:', error);
        return [];
      }

      return (data || []).map((row) => ({
        ...processTweet(row),
        content: row.tweet?.text || row.content_summary,
        photos: row.tweet?.photos || [],
      }));
    } catch (error) {
      console.error('Error in getTrendingTweets:', error);
      return [];
    }
  },

  async getNewsTweets(limit = 50): Promise<TrendingTweet[]> {
    try {
      const { data, error } = await supabaseClient
        .from('tweet_analysis')
        .select(`
          *,
          tweet:tweet_id (
            text,
            media_url,
            photos
          )
        `)
        .eq('is_spam', false)
        .eq('type', 'news')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching news tweets:', error);
        return [];
      }

      return (data || []).map((row) => ({
        ...processTweet(row),
        content: row.tweet?.text || row.content_summary,
        photos: row.tweet?.photos || [],
      }));
    } catch (error) {
      console.error('Error in getNewsTweets:', error);
      return [];
    }
  },
};
