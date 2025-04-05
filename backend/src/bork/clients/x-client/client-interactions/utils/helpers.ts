import type { Content, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import type { TwitterService } from '../../../lib/services/twitter-service';

const MAX_TWEET_LENGTH = 280; // Updated to Twitter's current character limit

export const wait = (minTime = 1000, maxTime = 3000) => {
  const waitTime =
    Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};

export const isValidTweet = (tweet: Tweet): boolean => {
  // Filter out tweets with too many hashtags, @s, or $ signs, probably spam or garbage
  const hashtagCount = (tweet.text?.match(/#/g) || []).length;
  const atCount = (tweet.text?.match(/@/g) || []).length;
  const dollarSignCount = (tweet.text?.match(/\$/g) || []).length;
  const totalCount = hashtagCount + atCount + dollarSignCount;

  return (
    hashtagCount <= 1 && atCount <= 2 && dollarSignCount <= 1 && totalCount <= 3
  );
};

export async function sendTweet(
  twitterService: TwitterService,
  runtime: IAgentRuntime,
  content: Content,
  roomId: UUID,
  agentId: UUID,
  inReplyTo?: string,
): Promise<Memory[]> {
  const tweetChunks = splitTweetContent(content.text);
  const sentTweets: Tweet[] = [];
  let previousTweetId = inReplyTo;

  for (const chunk of tweetChunks) {
    const tweet = await twitterService.sendTweet(chunk.trim(), previousTweetId);
    sentTweets.push(tweet);
    previousTweetId = tweet.id;

    // Wait a bit between tweets to avoid rate limiting issues
    await wait(1000, 2000);
  }

  const memories: Memory[] = [];

  for (const tweet of sentTweets) {
    const memory: Memory = {
      id: stringToUuid(`${tweet.id}-${agentId}`),
      agentId,
      userId: agentId,
      content: {
        text: tweet.text,
        source: 'twitter',
        url: tweet.permanentUrl,
        inReplyTo: tweet.inReplyToStatusId
          ? stringToUuid(`${tweet.inReplyToStatusId}-${agentId}`)
          : undefined,
      },
      roomId,
      createdAt: tweet.timestamp * 1000,
    };

    // Generate embedding for the tweet memory
    await runtime.messageManager.addEmbeddingToMemory(memory);
    memories.push(memory);
  }

  return memories;
}

function splitTweetContent(content: string): string[] {
  const maxLength = MAX_TWEET_LENGTH;
  const paragraphs = content.split('\n\n').map((p) => p.trim());
  const tweets: string[] = [];
  let currentTweet = '';

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      continue;
    }

    if ((currentTweet + paragraph).trim().length <= maxLength) {
      if (currentTweet) {
        currentTweet = `${currentTweet}\n\n${paragraph}`;
      } else {
        currentTweet = paragraph;
      }
    } else {
      if (currentTweet) {
        tweets.push(currentTweet.trim());
      }
      if (paragraph.length <= maxLength) {
        currentTweet = paragraph;
      } else {
        // Split long paragraph into smaller chunks
        const chunks = splitParagraph(paragraph, maxLength);
        tweets.push(...chunks.slice(0, -1));
        currentTweet = chunks[chunks.length - 1];
      }
    }
  }

  if (currentTweet) {
    tweets.push(currentTweet.trim());
  }

  return tweets;
}

function splitParagraph(paragraph: string, maxLength: number): string[] {
  // eslint-disable-next-line
  const sentences = paragraph.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g) || [
    paragraph,
  ];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).trim().length <= maxLength) {
      if (currentChunk) {
        currentChunk = `${currentChunk} ${sentence}`;
      } else {
        currentChunk = sentence;
      }
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (sentence.length <= maxLength) {
        currentChunk = sentence;
      } else {
        // Split long sentence into smaller pieces
        const words = sentence.split(' ');
        currentChunk = '';
        for (const word of words) {
          if ((currentChunk + word).trim().length <= maxLength) {
            if (currentChunk) {
              currentChunk = `${currentChunk} ${word}`;
            } else {
              currentChunk = word;
            }
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = word;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
