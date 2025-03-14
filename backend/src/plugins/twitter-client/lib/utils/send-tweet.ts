import {
  type Content,
  type Memory,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';
import type { TwitterService } from '../../services/twitter.service';

export async function sendTweet(
  twitterService: TwitterService,
  response: Content,
  roomId: string,
  inReplyToId?: string,
): Promise<Memory[]> {
  const memories: Memory[] = [];
  const text = response.text;

  if (!text) {
    elizaLogger.error('[Twitter Client] No text to send');
    return memories;
  }

  try {
    const tweet = await twitterService.sendTweet(text, inReplyToId);
    const memory: Memory = {
      id: stringToUuid(tweet.id),
      agentId: stringToUuid(roomId),
      content: {
        text: tweet.text,
        source: 'twitter',
        url: tweet.permanentUrl,
        inReplyTo: inReplyToId ? stringToUuid(inReplyToId) : undefined,
      },
      createdAt: tweet.timestamp * 1000,
      roomId: stringToUuid(roomId),
      userId: stringToUuid(tweet.userId),
    };
    memories.push(memory);
  } catch (error) {
    elizaLogger.error('[Twitter Client] Error sending tweet:', error);
  }

  return memories;
}
