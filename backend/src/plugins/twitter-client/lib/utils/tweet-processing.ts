import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { v4 as uuidv4 } from 'uuid';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TwitterService } from '../../services/twitter.service';
import { tweetAnalysisTemplate } from '../../templates/analysis';
import type { TweetAnalysis } from '../../types/analysis';
import type { TopicWeightRow } from '../../types/topic.js';
import type { SpamUser } from '../../types/twitter.js';

export interface ProcessedTweet extends Tweet {
  created_at: Date;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  entities: {
    hashtags: string[];
    mentions: Array<{ username: string; id: string }>;
    urls: string[];
  };
}

export async function processAndStoreTweet(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweet: Tweet,
  topicWeights: TopicWeightRow[],
): Promise<void> {
  try {
    // Check if tweet has already been processed
    const existingTweet = await tweetQueries.findTweetByTweetId(tweet.id);
    if (existingTweet) {
      elizaLogger.info(
        `[Tweet Processing] Tweet ${tweet.id} has already been processed - skipping`,
        {
          dbId: existingTweet.id,
          status: existingTweet.status,
        },
      );
      return;
    }

    // Store tweet in cache
    await twitterService.cacheTweet(tweet);

    // Generate ID for the tweet
    const dbId = uuidv4();

    // Pass original text to analysis, don't strip mentions
    const textForAnalysis = tweet.text || '';

    // First store the tweet object
    await tweetQueries.saveTweetObject({
      id: dbId,
      tweet_id: tweet.id,
      content: tweet.text || '',
      text: tweet.text || '',
      status: 'pending',
      createdAt: new Date(tweet.timestamp * 1000),
      agentId: runtime.agentId,
      mediaType: 'text',
      mediaUrl: tweet.permanentUrl,
      bookmarkCount: tweet.bookmarkCount,
      conversationId: tweet.conversationId,
      hashtags: tweet.hashtags || [],
      html: tweet.html,
      inReplyToStatusId: tweet.inReplyToStatusId,
      isQuoted: tweet.isQuoted || false,
      isPin: tweet.isPin || false,
      isReply: tweet.isReply || false,
      isRetweet: tweet.isRetweet || false,
      isSelfThread: tweet.isSelfThread || false,
      likes: tweet.likes || 0,
      name: tweet.name,
      mentions: (tweet.mentions || []).map((mention) => ({
        username: mention.username || '',
        id: mention.id || '',
      })),
      permanentUrl: tweet.permanentUrl || '',
      photos: tweet.photos || [],
      quotedStatusId: tweet.quotedStatusId,
      replies: tweet.replies || 0,
      retweets: tweet.retweets || 0,
      retweetedStatusId: tweet.retweetedStatusId,
      timestamp: tweet.timestamp,
      urls: tweet.urls || [],
      userId: tweet.userId || '',
      username: tweet.username || '',
      views: tweet.views,
      sensitiveContent: tweet.sensitiveContent || false,
      homeTimeline: {
        publicMetrics: {
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
        },
        entities: {
          hashtags: tweet.hashtags || [],
          mentions: (tweet.mentions || []).map((mention) => ({
            username: mention.username || '',
            id: mention.id || '',
          })),
          urls: tweet.urls || [],
        },
      },
    });

    elizaLogger.info(
      `[Tweet Processing] Starting analysis for tweet ${tweet.id} from @${tweet.userId}`,
      {
        text:
          tweet.text?.substring(0, 100) +
          (tweet.text?.length > 100 ? '...' : ''),
        metrics: {
          likes: tweet.likes,
          retweets: tweet.retweets,
          replies: tweet.replies,
        },
      },
    );

    // Perform comprehensive analysis
    const template = tweetAnalysisTemplate({
      text: textForAnalysis,
      public_metrics: {
        like_count: tweet.likes || 0,
        retweet_count: tweet.retweets || 0,
        reply_count: tweet.replies || 0,
      },
      topics: runtime.character.topics || [],
      topicWeights: topicWeights.map((tw) => ({
        topic: tw.topic,
        weight: tw.weight,
      })),
    });

    const context = composeContext({
      state: await runtime.composeState(
        {
          content: { text: tweet.text },
          userId: stringToUuid(tweet.userId),
          agentId: runtime.agentId,
          roomId: stringToUuid(`${tweet.id}-${runtime.agentId}`),
        } as Memory,
        {
          twitterService,
          twitterUserName: runtime.getSetting('TWITTER_USERNAME'),
          currentPost: tweet.text,
        },
      ),
      template: template.context,
    });

    elizaLogger.debug('[Tweet Processing] Generated context:', {
      contextLength: context.length,
      hasTemplate: Boolean(template.context),
      modelClass: template.modelClass,
    });

    const analysis = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.MEDIUM,
    });

    // Validate and process the analysis response
    if (!analysis || typeof analysis !== 'object') {
      elizaLogger.error('[Tweet Processing] Invalid analysis response:', {
        analysis,
      });
      throw new Error('Invalid analysis response structure');
    }

    // Add detailed logging of the analysis response
    elizaLogger.info('[Tweet Processing] Raw analysis response:', {
      responseType: typeof analysis,
      hasSpamAnalysis: 'spamAnalysis' in analysis,
      hasContentAnalysis: 'contentAnalysis' in analysis,
      hasText: 'text' in analysis,
    });

    let parsedAnalysis: TweetAnalysis;
    try {
      if ('spamAnalysis' in analysis && 'contentAnalysis' in analysis) {
        // Direct JSON object response - need to cast through unknown due to type mismatch
        parsedAnalysis = analysis as unknown as TweetAnalysis;
        elizaLogger.info('[Tweet Processing] Using direct analysis object');
      } else if ('text' in analysis && typeof analysis.text === 'string') {
        // Text response that needs parsing
        const cleanedText = extractJsonFromText(analysis.text);
        parsedAnalysis = JSON.parse(cleanedText) as TweetAnalysis;
        elizaLogger.info(
          '[Tweet Processing] Parsed analysis from text response',
        );
      } else {
        throw new Error(
          'Response missing both direct analysis and text property',
        );
      }
    } catch (error) {
      elizaLogger.error('[Tweet Processing] Failed to process analysis:', {
        error: error instanceof Error ? error.message : String(error),
        analysis: analysis,
      });
      throw new Error('Failed to process analysis response');
    }

    // Validate required fields
    if (!parsedAnalysis.spamAnalysis || !parsedAnalysis.contentAnalysis) {
      throw new Error('Invalid analysis format - missing required fields');
    }

    // Add debug logging for spam detection
    elizaLogger.debug('[Tweet Processing] Spam analysis results:', {
      spamScore: parsedAnalysis.spamAnalysis.spamScore,
      isSpam: parsedAnalysis.spamAnalysis.isSpam,
      reasons: parsedAnalysis.spamAnalysis.reasons,
    });

    // Update spam user data regardless of spam status
    await updateUserSpamData(
      tweet.userId,
      parsedAnalysis.spamAnalysis.spamScore,
      parsedAnalysis.spamAnalysis.reasons,
      '[Tweet Processing]',
    );

    // Check if tweet is spam - must have both high spam score AND be marked as spam
    const isSpam =
      parsedAnalysis.spamAnalysis.isSpam === true &&
      parsedAnalysis.spamAnalysis.spamScore > 0.7;

    if (isSpam) {
      // Update tweet status to indicate it's spam
      await tweetQueries.updateTweetStatus(dbId, 'spam');
      elizaLogger.info(
        `[Tweet Processing] Tweet ${tweet.id} identified as spam - skipping analysis`,
        {
          spamScore: parsedAnalysis.spamAnalysis.spamScore,
          reasons: parsedAnalysis.spamAnalysis.reasons,
        },
      );
      return;
    }

    // If tweet is not spam, add author to target accounts
    if (tweet.username && tweet.userId) {
      elizaLogger.info(
        `[Tweet Processing] Upserting non-spam tweet author @${tweet.username} to target accounts`,
      );

      await tweetQueries.insertTargetAccount({
        username: tweet.username,
        userId: tweet.userId,
        displayName: tweet.name || tweet.username,
        description: '',
        followersCount: 0,
        followingCount: 0,
        friendsCount: 0,
        mediaCount: 0,
        statusesCount: 0,
        likesCount: 0,
        listedCount: 0,
        tweetsCount: 0,
        isPrivate: false,
        isVerified: false,
        isBlueVerified: false,
        joinedAt: null,
        location: '',
        avatarUrl: null,
        bannerUrl: null,
        websiteUrl: null,
        canDm: false,
        createdAt: new Date(),
        lastUpdated: new Date(),
        isActive: true,
        source: 'tweet_author',
      });
    }

    // Store analysis for non-spam tweets
    await tweetQueries.insertTweetAnalysis(
      dbId,
      parsedAnalysis.contentAnalysis.type,
      parsedAnalysis.contentAnalysis.sentiment,
      parsedAnalysis.contentAnalysis.confidence,
      {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
        spamScore: parsedAnalysis.spamAnalysis.spamScore,
        spamViolations: parsedAnalysis.spamAnalysis.reasons,
        ...parsedAnalysis.contentAnalysis.metrics,
      },
      parsedAnalysis.contentAnalysis.entities,
      parsedAnalysis.contentAnalysis.topics,
      parsedAnalysis.contentAnalysis.impactScore,
      new Date(tweet.timestamp * 1000),
      tweet.userId,
      tweet.text || '',
      {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
      },
      {
        hashtags: tweet.hashtags || [],
        mentions: tweet.mentions || [],
        urls: tweet.urls || [],
        topicWeights: topicWeights.map((tw) => ({
          topic: tw.topic,
          weight: tw.weight,
        })),
      },
      parsedAnalysis.spamAnalysis,
      parsedAnalysis.contentAnalysis.metrics,
    );

    // Update tweet status to analyzed
    await tweetQueries.updateTweetStatus(dbId, 'analyzed');

    // Update topic weights for non-spam tweets
    if (topicWeights.length > 0) {
      await updateTopicWeights(
        topicWeights,
        parsedAnalysis.contentAnalysis.topics || [],
        parsedAnalysis.contentAnalysis.impactScore || 0.5,
        '[Tweet Processing]',
      );
    }

    elizaLogger.info(
      `[Tweet Processing] Successfully processed non-spam tweet ${tweet.id} and stored in database with ID ${dbId}`,
    );
  } catch (error) {
    elizaLogger.error('[Tweet Processing] Error processing tweet:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tweetId: tweet.id,
      userId: tweet.userId,
      text:
        tweet.text?.substring(0, 100) + (tweet.text?.length > 100 ? '...' : ''),
    });
  }
}

