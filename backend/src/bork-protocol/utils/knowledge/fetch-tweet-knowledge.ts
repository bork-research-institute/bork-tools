import type { DatabaseTweet } from '@/types/twitter';
import {
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetches relevant knowledge for a tweet and formats it for analysis context
 * @param runtime The agent runtime
 * @param tweet The tweet to fetch knowledge for
 * @param logPrefix Optional log prefix for consistent logging
 * @returns Formatted knowledge context string
 */
export async function fetchAndFormatKnowledge(
  runtime: IAgentRuntime,
  tweet: DatabaseTweet,
  logPrefix = '[Knowledge Retrieval]',
): Promise<string> {
  try {
    elizaLogger.debug(
      `${logPrefix} Fetching knowledge for tweet ${tweet.tweet_id}`,
    );

    // Create a memory object for embedding generation
    const tweetMemory: Memory = {
      id: stringToUuid(`tweet-memory-${tweet.tweet_id}`),
      content: {
        text: tweet.text,
      },
      agentId: runtime.agentId,
      userId: stringToUuid(`twitter-user-${tweet.userId}`),
      roomId: stringToUuid(uuidv4()),
    };

    elizaLogger.debug(
      `${logPrefix} Generating embedding for tweet ${tweet.tweet_id} to search for relevant knowledge`,
    );

    // Generate embedding for the tweet text
    await runtime.messageManager.addEmbeddingToMemory(tweetMemory);

    // Ensure the embedding exists
    if (!tweetMemory.embedding) {
      elizaLogger.warn(
        `${logPrefix} No embedding generated for tweet ${tweet.tweet_id}`,
      );
      return '';
    }

    elizaLogger.debug(
      `${logPrefix} Successfully generated search embedding for tweet ${tweet.tweet_id}`,
    );
    elizaLogger.debug({
      embeddingSize:
        tweetMemory.embedding instanceof Float32Array
          ? tweetMemory.embedding.length
          : tweetMemory.embedding.length,
      embeddingType:
        tweetMemory.embedding instanceof Float32Array
          ? 'Float32Array'
          : 'Array',
    });

    // Convert the embedding to Float32Array if needed
    const embedding =
      tweetMemory.embedding instanceof Float32Array
        ? tweetMemory.embedding
        : new Float32Array(tweetMemory.embedding);

    elizaLogger.debug(`${logPrefix} Searching for knowledge with parameters:`, {
      agentId: runtime.agentId,
      match_threshold: 0.7,
      match_count: 5,
      textLength: tweet.text.length,
      hasEmbedding: Boolean(embedding?.length),
      embeddingSize: embedding?.length,
      searchText:
        tweet.text.slice(0, 100) + (tweet.text.length > 100 ? '...' : ''), // Log part of search text
    });

    let relevantKnowledge: RAGKnowledgeItem[] = [];
    try {
      relevantKnowledge = await runtime.databaseAdapter.searchKnowledge({
        agentId: runtime.agentId,
        embedding,
        match_threshold: 0.7,
        match_count: 5,
        searchText: tweet.text,
      });
    } catch (searchError) {
      elizaLogger.error(`${logPrefix} Error during knowledge search:`, {
        error:
          searchError instanceof Error
            ? searchError.message
            : String(searchError),
        stack: searchError instanceof Error ? searchError.stack : undefined,
      });
      return '';
    }

    if (relevantKnowledge.length === 0) {
      elizaLogger.info(
        `${logPrefix} No relevant knowledge found for tweet ${tweet.tweet_id}.`,
      );
      return '';
    }

    elizaLogger.info(
      `${logPrefix} Found ${relevantKnowledge.length} relevant knowledge items for tweet ${tweet.tweet_id}`,
    );

    // Format the knowledge context
    const knowledgeContext = `\n\nRelevant Knowledge:\n${relevantKnowledge
      .map((k) => {
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

        return `- ${analysisContent.mainContent}
${analysisContent.keyTakeaways?.length ? `Key Takeaways:\n${analysisContent.keyTakeaways.map((point) => `  - ${point}`).join('\n')}\n` : ''}
Type: ${metadata.tweetType || 'unknown'}
Confidence: ${metadata.confidence || 'unknown'}
Similarity: ${(k.similarity || 0).toFixed(2)}
Topics: ${topics.join(', ') || 'none'}
Impact Score: ${metadata.impactScore || 'unknown'}
Engagement: ${
          metrics
            ? `Likes: ${metrics.likes || 0}, Retweets: ${metrics.retweets || 0}, Replies: ${metrics.replies || 0}`
            : 'unknown'
        }
Is Opinion: ${metadata.isOpinion ? 'Yes' : 'No'}
Is Factual: ${metadata.isFactual ? 'Yes' : 'No'}
Has Question: ${metadata.hasQuestion ? 'Yes' : 'No'}`;
      })
      .join('\n\n')}`;

    return knowledgeContext;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error fetching knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id,
    });
    return '';
  }
}
