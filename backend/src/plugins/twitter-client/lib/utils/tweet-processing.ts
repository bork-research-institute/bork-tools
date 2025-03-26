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
import { tweetAnalysisTemplate } from '../templates/analysis';
import type { TweetAnalysis } from '../types/analysis';
import type { TopicWeightRow } from '../types/topic';
import type { Tweet } from '../types/twitter';
import { updateUserSpamData } from './spam-processing';
import { extractJsonFromText } from './text-processing';
import { updateTopicWeights } from './topic-processing';
import { mergeTweetContent } from './tweet-merging';

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

    const mergedTweets = mergeTweetContent(validTweets);

    elizaLogger.info(
      `[TwitterAccounts] Processing ${mergedTweets.length} tweets`,
    );

    for (const tweet of mergedTweets) {
      try {
        // Check if tweet has already been processed
        const existingTweet = await tweetQueries.findTweetByTweetId(
          tweet.tweet_id,
        );
        if (existingTweet) {
          elizaLogger.info(
            `[Tweet Processing] Tweet ${tweet.tweet_id} has already been processed - skipping`,
            {
              tweetId: existingTweet.tweet_id,
              status: existingTweet.status,
            },
          );
          continue;
        }

        // Store tweet in cache
        await twitterService.cacheTweet(tweet);

        // Store the tweet object with both merged and original content
        await tweetQueries.saveTweetObject({
          id: tweet.id, // Use fresh UUID as primary key
          tweet_id: tweet.tweet_id, // Use Twitter's ID as foreign key
          text: tweet.text || '',
          userId: tweet.userId?.toString() || '',
          username: tweet.username || '',
          name: tweet.name || '',
          timestamp: tweet.timestamp || Math.floor(Date.now() / 1000),
          timeParsed: tweet.timeParsed || new Date(),

          // Tweet metrics
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          views: tweet.views || 0,
          bookmarkCount: tweet.bookmarkCount || 0,

          // Tweet metadata
          conversationId: tweet.conversationId || '',
          permanentUrl: tweet.permanentUrl || '',
          html: tweet.html || '',
          inReplyToStatus: tweet.inReplyToStatus,
          inReplyToStatusId: tweet.inReplyToStatusId,
          quotedStatus: tweet.quotedStatus,
          quotedStatusId: tweet.quotedStatusId,
          retweetedStatus: tweet.retweetedStatus,
          retweetedStatusId: tweet.retweetedStatusId,
          thread: Array.isArray(tweet.thread) ? tweet.thread : [],

          // Tweet flags
          isQuoted: tweet.isQuoted || false,
          isPin: tweet.isPin || false,
          isReply: tweet.isReply || false,
          isRetweet: tweet.isRetweet || false,
          isSelfThread: tweet.isSelfThread || false,
          sensitiveContent: tweet.sensitiveContent || false,

          // Media and entities
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
          mentions: Array.isArray(tweet.mentions)
            ? tweet.mentions.map((mention) => ({
                username: mention.username || '',
                id: mention.id || '',
              }))
            : [],
          photos: Array.isArray(tweet.photos) ? tweet.photos : [],
          urls: Array.isArray(tweet.urls) ? tweet.urls : [],
          videos: Array.isArray(tweet.videos) ? tweet.videos : [],
          place: tweet.place,
          poll: tweet.poll,

          // Application-specific fields
          status: 'pending',
          createdAt: new Date(),
          agentId: runtime.agentId,
          mediaType: tweet.mediaType || 'text',
          mediaUrl: tweet.mediaUrl || tweet.permanentUrl,
          scheduledFor: tweet.scheduledFor,
          sentAt: tweet.sentAt,
          error: tweet.error,
          prompt: tweet.prompt,
          newTweetContent: tweet.newTweetContent,

          // Thread processing fields
          isThreadMerged: tweet.isThreadMerged || false,
          threadSize: tweet.threadSize || 0,
          originalText: tweet.originalText || tweet.text || '',

          // Timeline data
          homeTimeline: {
            publicMetrics: {
              likes: tweet.likes || 0,
              retweets: tweet.retweets || 0,
              replies: tweet.replies || 0,
            },
            entities: {
              hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
              mentions: Array.isArray(tweet.mentions)
                ? tweet.mentions.map((mention) => ({
                    username: mention.username || '',
                    id: mention.id || '',
                  }))
                : [],
              urls: Array.isArray(tweet.urls) ? tweet.urls : [],
            },
          },
        });

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
        const template = tweetAnalysisTemplate({
          text: tweet.text,
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

        // Convert Twitter user ID to a consistent UUID for the memory context
        const memoryUserId = stringToUuid(`twitter-user-${tweet.userId}`);

        const context = composeContext({
          state: await runtime.composeState(
            {
              content: { text: tweet.text },
              userId: memoryUserId, // Use the generated UUID instead of Twitter ID
              agentId: runtime.agentId,
              roomId: uuidv4(), // This is fine as it's just for the context
            } as Memory,
            {
              twitterService,
              twitterUserName: runtime.getSetting('TWITTER_USERNAME'),
              currentPost: tweet.text,
            },
          ),
          template: template.context,
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

        let parsedAnalysis: TweetAnalysis;
        try {
          if ('spamAnalysis' in analysis && 'contentAnalysis' in analysis) {
            parsedAnalysis = analysis as unknown as TweetAnalysis;
          } else if ('text' in analysis && typeof analysis.text === 'string') {
            const cleanedText = extractJsonFromText(analysis.text);
            parsedAnalysis = JSON.parse(cleanedText) as TweetAnalysis;
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
          });
        }

        // Store analysis for non-spam tweets
        const analysisId = stringToUuid(uuidv4()); // Convert UUID string to UUID type

        await tweetQueries.insertTweetAnalysis(
          analysisId, // UUID primary key
          tweet.tweet_id, // tweet_id foreign key
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
          tweet.userId?.toString() || '', // Ensure author_id is a string
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

        // Update tweet status to analyzed using Twitter's ID
        await tweetQueries.updateTweetStatus(tweet.tweet_id, 'analyzed');

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
          `[Tweet Processing] Successfully processed tweet ${tweet.tweet_id}`,
          {
            analysisId,
            tweetId: tweet.tweet_id,
            isThreadMerged: tweet.isThreadMerged,
            textLength: tweet.text.length,
            originalTextLength: tweet.originalText.length,
          },
        );
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