export async function updateMarketMetrics(tweets: Tweet[]): Promise<void> {
  try {
    const metrics = {
      totalEngagement: tweets.reduce(
        (sum, tweet) =>
          sum +
          (tweet.likes || 0) +
          (tweet.retweets || 0) +
          (tweet.replies || 0),
        0,
      ),
      tweetCount: tweets.length,
      averageSentiment: 0.5, // Default neutral sentiment
      timestamp: new Date(),
    };

    await tweetQueries.insertMarketMetrics({
      ...metrics,
      [metrics.timestamp.toISOString()]: metrics,
    });

    elizaLogger.info(
      `[Tweet Processing] Updated market metrics for ${tweets.length} tweets`,
      metrics,
    );
  } catch (error) {
    elizaLogger.error(
      '[Tweet Processing] Error updating market metrics:',
      error,
    );
  }
}

export async function getUserSpamData(
  userId: string,
  context: string,
): Promise<SpamUser> {
  try {
    const spamUser = await tweetQueries.getSpamUser(userId);
    if (!spamUser) {
      return null;
    }

    return {
      userId: spamUser.user_id,
      spamScore: spamUser.spam_score,
      lastTweetDate: new Date(spamUser.last_tweet_date),
      tweetCount: spamUser.tweet_count,
      violations: spamUser.violations,
    };
  } catch (error) {
    elizaLogger.error(
      `${context} Error getting spam data for user ${userId}:`,
      error,
    );
    return null;
  }
}

