import {} from '@/config/knowledge';
import { knowledgeQueries } from '@/db/knowledge';
import {
  type IAgentRuntime,
  type RAGKnowledgeItem,
  elizaLogger,
} from '@elizaos/core';

/**
 * Fetches and formats knowledge items related to a specific topic using keyword matching
 */
export async function fetchTopicKnowledge(
  runtime: IAgentRuntime,
  topic: string,
  logPrefix = '[Knowledge Fetch]',
): Promise<RAGKnowledgeItem[]> {
  try {
    elizaLogger.debug(
      `${logPrefix} Searching for topic "${topic}" using keywords`,
    );

    // Debug the knowledge table first
    await knowledgeQueries.debugKnowledgeTable(runtime.agentId);

    // Add detailed check for this specific topic
    await knowledgeQueries.checkContentForTopic({
      agentId: runtime.agentId,
      topic,
    });

    // First try exact topic match with higher limit
    let knowledge = await knowledgeQueries.searchKnowledgeByKeywords({
      agentId: runtime.agentId,
      topic,
      limit: 10,
    });

    elizaLogger.debug(`${logPrefix} Search results for topic "${topic}":`, {
      exactMatchCount: knowledge.length,
    });

    // If no exact matches, try broader search with more results
    if (knowledge.length === 0) {
      knowledge = await knowledgeQueries.searchKnowledgeByKeywords({
        agentId: runtime.agentId,
        topic: `${topic} cryptocurrency crypto market trading analysis news`,
        limit: 25,
      });

      elizaLogger.debug(
        `${logPrefix} Broad search results for topic "${topic}":`,
        {
          broadMatchCount: knowledge.length,
        },
      );
    }

    if (knowledge.length === 0) {
      elizaLogger.info(
        `${logPrefix} No relevant knowledge found for topic "${topic}".`,
      );
      return [];
    }

    elizaLogger.info(
      `${logPrefix} Found ${knowledge.length} knowledge items for topic "${topic}"`,
      {
        similarityRange:
          knowledge.length > 0
            ? {
                min: Math.min(...knowledge.map((k) => k.similarity || 0)),
                max: Math.max(...knowledge.map((k) => k.similarity || 0)),
              }
            : null,
      },
    );

    // Process and format each knowledge item
    return knowledge.map((k) => {
      const metadata = k.content.metadata || {};
      const topics = Array.isArray(metadata.topics) ? metadata.topics : [];
      const metrics =
        (metadata.publicMetrics as {
          likes?: number;
          retweets?: number;
          replies?: number;
        }) || {};

      interface AnalysisContent {
        mainContent: string;
        keyTakeaways?: string[];
      }

      let analysisContent: AnalysisContent;
      try {
        analysisContent = JSON.parse(k.content.text) as AnalysisContent;
      } catch {
        // Handle legacy format or invalid JSON
        analysisContent = { mainContent: k.content.text };
      }

      // Format the content text with key takeaways if available
      const formattedText = `${analysisContent.mainContent}${
        analysisContent.keyTakeaways?.length
          ? `\nKey Takeaways:\n${analysisContent.keyTakeaways
              .map((point) => `- ${point}`)
              .join('\n')}`
          : ''
      }`;

      // Return a properly typed knowledge item
      return {
        ...k,
        content: {
          text: formattedText,
          metadata: {
            ...k.content.metadata,
            type: String(metadata.tweetType || 'unknown'),
            confidence: Number(metadata.confidence || 0),
            similarity: Number((k.similarity || 0).toFixed(2)),
            topics: topics.join(', ') || 'none',
            impactScore: Number(metadata.impactScore || 0),
            engagement: {
              likes: Number(metrics.likes || 0),
              retweets: Number(metrics.retweets || 0),
              replies: Number(metrics.replies || 0),
            },
            isOpinion: Boolean(metadata.isOpinion),
            isFactual: Boolean(metadata.isFactual),
            hasQuestion: Boolean(metadata.hasQuestion),
          },
        },
      };
    });
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error fetching knowledge for topic ${topic}:`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    return [];
  }
}
