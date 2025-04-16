import { tweetQueries } from '@/db/queries';
import type { TweetAnalysis } from '@/types/response/tweet-analysis';
import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateObject,
  stringToUuid,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';
import { tweetAnalysisTemplate } from '../../bork-protocol/templates/analysis';
import { tweetAnalysisSchema } from '../../bork-protocol/types/response/tweet-analysis';
import type { DatabaseTweet } from '../../bork-protocol/types/twitter';
import { fetchAndFormatKnowledge } from '../../bork-protocol/utils/tweet-analysis/process-knowledge';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockMergedTweets } from '../mock-data/mock-tweets';

export async function testTweetContextPreparation(runtime: IAgentRuntime) {
  const logPrefix = '[Test] [Tweet Context]';
  elizaLogger.info(`${logPrefix} Starting tweet context preparation test`);

  try {
    // Get Twitter service from runtime's clients
    const twitterClient = runtime.clients.find(
      (client) =>
        (client as unknown as { twitterService: TwitterService })
          .twitterService,
    );
    if (!twitterClient) {
      throw new Error('Twitter client not found in runtime');
    }
    const twitterService = (
      twitterClient as unknown as { twitterService: TwitterService }
    ).twitterService;

    const testTweet = mockMergedTweets[0];

    // Collect all tweets in the conversation
    const allTweets: DatabaseTweet[] = [
      testTweet.originalTweet,
      ...testTweet.upstreamTweets.inReplyChain,
      ...testTweet.upstreamTweets.quotedTweets,
      ...testTweet.upstreamTweets.retweetedTweets,
    ];

    // Gather knowledge for each tweet
    const knowledgeContexts: string[] = [];
    const seenKnowledge = new Set<string>();

    for (const tweet of allTweets) {
      const tweetKnowledge = await fetchAndFormatKnowledge(
        runtime,
        tweet,
        `${logPrefix} [Knowledge]`,
      );

      if (tweetKnowledge) {
        // Split knowledge into individual items and deduplicate
        const knowledgeItems = tweetKnowledge
          .split('\n\n')
          .filter((item) => item.trim())
          .filter((item) => !seenKnowledge.has(item));

        // Add new unique items
        for (const item of knowledgeItems) {
          seenKnowledge.add(item);
          knowledgeContexts.push(item);
        }
      }
    }

    // Combine all unique knowledge contexts
    const combinedKnowledgeContext = knowledgeContexts.join('\n\n');
    elizaLogger.info(`${logPrefix} Combined knowledge context:`, {
      totalContexts: knowledgeContexts.length,
      uniqueContexts: seenKnowledge.size,
      totalLength: combinedKnowledgeContext.length,
    });

    // Create template using original tweet
    const template = tweetAnalysisTemplate({
      text: testTweet.originalTweet.text,
      public_metrics: {
        like_count: testTweet.originalTweet.likes || 0,
        retweet_count: testTweet.originalTweet.retweets || 0,
        reply_count: testTweet.originalTweet.replies || 0,
      },
      topics: runtime.character.topics || [],
      topicWeights: mockTopicWeights.slice(0, 3).map((tw) => ({
        topic: tw.topic,
        weight: tw.weight,
      })),
      isThreadMerged: testTweet.originalTweet.isThreadMerged,
      threadSize: testTweet.originalTweet.threadSize,
      originalText: testTweet.originalTweet.originalText,
    });

    // Create memory and state
    const memoryUserId = stringToUuid(
      `twitter-user-${testTweet.originalTweet.userId}`,
    );
    const memory: Memory = {
      content: {
        text: testTweet.originalTweet.text,
        isThreadMerged: testTweet.originalTweet.isThreadMerged,
        threadSize: testTweet.originalTweet.threadSize,
        originalText: testTweet.originalTweet.originalText,
      },
      userId: memoryUserId,
      agentId: runtime.agentId,
      roomId: stringToUuid(testTweet.originalTweet.tweet_id),
    };

    const state = await runtime.composeState(memory, {
      twitterService,
      twitterUserName: runtime.getSetting('TWITTER_USERNAME') || '',
      currentPost: testTweet.originalTweet.text,
    });

    const context = composeContext({
      template:
        template.context +
        (combinedKnowledgeContext
          ? `\n\nRelevant Knowledge:\n${combinedKnowledgeContext}`
          : ''),
      state,
    });

    elizaLogger.info(`${logPrefix} Generated context:`, {
      templateLength: template.context.length,
      knowledgeLength: combinedKnowledgeContext.length,
      totalLength: context.length,
    });

    try {
      const { object } = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: tweetAnalysisSchema,
      });

      const analysis = object as TweetAnalysis;

      // Store analysis for non-spam tweets
      const analysisId = stringToUuid(uuidv4());

      await tweetQueries.processTweetsInTransaction(async (client) => {
        // Insert the tweet analysis
        await tweetQueries.insertTweetAnalysis(
          analysisId,
          testTweet.originalTweet.tweet_id,
          analysis.contentAnalysis.type,
          analysis.contentAnalysis.format,
          analysis.contentAnalysis.sentiment,
          analysis.contentAnalysis.confidence,
          analysis.contentAnalysis.summary,
          analysis.contentAnalysis.topics,
          analysis.contentAnalysis.entities,
          analysis.contentAnalysis.qualityMetrics.relevance,
          analysis.contentAnalysis.qualityMetrics.originality,
          analysis.contentAnalysis.qualityMetrics.clarity,
          analysis.contentAnalysis.qualityMetrics.authenticity,
          analysis.contentAnalysis.qualityMetrics.valueAdd,
          testTweet.originalTweet.likes || 0,
          testTweet.originalTweet.replies || 0,
          testTweet.originalTweet.retweets || 0,
          new Date(testTweet.originalTweet.timestamp * 1000),
          testTweet.originalTweet.username || '',
          analysis.marketingAnalysis.summary,
          analysis.spamAnalysis.isSpam,
          analysis.spamAnalysis.spamScore,
          client,
        );
      });

      elizaLogger.info(
        `${logPrefix} Successfully saved analysis for tweet ${testTweet.originalTweet.tweet_id}`,
      );

      return {
        analysis,
      };
    } catch (genError) {
      elizaLogger.error(`${logPrefix} Error generating analysis:`, {
        error: genError instanceof Error ? genError.message : String(genError),
        tweetId: testTweet.originalTweet.tweet_id,
      });
      throw genError;
    }
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error in context preparation test:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
