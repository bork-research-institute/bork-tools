import type { Profile as TwitterClientProfile } from 'agent-twitter-client';
import type { Tweet as AgentTweet } from 'agent-twitter-client';
import type { TopicWeight } from './topic';

// Re-export the base Tweet type with our extensions
export interface Tweet extends AgentTweet {
  tweet_id?: string; // Twitter's original ID after mapping
}

// Define our own types for media and mentions
export interface Mention {
  id: string;
  username?: string;
  name?: string;
}

export interface Photo {
  id: string;
  url: string;
  alt_text: string;
}

export interface Video {
  id: string;
  preview: string;
  url?: string;
}

export interface PollV2 {
  id: string;
  options: Array<{
    position: number;
    label: string;
    votes: number;
  }>;
}

interface PlaceRaw {
  id?: string;
  place_type?: string;
  name?: string;
  full_name?: string;
  country_code?: string;
  country?: string;
  bounding_box?: {
    type?: string;
    coordinates?: number[][][];
  };
}

// Our database tweet type that extends the agent-twitter-client Tweet
export interface DatabaseTweet extends AgentTweet {
  // Database fields
  id?: string; // UUID primary key in our database
  tweet_id: string; // Twitter's ID (unique)
  status: string; // Tweet status in our system (pending, approved, sent, error)
  createdAt: Date; // When the tweet was created in our system
  agentId?: string; // Reference to the agent that created/processed this tweet
  mediaType?: string; // Type of media in our system
  mediaUrl?: string; // URL to media in our system
  scheduledFor?: Date; // When the tweet is scheduled to be sent
  sentAt?: Date; // When the tweet was actually sent
  error?: string; // Error message if the tweet failed to send
  prompt?: string; // The prompt used to generate this tweet
  newTweetContent?: string; // New content for quote tweets/replies
  isThreadMerged: boolean; // Whether this tweet is part of a merged thread
  threadSize: number; // Number of tweets in the thread
  originalText: string; // Original text before thread merging
  homeTimeline: {
    publicMetrics: {
      likes: number;
      retweets: number;
      replies: number;
    };
    entities: {
      hashtags: string[];
      mentions: Array<{
        username: string;
        id: string;
      }>;
      urls: string[];
    };
  };
}

// Re-export other types
export interface TweetSelectionResult {
  tweets: AgentTweet[];
  spammedTweets: number;
  processedCount: number;
}

// Tweet with original text preserved (for merging threads)
export interface MergedTweet extends AgentTweet {
  // Core tweet data from AgentTweet
  id?: string;
  text?: string;
  userId?: string;
  username?: string;
  name?: string;
  timestamp?: number;
  timeParsed?: Date;

  // Tweet metrics
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  bookmarkCount?: number;

  // Tweet metadata
  conversationId?: string;
  permanentUrl?: string;
  html?: string;
  inReplyToStatus?: AgentTweet;
  inReplyToStatusId?: string;
  quotedStatus?: AgentTweet;
  quotedStatusId?: string;
  retweetedStatus?: AgentTweet;
  retweetedStatusId?: string;
  thread: AgentTweet[];

  // Tweet flags
  isQuoted?: boolean;
  isPin?: boolean;
  isReply?: boolean;
  isRetweet?: boolean;
  isSelfThread?: boolean;
  sensitiveContent?: boolean;

  // Media and entities
  hashtags: string[];
  mentions: Mention[];
  photos: Photo[];
  urls: string[];
  videos: Video[];
  place?: PlaceRaw;
  poll?: PollV2;

  // Additional fields for our application
  status?: string;
  createdAt?: Date;
  agentId?: string;
  mediaType?: string;
  mediaUrl?: string;
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  prompt?: string;
  newTweetContent?: string;

  // Thread processing fields
  originalText: string;
  isThreadMerged: boolean;
  threadSize: number;

  // Timeline data
  homeTimeline?: {
    publicMetrics: {
      likes: number;
      retweets: number;
      replies: number;
    };
    entities: {
      hashtags: string[];
      mentions: Array<{ username: string; id: string }>;
      urls: string[];
    };
  };
}

// Tweet with processed metrics and entities
export interface ProcessedTweet extends AgentTweet {
  created_at: Date;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count?: number;
  };
  entities: {
    hashtags: string[];
    mentions: Array<{ username: string; id: string }>;
    urls: string[];
  };
  originalText: string;
  isThreadMerged: boolean;
  threadSize: number;
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
    metrics: {
      relevance: number;
      quality: number;
      engagement: number;
      authenticity: number;
      valueAdd: number;
    };
    entities: string[];
    topics: string[];
    impactScore: number;
  };
  entities: string[];
  topics: string[];
  impactScore: number;
  spamScore?: number;
  spamAnalysis: {
    spamScore: number;
    reasons: string[];
    isSpam: boolean;
    confidenceMetrics: {
      linguisticRisk: number;
      topicMismatch: number;
      engagementAnomaly: number;
      promotionalIntent: number;
    };
  };
  topicWeights: TopicWeight[];
}

export interface TwitterProfile {
  userId: string;
  username: string;
  displayName: string;
  description: string;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  mediaCount: number;
  statusesCount: number;
  likesCount: number;
  listedCount: number;
  tweetsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  isBlueVerified: boolean;
  joinedAt: Date | null;
  location: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  canDm: boolean;
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
