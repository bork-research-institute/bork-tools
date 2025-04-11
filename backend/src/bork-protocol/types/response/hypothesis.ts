import { z } from 'zod';

export const contentStrategySchema = z.object({
  format: z.enum(['thread', 'carousel', 'poll', 'video', 'mixed']),
  numberOfPosts: z.number().min(1),
  keyElements: z.array(z.string()),
  uniqueAngles: z.array(z.string()),
});

export const growthPotentialSchema = z.object({
  estimatedImpressions: z.number().min(0),
  targetEngagementRate: z.number().min(0).max(1),
  followerGrowthEstimate: z.number().min(0),
});

export const successMetricsSchema = z.object({
  minimumEngagement: z.number().min(0),
  targetImpressions: z.number().min(0),
  expectedFollowerGain: z.number().min(0),
});

export const hypothesisSchema = z.object({
  projectName: z.string(),
  primaryTopic: z.string(),
  relatedTopics: z.array(z.string()),
  contentStrategy: contentStrategySchema,
  growthPotential: growthPotentialSchema,
  rationale: z.string(),
  confidenceScore: z.number().min(0).max(1),
  risks: z.array(z.string()),
  successMetrics: successMetricsSchema,
});

export const topicDistributionSchema = z.object({
  topic: z.string(),
  percentage: z.number().min(0).max(1),
});

export const contentMixSchema = z.object({
  format: z.string(),
  percentage: z.number().min(0).max(1),
});

export const overallStrategySchema = z.object({
  recommendedFrequency: z.string(),
  topicDistribution: z.array(topicDistributionSchema),
  contentMix: z.array(contentMixSchema),
});

export const marketingInsightsSchema = z.object({
  targetAudience: z.array(z.string()),
  uniqueValueProposition: z.string(),
  competitiveAdvantage: z.array(z.string()),
  growthLevers: z.array(z.string()),
});

export const hypothesisResponseSchema = z.object({
  hypotheses: z.array(hypothesisSchema),
  overallStrategy: overallStrategySchema,
  marketingInsights: marketingInsightsSchema,
});

// Export the inferred type from the schema
export type HypothesisResponse = z.infer<typeof hypothesisResponseSchema>;
