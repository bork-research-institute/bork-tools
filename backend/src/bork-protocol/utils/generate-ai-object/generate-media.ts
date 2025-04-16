import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { ImageGenerationService } from '../../services/image/image-generation';
import type { Media, TweetContent } from './generate-informative-thread';

/**
 * Analyzes tweet content and determines if it needs media enhancement
 */
async function analyzeMediaNeed(tweet: TweetContent): Promise<{
  type: 'image' | 'video';
  description: string;
  style: string;
  purpose: string;
} | null> {
  // TODO: Implement AI-based analysis to determine if and what type of media would enhance the tweet
  // For now, suggest media for highlight tweets that contain data or instructions
  if (!tweet.isHighlight) {
    return null;
  }

  const content = tweet.content.toLowerCase();
  if (
    content.includes('data') ||
    content.includes('stats') ||
    content.includes('numbers') ||
    content.includes('step') ||
    content.includes('how to')
  ) {
    return {
      type: 'image',
      description: `Create a visual representation for: ${tweet.content}`,
      style: 'modern, clean, professional',
      purpose:
        'Enhance understanding and engagement through visual representation',
    };
  }

  return null;
}

/**
 * Generates media for a tweet based on its content and context
 */
export async function generateMediaForTweet(
  runtime: IAgentRuntime,
  tweet: TweetContent,
  logPrefix: string,
): Promise<Media | null> {
  try {
    const mediaNeeded = await analyzeMediaNeed(tweet);
    if (!mediaNeeded) {
      return null;
    }

    elizaLogger.debug(`${logPrefix} Generating media for tweet`, {
      mediaType: mediaNeeded.type,
      purpose: mediaNeeded.purpose,
      isHighlight: tweet.isHighlight,
    });

    if (mediaNeeded.type === 'image') {
      const imageService = new ImageGenerationService();
      await imageService.initialize(runtime);

      const result = await imageService.generateImage(mediaNeeded.description, {
        model: 'dall-e-3',
        size: '1792x1024', // Landscape format for better visibility
        quality: 'hd',
        style: 'vivid',
      });

      return {
        type: 'image',
        url: result.imageUrls[0],
        description: mediaNeeded.description,
        style: mediaNeeded.style,
        purpose: mediaNeeded.purpose,
      };
    }

    // TODO: Implement video generation when needed
    if (mediaNeeded.type === 'video') {
      elizaLogger.warn(`${logPrefix} Video generation not yet implemented`);
      return null;
    }

    return null;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating media:`, error);
    return null;
  }
}

/**
 * Enhances a thread by adding media to appropriate tweets
 */
export async function enhanceThreadWithMedia(
  runtime: IAgentRuntime,
  tweets: TweetContent[],
  logPrefix = '[Media Generation]',
): Promise<TweetContent[]> {
  const enhancedTweets = await Promise.all(
    tweets.map(async (tweet) => {
      const media = await generateMediaForTweet(runtime, tweet, logPrefix);
      return media
        ? {
            ...tweet,
            media,
            mediaPrompt: {
              type: media.type,
              description: media.description,
              style: media.style,
              purpose: media.purpose,
            },
          }
        : tweet;
    }),
  );

  const mediaCount = enhancedTweets.filter((t) => t.media).length;
  elizaLogger.info(`${logPrefix} Enhanced thread with media`, {
    totalTweets: tweets.length,
    tweetsWithMedia: mediaCount,
  });

  return enhancedTweets;
}
