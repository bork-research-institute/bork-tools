export interface PostedThread {
  id: string;
  agentId: string;
  primaryTopic: string;
  relatedTopics?: string[];
  threadIdea: string;
  uniqueAngle: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  performanceScore: number;
  tweetIds: string[];
  usedKnowledge?: UsedKnowledge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicPerformance {
  topic: string;
  totalThreads: number;
  avgEngagement: PostedThread['engagement'];
  performanceScore: number;
  lastPosted?: Date;
}

export interface UsedKnowledge {
  content: string;
  type?: string;
  useCase?: string;
  createdAt?: number;
  source: {
    tweetId?: string;
    authorUsername: string;
    url: string;
    metrics?: {
      likes: number;
      retweets: number;
      replies: number;
    };
  };
}

// Only keeping ThreadPerformanceMetrics as it's used for updating
export interface ThreadPerformanceMetrics {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  performanceScore: number;
}
