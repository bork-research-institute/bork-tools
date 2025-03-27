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
import type { TwitterService } from '../../lib/services/twitter-service';
import { extractAndRepairAnalysis } from '../helpers/repair-tweet-analysis';
import { tweetAnalysisTemplate } from '../templates/analysis';
import type { TopicWeightRow } from '../types/topic';
import type { DatabaseTweet } from '../types/twitter';
import { storeMentions } from './mentions-processing';
import { updateUserSpamData } from './spam-processing';
import { updateTopicWeights } from './topic-processing';

/**
 * Processes a single tweet by analyzing its content, detecting spam,
 * and updating relevant data in the database
 */
export async function processSingleTweet(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweet: DatabaseTweet,
  topicWeights: TopicWeightRow[],
  logPrefix = '[Tweet Analysis]',
): Promise<void> {
  try {
    elizaLogger.info(
      `${logPrefix} Starting to process tweet ${tweet.tweet_id}`,
    );

    // Store tweet in cache using Twitter's numeric ID
    await twitterService.cacheTweet({
      id: tweet.tweet_id, // Use Twitter's numeric ID here
      text: tweet.text,
      userId: tweet.userId,
      username: tweet.username,
      name: tweet.name,
      timestamp: tweet.timestamp,
      timeParsed: tweet.timeParsed,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      views: tweet.views,
      bookmarkCount: tweet.bookmarkCount,
      conversationId: tweet.conversationId,
      permanentUrl: tweet.permanentUrl,
      html: tweet.html,
      inReplyToStatus: tweet.inReplyToStatus,
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatus: tweet.quotedStatus,
      quotedStatusId: tweet.quotedStatusId,
      retweetedStatus: tweet.retweetedStatus,
      retweetedStatusId: tweet.retweetedStatusId,
      thread: tweet.thread,
      isQuoted: tweet.isQuoted,
      isPin: tweet.isPin,
      isReply: tweet.isReply,
      isRetweet: tweet.isRetweet,
      isSelfThread: tweet.isSelfThread,
      sensitiveContent: tweet.sensitiveContent,
      hashtags: tweet.hashtags,
      mentions: tweet.mentions,
      photos: tweet.photos,
      urls: tweet.urls,
      videos: tweet.videos,
      place: tweet.place,
      poll: tweet.poll,
    });

    // Process mentions from the merged tweet and add to target accounts
    await storeMentions(tweet);

    const template = tweetAnalysisTemplate({
      text: tweet.text, // This is the merged text
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
      isThreadMerged: tweet.isThreadMerged,
      threadSize: tweet.threadSize,
      originalText: tweet.originalText,
    });

    // Convert Twitter user ID to a consistent UUID for the memory context
    const memoryUserId = stringToUuid(`twitter-user-${tweet.userId}`);

    try {
      const state = await runtime.composeState(
        {
          content: {
            text: tweet.text,
            isThreadMerged: tweet.isThreadMerged,
            threadSize: tweet.threadSize,
            originalText: tweet.originalText,
          },
          userId: memoryUserId,
          agentId: runtime.agentId,
          roomId: uuidv4(),
        } as Memory,
        {
          twitterService,
          twitterUserName: runtime.getSetting('TWITTER_USERNAME') || '',
          currentPost: tweet.text,
        },
      );

      const context = composeContext({
        state,
        template: template.context,
      });

      try {
        const analysis = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.MEDIUM,
        });

        // Validate and process the analysis response
        if (!analysis || typeof analysis !== 'object') {
          elizaLogger.error(`${logPrefix} Invalid analysis response:`, {
            analysis,
            tweetId: tweet.tweet_id,
          });
          throw new Error('Invalid analysis response structure');
        }

        const parsedAnalysis = extractAndRepairAnalysis(analysis);

        // Update spam user data regardless of spam status
        await updateUserSpamData(
          tweet.userId?.toString() || '',
          parsedAnalysis.spamAnalysis.spamScore,
          parsedAnalysis.spamAnalysis.reasons,
          logPrefix,
        );

        // Check if tweet is spam
        const isSpam =
          parsedAnalysis.spamAnalysis.isSpam === true &&
          parsedAnalysis.spamAnalysis.spamScore > 0.7;

        if (isSpam) {
          await tweetQueries.updateTweetStatus(tweet.tweet_id, 'spam');
          elizaLogger.info(
            `${logPrefix} Tweet ${tweet.tweet_id} identified as spam - skipping analysis`,
            {
              tweetId: tweet.tweet_id,
              spamScore: parsedAnalysis.spamAnalysis.spamScore,
              reasons: parsedAnalysis.spamAnalysis.reasons,
              isThreadMerged: tweet.isThreadMerged,
              threadSize: tweet.threadSize,
            },
          );
          return;
        }

        // If tweet is not spam, add author to target accounts
        if (tweet.username && tweet.userId) {
          elizaLogger.info(
            `${logPrefix} Upserting non-spam tweet author @${tweet.username} to target accounts`,
          );

          await tweetQueries.insertTargetAccount({
            username: tweet.username,
            userId: tweet.userId.toString(),
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
            avgLikes50: 0,
            avgRetweets50: 0,
            avgReplies50: 0,
            avgViews50: 0,
            engagementRate50: 0,
            influenceScore: 0,
            last50TweetsUpdatedAt: null,
          });
        }

        // Store analysis for non-spam tweets
        const analysisId = stringToUuid(uuidv4());

        // Process analysis in a transaction
        try {
          await tweetQueries.processTweetsInTransaction(async (client) => {
            try {
              elizaLogger.info(
                `${logPrefix} Saving analysis for tweet ${tweet.tweet_id}`,
                {
                  analysisId: analysisId.toString(),
                  tweetId: tweet.tweet_id,
                  isThreadMerged: tweet.isThreadMerged,
                  threadSize: tweet.threadSize,
                  textLength: tweet.text.length,
                  originalTextLength: tweet.originalText.length,
                },
              );

              // Insert the tweet analysis
              await tweetQueries.insertTweetAnalysis(
                analysisId,
                tweet.tweet_id,
                parsedAnalysis.contentAnalysis.type,
                parsedAnalysis.contentAnalysis.sentiment,
                parsedAnalysis.contentAnalysis.confidence,
                {
                  likes: tweet.likes || 0,
                  retweets: tweet.retweets || 0,
                  replies: tweet.replies || 0,
                  spamScore: parsedAnalysis.spamAnalysis.spamScore,
                  spamViolations: parsedAnalysis.spamAnalysis.reasons,
                  isThreadMerged: tweet.isThreadMerged,
                  threadSize: tweet.threadSize,
                  originalTextLength: tweet.originalText.length,
                  mergedTextLength: tweet.text.length,
                  ...parsedAnalysis.contentAnalysis.metrics,
                },
                parsedAnalysis.contentAnalysis.entities,
                parsedAnalysis.contentAnalysis.topics,
                parsedAnalysis.contentAnalysis.impactScore,
                new Date(tweet.timestamp * 1000),
                tweet.userId?.toString() || '',
                tweet.text || '', // Use merged text
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
                  originalText: tweet.originalText, // Store original text
                  thread: tweet.thread, // Store thread data
                },
                parsedAnalysis.spamAnalysis,
                parsedAnalysis.contentAnalysis.metrics,
                client,
              );

              elizaLogger.info(
                `${logPrefix} Successfully saved analysis for tweet ${tweet.tweet_id}`,
              );

              // Update tweet status to analyzed using Twitter's ID
              await tweetQueries.updateTweetStatus(
                tweet.tweet_id,
                'analyzed',
                undefined,
                client,
              );

              // Update topic weights for non-spam tweets
              try {
                if (topicWeights.length > 0) {
                  await updateTopicWeights(
                    topicWeights,
                    parsedAnalysis.contentAnalysis.topics || [],
                    parsedAnalysis.contentAnalysis.impactScore || 0.5,
                    logPrefix,
                  );
                }
              } catch (topicError) {
                // Log but don't fail the whole transaction
                elizaLogger.error(
                  `${logPrefix} Error updating topic weights:`,
                  {
                    error:
                      topicError instanceof Error
                        ? topicError.message
                        : String(topicError),
                    tweetId: tweet.tweet_id,
                  },
                );
              }
            } catch (innerError) {
              elizaLogger.error(`${logPrefix} Error in transaction:`, {
                error:
                  innerError instanceof Error
                    ? innerError.message
                    : String(innerError),
                tweetId: tweet.tweet_id,
                phase: 'analysis_insertion',
              });
              throw innerError; // Rethrow to trigger rollback
            }
          });

          elizaLogger.info(
            `${logPrefix} Successfully processed tweet ${tweet.tweet_id}`,
            {
              analysisId: analysisId.toString(),
              tweetId: tweet.tweet_id,
              isThreadMerged: tweet.isThreadMerged,
              textLength: tweet.text.length,
              originalTextLength: tweet.originalText.length,
            },
          );
        } catch (txError) {
          elizaLogger.error(`${logPrefix} Transaction failed:`, {
            error: txError instanceof Error ? txError.message : String(txError),
            tweetId: tweet.tweet_id,
          });

          // Try to update the status separately to indicate an error
          try {
            await tweetQueries.updateTweetStatus(
              tweet.tweet_id,
              'error',
              `Analysis error: ${txError instanceof Error ? txError.message : String(txError)}`,
            );
          } catch (statusError) {
            elizaLogger.error(
              `${logPrefix} Could not update error status:`,
              statusError,
            );
          }
        }
      } catch (aiError) {
        elizaLogger.error(`${logPrefix} AI analysis error:`, {
          error: aiError instanceof Error ? aiError.message : String(aiError),
          tweetId: tweet.tweet_id,
        });

        // Update tweet status to indicate AI error
        await tweetQueries.updateTweetStatus(
          tweet.tweet_id,
          'error',
          `AI analysis error: ${aiError instanceof Error ? aiError.message : String(aiError)}`,
        );
      }
    } catch (contextError) {
      elizaLogger.error(`${logPrefix} Error preparing context:`, {
        error:
          contextError instanceof Error
            ? contextError.message
            : String(contextError),
        tweetId: tweet.tweet_id,
      });

      // Update tweet status to indicate context error
      await tweetQueries.updateTweetStatus(
        tweet.tweet_id,
        'error',
        `Context error: ${contextError instanceof Error ? contextError.message : String(contextError)}`,
      );
    }
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error processing tweet:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
