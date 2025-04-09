import { tweetQueries } from '@/extensions/src/db/queries';
import { updateUserSpamData } from '@/helpers/spam-helper';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { tweetAnalysisTemplate } from '@/templates/analysis';
import type { TweetAnalysis } from '@/types/analysis';
import { tweetAnalysisSchema } from '@/types/response/tweet-analysis';
import type { TopicWeightRow } from '@/types/topic';
import type { DatabaseTweet, TweetWithUpstream } from '@/types/twitter';
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
import { updateTopicWeights } from '../topic-weights/topics';
import { storeAccountInfo } from './process-accounts';
import { extractAndStoreKnowledge } from './process-knowledge';
import { fetchAndFormatKnowledge } from './process-knowledge';

/**
 * Processes a single tweet by analyzing its content, detecting spam,
 * and updating relevant data in the database
 */
export async function processSingleTweet(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  processedTweet: TweetWithUpstream,
  topicWeights: TopicWeightRow[],
  logPrefix = '[Tweet Analysis]',
): Promise<void> {
  try {
    // Collect all tweets in the conversation
    const allTweets: DatabaseTweet[] = [
      processedTweet.originalTweet,
      ...processedTweet.upstreamTweets.inReplyChain,
      ...processedTweet.upstreamTweets.quotedTweets,
      ...processedTweet.upstreamTweets.retweetedTweets,
    ];

    // Combine all unique knowledge contexts
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

        elizaLogger.debug(`${logPrefix} Found knowledge for tweet:`, {
          tweetId: tweet.tweet_id,
          totalItems: knowledgeItems.length,
          uniqueItems: seenKnowledge.size,
        });
      }
    }

    // Combine all unique knowledge contexts
    const combinedKnowledgeContext = knowledgeContexts.join('\n\n');

    // Create template using the original tweet
    const template = tweetAnalysisTemplate({
      text: processedTweet.originalTweet.text,
      public_metrics: {
        like_count: processedTweet.originalTweet.likes || 0,
        retweet_count: processedTweet.originalTweet.retweets || 0,
        reply_count: processedTweet.originalTweet.replies || 0,
      },
      topics: runtime.character.topics || [],
      topicWeights: topicWeights.map((tw) => ({
        topic: tw.topic,
        weight: tw.weight,
      })),
      isThreadMerged: processedTweet.originalTweet.isThreadMerged,
      threadSize: processedTweet.originalTweet.threadSize,
      originalText: processedTweet.originalTweet.originalText,
    });

    // Create memory for state composition
    const memoryUserId = stringToUuid(
      `twitter-user-${processedTweet.originalTweet.userId}`,
    );
    const memory: Memory = {
      content: {
        text: processedTweet.originalTweet.text,
        isThreadMerged: processedTweet.originalTweet.isThreadMerged,
        threadSize: processedTweet.originalTweet.threadSize,
        originalText: processedTweet.originalTweet.originalText,
      },
      userId: memoryUserId,
      agentId: runtime.agentId,
      roomId: stringToUuid(processedTweet.originalTweet.tweet_id),
    };

    const state = await runtime.composeState(memory, {
      twitterService,
      twitterUserName: runtime.getSetting('TWITTER_USERNAME') || '',
      currentPost: processedTweet.originalTweet.text,
    });

    const context = composeContext({
      template:
        template.context +
        (combinedKnowledgeContext
          ? `\n\nRelevant Knowledge:\n${combinedKnowledgeContext}`
          : ''),
      state,
    });

    elizaLogger.info(`${logPrefix} Requesting an analysis from the AI...`);

    try {
      const { object } = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: tweetAnalysisSchema,
      });

      elizaLogger.info(`${logPrefix} Received analysis from the AI`);

      const analysis = object as TweetAnalysis;

      // Validate and process the analysis response
      if (!analysis || typeof analysis !== 'object') {
        elizaLogger.error(`${logPrefix} Invalid analysis response:`, {
          analysis,
          tweetId: processedTweet.originalTweet.tweet_id,
        });
        throw new Error('Invalid analysis response structure');
      }

      // Update spam user data regardless of spam status
      await updateUserSpamData(
        processedTweet.originalTweet.userId?.toString() || '',
        analysis.spamAnalysis.spamScore,
        analysis.spamAnalysis.reasons,
        logPrefix,
      );

      // Check if tweet is spam
      const isSpam =
        analysis.spamAnalysis.isSpam === true &&
        analysis.spamAnalysis.spamScore > 0.7;

      if (isSpam) {
        await tweetQueries.updateTweetStatus(
          processedTweet.originalTweet.tweet_id,
          'spam',
        );
        elizaLogger.info(
          `${logPrefix} Tweet ${processedTweet.originalTweet.tweet_id} identified as spam - skipping analysis`,
          {
            tweetId: processedTweet.originalTweet.tweet_id,
            spamScore: analysis.spamAnalysis.spamScore,
            reasons: analysis.spamAnalysis.reasons,
            isThreadMerged: processedTweet.originalTweet.isThreadMerged,
            threadSize: processedTweet.originalTweet.threadSize,
          },
        );
        return;
      }

      // Store analysis for non-spam tweets
      const analysisId = stringToUuid(uuidv4());

      // Process analysis in a transaction
      try {
        await tweetQueries.processTweetsInTransaction(async (client) => {
          try {
            elizaLogger.debug(
              `${logPrefix} Saving analysis for tweet ${processedTweet.originalTweet.tweet_id}`,
              {
                analysisId: analysisId.toString(),
                tweetId: processedTweet.originalTweet.tweet_id,
                isThreadMerged: processedTweet.originalTweet.isThreadMerged,
                threadSize: processedTweet.originalTweet.threadSize,
                textLength: processedTweet.originalTweet.text.length,
                originalTextLength:
                  processedTweet.originalTweet.originalText.length,
              },
            );

            // Insert the tweet analysis
            await tweetQueries.insertTweetAnalysis(
              analysisId,
              processedTweet.originalTweet.tweet_id,
              analysis.contentAnalysis.type,
              analysis.contentAnalysis.sentiment,
              analysis.contentAnalysis.confidence,
              {
                likes: processedTweet.originalTweet.likes || 0,
                retweets: processedTweet.originalTweet.retweets || 0,
                replies: processedTweet.originalTweet.replies || 0,
                spamScore: analysis.spamAnalysis.spamScore,
                spamViolations: analysis.spamAnalysis.reasons,
                isThreadMerged: processedTweet.originalTweet.isThreadMerged,
                threadSize: processedTweet.originalTweet.threadSize,
                originalTextLength:
                  processedTweet.originalTweet.originalText.length,
                mergedTextLength: processedTweet.originalTweet.text.length,
                hashtagsUsed: analysis.contentAnalysis.hashtagsUsed || [],
                engagementMetrics: analysis.contentAnalysis.engagementAnalysis,
              },
              // Flatten entities into a single array
              [
                ...(analysis.contentAnalysis.entities.people || []),
                ...(analysis.contentAnalysis.entities.organizations || []),
                ...(analysis.contentAnalysis.entities.products || []),
                ...(analysis.contentAnalysis.entities.locations || []),
                ...(analysis.contentAnalysis.entities.events || []),
              ],
              // Combine primary and secondary topics
              [
                ...(analysis.contentAnalysis.primaryTopics || []),
                ...(analysis.contentAnalysis.secondaryTopics || []),
              ],
              analysis.contentAnalysis.engagementAnalysis.overallScore,
              new Date(processedTweet.originalTweet.timestamp * 1000),
              processedTweet.originalTweet.userId?.toString() || '',
              processedTweet.originalTweet.text || '', // Use merged text
              {
                likes: processedTweet.originalTweet.likes || 0,
                retweets: processedTweet.originalTweet.retweets || 0,
                replies: processedTweet.originalTweet.replies || 0,
              },
              {
                hashtags: Array.isArray(processedTweet.originalTweet.hashtags)
                  ? processedTweet.originalTweet.hashtags
                  : [],
                mentions: Array.isArray(processedTweet.originalTweet.mentions)
                  ? processedTweet.originalTweet.mentions.map((mention) => ({
                      username: mention.username || '',
                      id: mention.id || '',
                    }))
                  : [],
                urls: Array.isArray(processedTweet.originalTweet.urls)
                  ? processedTweet.originalTweet.urls
                  : [],
                topicWeights: topicWeights.map((tw) => ({
                  topic: tw.topic,
                  weight: tw.weight,
                })),
                entities: analysis.contentAnalysis.entities, // Store full entity structure
              },
              analysis.spamAnalysis,
              {
                relevance: analysis.contentAnalysis.qualityMetrics.relevance,
                quality: analysis.contentAnalysis.qualityMetrics.clarity,
                engagement:
                  analysis.contentAnalysis.engagementAnalysis.overallScore,
                authenticity:
                  analysis.contentAnalysis.qualityMetrics.authenticity,
                valueAdd: analysis.contentAnalysis.qualityMetrics.valueAdd,
                callToActionEffectiveness:
                  analysis.marketingInsights?.copywriting?.callToAction
                    ?.effectiveness || 0,
                trendAlignmentScore:
                  analysis.marketingInsights?.trendAlignment?.relevanceScore ||
                  0,
              },
              analysis.contentAnalysis.format,
              // Store full marketing insights structure
              {
                targetAudience:
                  analysis.marketingInsights?.targetAudience || [],
                keyTakeaways: analysis.marketingInsights?.keyTakeaways || [],
                contentStrategies: {
                  whatWorked:
                    analysis.marketingInsights?.contentStrategies?.whatWorked ||
                    [],
                  improvement:
                    analysis.marketingInsights?.contentStrategies
                      ?.improvement || [],
                },
                trendAlignment: {
                  currentTrends:
                    analysis.marketingInsights?.trendAlignment?.currentTrends ||
                    [],
                  emergingOpportunities:
                    analysis.marketingInsights?.trendAlignment
                      ?.emergingOpportunities || [],
                  relevanceScore:
                    analysis.marketingInsights?.trendAlignment
                      ?.relevanceScore || 0,
                },
                copywriting: {
                  effectiveElements:
                    analysis.marketingInsights?.copywriting
                      ?.effectiveElements || [],
                  hooks: analysis.marketingInsights?.copywriting?.hooks || [],
                  callToAction: {
                    present:
                      analysis.marketingInsights?.copywriting?.callToAction
                        ?.present || false,
                    type:
                      analysis.marketingInsights?.copywriting?.callToAction
                        ?.type || 'none',
                    effectiveness:
                      analysis.marketingInsights?.copywriting?.callToAction
                        ?.effectiveness || 0,
                  },
                },
              },
              client,
            );

            elizaLogger.info(
              `${logPrefix} Successfully saved analysis for tweet ${processedTweet.originalTweet.tweet_id}`,
            );

            // Update tweet status to analyzed using Twitter's ID
            await tweetQueries.updateTweetStatus(
              processedTweet.originalTweet.tweet_id,
              'analyzed',
              undefined,
              client,
            );

            // Update topic weights with the new analysis
            const allTopics = [
              ...(analysis.contentAnalysis.primaryTopics || []),
              ...(analysis.contentAnalysis.secondaryTopics || []),
            ];

            await updateTopicWeights(
              allTopics,
              analysis,
              processedTweet.originalTweet,
              logPrefix,
            );

            // Process mentions from the merged tweet and add to target accounts, including topic relationships
            await storeAccountInfo(
              processedTweet.originalTweet,
              twitterService,
              allTopics,
            );

            // Extract and store knowledge from tweet analysis
            try {
              await extractAndStoreKnowledge(
                runtime,
                processedTweet.originalTweet,
                analysis,
                `${logPrefix} [Knowledge]`,
              );
              elizaLogger.info(
                `${logPrefix} Successfully extracted knowledge from tweet ${processedTweet.originalTweet.tweet_id}`,
              );
            } catch (knowledgeError) {
              // Log but don't fail the whole process
              elizaLogger.error(`${logPrefix} Error extracting knowledge:`, {
                error:
                  knowledgeError instanceof Error
                    ? knowledgeError.message
                    : String(knowledgeError),
                tweetId: processedTweet.originalTweet.tweet_id,
              });
            }

            elizaLogger.info(
              `${logPrefix} Successfully processed tweet ${processedTweet.originalTweet.tweet_id}`,
              {
                analysisId: analysisId.toString(),
                tweetId: processedTweet.originalTweet.tweet_id,
              },
            );
          } catch (innerError) {
            elizaLogger.error(`${logPrefix} Error in transaction:`, {
              error:
                innerError instanceof Error
                  ? innerError.message
                  : String(innerError),
              tweetId: processedTweet.originalTweet.tweet_id,
              phase: 'analysis_insertion',
            });
            throw innerError; // Rethrow to trigger rollback
          }
        });
      } catch (txError) {
        elizaLogger.error(`${logPrefix} Transaction failed:`, {
          error: txError instanceof Error ? txError.message : String(txError),
          tweetId: processedTweet.originalTweet.tweet_id,
        });

        // Try to update the status separately to indicate an error
        try {
          await tweetQueries.updateTweetStatus(
            processedTweet.originalTweet.tweet_id,
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
    } catch (contextError) {
      elizaLogger.error(`${logPrefix} Error preparing context:`, {
        error:
          contextError instanceof Error
            ? contextError.message
            : String(contextError),
        tweetId: processedTweet.originalTweet.tweet_id,
      });

      // Update tweet status to indicate context error
      await tweetQueries.updateTweetStatus(
        processedTweet.originalTweet.tweet_id,
        'error',
        `Context error: ${contextError instanceof Error ? contextError.message : String(contextError)}`,
      );
    }
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error processing tweet:`,
      error instanceof Error ? error.message : String(error),
    );

    // Try to update the status separately to indicate an error
    try {
      await tweetQueries.updateTweetStatus(
        processedTweet.originalTweet.tweet_id,
        'error',
        `Processing error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } catch (statusError) {
      elizaLogger.error(
        `${logPrefix} Could not update error status:`,
        statusError,
      );
    }
  }
}
