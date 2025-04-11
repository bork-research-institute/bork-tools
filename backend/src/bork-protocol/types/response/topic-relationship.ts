import { z } from 'zod';

/**
 * Schema for topic relationship analysis
 */
export const topicRelationshipSchema = z.object({
  relatedTopics: z.array(
    z.object({
      topic: z.string().min(1),
      relevanceScore: z.number().min(0).max(1),
      relationshipType: z.enum([
        'direct',
        'strong',
        'moderate',
        'weak',
        'none',
      ]),
    }),
  ),
  analysisMetadata: z.object({
    confidence: z.number().min(0).max(1),
  }),
});

export type TopicRelationshipAnalysis = z.infer<typeof topicRelationshipSchema>;

/**
 * Relationship types and their score ranges
 */
export const RELATIONSHIP_TYPES = {
  direct: { min: 1.0, max: 1.0 },
  strong: { min: 0.7, max: 0.9 },
  moderate: { min: 0.4, max: 0.6 },
  weak: { min: 0.1, max: 0.3 },
  none: { min: 0.0, max: 0.0 },
} as const;

/**
 * Helper function to determine relationship type from score
 */
export function getRelationshipType(
  score: number,
): keyof typeof RELATIONSHIP_TYPES {
  if (score >= 1.0) {
    return 'direct';
  }
  if (score >= 0.7) {
    return 'strong';
  }
  if (score >= 0.4) {
    return 'moderate';
  }
  if (score >= 0.1) {
    return 'weak';
  }
  return 'none';
}
