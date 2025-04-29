import { hypothesisTemplate } from '@/templates/hypothesis';
import {
  type HypothesisResponse,
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
import { threadTrackingQueries } from '../../../bork-protocol/db/queries';

/**
 * Generates topic and knowledge suggestions for thread creation
 */
export async function generateHypothesis(
  runtime: IAgentRuntime,
  timeframeHours = 24,
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
      20,
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

    // Get recently used knowledge to avoid repetition
    const recentlyUsedKnowledge =
      await threadTrackingQueries.getRecentlyUsedKnowledge(timeframeHours);

    // Get topic performance data
    const topicPerformance = await threadTrackingQueries.getTopicPerformance(
      validTopicRows.map((row) => row.topic),
    );

    // Get recent threads for all topics
    const recentThreads = [];

    // Fetch recent threads for each topic with sufficient knowledge
    for (const row of validTopicRows) {
      const topicThreads = await threadTrackingQueries.getPostedThreadsByTopic(
        row.topic,
        2, // Limit to 2 most recent threads per topic
      );
      recentThreads.push(...topicThreads);
    }

    // Filter threads to only include those related to our topics
    const relevantThreads = recentThreads.filter((thread) => {
      return validTopicRows.some(
        (row) =>
          thread.primary_topic === row.topic ||
          thread.related_topics?.includes(row.topic),
      );
    });

    elizaLogger.info(
      'Recent threads for hypothesis generation:',
      relevantThreads.map((t) => ({
        id: t.id,
        title: t.title,
        primary_topic: t.primary_topic,
        related_topics: t.related_topics,
      })),
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

    // Log historical performance data
    elizaLogger.info(`${logPrefix} Historical performance data:`, {
      topicPerformance: topicPerformance.map((tp) => ({
        topic: tp.topic,
        totalThreads: tp.totalThreads,
        avgEngagement: tp.avgEngagement,
        performanceScore: tp.performanceScore,
      })),
      recentlyUsedKnowledge: recentlyUsedKnowledge.length,
      recentThreads: relevantThreads.length,
    });

    // Create the template
    const template = hypothesisTemplate({
      topicWeights: validTopicRows,
      topicKnowledge: topicKnowledgeMap,
      recentThreads: relevantThreads,
      topicPerformance,
      recentlyUsedKnowledge,
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
      recentThreadsOnTopic: relevantThreads.filter(
        (t) => t.primary_topic === hypothesis.selectedTopic?.primaryTopic,
      ).length,
    });

    return hypothesis;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating topic suggestions:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export type { HypothesisResponse };