export async function updateUserSpamData(
  userId: string,
  spamScore: number,
  violations: string[],
  logPrefix = '[Tweet Processing]',
): Promise<void> {
  try {
    await tweetQueries.updateSpamUser(userId, spamScore, violations);
    elizaLogger.info(`${logPrefix} Updated spam data for user ${userId}`);
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error updating spam data for user ${userId}:`,
      error,
    );
  }
}

export async function updateTopicWeights(
  currentWeights: TopicWeightRow[],
  relevantTopics: string[],
  impactScore: number,
  logPrefix = '[Tweet Processing]',
): Promise<TopicWeightRow[]> {
  try {
    // Update weights based on relevance and impact
    const updatedWeights = currentWeights.map((weight) => {
      const isRelevant = relevantTopics.includes(weight.topic);
      const newWeight = isRelevant
        ? Math.min(1, weight.weight + 0.1 * impactScore)
        : Math.max(0, weight.weight - 0.05);

      return {
        ...weight,
        weight: newWeight,
        impact_score: isRelevant ? impactScore : weight.impact_score,
        last_updated: new Date(),
      };
    });

    // Store updated weights in database
    await Promise.all(
      updatedWeights.map(({ topic, weight, impact_score, seed_weight }) =>
        tweetQueries.updateTopicWeight(
          topic,
          weight,
          impact_score,
          seed_weight,
        ),
      ),
    );

    return updatedWeights;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error updating topic weights:`, error);
    return currentWeights;
  }
}

