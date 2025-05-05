export interface TargetAccount {
  username: string;
  userId: string;
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
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
  source: string;
  // Influence metrics
  avgLikes50: number;
  avgRetweets50: number;
  avgReplies50: number;
  avgViews50: number;
  engagementRate50: number;
  influenceScore: number;
  last50TweetsUpdatedAt: Date | null;
}

/**
 * Average engagement metrics for tweets
 */
export interface TweetMetrics {
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  avgViews: number;
}

export interface WeightedAccount {
  account: TargetAccount;
  weight: number;
}
