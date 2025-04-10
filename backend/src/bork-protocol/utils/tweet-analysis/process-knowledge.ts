import type { TweetAnalysis } from '@/types/analysis';
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
 * Extracts knowledge from a tweet analysis and stores it in the database
 * This function identifies facts, opinions, and other useful information from the analysis
 * and formats them for RAG retrieval
 */
export async function extractAndStoreKnowledge(
  runtime: IAgentRuntime,
  tweet: DatabaseTweet,
  analysis: TweetAnalysis,
  logPrefix = '[Knowledge Extraction]',
): Promise<void> {
  try {
    elizaLogger.info(
      `${logPrefix} Starting knowledge extraction for tweet ${tweet.tweet_id}`,
    );

    if (!analysis || !analysis.contentAnalysis) {
      elizaLogger.warn(
        `${logPrefix} No valid analysis found for tweet ${tweet.tweet_id}`,
      );
      return;
    }

    // Check if tweet is considered spam - don't extract knowledge from spam
    if (
      analysis.spamAnalysis.isSpam === true &&
      analysis.spamAnalysis.spamScore > 0.7
    ) {
      elizaLogger.info(
        `${logPrefix} Skipping knowledge extraction for spam tweet ${tweet.tweet_id}`,
      );
      return;
    }

    const topics = [
      ...(analysis.contentAnalysis.primaryTopics || []),
      ...(analysis.contentAnalysis.secondaryTopics || []),
    ];
    const tweetType = analysis.contentAnalysis.type;
    const sentiment = analysis.contentAnalysis.sentiment;
    const impactScore =
      analysis.contentAnalysis.engagementAnalysis?.overallScore || 0.5;

    // Create the base knowledge item for the tweet itself
    const tweetKnowledgeId = stringToUuid(`tweet-knowledge-${tweet.tweet_id}`);

    // Format analysis content for storage
    const analysisContent = {
      mainContent: analysis.contentAnalysis.summary || tweet.text,
      keyPoints: analysis.contentAnalysis.keyPoints || [],
      entities: analysis.contentAnalysis.entities || [],
      sentiment: analysis.contentAnalysis.sentiment,
      type: analysis.contentAnalysis.type,
      topics: topics,
      originalText: tweet.text,
    };

    // Create a knowledge entry for the analysis content with metadata
    const tweetKnowledge: RAGKnowledgeItem = {
      id: tweetKnowledgeId,
      agentId: runtime.agentId,
      content: {
        text: JSON.stringify(analysisContent),
        metadata: {
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
          isFactual: tweetType === 'factual' || tweetType === 'informative',
          hasQuestion: tweetType === 'question',
          publicMetrics: {
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0,
          },
          timestamp: tweet.timestamp,
          isMain: true,
          isThreadMerged: tweet.isThreadMerged,
          threadSize: tweet.threadSize || 1,
          analysisVersion: '1.0', // Add version tracking for analysis format
        },
      },
      embedding: undefined,
      createdAt: Date.now(),
    };

    // Generate embedding for the analysis knowledge
    const tweetMemory: Memory = {
      id: tweetKnowledgeId,
      content: {
        text: JSON.stringify(analysisContent),
      },
      agentId: runtime.agentId,
      userId: stringToUuid(`twitter-user-${tweet.userId}`),
      // TODO Should we create a random room all the time?
      roomId: stringToUuid(uuidv4()),
    };

    elizaLogger.info(
      `${logPrefix} Generating embedding for analysis of tweet ${tweet.tweet_id}`,
    );

    await runtime.messageManager.addEmbeddingToMemory(tweetMemory);

    if (tweetMemory.embedding) {
      elizaLogger.debug(
        `${logPrefix} Successfully generated embedding for tweet ${tweet.tweet_id}`,
        {
          embeddingSize:
            tweetMemory.embedding instanceof Float32Array
              ? tweetMemory.embedding.length
              : tweetMemory.embedding.length,
          embeddingType:
            tweetMemory.embedding instanceof Float32Array
              ? 'Float32Array'
              : 'Array',
        },
      );

      tweetKnowledge.embedding =
        tweetMemory.embedding instanceof Float32Array
          ? tweetMemory.embedding
          : new Float32Array(tweetMemory.embedding);
    } else {
      elizaLogger.warn(
        `${logPrefix} Failed to generate embedding for tweet ${tweet.tweet_id}`,
      );
    }

    // Store the main tweet knowledge
    await runtime.databaseAdapter.createKnowledge(tweetKnowledge);
    elizaLogger.debug(
      `${logPrefix} Stored main tweet analysis knowledge for ${tweet.tweet_id}`,
    );
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error extracting knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id,
    });
  }
}

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
    elizaLogger.info(
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

    elizaLogger.info(
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

    elizaLogger.info(
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

    // Fetch relevant knowledge
    const relevantKnowledge = await runtime.databaseAdapter.searchKnowledge({
      agentId: runtime.agentId,
      embedding,
      match_threshold: 0.7,
      match_count: 5,
      searchText: tweet.text,
    });

    if (relevantKnowledge.length === 0) {
      elizaLogger.info(
        `${logPrefix} No relevant knowledge found for tweet ${tweet.tweet_id}`,
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
          keyPoints?: string[];
        }

        let analysisContent: AnalysisContent;
        try {
          analysisContent = JSON.parse(k.content.text) as AnalysisContent;
        } catch {
          // Handle legacy format or invalid JSON
          analysisContent = { mainContent: k.content.text };
        }

        return `- ${analysisContent.mainContent}
${analysisContent.keyPoints?.length ? `Key Points:\n${analysisContent.keyPoints.map((point) => `  - ${point}`).join('\n')}\n` : ''}
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

    elizaLogger.info(
      `${logPrefix} Successfully fetched and formatted knowledge for tweet ${tweet.tweet_id}`,
    );
    elizaLogger.debug({
      knowledgeCount: relevantKnowledge.length,
    });

    return knowledgeContext;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error fetching knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id,
    });
    return '';
  }
}
