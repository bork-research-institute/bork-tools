import { tweetSchema } from '@/types/response/hypothesis';
import { generateHypothesis } from '@/utils/generate-ai-object/generate-hypothesis';
import { generateThread } from '@/utils/generate-ai-object/generate-informative-thread';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';

export async function testHypothesisAndThreadGeneration(
  runtime: IAgentRuntime,
) {
  const logPrefix = '[Test] [Hypothesis & Thread]';
  elizaLogger.info(
    `${logPrefix} Starting hypothesis and thread generation test`,
  );

  try {
    // Get recent topic weights from the database
    const timeframeHours = 168; // Last 7 days
    // Generate hypothesis using real data
    const hypothesis = await generateHypothesis(
      runtime,
      timeframeHours,
      [], // No lessons learned for testing
      `${logPrefix} [Hypothesis]`,
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

    // Log knowledge items separately for better readability
    if (hypothesis.selectedTopic?.relevantKnowledge?.length) {
      elizaLogger.info(`${logPrefix} Relevant knowledge items:`, {
        count: hypothesis.selectedTopic.relevantKnowledge.length,
        items: hypothesis.selectedTopic.relevantKnowledge.map((k, i) => ({
          index: i + 1,
          type: k.type,
          content: k.content,
          useCase: k.useCase,
        })),
      });
    }

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

    return {
      hypothesis,
      thread,
      validation: validationResults,
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
