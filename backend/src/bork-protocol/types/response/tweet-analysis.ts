import { z } from 'zod';

export const qualityMetricsSchema = z.object({
  relevance: z.number().min(0).max(1),
  originality: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  authenticity: z.number().min(0).max(1),
  valueAdd: z.number().min(0).max(1),
});

export const engagementAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(1),
  virality: z.number().min(0).max(1),
  conversionPotential: z.number().min(0).max(1),
  communityBuilding: z.number().min(0).max(1),
  thoughtLeadership: z.number().min(0).max(1),
});

export const entitiesSchema = z.object({
  people: z.array(z.string()),
  organizations: z.array(z.string()),
  products: z.array(z.string()),
  locations: z.array(z.string()),
  events: z.array(z.string()),
});

export const contentAnalysisSchema = z.object({
  type: z.enum([
    'news',
    'opinion',
    'announcement',
    'question',
    'promotion',
    'thought_leadership',
    'educational',
    'entertainment',
    'other',
  ]),
  format: z.enum([
    'statement',
    'question',
    'poll',
    'call_to_action',
    'thread',
    'image_focus',
    'video_focus',
    'link_share',
    'other',
  ]),
  sentiment: z.enum([
    'positive',
    'negative',
    'neutral',
    'controversial',
    'inspirational',
  ]),
  confidence: z.number().min(0).max(1),
  primaryTopics: z.array(z.string()),
  secondaryTopics: z.array(z.string()),
  entities: entitiesSchema,
  hashtagsUsed: z.array(z.string()),
  qualityMetrics: qualityMetricsSchema,
  engagementAnalysis: engagementAnalysisSchema,
});

export const callToActionSchema = z.object({
  present: z.boolean(),
  type: z.enum(['follow', 'click', 'share', 'reply', 'other', 'none']),
  effectiveness: z.number().min(0).max(1),
});

export const copywritingSchema = z.object({
  effectiveElements: z.array(z.string()),
  hooks: z.array(z.string()),
  callToAction: callToActionSchema,
});

export const trendAlignmentSchema = z.object({
  currentTrends: z.array(z.string()),
  emergingOpportunities: z.array(z.string()),
  relevanceScore: z.number().min(0).max(1),
});

export const contentStrategiesSchema = z.object({
  whatWorked: z.array(z.string()),
  improvement: z.array(z.string()),
});

export const marketingInsightsSchema = z.object({
  targetAudience: z.array(z.string()),
  keyTakeaways: z.array(z.string()),
  contentStrategies: contentStrategiesSchema,
  trendAlignment: trendAlignmentSchema,
  copywriting: copywritingSchema,
});

export const confidenceMetricsSchema = z.object({
  linguisticRisk: z.number().min(0).max(1),
  topicMismatch: z.number().min(0).max(1),
  engagementAnomaly: z.number().min(0).max(1),
  promotionalIntent: z.number().min(0).max(1),
  accountTrustSignals: z.number().min(0).max(1),
});

export const spamAnalysisSchema = z.object({
  isSpam: z.boolean(),
  spamScore: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  confidenceMetrics: confidenceMetricsSchema,
});

export const engagementStrategySchema = z.object({
  action: z.string(),
  rationale: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  expectedOutcome: z.string(),
});

export const contentCreationSchema = z.object({
  contentType: z.string(),
  focus: z.string(),
  keyElements: z.array(z.string()),
});

export const networkBuildingSchema = z.object({
  targetType: z.enum(['user', 'community', 'hashtag']),
  target: z.string(),
  approach: z.string(),
  value: z.string(),
});

export const actionableRecommendationsSchema = z.object({
  engagementStrategies: z.array(engagementStrategySchema),
  contentCreation: z.array(contentCreationSchema),
  networkBuilding: z.array(networkBuildingSchema),
});

export const tweetAnalysisSchema = z.object({
  contentAnalysis: contentAnalysisSchema,
  marketingInsights: marketingInsightsSchema,
  actionableRecommendations: actionableRecommendationsSchema,
  spamAnalysis: spamAnalysisSchema,
});
