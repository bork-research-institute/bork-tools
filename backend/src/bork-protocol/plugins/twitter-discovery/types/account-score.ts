export interface AccountScore {
  username: string;
  relevanceScore: number;
  qualityScore: number;
  lastUpdated: Date;
  totalTweetsAnalyzed: number;
  relevantTweetsCount: number;
  topicsMatch: Record<string, number>; // Topic -> match count
  interactionScore: number; // Based on RTs, likes, etc.
}
