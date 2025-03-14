import type {
  Profile as TwitterClientProfile,
  Tweet as TwitterClientTweet,
} from 'agent-twitter-client';

export interface Tweet extends TwitterClientTweet {
  created_at: Date;
  author_id: string;
  text: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
  entities?: Record<string, unknown>;
}

export interface TopicWeight {
  topic: string;
  weight: number;
  impactScore: number;
  lastUpdated: Date;
}

export interface TopicWeightRow {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: Date;
  seed_weight: number;
}

export interface SpamUser {
  userId: string;
  spamScore: number;
  lastTweetDate: Date;
  tweetCount: number;
  violations: string[];
}

export interface TweetAnalysis {
  spamAnalysis: {
    spamScore: number;
    reasons: string[];
    isSpam: boolean;
  };
  contentAnalysis: {
    type:
      | 'price_speculation'
      | 'partnership'
      | 'technical_analysis'
      | 'news_event'
      | 'engagement'
      | 'influencer'
      | 'competitor'
      | 'developer';
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    impactScore: number;
    entities: string[];
    topics: string[];
    metrics: {
      likes?: number;
      retweets?: number;
      replies?: number;
      quoteTweets?: number;
    };
  };
}

export interface MarketMetrics {
  totalEngagement: number;
  tweetCount: number;
  averageSentiment: number;
  timestamp: Date;
}

export type Profile = TwitterClientProfile;

export function convertToTopicWeight(row: TopicWeightRow): TopicWeight {
  return {
    topic: row.topic,
    weight: row.weight,
    impactScore: row.impact_score,
    lastUpdated: row.last_updated,
  };
}
