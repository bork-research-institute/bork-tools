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
import { updateAccountEngagementMetrics } from '../../client-account/utils/engagement-metrics';
import type { TwitterService } from '../../lib/services/twitter-service';
import { tweetAnalysisTemplate } from '../templates/analysis';
import type { TweetAnalysis } from '../types/analysis';
import type { TopicWeightRow } from '../types/topic';
import type { DatabaseTweet, MergedTweet, Tweet } from '../types/twitter';
import { storeMentions } from './mentions-processing';
import { updateUserSpamData } from './spam-processing';
import {
  extractJsonFromText,
  removeNonPrintableChars,
} from './text-processing';
import { updateTopicWeights } from './topic-processing';
import { mergeTweetContent } from './tweet-merging';

/**
 * Creates a default TweetAnalysis object with reasonable default values
 * Used as a fallback when the AI response is malformed
 */
function createDefaultAnalysis(): TweetAnalysis {
  return {
    contentAnalysis: {
      type: 'other',
      sentiment: 'neutral',
      confidence: 0.5,
      impactScore: 0.5,
      entities: [],
      topics: [],
      metrics: {
        relevance: 0.5,
        quality: 0.5,
        engagement: 0.5,
        authenticity: 0.5,
        valueAdd: 0.5,
      },
    },
    spamAnalysis: {
      isSpam: false,
      spamScore: 0.1,
      reasons: [],
      confidenceMetrics: {
        linguisticRisk: 0.1,
        topicMismatch: 0.1,
        engagementAnomaly: 0.1,
        promotionalIntent: 0.1,
      },
    },
  };
}

/**
 * Repairs a partially formed analysis response by filling in missing data
 * with reasonable defaults
 */
