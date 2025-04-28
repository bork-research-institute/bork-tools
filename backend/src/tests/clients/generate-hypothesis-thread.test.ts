import { CONTENT_CREATION } from '@/config/creation';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { tweetSchema } from '@/types/response/hypothesis';
import { generateHypothesis } from '@/utils/generate-ai-object/hypothesis';
import { generateThread } from '@/utils/generate-ai-object/informative-thread';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { threadTrackingQueries } from '../../bork-protocol/db/queries';

interface RuntimeWithAgent extends Omit<IAgentRuntime, 'agentId'> {
  agentId: string;
}

export async function testHypothesisAndThreadGeneration(
  runtime: IAgentRuntime,
) {
  const logPrefix = '[Test] [Hypothesis & Thread]';
  elizaLogger.info(
    `${logPrefix} Starting hypothesis and thread generation test`,
  );

  try {
    // Get TwitterService from runtime
    const twitterService = (
      runtime as unknown as { twitterService: TwitterService }
    ).twitterService;
    if (!twitterService) {
      throw new Error('TwitterService not available on runtime');
    }

    // Update all thread and topic performance metrics before generating hypothesis
    elizaLogger.info(
      `${logPrefix} Updating performance metrics for all threads and topics`,
    );
    await threadTrackingQueries.updateAllThreadPerformanceMetrics();

    // Get recent topic weights from the database
    const timeframeHours = 24; // In hours

    // Generate hypothesis using real data
    const hypothesis = await generateHypothesis(
      runtime,
      timeframeHours,
      CONTENT_CREATION.PREFERRED_TOPIC,
    );

    elizaLogger.info(`${logPrefix} Generated hypothesis`, {
      selectedTopic: hypothesis.selectedTopic
        ? {
            primaryTopic: hypothesis.selectedTopic.primaryTopic,
            relatedTopics: hypothesis.selectedTopic.relatedTopics,
            relevantKnowledge: hypothesis.selectedTopic.relevantKnowledge?.map(
              (k) => ({
                type: k.type,
                content: k.content,
                useCase: k.useCase,
              }),
            ),
            threadIdea: hypothesis.selectedTopic.threadIdea,
            uniqueAngle: hypothesis.selectedTopic.uniqueAngle,
            estimatedLength: hypothesis.selectedTopic.estimatedLength,
          }
        : null,
    });

    if (!hypothesis.selectedTopic) {
      throw new Error('No topic selected in hypothesis');
    }

    // Generate thread based on hypothesis
    const thread = await generateThread(
      runtime,
      hypothesis.selectedTopic,
      `${logPrefix} [Thread]`,
    );

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

    const invalidTweets = validationResults.filter((result) => !result.isValid);

    if (invalidTweets.length > 0) {
      elizaLogger.error(
        `${logPrefix} Found ${invalidTweets.length} invalid tweets:`,
        {
          invalidTweets: invalidTweets.map((t) => ({
            tweetNumber: t.tweetNumber,
            text: t.text,
            error: t.error,
          })),
        },
      );
      throw new Error('Thread contains invalid tweets');
    }

    elizaLogger.info(`${logPrefix} Generated thread`, {
      tweets: {
        count: thread.tweets?.length ?? 0,
        content: validationResults,
      },
      threadSummary: thread.threadSummary,
      targetAudience: thread.targetAudience,
      estimatedEngagement: thread.estimatedEngagement,
      optimalPostingTime: thread.optimalPostingTime,
    });

    // Post the thread to Twitter using the real Twitter service
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
      postedTweets.push({
        id: postedTweet.id,
        text: postedTweet.text,
        permanentUrl: postedTweet.permanentUrl,
      });

      elizaLogger.info(`${logPrefix} Posted tweet`, {
        tweet_id: postedTweet.id,
        text: postedTweet.text,
        inReplyToId: previousTweetId,
        permanentUrl: postedTweet.permanentUrl,
      });

      previousTweetId = postedTweet.id;
    }

    const runtimeWithAgent = runtime as RuntimeWithAgent;

    // Save the posted thread and its performance metrics
    const postedThread = await threadTrackingQueries.savePostedThread({
      agentId: runtimeWithAgent.agentId || 'default',
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
    });

    // Save the used knowledge
    if (hypothesis.selectedTopic.relevantKnowledge) {
      await Promise.all(
        hypothesis.selectedTopic.relevantKnowledge
          .filter((k) => k.source?.url && k.source?.authorUsername)
          .map((k) =>
            threadTrackingQueries.saveUsedKnowledge({
              threadId: postedThread.id,
              content: k.content,
              source: {
                url: k.source?.url || '',
                authorUsername: k.source?.authorUsername || '',
              },
              performanceContribution: 0,
              useCount: 1,
            }),
          ),
      );
    }

    return {
      hypothesis,
      thread,
      validation: validationResults,
      postedTweets,
      postedThread,
    };
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error in hypothesis and thread generation test:`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    throw error;
  }
}
