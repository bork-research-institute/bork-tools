import type { DatabaseTweet, TweetWithUpstream } from '../types/twitter';

/**
 * Maps a TweetWithUpstream object into a single DatabaseTweet that combines
 * all the context from the original tweet and its upstream tweets.
 */
export function mapToCombinedTweet(
  processedTweet: TweetWithUpstream,
): DatabaseTweet {
  // Combine all texts with proper spacing and attribution
  const texts = [
    processedTweet.originalTweet.text,
    ...processedTweet.upstreamTweets.inReplyChain.map(
      (t) => `[Reply from @${t.username}]\n${t.text}`,
    ),
    ...processedTweet.upstreamTweets.quotedTweets.map(
      (t) => `[Quote from @${t.username}]\n${t.text}`,
    ),
    ...processedTweet.upstreamTweets.retweetedTweets.map(
      (t) => `[Retweet from @${t.username}]\n${t.text}`,
    ),
  ];

  // Calculate total engagement metrics
  const totalLikes =
    processedTweet.originalTweet.likes +
    processedTweet.upstreamTweets.inReplyChain.reduce(
      (sum, t) => sum + (t.likes || 0),
      0,
    ) +
    processedTweet.upstreamTweets.quotedTweets.reduce(
      (sum, t) => sum + (t.likes || 0),
      0,
    ) +
    processedTweet.upstreamTweets.retweetedTweets.reduce(
      (sum, t) => sum + (t.likes || 0),
      0,
    );

  const totalRetweets =
    processedTweet.originalTweet.retweets +
    processedTweet.upstreamTweets.inReplyChain.reduce(
      (sum, t) => sum + (t.retweets || 0),
      0,
    ) +
    processedTweet.upstreamTweets.quotedTweets.reduce(
      (sum, t) => sum + (t.retweets || 0),
      0,
    ) +
    processedTweet.upstreamTweets.retweetedTweets.reduce(
      (sum, t) => sum + (t.retweets || 0),
      0,
    );

  const totalReplies =
    processedTweet.originalTweet.replies +
    processedTweet.upstreamTweets.inReplyChain.reduce(
      (sum, t) => sum + (t.replies || 0),
      0,
    ) +
    processedTweet.upstreamTweets.quotedTweets.reduce(
      (sum, t) => sum + (t.replies || 0),
      0,
    ) +
    processedTweet.upstreamTweets.retweetedTweets.reduce(
      (sum, t) => sum + (t.replies || 0),
      0,
    );

  // Combine all unique entities
  const hashtags = [
    ...new Set([
      ...processedTweet.originalTweet.hashtags,
      ...processedTweet.upstreamTweets.inReplyChain.flatMap((t) => t.hashtags),
      ...processedTweet.upstreamTweets.quotedTweets.flatMap((t) => t.hashtags),
      ...processedTweet.upstreamTweets.retweetedTweets.flatMap(
        (t) => t.hashtags,
      ),
    ]),
  ];

  const mentions = [
    ...new Set([
      ...processedTweet.originalTweet.mentions,
      ...processedTweet.upstreamTweets.inReplyChain.flatMap((t) => t.mentions),
      ...processedTweet.upstreamTweets.quotedTweets.flatMap((t) => t.mentions),
      ...processedTweet.upstreamTweets.retweetedTweets.flatMap(
        (t) => t.mentions,
      ),
    ]),
  ];

  const urls = [
    ...new Set([
      ...processedTweet.originalTweet.urls,
      ...processedTweet.upstreamTweets.inReplyChain.flatMap((t) => t.urls),
      ...processedTweet.upstreamTweets.quotedTweets.flatMap((t) => t.urls),
      ...processedTweet.upstreamTweets.retweetedTweets.flatMap((t) => t.urls),
    ]),
  ];

  // Calculate thread size
  const threadSize =
    1 +
    processedTweet.upstreamTweets.inReplyChain.length +
    processedTweet.upstreamTweets.quotedTweets.length +
    processedTweet.upstreamTweets.retweetedTweets.length;

  // Create the combined tweet
  return {
    ...processedTweet.originalTweet,
    text: texts.join('\n\n'),
    likes: totalLikes,
    retweets: totalRetweets,
    replies: totalReplies,
    hashtags,
    mentions,
    urls,
    isThreadMerged: true,
    threadSize,
    originalText: processedTweet.originalTweet.text,
    // Update timeline metrics to reflect the combined engagement
    homeTimeline: {
      ...processedTweet.originalTweet.homeTimeline,
      publicMetrics: {
        likes: totalLikes,
        retweets: totalRetweets,
        replies: totalReplies,
      },
      entities: {
        hashtags,
        mentions: mentions.map((m) => ({
          username: m.username || '',
          id: m.id || '',
        })),
        urls,
      },
    },
  };
}
