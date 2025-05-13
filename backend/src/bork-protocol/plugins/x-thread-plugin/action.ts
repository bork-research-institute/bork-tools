import { threadQueries } from '@/bork-protocol/db/thread-queries';
import { tweetSchema } from '@/bork-protocol/types/response/hypothesis';
import { generateHypothesis } from '@/bork-protocol/utils/generate-ai-object/hypothesis';
import { generateThread } from '@/bork-protocol/utils/generate-ai-object/informative-thread';
import { TwitterService } from '@/services/twitter-service';
import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';

export default {
  name: 'CREATE_THREAD',
  similes: [
    'POST_THREAD',
    'MAKE_THREAD',
    'CREATE_CONTENT',
    'CREATE_TWEET',
    'POST_TWEET',
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[CreateThreadAction] Twitter service not found');
      return false;
    }
    return true;
  },
  description: 'Create a bullish thread about a specific topic',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    initialState: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    elizaLogger.info('[CreateThreadAction] Starting handler...');

    let state = initialState;
    if (state) {
      state = await runtime.updateRecentMessageState(state);
    } else {
      state = (await runtime.composeState(message)) as State;
    }

    // Extract the topic from the message
    const topic = message.content.text.toLowerCase();
    elizaLogger.info(
      '[CreateThreadAction] Creating thread about topic:',
      topic,
    );

    try {
      // Generate hypothesis for the specific topic
      const hypothesis = await generateHypothesis(runtime, 24, topic);
      const twitterService = runtime.services.get(
        TwitterService.serviceType,
      ) as TwitterService;

      if (!hypothesis.selectedTopic) {
        elizaLogger.warn(
          '[CreateThreadAction] No suitable topic found for content generation',
        );
        if (callback) {
          callback({
            text: "Sorry, I couldn't find enough information to create a compelling thread about this topic. Please try a different topic.",
            content: {
              error: 'Insufficient topic data',
              details:
                'Not enough knowledge or engagement data available for the requested topic',
            },
          });
        }
        return false;
      }

      // Generate thread based on hypothesis
      const thread = await generateThread(runtime, hypothesis.selectedTopic);

      // Validate tweets using schema
      const validationResults = await Promise.all(
        thread.tweets.map(async (tweet, index) => {
          try {
            await tweetSchema.parseAsync(tweet);
            return {
              tweetNumber: index + 1,
              text: tweet.text,
              isValid: true,
              hasMedia: tweet.hasMedia,
            };
          } catch (error) {
            return {
              tweetNumber: index + 1,
              text: tweet.text,
              isValid: false,
              error: error instanceof Error ? error.message : String(error),
              hasMedia: tweet.hasMedia,
            };
          }
        }),
      );

      const invalidTweets = validationResults.filter(
        (result) => !result.isValid,
      );

      if (invalidTweets.length > 0) {
        elizaLogger.error(
          `[CreateThreadAction] Found ${invalidTweets.length} invalid tweets:`,
          {
            invalidTweets: invalidTweets.map((t) => ({
              tweetNumber: t.tweetNumber,
              text: t.text,
              error: t.error,
            })),
          },
        );
        if (callback) {
          callback({
            text: 'Sorry, there was an issue validating the thread content. Please try again.',
            content: {
              error: 'Invalid tweet content',
              details: invalidTweets,
            },
          });
        }
        return false;
      }

      // Post the thread to Twitter
      let previousTweetId: string | undefined = undefined;
      const postedTweets: {
        id: string;
        text: string;
        permanentUrl: string;
      }[] = [];

      for (const tweet of thread.tweets) {
        const postedTweet = await twitterService.sendTweet(
          tweet.text,
          previousTweetId,
        );

        // Wait a moment for the permanent URL to be available
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get the permanent URL
        const permanentUrl = `https://twitter.com/bork_agent/status/${postedTweet.id}`;

        postedTweets.push({
          id: postedTweet.id,
          text: postedTweet.text,
          permanentUrl,
        });

        elizaLogger.info('Posted tweet', {
          tweet_id: postedTweet.id,
          text: postedTweet.text,
          inReplyToId: previousTweetId,
          permanentUrl,
        });

        previousTweetId = postedTweet.id;
      }

      // Save the posted thread
      const postedThread = await threadQueries.savePostedThread({
        agentId: (runtime as { agentId: string }).agentId || 'default',
        primaryTopic: hypothesis.selectedTopic.primaryTopic,
        relatedTopics: hypothesis.selectedTopic.relatedTopics || [],
        threadIdea: hypothesis.selectedTopic.threadIdea,
        uniqueAngle: hypothesis.selectedTopic.uniqueAngle,
        engagement: {
          likes: 0,
          retweets: 0,
          replies: 0,
          views: 0,
        },
        performanceScore: 0,
        tweetIds: postedTweets.map((t) => t.id),
        usedKnowledge:
          hypothesis.selectedTopic.relevantKnowledge
            ?.filter((k) => k.source?.url && k.source?.authorUsername)
            .map((k) => ({
              content: k.content,
              type: k.type,
              useCase: k.useCase,
              createdAt: k.createdAt,
              source: {
                tweetId: k.source?.tweetId,
                url: k.source?.url || '',
                authorUsername: k.source?.authorUsername || '',
                metrics: k.source?.metrics
                  ? {
                      likes: k.source.metrics.likes || 0,
                      retweets: k.source.metrics.retweets || 0,
                      replies: k.source.metrics.replies || 0,
                    }
                  : undefined,
              },
            })) || [],
      });

      if (callback) {
        // Create a thread summary with all tweet URLs
        const threadUrls = postedTweets
          .map((tweet, index) => `${index + 1}. ${tweet.permanentUrl}`)
          .join('\n');

        callback({
          text: `Successfully created and posted a thread about ${hypothesis.selectedTopic.primaryTopic}!\n\nThread Summary:\n${thread.threadSummary}\n\nThread URLs:\n${threadUrls}\n\nBe sure to share it with your followers!`,
          content: {
            success: true,
            threadId: postedThread.id,
            primaryTopic: hypothesis.selectedTopic.primaryTopic,
            tweetCount: thread.tweets.length,
            threadUrls: postedTweets.map((t) => t.permanentUrl),
            threadSummary: thread.threadSummary,
          },
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error('[CreateThreadAction] Error creating thread:', error);
      if (callback) {
        callback({
          text: `Issue creating the thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
          content: {
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined,
          },
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Create a bullish thread about Solana',
        },
      },
      {
        user: '{{user2}}',
        content: {
          text: "I'll create a bullish thread about Solana's latest developments and growth metrics.",
          action: 'CREATE_THREAD',
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
