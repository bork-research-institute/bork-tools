import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { tweetQueries } from '../../../bork-extensions/src/db/queries';
import type { TwitterService } from '../../services/twitter-service';
import { tweetAnalysisTemplate } from '../../templates/analysis';
import type { TweetAnalysis } from '../../types/analysis';
import type { TopicWeightRow } from '../../types/topic';
import type { MergedTweet } from '../../types/twitter';
import { updateUserSpamData } from './spam-processing';
import { extractJsonFromText } from './text-processing';
import { updateTopicWeights } from './topic-processing';

export async function processAndStoreTweet(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweet: MergedTweet,
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

    // Use the merged text for analysis
    const textForAnalysis = tweet.text || '';

    // First store the tweet object with both merged and original content
    await tweetQueries.saveTweetObject({
      id: dbId,
      tweet_id: tweet.id,
      content: textForAnalysis, // Store the full merged content
      text: tweet.originalText || tweet.text || '', // Store the original tweet text
      status: 'pending',
      createdAt: new Date(tweet.timestamp * 1000),
      agentId: runtime.agentId,
      mediaType: 'text',
      mediaUrl: tweet.permanentUrl,
      bookmarkCount: tweet.bookmarkCount,
      conversationId: tweet.conversationId,
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [], // Ensure array
      html: tweet.html,
      inReplyToStatusId: tweet.inReplyToStatusId,
      isQuoted: tweet.isQuoted || false,
      isPin: tweet.isPin || false,
      isReply: tweet.isReply || false,
      isRetweet: tweet.isRetweet || false,
      isSelfThread: tweet.isSelfThread || false,
      isThreadMerged: tweet.isThreadMerged || false,
      hasReplies: tweet.hasReplies || false,
      threadSize: tweet.threadSize || 0,
      replyCount: tweet.replyCount || 0,
      likes: tweet.likes || 0,
      name: tweet.name,
      mentions: Array.isArray(tweet.mentions)
        ? tweet.mentions.map((mention) => ({
            username: mention.username || '',
            id: mention.id || '',
          }))
        : [], // Ensure array and proper structure
      permanentUrl: tweet.permanentUrl || '',
      photos: Array.isArray(tweet.photos) ? tweet.photos : [], // Ensure array
      quotedStatusId: tweet.quotedStatusId,
      replies: tweet.replies || 0,
      retweets: tweet.retweets || 0,
      retweetedStatusId: tweet.retweetedStatusId,
      timestamp: tweet.timestamp,
      urls: Array.isArray(tweet.urls) ? tweet.urls : [], // Ensure array
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
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [], // Ensure array
          mentions: Array.isArray(tweet.mentions)
            ? tweet.mentions.map((mention) => ({
                username: mention.username || '',
                id: mention.id || '',
              }))
            : [], // Ensure array and proper structure
          urls: Array.isArray(tweet.urls) ? tweet.urls : [], // Ensure array
        },
      },
    });

    elizaLogger.info(
      `[Tweet Processing] Starting analysis for tweet ${tweet.id} from @${tweet.userId}`,
      {
        originalText:
          tweet.originalText?.substring(0, 100) +
          (tweet.originalText?.length > 100 ? '...' : ''),
        mergedTextLength: textForAnalysis.length,
        isThreadMerged: tweet.isThreadMerged,
        hasReplies: tweet.hasReplies,
        threadSize: tweet.threadSize,
        replyCount: tweet.replyCount,
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
        hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
        mentions: Array.isArray(tweet.mentions)
          ? tweet.mentions.map((mention) => ({
              username: mention.username || '',
              id: mention.id || '',
            }))
          : [],
        urls: Array.isArray(tweet.urls) ? tweet.urls : [],
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
