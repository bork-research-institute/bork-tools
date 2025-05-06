export interface TwitterDiscoveryConfig {
  discoveryKeywords: string[];
  twitterTargetUsers: string[];
  twitterPollInterval: number;
  searchTimeframeHours: number;
  searchPreferredTopic: string[];
  maxSearchTopics: number;
  maxQueueSize: number;
  maxProcessedIdsSize: number;
  minRelevanceScore: number;
  minQualityScore: number;
  scoreDecayFactor: number;
  maxAccounts: number;
  preferredTopic: string;
  discoveryInterval: number;
  evaluationInterval: number;
  accountsPerDiscovery: number;
}
