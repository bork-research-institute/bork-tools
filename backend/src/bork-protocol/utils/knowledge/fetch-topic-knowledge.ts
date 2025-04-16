import { KNOWLEDGE_ROOM_ID, SYSTEM_USER_ID } from '@/config/knowledge';
import {
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';

/**
 * Fetches and formats knowledge items related to a specific topic
 */
export async function fetchTopicKnowledge(
  runtime: IAgentRuntime,
  topic: string,
  logPrefix = '[Knowledge Fetch]',
): Promise<RAGKnowledgeItem[]> {
  try {
    elizaLogger.debug(`${logPrefix} Generating embedding for topic "${topic}"`);

    // Create minimal memory object for embedding generation using standardized IDs
    const memory: Memory = {
      id: stringToUuid(`topic-${topic}`),
      content: { text: topic },
      agentId: runtime.agentId,
      userId: stringToUuid(SYSTEM_USER_ID),
      roomId: stringToUuid(KNOWLEDGE_ROOM_ID),
    };

    // Generate embedding for the topic
    await runtime.messageManager.addEmbeddingToMemory(memory);

    if (!memory.embedding) {
      elizaLogger.warn(
        `${logPrefix} No embedding generated for topic ${topic}, falling back to text search`,
      );
      return [];
    }

    // Convert embedding to Float32Array if needed
    const embedding =
      memory.embedding instanceof Float32Array
        ? memory.embedding
        : new Float32Array(memory.embedding);

    // Search for knowledge items related to the topic
    let knowledge: RAGKnowledgeItem[] = [];
    try {
      knowledge = await runtime.databaseAdapter.searchKnowledge({
        agentId: runtime.agentId,
        embedding,
        match_threshold: 0.35,
        match_count: 15,
        searchText: topic,
      });
    } catch (searchError) {
      elizaLogger.error(`${logPrefix} Error during knowledge search:`, {
        error:
          searchError instanceof Error
            ? searchError.message
            : String(searchError),
        stack: searchError instanceof Error ? searchError.stack : undefined,
      });
      return [];
    }

    if (knowledge.length === 0) {
      elizaLogger.info(
        `${logPrefix} No relevant knowledge found for topic "${topic}".`,
      );
      return [];
    }

    elizaLogger.info(
      `${logPrefix} Found ${knowledge.length} knowledge items for topic "${topic}"`,
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