export function extractJsonFromText(text: string): string {
  try {
    // First try direct parsing after aggressive trimming
    const trimmedText = text.trim().replace(/^\s+|\s+$/g, '');
    JSON.parse(trimmedText);
    return trimmedText;
  } catch {
    // If direct parsing fails, try to extract JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedJson = jsonMatch[0]
        .replace(/^\s+|\s+$/g, '') // Remove all leading/trailing whitespace
        .replace(/\s+/g, ' ') // Normalize internal spaces
        .replace(/\{\s+/, '{') // Remove spaces after opening brace
        .replace(/\s+\}/, '}') // Remove spaces before closing brace
        .replace(/\[\s+/, '[') // Remove spaces after opening bracket
        .replace(/\s+\]/, ']') // Remove spaces before closing bracket
        .replace(/,\s+/, ',') // Remove spaces after commas
        .replace(/:\s+/, ':') // Remove spaces after colons
        .trim();

      try {
        // Validate the extracted JSON
        JSON.parse(extractedJson);
        return extractedJson;
      } catch {
        // If extraction fails, return a default valid JSON
        return JSON.stringify({
          spamAnalysis: {
            spamScore: 0.5,
            reasons: [],
            isSpam: false,
          },
          contentAnalysis: {
            type: 'unknown',
            sentiment: 'neutral',
            confidence: 0.5,
            impactScore: 0.5,
            entities: [],
            topics: [],
            metrics: {},
          },
        });
      }
    }
    // If no JSON found, return default
    return JSON.stringify({
      spamAnalysis: {
        spamScore: 0.5,
        reasons: [],
        isSpam: false,
      },
      contentAnalysis: {
        type: 'unknown',
        sentiment: 'neutral',
        confidence: 0.5,
        impactScore: 0.5,
        entities: [],
        topics: [],
        metrics: {},
      },
    });
  }
}
