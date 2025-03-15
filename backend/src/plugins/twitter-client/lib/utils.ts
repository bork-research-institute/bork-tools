import { getEmbeddingZeroVector } from '@elizaos/core';
import type { Content, Memory, UUID } from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import type { ClientBase } from '../base';

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
  client: ClientBase,
  content: Content,
  roomId: UUID,
  twitterUsername: string,
  inReplyTo: string,
  mediaData: {
    data: Buffer;
    mediaType: string;
  }[] = [],
): Promise<Memory[]> {
  const tweetChunks = splitTweetContent(content.text);
  const sentTweets: Tweet[] = [];
  let previousTweetId = inReplyTo;

  for (const chunk of tweetChunks) {
    const result = await client.requestQueue.add(
      async () =>
        await client.twitterClient.sendTweet(
          chunk.trim(),
          previousTweetId,
          mediaData,
        ),
    );
    const body = await result.json();

    // if we have a response
    if (body?.data?.create_tweet?.tweet_results?.result) {
      // Parse the response
      const tweetResult = body.data.create_tweet.tweet_results.result;
      const finalTweet: Tweet = {
        id: tweetResult.rest_id,
        text: tweetResult.legacy.full_text,
        conversationId: tweetResult.legacy.conversation_id_str,
        timestamp: new Date(tweetResult.legacy.created_at).getTime() / 1000,
        userId: tweetResult.legacy.user_id_str,
        inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
        permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
        hashtags: [],
        mentions: [],
        photos: tweetResult.photos,
        thread: [],
        urls: [],
        videos: [],
      };
      sentTweets.push(finalTweet);
      previousTweetId = finalTweet.id;
    } else {
      console.error('Error sending chunk', chunk, 'repsonse:', body);
    }

    // Wait a bit between tweets to avoid rate limiting issues
    await wait(1000, 2000);
  }

  const memories: Memory[] = sentTweets.map((tweet) => ({
    id: stringToUuid(`${tweet.id}-${client.runtime.agentId}`),
    agentId: client.runtime.agentId,
    userId: client.runtime.agentId,
    content: {
      text: tweet.text,
      source: 'twitter',
      url: tweet.permanentUrl,
      inReplyTo: tweet.inReplyToStatusId
        ? stringToUuid(`${tweet.inReplyToStatusId}-${client.runtime.agentId}`)
        : undefined,
    },
    roomId,
    embedding: getEmbeddingZeroVector(),
    createdAt: tweet.timestamp * 1000,
  }));

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
