import {
  KNOWLEDGE_ROOM_ID,
  SYSTEM_USER_ID,
} from '@/bork-protocol/config/knowledge';
import {
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';

/**
 * Fetches and formats knowledge items related to a specific topic using embeddings-based search
 */
export async function fetchTopicKnowledge(
  runtime: IAgentRuntime,
  topic: string,
  logPrefix = '[Knowledge Fetch]',
): Promise<RAGKnowledgeItem[]> {
  try {
    // Create a memory object for embedding generation
    const memory: Memory = {
      id: stringToUuid(`topic-search-${topic}`),
      agentId: runtime.agentId,
      content: {
        text: topic,
      },
      userId: stringToUuid(SYSTEM_USER_ID),
      roomId: stringToUuid(KNOWLEDGE_ROOM_ID),
    };

    // Generate embedding for the topic
    await runtime.messageManager.addEmbeddingToMemory(memory);

    if (!memory.embedding) {
      elizaLogger.warn(
        `${logPrefix} Failed to generate embedding for topic: ${topic}`,
      );
      return [];
    }

    // Convert embedding to Float32Array if needed
    const embedding =
      memory.embedding instanceof Float32Array
        ? memory.embedding
        : new Float32Array(memory.embedding);

    // Search knowledge using embeddings
    const knowledge = await runtime.databaseAdapter.searchKnowledge({
      agentId: runtime.agentId,
      embedding,
      match_threshold: 0.7,
      match_count: 20,
      searchText: topic,
    });

    elizaLogger.debug(
      `${logPrefix} Found ${knowledge.length} knowledge items for topic: ${topic}`,
      {
        topic,
        knowledgeCount: knowledge.length,
        firstItem: knowledge[0]
          ? {
              preview: knowledge[0].content.text.slice(0, 100),
              similarity: knowledge[0].similarity?.toFixed(3),
              metadata: knowledge[0].content.metadata,
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
        writingStyle?: {
          tone: 'academic_degen';
          useEmojis: false;
          format: 'thread';
        };
      }

      let analysisContent: AnalysisContent;
      try {
        analysisContent = JSON.parse(k.content.text) as AnalysisContent;
      } catch {
        // Handle legacy format or invalid JSON
        analysisContent = {
          mainContent: k.content.text,
          writingStyle: {
            tone: 'academic_degen',
            useEmojis: false,
            format: 'thread',
          },
        };
      }

      return {
        ...k,
        content: {
          ...k.content,
          text: analysisContent.mainContent,
          metadata: {
            ...metadata,
            topics,
            metrics,
            keyTakeaways: analysisContent.keyTakeaways,
            writingStyle: analysisContent.writingStyle,
          },
        },
      };
    });
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error fetching knowledge for topic:`, {
      topic,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
