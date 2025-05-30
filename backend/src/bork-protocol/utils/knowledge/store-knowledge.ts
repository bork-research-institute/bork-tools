import { KNOWLEDGE_ROOM_ID, SYSTEM_USER_ID } from '@bork/config/knowledge';
import type { TweetAnalysis } from '@bork/types/analysis';
import type { DatabaseTweet } from '@bork/types/twitter';
import {
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  type UUID,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';

/**
 * Splits text into chunks of approximately the specified token length
 * This is a simple implementation that uses characters as a proxy for tokens
 * For more accurate token counting, you would need a proper tokenizer
 */
function chunkText(text: string, maxTokens: number): string[] {
  // Assuming average token is ~4 characters, convert tokens to characters
  const maxChars = maxTokens * 4;

  // Split into sentences first to avoid breaking mid-sentence
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Creates metadata for a knowledge item
 */
function createKnowledgeMetadata(
  tweet: DatabaseTweet,
  analysis: TweetAnalysis,
  knowledgeType: 'content' | 'marketing',
  isChunk = false,
  chunkIndex?: number,
  originalId?: UUID,
) {
  const topics = analysis.contentAnalysis.topics || [];
  const tweetType = analysis.contentAnalysis.type;
  const sentiment = analysis.contentAnalysis.sentiment;
  const impactScore = analysis.contentAnalysis.qualityMetrics?.valueAdd || 0.5;

  return {
    source: 'twitter',
    sourceId: tweet.tweet_id,
    sourceUrl: tweet.permanentUrl,
    authorUsername: tweet.username,
    authorUserId: tweet.userId?.toString(),
    tweetType,
    sentiment,
    impactScore,
    topics,
    isOpinion: tweetType === 'opinion',
    isFactual: tweetType === 'news' || tweetType === 'educational',
    hasQuestion: tweetType === 'question',
    publicMetrics: {
      likes: tweet.likes || 0,
      retweets: tweet.retweets || 0,
      replies: tweet.replies || 0,
    },
    timestamp: tweet.timestamp,
    isMain: !isChunk,
    isChunk,
    originalId,
    chunkIndex,
    isThreadMerged: tweet.isThreadMerged,
    threadSize: tweet.threadSize || 1,
    analysisVersion: '1.0',
    knowledgeType,
  };
}

/**
 * Stores knowledge with proper chunking
 */
export async function storeKnowledge(
  runtime: IAgentRuntime,
  tweet: DatabaseTweet,
  analysis: TweetAnalysis,
  text: string,
  knowledgeType: 'content' | 'marketing',
  logPrefix: string,
): Promise<void> {
  // Create the main knowledge item first
  const mainId = stringToUuid(`tweet-${knowledgeType}-${tweet.tweet_id}`);

  const mainKnowledge: RAGKnowledgeItem = {
    id: mainId,
    agentId: runtime.agentId,
    content: {
      text: text.toLowerCase(),
      metadata: {
        ...createKnowledgeMetadata(tweet, analysis, knowledgeType, false),
        originalText: text,
      },
    },
    embedding: undefined,
    createdAt: Date.now(),
  };

  // Generate embedding for the main item using standardized IDs
  const mainMemory: Memory = {
    id: mainId,
    content: { text: text.toLowerCase() },
    agentId: runtime.agentId,
    userId: stringToUuid(SYSTEM_USER_ID),
    roomId: stringToUuid(KNOWLEDGE_ROOM_ID),
  };

  await runtime.messageManager.addEmbeddingToMemory(mainMemory);

  if (mainMemory.embedding) {
    mainKnowledge.embedding =
      mainMemory.embedding instanceof Float32Array
        ? mainMemory.embedding
        : new Float32Array(mainMemory.embedding);

    // Store the main knowledge item
    await runtime.databaseAdapter.createKnowledge(mainKnowledge);

    elizaLogger.debug(
      `${logPrefix} Stored main ${knowledgeType} knowledge for tweet ${tweet.tweet_id}`,
      {
        textLength: text.length,
        embeddingSize: mainKnowledge.embedding.length,
      },
    );

    // If text is long enough, create chunks
    if (text.length > 1000) {
      const chunks = chunkText(text, 1000);
      elizaLogger.debug(
        `${logPrefix} Creating ${chunks.length} chunks for ${knowledgeType} knowledge`,
      );

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const chunkId = stringToUuid(
          `tweet-${knowledgeType}-${tweet.tweet_id}-chunk-${i}`,
        );

        // Create chunk memory for embedding using standardized IDs
        const chunkMemory: Memory = {
          id: chunkId,
          content: { text: chunkText.toLowerCase() },
          agentId: runtime.agentId,
          userId: stringToUuid(SYSTEM_USER_ID),
          roomId: stringToUuid(KNOWLEDGE_ROOM_ID),
        };

        await runtime.messageManager.addEmbeddingToMemory(chunkMemory);

        if (chunkMemory.embedding) {
          const chunkKnowledge: RAGKnowledgeItem = {
            id: chunkId,
            agentId: runtime.agentId,
            content: {
              text: chunkText.toLowerCase(),
              metadata: {
                ...createKnowledgeMetadata(
                  tweet,
                  analysis,
                  knowledgeType,
                  true,
                  i,
                  mainId,
                ),
                originalText: chunkText,
              },
            },
            embedding:
              chunkMemory.embedding instanceof Float32Array
                ? chunkMemory.embedding
                : new Float32Array(chunkMemory.embedding),
            createdAt: Date.now(),
          };

          await runtime.databaseAdapter.createKnowledge(chunkKnowledge);

          elizaLogger.debug(
            `${logPrefix} Stored chunk ${i} for ${knowledgeType} knowledge of tweet ${tweet.tweet_id}`,
            {
              chunkSize: chunkText.length,
              embeddingSize: chunkKnowledge.embedding.length,
            },
          );
        }
      }
    }
  } else {
    elizaLogger.warn(
      `${logPrefix} Failed to generate embedding for ${knowledgeType} knowledge of tweet ${tweet.tweet_id}`,
    );
  }
}
