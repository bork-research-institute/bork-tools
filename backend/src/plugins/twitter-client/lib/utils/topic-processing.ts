import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TweetAnalysis } from '../types/analysis.js';
import type { TopicWeightRow } from '../types/topic.js';
import type { DatabaseTweet } from '../types/twitter.js';

interface EngagementMetrics {
  likes: number;
  retweets: number;
  replies: number;
  virality: number;
  conversionPotential: number;
  communityBuilding: number;
  thoughtLeadership: number;
}

/**
 * Calculates a sophisticated weight for a topic based on multiple factors
 */
function calculateTopicWeight(
  impactScore: number,
  engagementMetrics: EngagementMetrics,
  sentiment: string,
  confidence: number,
): number {
  // Sigmoid function for smooth normalization without hard caps
  // k controls the steepness of the curve (smaller = more gradual)
  // x0 is the midpoint where sigmoid(x0) = 0.5
  const sigmoid = (x: number, k: number, x0: number): number =>
    1 / (1 + Math.exp(-k * (Math.log(x + 1) - Math.log(x0))));

  // Calculate normalized engagement metrics using sigmoid
  const normalizedEngagement = {
    // Use logarithmic sigmoid to better handle order-of-magnitude differences
    likes: sigmoid(engagementMetrics.likes, 1.5, 1000), // x0 = 1000 likes
    retweets: sigmoid(engagementMetrics.retweets, 1.5, 500), // x0 = 500 retweets
    replies: sigmoid(engagementMetrics.replies, 1.5, 200), // x0 = 200 replies
    virality: engagementMetrics.virality,
    conversionPotential: engagementMetrics.conversionPotential,
    communityBuilding: engagementMetrics.communityBuilding,
    thoughtLeadership: engagementMetrics.thoughtLeadership,
  };

  // Calculate engagement score (30% of total weight)
  const engagementScore =
    (normalizedEngagement.likes * 0.3 +
      normalizedEngagement.retweets * 0.25 +
      normalizedEngagement.replies * 0.2 +
      normalizedEngagement.virality * 0.25) *
    0.3;

  // Calculate influence score (30% of total weight)
  const influenceScore =
    (normalizedEngagement.conversionPotential * 0.4 +
      normalizedEngagement.communityBuilding * 0.3 +
      normalizedEngagement.thoughtLeadership * 0.3) *
    0.3;

  // Calculate sentiment score (20% of total weight)
  const sentimentMultiplier =
    sentiment === 'positive' ? 1 : sentiment === 'neutral' ? 0.7 : 0.4;
  const sentimentScore = sentimentMultiplier * 0.2;

  // Impact score and confidence (20% of total weight)
  const impactConfidenceScore = (impactScore * 0.6 + confidence * 0.4) * 0.2;

  // Combine all scores and ensure it's between 0 and 1
  return Math.max(
    0,
    Math.min(
      1,
      engagementScore + influenceScore + sentimentScore + impactConfidenceScore,
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

      // Calculate engagement metrics from content analysis
      const engagementMetrics = {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
        virality: tweetAnalysis.contentAnalysis.engagementAnalysis.virality,
        conversionPotential:
          tweetAnalysis.contentAnalysis.engagementAnalysis.conversionPotential,
        communityBuilding:
          tweetAnalysis.contentAnalysis.engagementAnalysis.communityBuilding,
        thoughtLeadership:
          tweetAnalysis.contentAnalysis.engagementAnalysis.thoughtLeadership,
      };

      // Calculate new weight using our sophisticated formula
      const weight = calculateTopicWeight(
        tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
        engagementMetrics,
        tweetAnalysis.contentAnalysis.sentiment,
        tweetAnalysis.contentAnalysis.confidence,
      );

      try {
        // Create a new topic weight entry
        const topicWeight: TopicWeightRow = {
          topic,
          weight,
          impact_score:
            tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
          created_at: new Date(),
          engagement_metrics: engagementMetrics,
          sentiment: tweetAnalysis.contentAnalysis.sentiment,
          confidence: tweetAnalysis.contentAnalysis.confidence,
          tweet_id: tweet.tweet_id,
          id: uuidv4(),
        };

        await tweetQueries.createTopicWeight(topicWeight);

        elizaLogger.debug(
          `${context} Created new topic weight entry for ${topic}`,
          {
            weight,
            impactScore:
              tweetAnalysis.contentAnalysis.engagementAnalysis.overallScore,
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
 * Initializes topic weights if they don't exist and retrieves them
 * @param defaultTopics Default topics to use when initializing
 * @param logPrefix Prefix for log messages
 * @returns Array of topic weights or empty array if initialization fails
 */
export async function initializeAndGetTopicWeights(
  defaultTopics: string[],
  logPrefix = '[Topic Processing]',
): Promise<TopicWeightRow[]> {
  try {
    // Get topic weights from the last 24 hours
    let topicWeights = await tweetQueries.getRecentTopicWeights(24);

    // Initialize if none exist
    if (!topicWeights.length) {
      elizaLogger.info(
        `${logPrefix} No recent topic weights found, creating initial entries`,
      );

      // Create initial weight entries for each default topic
      for (const topic of defaultTopics) {
        const initialWeight: TopicWeightRow = {
          id: uuidv4(),
          topic,
          weight: 0.5, // Start with neutral weight
          impact_score: 0.5,
          created_at: new Date(),
          engagement_metrics: {
            likes: 0,
            retweets: 0,
            replies: 0,
            virality: 0.5,
            conversionPotential: 0.5,
            communityBuilding: 0.5,
            thoughtLeadership: 0.5,
          },
          sentiment: 'neutral',
          confidence: 0.5,
          tweet_id: 'initial', // Mark as initial entry
        };

        try {
          await tweetQueries.createTopicWeight(initialWeight);
        } catch (error) {
          elizaLogger.error(
            `${logPrefix} Error creating initial weight for topic ${topic}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      elizaLogger.info(
        `${logPrefix} Created initial entries for ${defaultTopics.length} default topics`,
      );

      // Reload the topic weights
      topicWeights = await tweetQueries.getRecentTopicWeights(24);

      if (!topicWeights.length) {
        elizaLogger.error(`${logPrefix} Failed to initialize topic weights`);
        return []; // Return empty array if initialization failed
      }
    }

    return topicWeights;
  } catch (dbError) {
    elizaLogger.error(
      `${logPrefix} Database error getting topic weights:`,
      dbError instanceof Error ? dbError.message : String(dbError),
    );
    return []; // Return empty array on error
  }
}
