import {
  type IAgentRuntime,
  ModelClass,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { z } from 'zod';
import { createThreadTemplate } from '../../templates/informative-thread';
import type { HypothesisResponse } from './hypothesis';

export const mediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string(),
  description: z.string(),
  style: z.string(),
  purpose: z.string(), // Why this media enhances the tweet
});

export const tweetSchema = z.object({
  text: z.string(),
  hasMedia: z.boolean().optional().default(false),
});

export const threadSchema = z.object({
  tweets: z.array(tweetSchema),
  threadSummary: z.string(),
  targetAudience: z.array(z.string()),
  estimatedEngagement: z.object({
    likesPrediction: z.number(),
    retweetsPrediction: z.number(),
    repliesPrediction: z.number(),
  }),
  optimalPostingTime: z.string(),
});

export type ThreadResponse = z.infer<typeof threadSchema>;
export type TweetContent = z.infer<typeof tweetSchema>;
export type Media = z.infer<typeof mediaSchema>;

/**
 * Generates an engaging thread based on the selected topic and knowledge
 */
export async function generateThread(
  runtime: IAgentRuntime,
  topic: HypothesisResponse['selectedTopic'],
  logPrefix = '[Thread Generation]',
): Promise<ThreadResponse> {
  try {
    elizaLogger.info(`${logPrefix} Starting thread generation for topic:`, {
      primaryTopic: topic?.primaryTopic,
      threadIdea: topic?.threadIdea,
    });

    const template = createThreadTemplate(topic);

    const { object } = await generateObject({
      runtime,
      context: template.context,
      modelClass: ModelClass.SMALL,
      schema: threadSchema,
    });

    const thread = object as ThreadResponse;

    // Log some stats about the generated thread
    const mediaCount = thread.tweets.filter((t) => t.hasMedia).length;

    elizaLogger.info(`${logPrefix} Successfully generated thread`, {
      primaryTopic: topic?.primaryTopic,
      tweetCount: thread.tweets.length,
      mediaCount,
      targetAudience: thread.targetAudience,
    });

    return thread;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating thread:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
