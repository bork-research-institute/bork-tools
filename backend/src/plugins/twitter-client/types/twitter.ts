import type {
  Profile as TwitterClientProfile,
  Tweet as TwitterClientTweet,
} from 'agent-twitter-client';
import type { TopicWeight } from './topic';

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
  contentAnalysis: {
    type: string;
    sentiment: string;
    confidence: number;
    impactScore: number;
    entities: string[];
    topics: string[];
    metrics: {
      relevance: number;
      quality: number;
      engagement: number;
    };
  };
  entities: string[];
  topics: string[];
  impactScore: number;
  spamScore?: number;
  spamAnalysis: {
    spamScore: number;
    reasons: string[];
    isSpam: boolean;
  };
  topicWeights: TopicWeight[];
}

export interface TwitterProfile {
  id: string;
  username: string;
  screenName: string;
  bio: string;
  nicknames: string[];
}

export type Profile = TwitterClientProfile;

export interface TwitterSearchParams {
  excludeReplies: boolean;
  excludeRetweets: boolean;
  filterLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface TwitterEngagementThresholds {
  minLikes: number;
  minRetweets: number;
  minReplies: number;
}
