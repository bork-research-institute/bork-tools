import { tweetQueries } from '@/db/queries.js';
import type {
  QualityMetrics,
  TweetAnalysis,
} from '@/types/response/tweet-analysis';
import type { TopicWeightRow } from '@/types/topic.js';
import type { DatabaseTweet } from '@/types/twitter.js';
import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculates engagement metrics from tweet data and analysis
 */
function calculateEngagementMetrics(
  tweet: DatabaseTweet,
  analysis: TweetAnalysis,
): TopicWeightRow['engagement_metrics'] {
  const qualityMetrics = {
    relevance: analysis.contentAnalysis.qualityMetrics.relevance ?? 0,
    originality: analysis.contentAnalysis.qualityMetrics.originality ?? 0,
    clarity: analysis.contentAnalysis.qualityMetrics.clarity ?? 0,
    authenticity: analysis.contentAnalysis.qualityMetrics.authenticity ?? 0,
    valueAdd: analysis.contentAnalysis.qualityMetrics.valueAdd ?? 0,
  };

  return {
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    quality_metrics: qualityMetrics,
  };
}

/**
 * Calculates a sophisticated weight for a topic based on multiple factors
 */
function calculateTopicWeight(
  likes: number,
  retweets: number,
  replies: number,
  sentiment: string,
  confidence: number,
  qualityMetrics: QualityMetrics,
): number {
  // Sigmoid function for smooth normalization without hard caps
  // k controls the steepness of the curve (smaller = more gradual)
  // x0 is the midpoint where sigmoid(x0) = 0.5
  const sigmoid = (x: number, k: number, x0: number): number =>
    1 / (1 + Math.exp(-k * (Math.log(x + 1) - Math.log(x0))));

  // Calculate normalized engagement metrics using sigmoid
  const normalizedEngagement = {
    // Use logarithmic sigmoid to better handle order-of-magnitude differences
    likes: sigmoid(likes, 1.5, 1000), // x0 = 1000 likes
    retweets: sigmoid(retweets, 1.5, 500), // x0 = 500 retweets
    replies: sigmoid(replies, 1.5, 200), // x0 = 200 replies
  };

  // Calculate engagement score (30% of total weight)
  const engagementScore =
    (normalizedEngagement.likes * 0.4 +
      normalizedEngagement.retweets * 0.35 +
      normalizedEngagement.replies * 0.25) *
    0.3;

  // Calculate quality score (30% of total weight)
  const qualityScore =
    (qualityMetrics.relevance * 0.25 +
      qualityMetrics.originality * 0.2 +
      qualityMetrics.clarity * 0.15 +
      qualityMetrics.authenticity * 0.2 +
      qualityMetrics.valueAdd * 0.2) *
    0.3;

  // Calculate sentiment score (20% of total weight)
  const sentimentMultiplier =
    sentiment === 'positive' ? 1 : sentiment === 'neutral' ? 0.7 : 0.4;
  const sentimentScore = sentimentMultiplier * 0.2;

  // Confidence score (20% of total weight)
  const confidenceScore = confidence * 0.2;

  // Combine all scores and ensure it's between 0 and 1
  return Math.max(
    0,
    Math.min(
      1,
      engagementScore + qualityScore + sentimentScore + confidenceScore,
    ),
  );
}

/**
 * Updates topic weights based on tweet analysis
 * @param tweetTopics Topics found in the tweet
 * @param tweetAnalysis The full tweet analysis
 * @param tweet The original tweet data
 * @param context The logging context
 */
export async function updateTopicWeights(
  tweetTopics: string[],
  tweetAnalysis: TweetAnalysis,
  tweet: DatabaseTweet,
  context: string,
): Promise<void> {
  if (!tweetTopics || tweetTopics.length === 0) {
    elizaLogger.debug(`${context} No topics to process, skipping`);
    return;
  }

  try {
    // Process each topic found in the tweet
    for (const topic of tweetTopics) {
      if (!topic || typeof topic !== 'string') {
        elizaLogger.warn(`${context} Invalid topic found, skipping`);
        continue;
      }

      // Calculate new weight using our sophisticated formula
      const weight = calculateTopicWeight(
        tweet.likes || 0,
        tweet.retweets || 0,
        tweet.replies || 0,
        tweetAnalysis.contentAnalysis.sentiment,
        tweetAnalysis.contentAnalysis.confidence,
        tweetAnalysis.contentAnalysis.qualityMetrics,
      );

      try {
        const now = new Date();

        // Create a new topic weight entry matching the database schema
        const topicWeight: TopicWeightRow = {
          id: uuidv4(),
          topic,
          weight,
          impact_score: weight,
          created_at: now,
          engagement_metrics: calculateEngagementMetrics(tweet, tweetAnalysis),
          sentiment: tweetAnalysis.contentAnalysis.sentiment,
          confidence: tweetAnalysis.contentAnalysis.confidence,
          tweet_id: tweet.tweet_id,
        };

        await tweetQueries.createTopicWeight(topicWeight);

        elizaLogger.debug(
          `${context} Created new topic weight entry for ${topic}`,
          {
            weight,
            impactScore: weight,
            tweetId: tweet.tweet_id,
          },
        );
      } catch (updateError) {
        elizaLogger.error(
          `${context} Error creating topic weight for ${topic}:`,
          {
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
            topic,
          },
        );
      }
    }

    elizaLogger.info(
      `${context} Created weight entries for ${tweetTopics.length} topics`,
    );
  } catch (error) {
    elizaLogger.error(`${context} Error processing topic weights:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetTopics,
    });
  }
}

/**
 * Gets the most recent topic weights for analysis
 * @param timeframe Optional timeframe in hours to look back (default 24 hours)
 * @returns Array of the most recent topic weights
 */
export async function getRecentTopicWeights(
  timeframe = 24,
): Promise<TopicWeightRow[]> {
  try {
    return await tweetQueries.getRecentTopicWeights(timeframe);
  } catch (error) {
    elizaLogger.error(
      '[Topic Processing] Error getting recent topic weights:',
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return [];
  }
}

/**
 * Gets aggregated topic weights suitable for search term selection
 * @param timeframeHours Optional timeframe in hours to look back for recent weights
 * @returns Array of topic weights with aggregated scores
 */
export async function getAggregatedTopicWeights(
  timeframeHours = 168, // Default to 1 week
): Promise<TopicWeightRow[]> {
  try {
    // Get recent weights
    const recentWeights =
      await tweetQueries.getRecentTopicWeights(timeframeHours);
    elizaLogger.debug(
      `[TopicWeights] Found ${recentWeights.length} recent weights in the last ${timeframeHours} hours`,
    );

    if (recentWeights.length === 0) {
      elizaLogger.warn(
        `[TopicWeights] No recent weights found in the last ${timeframeHours} hours`,
      );
    }

    // Group weights by topic and calculate average weight
    const topicMap = new Map<string, TopicWeightRow>();

    for (const weight of recentWeights) {
      if (!topicMap.has(weight.topic)) {
        topicMap.set(weight.topic, {
          ...weight,
        });
      }
    }

    const result = Array.from(topicMap.values());
    elizaLogger.debug(
      `[TopicWeights] Returning ${result.length} aggregated topic weights`,
    );
    return result;
  } catch (error) {
    elizaLogger.error('[Topic Processing] Error getting aggregated weights:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
