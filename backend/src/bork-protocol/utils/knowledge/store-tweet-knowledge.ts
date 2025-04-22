import type { TweetAnalysis } from '@/types/analysis';
import type { DatabaseTweet } from '@/types/twitter';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { storeKnowledge } from './store-knowledge';

/**
 * Extracts knowledge from a tweet analysis and stores it in the database
 * This function stores separate entries for content and marketing summaries,
 * with proper chunking for long text (max 1000 tokens per chunk)
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

    // Process content summary if available
    if (analysis.contentAnalysis.summary) {
      await storeKnowledge(
        runtime,
        tweet,
        analysis,
        analysis.contentAnalysis.summary,
        'content',
        logPrefix,
      );
    }

    elizaLogger.info(
      `${logPrefix} Completed knowledge extraction for tweet ${tweet.tweet_id}`,
    );
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error extracting knowledge:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetId: tweet.tweet_id,
    });
  }
}
