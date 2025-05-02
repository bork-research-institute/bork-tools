export interface TweetAnalysis {
  id: string;
  ticker: string;
  tweet_text: string;
  content_summary: string;
  topics: string[];
  author: string;
  timestamp: string;
  sentiment?: string;
  relevance: number;
  clarity: number;
  authenticity: number;
  value_add: number;
}

export interface DatabaseTweet {
  // Core tweet data
  id?: string;
  tweet_id: string;
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
  inReplyToStatus?: DatabaseTweet;
  inReplyToStatusId?: string;
  quotedStatus?: DatabaseTweet;
  quotedStatusId?: string;
  retweetedStatus?: DatabaseTweet;
  retweetedStatusId?: string;
  thread: DatabaseTweet[];

  // Tweet flags
  isQuoted?: boolean;
  isPin?: boolean;
  isReply?: boolean;
  isRetweet?: boolean;
  isSelfThread?: boolean;
  sensitiveContent?: boolean;

  // Media and entities
  hashtags: string[];
  mentions: Array<{
    username: string;
    id: string;
  }>;
  photos: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  urls: string[];
  videos: Array<{
    url: string;
    width?: number;
    height?: number;
    preview?: string;
    duration?: number;
  }>;
  place?: {
    fullName: string;
    name: string;
    type: string;
    country: string;
    countryCode: string;
  };
  poll?: {
    id: string;
    options: Array<{
      position: number;
      label: string;
      votes: number;
    }>;
    status: string;
    endDate: Date;
    duration: number;
    totalVotes: number;
  } | null;

  // Entities (from Twitter API)
  entities?: {
    hashtags: string[];
    mentions: Array<{
      username: string;
      id: string;
    }>;
    urls: string[];
  };

  // Our additional fields
  status: string;
  createdAt: string;
  agentId?: string;
  mediaType?: string;
  mediaUrl?: string;
  scheduledFor?: string;
  sentAt?: string;
  error?: string;
  prompt?: string;
  newTweetContent?: string;
  isThreadMerged: boolean;
  threadSize: number;
  originalText: string;
  homeTimeline: {
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
  structuredContent?: {
    mainTweet: string;
    replies: Array<{ text: string; username: string }>;
    quotes: Array<{ text: string; username: string }>;
    retweets: Array<{ text: string; username: string }>;
  };
}

export interface TweetWithAnalysis extends DatabaseTweet {
  analysis?: TweetAnalysis;
}
