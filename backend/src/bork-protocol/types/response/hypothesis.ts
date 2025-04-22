import { z } from 'zod';

const relevantKnowledgeSchema = z.object({
  content: z.string(),
  type: z.string(),
  useCase: z.string(),
  source: z.object({
    tweetId: z.string(),
    authorUsername: z.string(),
    url: z.string(),
    metrics: z.object({
      likes: z.number(),
      retweets: z.number(),
      replies: z.number(),
    }),
  }),
});

export const selectedTopicSchema = z.object({
  primaryTopic: z.string(),
  relatedTopics: z.array(z.string()),
  relevantKnowledge: z.array(relevantKnowledgeSchema),
  threadIdea: z.string(),
  uniqueAngle: z.string(),
  estimatedLength: z.number().min(1),
  confidenceScore: z.number().min(0.75),
});

export const hypothesisResponseSchema = z.object({
  selectedTopic: selectedTopicSchema.nullable(),
});

export type HypothesisResponse = z.infer<typeof hypothesisResponseSchema>;
export type SelectedTopic = z.infer<typeof selectedTopicSchema>;

export type LessonLearned = {
  topic: string;
  whatWorked: string[];
  whatDidntWork: string[];
};

export const topicSuggestionsSchema = z.object({
  selectedTopics: z.array(selectedTopicSchema),
});

export type TopicSuggestionsResponse = z.infer<typeof topicSuggestionsSchema>;
