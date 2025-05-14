import { hypothesisTemplate } from '@/bork-protocol/templates/hypothesis';
import {
  type HypothesisResponse,
  hypothesisResponseSchema,
} from '@/bork-protocol/types/response/hypothesis';
import { fetchTopicKnowledge } from '@/bork-protocol/utils/knowledge/fetch-topic-knowledge';
import { selectTopic } from '@/bork-protocol/utils/selection/select-topic';
import {
  type IAgentRuntime,
  ModelClass,
  type RAGKnowledgeItem,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { threadQueries } from '../../db/thread-queries';

/**
 * Generates topic and knowledge suggestions for thread creation
 */
export async function generateHypothesis(
  runtime: IAgentRuntime,
  timeframeHours = 24,
  preferredTopic = 'solana',
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
      preferredTopic,
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
      await threadQueries.getRecentlyUsedKnowledge(timeframeHours);

    // Get topic performance data from posted threads
    const topicPerformance = await threadQueries.getTopicPerformance(
      validTopicRows.map((row) => row.topic),
    );

    // Get recent threads for all topics
    const recentThreads = [];

    // Fetch recent threads for each topic with sufficient knowledge
    for (const row of validTopicRows) {
      const topicThreads = await threadQueries.getPostedThreadsByTopic(
        row.topic,
        2, // Limit to 2 most recent threads per topic
      );
      recentThreads.push(...topicThreads);
    }

    // Filter threads to only include those related to our topics
    const relevantThreads = recentThreads.filter((thread) => {
      return validTopicRows.some(
        (row) =>
          thread.primaryTopic === row.topic ||
          thread.relatedTopics?.includes(row.topic),
      );
    });

    elizaLogger.debug(
      `${logPrefix} Recent threads for hypothesis generation:`,
      relevantThreads.map((t) => ({
        id: t.id,
        title: t.threadIdea,
        primary_topic: t.primaryTopic,
        related_topics: t.relatedTopics,
      })),
    );

    // Log knowledge items for selected topics
    elizaLogger.debug(`${logPrefix} Knowledge items for selected topics:`, {
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
              createdAt: k.createdAt || Date.now(),
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
    elizaLogger.debug(`${logPrefix} Historical performance data:`, {
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
      preferredTopic,
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
        (t) => t.primaryTopic === hypothesis.selectedTopic?.primaryTopic,
      ).length,
    });

    return hypothesis;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating topic suggestions:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export type { HypothesisResponse };
