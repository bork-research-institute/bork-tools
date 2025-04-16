import { hypothesisTemplate } from '@/templates/hypothesis';
import {
  type HypothesisResponse,
  type LessonLearned,
  hypothesisResponseSchema,
} from '@/types/response/hypothesis';
import { fetchTopicKnowledge } from '@/utils/knowledge/fetch-topic-knowledge';
import { selectTopic } from '@/utils/selection/select-topic';
import {
  type IAgentRuntime,
  ModelClass,
  type RAGKnowledgeItem,
  elizaLogger,
  generateObject,
} from '@elizaos/core';

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

    // Select top 10 topics based on engagement
    const selectedTopicRows = await selectTopic(
      runtime,
      timeframeHours,
      undefined,
      10,
    );
    const topicKnowledgeMap = new Map<string, RAGKnowledgeItem[]>();

    // Fetch knowledge for each selected topic
    for (const topicRow of selectedTopicRows) {
      const topicKnowledge = await fetchTopicKnowledge(
        runtime,
        topicRow.topic,
        `${logPrefix} [Topic: ${topicRow.topic}]`,
      );

      // Only keep topics that have sufficient knowledge
      if (topicKnowledge.length >= 2) {
        topicKnowledgeMap.set(topicRow.topic, topicKnowledge);
      }
    }

    elizaLogger.info(
      `${logPrefix} Selected ${topicKnowledgeMap.size} topics with sufficient knowledge for analysis.`,
    );

    // Combine all knowledge items
    const allKnowledge: RAGKnowledgeItem[] = Array.from(
      topicKnowledgeMap.values(),
    ).flat();

    if (allKnowledge.length === 0) {
      elizaLogger.warn(
        `${logPrefix} No topics found with sufficient knowledge`,
      );
      return { selectedTopic: null };
    }

    // Filter selectedTopicRows to only include topics with sufficient knowledge
    const validTopicRows = selectedTopicRows.filter((row) =>
      topicKnowledgeMap.has(row.topic),
    );

    // Log knowledge items for selected topics
    elizaLogger.info(`${logPrefix} Knowledge items for selected topics:`, {
      topics: Array.from(topicKnowledgeMap.entries()).map(
        ([topic, knowledge]) => ({
          topic,
          knowledgeCount: knowledge.length,
          knowledge: knowledge.map((k, index) => {
            const metadata = k.content.metadata as {
              sourceId?: string;
              sourceUrl?: string;
              authorUsername?: string;
              publicMetrics?: {
                likes: number;
                retweets: number;
                replies: number;
              };
            };
            return {
              index: index + 1,
              similarity: k.similarity?.toFixed(3),
              preview: k.content.text,
              source: {
                tweetId: metadata?.sourceId,
                author: metadata?.authorUsername,
                url: metadata?.sourceUrl,
                metrics: metadata?.publicMetrics ?? null,
              },
            };
          }),
        }),
      ),
    });

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
      topicWeights: validTopicRows,
      topicKnowledge: topicKnowledgeMap,
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

    if (!hypothesis.selectedTopic) {
      elizaLogger.info(
        `${logPrefix} Not enough quality knowledge to create a compelling thread`,
      );
      return hypothesis;
    }

    elizaLogger.info(`${logPrefix} Successfully selected topic for thread`, {
      selectedTopic: hypothesis.selectedTopic.primaryTopic,
      hasKnowledge: hypothesis.selectedTopic.relevantKnowledge.length > 0,
      confidenceScore: hypothesis.selectedTopic.confidenceScore,
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