function repairAnalysisResponse(
  partialAnalysis: Partial<Record<string, unknown>>,
): TweetAnalysis {
  const defaultAnalysis = createDefaultAnalysis();
  const result: TweetAnalysis = { ...defaultAnalysis };

  // Handle case where we have a flattened structure
  if ('type' in partialAnalysis && 'sentiment' in partialAnalysis) {
    // We have content analysis fields at the top level
    result.contentAnalysis = {
      type:
        (partialAnalysis.type as string) ||
        defaultAnalysis.contentAnalysis.type,
      sentiment:
        (partialAnalysis.sentiment as string) ||
        defaultAnalysis.contentAnalysis.sentiment,
      confidence:
        (partialAnalysis.confidence as number) ||
        defaultAnalysis.contentAnalysis.confidence,
      impactScore:
        (partialAnalysis.impactScore as number) ||
        defaultAnalysis.contentAnalysis.impactScore,
      entities: Array.isArray(partialAnalysis.entities)
        ? (partialAnalysis.entities as string[])
        : defaultAnalysis.contentAnalysis.entities,
      topics: Array.isArray(partialAnalysis.topics)
        ? (partialAnalysis.topics as string[])
        : defaultAnalysis.contentAnalysis.topics,
      metrics: {
        relevance:
          (partialAnalysis.relevance as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.relevance as number) ||
          defaultAnalysis.contentAnalysis.metrics.relevance,
        quality:
          (partialAnalysis.quality as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.quality as number) ||
          defaultAnalysis.contentAnalysis.metrics.quality,
        engagement:
          (partialAnalysis.engagement as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.engagement as number) ||
          defaultAnalysis.contentAnalysis.metrics.engagement,
        authenticity:
          (partialAnalysis.authenticity as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.authenticity as number) ||
          defaultAnalysis.contentAnalysis.metrics.authenticity,
        valueAdd:
          (partialAnalysis.valueAdd as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.valueAdd as number) ||
          defaultAnalysis.contentAnalysis.metrics.valueAdd,
      },
    };
  } else if (
    'contentAnalysis' in partialAnalysis &&
    partialAnalysis.contentAnalysis
  ) {
    // We have a nested contentAnalysis object
    const partialContent = partialAnalysis.contentAnalysis as Record<
      string,
      unknown
    >;
    result.contentAnalysis = {
      type:
        (partialContent.type as string) || defaultAnalysis.contentAnalysis.type,
      sentiment:
        (partialContent.sentiment as string) ||
        defaultAnalysis.contentAnalysis.sentiment,
      confidence:
        (partialContent.confidence as number) ||
        defaultAnalysis.contentAnalysis.confidence,
      impactScore:
        (partialContent.impactScore as number) ||
        defaultAnalysis.contentAnalysis.impactScore,
      entities: Array.isArray(partialContent.entities)
        ? (partialContent.entities as string[])
        : defaultAnalysis.contentAnalysis.entities,
      topics: Array.isArray(partialContent.topics)
        ? (partialContent.topics as string[])
        : defaultAnalysis.contentAnalysis.topics,
      metrics: {
        relevance:
          ((partialContent.metrics as Record<string, unknown>)
            ?.relevance as number) ||
          defaultAnalysis.contentAnalysis.metrics.relevance,
        quality:
          ((partialContent.metrics as Record<string, unknown>)
            ?.quality as number) ||
          defaultAnalysis.contentAnalysis.metrics.quality,
        engagement:
          ((partialContent.metrics as Record<string, unknown>)
            ?.engagement as number) ||
          defaultAnalysis.contentAnalysis.metrics.engagement,
        authenticity:
          ((partialContent.metrics as Record<string, unknown>)
            ?.authenticity as number) ||
          defaultAnalysis.contentAnalysis.metrics.authenticity,
        valueAdd:
          ((partialContent.metrics as Record<string, unknown>)
            ?.valueAdd as number) ||
          defaultAnalysis.contentAnalysis.metrics.valueAdd,
      },
    };
  }

  // Handle spam analysis
  if ('isSpam' in partialAnalysis || 'spamScore' in partialAnalysis) {
    // Spam fields at top level
    result.spamAnalysis = {
      isSpam:
        typeof partialAnalysis.isSpam === 'boolean'
          ? partialAnalysis.isSpam
          : defaultAnalysis.spamAnalysis.isSpam,
      spamScore:
        (partialAnalysis.spamScore as number) ||
        defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialAnalysis.reasons)
        ? (partialAnalysis.reasons as string[])
        : defaultAnalysis.spamAnalysis.reasons,
      confidenceMetrics: {
        linguisticRisk:
          (partialAnalysis.linguisticRisk as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.linguisticRisk as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.linguisticRisk,
        topicMismatch:
          (partialAnalysis.topicMismatch as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.topicMismatch as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.topicMismatch,
        engagementAnomaly:
          (partialAnalysis.engagementAnomaly as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.engagementAnomaly as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.engagementAnomaly,
        promotionalIntent:
          (partialAnalysis.promotionalIntent as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.promotionalIntent as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.promotionalIntent,
      },
    };
  } else if (
    'spamAnalysis' in partialAnalysis &&
    partialAnalysis.spamAnalysis
  ) {
    // We have a nested spamAnalysis object
    const partialSpam = partialAnalysis.spamAnalysis as Record<string, unknown>;
    result.spamAnalysis = {
      isSpam:
        typeof partialSpam.isSpam === 'boolean'
          ? (partialSpam.isSpam as boolean)
          : defaultAnalysis.spamAnalysis.isSpam,
      spamScore:
        (partialSpam.spamScore as number) ||
        defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialSpam.reasons)
        ? (partialSpam.reasons as string[])
        : defaultAnalysis.spamAnalysis.reasons,
      confidenceMetrics: {
        linguisticRisk:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.linguisticRisk as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.linguisticRisk,
        topicMismatch:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.topicMismatch as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.topicMismatch,
        engagementAnomaly:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.engagementAnomaly as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.engagementAnomaly,
        promotionalIntent:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.promotionalIntent as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.promotionalIntent,
      },
    };
  }

  elizaLogger.info('[Tweet Processing] Repaired analysis response', {
    wasRepaired: true,
    hadContentAnalysis: 'contentAnalysis' in partialAnalysis,
    hadSpamAnalysis: 'spamAnalysis' in partialAnalysis,
  });

  return result;
}

export async function processTweets(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweets: Tweet[],
  topicWeights: TopicWeightRow[],
): Promise<void> {
  try {
    // Validate input tweets
    const validTweets = tweets.filter((tweet) => {
      if (!tweet.tweet_id) {
        elizaLogger.warn(
          '[Tweet Processing] Skipping tweet with missing Twitter ID:',
          {
            userId: tweet.userId,
            username: tweet.username,
            text: tweet.text?.substring(0, 100),
          },
        );
        return false;
      }
      return true;
    });

    if (validTweets.length === 0) {
      elizaLogger.error('[Tweet Processing] No valid tweets to process');
      return;
    }

    // Convert tweets to MergedTweet type
    const tweetsToMerge: MergedTweet[] = validTweets.map((tweet) => ({
      ...tweet,
      id: tweet.id || uuidv4(), // Internal UUID
      tweet_id: tweet.tweet_id, // Twitter's numeric ID
      originalText: tweet.text || '',
      isThreadMerged: false,
      threadSize: 1,
      thread: [],
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
      photos: Array.isArray(tweet.photos) ? tweet.photos : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      videos: Array.isArray(tweet.videos) ? tweet.videos : [],
    }));

    // Merge tweet content with related tweets - this will use a transaction internally
    const mergedTweets = await mergeTweetContent(
      twitterService,
      runtime,
      tweetsToMerge,
    );

    elizaLogger.info(
      `[TwitterAccounts] Processing ${mergedTweets.length} tweets`,
    );

    // Group tweets by username for batch processing
    const tweetsByUsername = new Map<string, DatabaseTweet[]>();
    for (const tweet of mergedTweets) {
      if (tweet.username) {
        const tweets = tweetsByUsername.get(tweet.username) || [];
        tweets.push(tweet);
        tweetsByUsername.set(tweet.username, tweets);
      }
    }

    // DEBUGGING: Log all tweet IDs before processing
    elizaLogger.info(
      `[Tweet Processing] DEBUG: About to process ${mergedTweets.length} tweets:`,
      {
        tweetIds: mergedTweets.map((t) => t.tweet_id),
        usernames: mergedTweets.map((t) => t.username),
      },
    );

    // Process tweets and update author metrics
    for (const [username] of tweetsByUsername.entries()) {
      try {
        elizaLogger.info(
          `[Tweet Processing] DEBUG: Processing metrics for user: ${username}`,
        );
        // Get all target accounts to find the author
        const accounts = await tweetQueries.getTargetAccounts();
        const account = accounts.find((acc) => acc.username === username);

        if (account) {
          // Pass skipSearch=true to avoid triggering additional searches
          // when we're already processing tweets from this account
          await updateAccountEngagementMetrics(
            account,
            '[Tweet Processing]',
            true,
          );
        }
      } catch (error) {
        elizaLogger.error(
          `[Tweet Processing] Error updating metrics for author ${username}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    for (const tweet of mergedTweets) {
      try {
        elizaLogger.info(
          `[Tweet Processing] DEBUG: Starting to process tweet ${tweet.tweet_id}`,
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

        elizaLogger.info(
          `[Tweet Processing] Starting analysis for tweet ${tweet.tweet_id} from @${tweet.userId}`,
          {
            tweetId: tweet.tweet_id,
            originalText:
              tweet.originalText?.substring(0, 100) +
              (tweet.originalText?.length > 100 ? '...' : ''),
            mergedTextLength: tweet.text.length,
            isThreadMerged: tweet.isThreadMerged,
            threadSize: tweet.threadSize,
            metrics: {
              likes: tweet.likes,
              retweets: tweet.retweets,
              replies: tweet.replies,
            },
          },
        );

        // Perform comprehensive analysis
        elizaLogger.info(
          `[Tweet Processing] DEBUG: Creating template for tweet ${tweet.tweet_id}`,
        );
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
        elizaLogger.info(
          `[Tweet Processing] DEBUG: Composing context for tweet ${tweet.tweet_id}`,
        );

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

          elizaLogger.info(
            `[Tweet Processing] DEBUG: Generating response for tweet ${tweet.tweet_id}`,
          );

          // Fix issue: Template no longer returns modelClass, so explicitly pass it
          try {
            // Add more explicit logging before making the API call
            elizaLogger.info(
              '[Tweet Processing] About to call generateMessageResponse',
              {
                contextLength: context.length,
                tweetId: tweet.tweet_id,
                modelClass: ModelClass.MEDIUM,
              },
            );

            const analysis = await generateMessageResponse({
              runtime,
              context,
              modelClass: ModelClass.MEDIUM, // Explicitly use MEDIUM model
            });

            elizaLogger.info(
              `[Tweet Processing] Got analysis response for tweet ${tweet.tweet_id}`,
              {
                hasResponse: Boolean(analysis),
                responseType: analysis ? typeof analysis : 'undefined',
                responseKeys:
                  analysis && typeof analysis === 'object'
                    ? Object.keys(analysis)
                    : [],
              },
            );

            // Validate and process the analysis response
            if (!analysis || typeof analysis !== 'object') {
              elizaLogger.error(
                '[Tweet Processing] Invalid analysis response:',
                {
                  analysis,
                  tweetId: tweet.tweet_id,
                },
              );
              throw new Error('Invalid analysis response structure');
            }

            // Add detailed logging of the analysis response
            elizaLogger.info('[Tweet Processing] Raw analysis response:', {
              responseType: typeof analysis,
              hasSpamAnalysis: 'spamAnalysis' in analysis,
              hasContentAnalysis: 'contentAnalysis' in analysis,
              hasText: 'text' in analysis,
              hasContent: 'content' in analysis,
            });

            let parsedAnalysis: TweetAnalysis;

            // Try all possible response formats, from most likely to least likely
            if ('spamAnalysis' in analysis && 'contentAnalysis' in analysis) {
              // Case 1: Direct structured output with expected fields
              parsedAnalysis = analysis as unknown as TweetAnalysis;
              elizaLogger.info(
                '[Tweet Processing] Using direct structured analysis object',
              );
            } else if (
              'text' in analysis &&
              typeof analysis.text === 'string'
            ) {
              // Case 2: Text response that needs JSON extraction
              elizaLogger.info(
                '[Tweet Processing] Attempting to extract JSON from text response',
                {
                  textLength: analysis.text.length,
                  textSample:
                    analysis.text.substring(0, 100) +
                    (analysis.text.length > 100 ? '...' : ''),
                },
              );

              try {
                // First try the standard extraction
                const cleanedText = extractJsonFromText(analysis.text);
                parsedAnalysis = JSON.parse(cleanedText) as TweetAnalysis;
              } catch (jsonError) {
                // Fall back to a simpler approach - use a super-resilient regex to find anything that looks like JSON
                elizaLogger.warn(
                  '[Tweet Processing] Standard JSON extraction failed, trying regex approach',
                  {
                    error:
                      jsonError instanceof Error
                        ? jsonError.message
                        : String(jsonError),
                  },
                );

                // Generate fallback analysis to use if extraction completely fails
                const fallbackAnalysis = createDefaultAnalysis();

                try {
                  // Try to extract anything that looks like a JSON object
                  const jsonMatch = analysis.text.match(/{[\s\S]*}/);
                  if (jsonMatch) {
                    const jsonCandidate = jsonMatch[0];
                    // Use the string sanitizer to clean up any issues
                    const sanitizedJson =
                      removeNonPrintableChars(jsonCandidate);

                    // Try to parse it, falling back to the default if needed
                    try {
                      parsedAnalysis = JSON.parse(
                        sanitizedJson,
                      ) as TweetAnalysis;
                    } catch (parseError) {
                      elizaLogger.error(
                        '[Tweet Processing] Failed to parse extracted JSON candidate',
                        {
                          error:
                            parseError instanceof Error
                              ? parseError.message
                              : String(parseError),
                          candidate:
                            sanitizedJson.substring(0, 100) +
                            (sanitizedJson.length > 100 ? '...' : ''),
                        },
                      );
                      parsedAnalysis = fallbackAnalysis;
                    }
                  } else {
                    // No JSON object found at all
                    elizaLogger.error(
                      '[Tweet Processing] No JSON pattern found in text response',
                    );
                    parsedAnalysis = fallbackAnalysis;
                  }
                } catch (regexError) {
                  // If even regex fails, use default
                  elizaLogger.error(
                    '[Tweet Processing] Regex extraction failed',
                    {
                      error:
                        regexError instanceof Error
                          ? regexError.message
                          : String(regexError),
                    },
                  );
                  parsedAnalysis = fallbackAnalysis;
                }
              }
            } else if (
              'content' in analysis &&
              typeof analysis.content === 'string'
            ) {
              // Case 3: Try content field which might contain JSON
              try {
                const contentText = analysis.content as string;
                const jsonMatch = contentText.match(/{[\s\S]*}/);
                if (jsonMatch) {
                  parsedAnalysis = JSON.parse(jsonMatch[0]) as TweetAnalysis;
                } else {
                  parsedAnalysis = repairAnalysisResponse(
                    analysis as Partial<Record<string, unknown>>,
                  );
                }
              } catch (contentError) {
                elizaLogger.error(
                  '[Tweet Processing] Failed to extract JSON from content field',
                  {
                    error:
                      contentError instanceof Error
                        ? contentError.message
                        : String(contentError),
                  },
                );
                parsedAnalysis = repairAnalysisResponse(
                  analysis as Partial<Record<string, unknown>>,
                );
              }
            } else {
              // Case 4: Unknown format - try to repair/convert whatever we got
              elizaLogger.warn(
                '[Tweet Processing] Response in unexpected format, attempting repair',
                {
                  responseType: typeof analysis,
                  keys: Object.keys(analysis),
                },
              );
              parsedAnalysis = repairAnalysisResponse(
                analysis as Partial<Record<string, unknown>>,
              );
            }

            // Do a final check for required fields and repair if needed
            if (
              !parsedAnalysis.spamAnalysis ||
              !parsedAnalysis.contentAnalysis
            ) {
              elizaLogger.warn(
                '[Tweet Processing] Analysis incomplete after parsing, repairing',
                {
                  hasContentAnalysis: Boolean(parsedAnalysis.contentAnalysis),
                  hasSpamAnalysis: Boolean(parsedAnalysis.spamAnalysis),
                },
              );
              parsedAnalysis = repairAnalysisResponse(
                parsedAnalysis as unknown as Partial<Record<string, unknown>>,
              );
            }

            // Update spam user data regardless of spam status
            await updateUserSpamData(
              tweet.userId?.toString() || '',
              parsedAnalysis.spamAnalysis.spamScore,
              parsedAnalysis.spamAnalysis.reasons,
              '[Tweet Processing]',
            );

            // Check if tweet is spam
            const isSpam =
              parsedAnalysis.spamAnalysis.isSpam === true &&
              parsedAnalysis.spamAnalysis.spamScore > 0.7;

            if (isSpam) {
              await tweetQueries.updateTweetStatus(tweet.tweet_id, 'spam');
              elizaLogger.info(
                `[Tweet Processing] Tweet ${tweet.tweet_id} identified as spam - skipping analysis`,
                {
                  tweetId: tweet.tweet_id,
                  spamScore: parsedAnalysis.spamAnalysis.spamScore,
                  reasons: parsedAnalysis.spamAnalysis.reasons,
                  isThreadMerged: tweet.isThreadMerged,
                  threadSize: tweet.threadSize,
                },
              );
              continue;
            }

            // If tweet is not spam, add author to target accounts
            if (tweet.username && tweet.userId) {
              elizaLogger.info(
                `[Tweet Processing] Upserting non-spam tweet author @${tweet.username} to target accounts`,
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
                    `[Tweet Processing] Saving analysis for tweet ${tweet.tweet_id}`,
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
                      hashtags: Array.isArray(tweet.hashtags)
                        ? tweet.hashtags
                        : [],
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
                    `[Tweet Processing] Successfully saved analysis for tweet ${tweet.tweet_id}`,
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
                        '[Tweet Processing]',
                      );
                    }
                  } catch (topicError) {
                    // Log but don't fail the whole transaction
                    elizaLogger.error(
                      '[Tweet Processing] Error updating topic weights:',
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
                  elizaLogger.error(
                    '[Tweet Processing] Error in transaction:',
                    {
                      error:
                        innerError instanceof Error
                          ? innerError.message
                          : String(innerError),
                      tweetId: tweet.tweet_id,
                      phase: 'analysis_insertion',
                    },
                  );
                  throw innerError; // Rethrow to trigger rollback
                }
              });

              elizaLogger.info(
                `[Tweet Processing] Successfully processed tweet ${tweet.tweet_id}`,
                {
                  analysisId: analysisId.toString(),
                  tweetId: tweet.tweet_id,
                  isThreadMerged: tweet.isThreadMerged,
                  textLength: tweet.text.length,
                  originalTextLength: tweet.originalText.length,
                },
              );
            } catch (txError) {
              elizaLogger.error('[Tweet Processing] Transaction failed:', {
                error:
                  txError instanceof Error ? txError.message : String(txError),
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
                  '[Tweet Processing] Could not update error status:',
                  statusError,
                );
              }
            }
          } catch (aiError) {
            elizaLogger.error('[Tweet Processing] AI analysis error:', {
              error:
                aiError instanceof Error ? aiError.message : String(aiError),
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
          elizaLogger.error('[Tweet Processing] Error preparing context:', {
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
          '[Tweet Processing] Error processing tweets:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    elizaLogger.info('[TwitterAccounts] Successfully processed all tweets');
  } catch (error) {
    elizaLogger.error(
      '[Tweet Processing] Error processing tweets:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
