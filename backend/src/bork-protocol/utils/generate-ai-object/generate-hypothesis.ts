import { tweetQueries } from '@/db/queries';
import { hypothesisTemplate } from '@/templates/hypothesis';
import { fetchTopicKnowledge } from '@/utils/knowledge/fetch-topic-knowledge';
import {
  type IAgentRuntime,
  ModelClass,
  type RAGKnowledgeItem,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { z } from 'zod';

interface LessonLearned {
  topic: string;
  whatWorked: string[];
  whatDidntWork: string[];
}

// Define the schema for the hypothesis response
const relevantKnowledgeSchema = z.object({
  content: z.string(),
  type: z.string(),
  useCase: z.string(),
});

const selectedTopicSchema = z.object({
  primaryTopic: z.string(),
  relatedTopics: z.array(z.string()),
  relevantKnowledge: z.array(relevantKnowledgeSchema),
  threadIdea: z.string(),
  uniqueAngle: z.string(),
  estimatedLength: z.number().min(1),
});

const hypothesisResponseSchema = z.object({
  selectedTopics: z.array(selectedTopicSchema),
});

type HypothesisResponse = z.infer<typeof hypothesisResponseSchema>;

/**
 * Generates topic and knowledge suggestions for thread creation
 */
export async function generateHypothesis(
  runtime: IAgentRuntime,
  timeframeHours = 24,
  lessonsLearned: LessonLearned[] = [],
  logPrefix = '[Hypothesis Generation]',
): Promise<HypothesisResponse> {
  try {
    elizaLogger.info(
      `${logPrefix} Starting topic selection for the last ${timeframeHours} hours`,
    );

    // Get recent topic weights
    const topicWeights =
      await tweetQueries.getRecentTopicWeights(timeframeHours);
    elizaLogger.info(
      `${logPrefix} Found ${topicWeights.length} topic weights to analyze`,
    );

    if (topicWeights.length === 0) {
      throw new Error('No recent topic weights found for analysis');
    }

    // Fetch knowledge for each topic
    const allKnowledge: RAGKnowledgeItem[] = [];
    for (const topicWeight of topicWeights) {
      const topicKnowledge = await fetchTopicKnowledge(
        runtime,
        topicWeight.topic,
        `${logPrefix} [Topic: ${topicWeight.topic}]`,
      );
      allKnowledge.push(...topicKnowledge);
    }

    elizaLogger.info(
      `${logPrefix} Found ${allKnowledge.length} total knowledge items`,
    );

    // Log lessons learned if available
    if (lessonsLearned.length > 0) {
      elizaLogger.info(
        `${logPrefix} Incorporating ${lessonsLearned.length} lessons learned`,
        {
          topics: lessonsLearned.map((l) => l.topic),
        },
      );
    }

    // Create the template
    const template = hypothesisTemplate({
      topicWeights,
      topicKnowledge: allKnowledge,
      lessonsLearned,
    });

    // Generate topic suggestions using the AI
    const { object } = await generateObject({
      runtime,
      context: template.context,
      modelClass: ModelClass.SMALL,
      schema: hypothesisResponseSchema,
    });

    const hypothesis = object as HypothesisResponse;

    elizaLogger.info(`${logPrefix} Successfully selected topics for threads`, {
      numTopics: hypothesis.selectedTopics.length,
      topics: hypothesis.selectedTopics.map((t) => t.primaryTopic),
      totalKnowledgeItems: hypothesis.selectedTopics.reduce(
        (sum, t) => sum + t.relevantKnowledge.length,
        0,
      ),
    });

    return hypothesis;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating topic suggestions:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export type { HypothesisResponse, LessonLearned };
