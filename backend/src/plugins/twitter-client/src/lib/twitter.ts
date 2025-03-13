import type { Tweet as TwitterClientTweet } from 'agent-twitter-client';

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

export interface SpamUser {
  userId: string;
  spamScore: number;
  lastTweetDate: Date;
  tweetCount: number;
  violations: string[];
}

export interface TweetAnalysis {
  tweetId: string;
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
  metrics: {
    likes?: number;
    retweets?: number;
    replies?: number;
    quoteTweets?: number;
  };
  entities: string[];
  topics: string[];
  impactScore: number;
  spamScore?: number;
  topicWeights: TopicWeight[];
}

export interface MarketMetrics {
  totalEngagement: number;
  tweetCount: number;
  averageSentiment: number;
  timestamp: Date;
}
