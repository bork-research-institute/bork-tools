import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import type { TwitterService } from '../../services/twitter.service';

export async function buildConversationThread(
  tweet: Tweet,
  twitterService: TwitterService,
  maxReplies = 10,
): Promise<Tweet[]> {
  const thread: Tweet[] = [];
  const visited: Set<string> = new Set();

  async function processThread(currentTweet: Tweet, depth = 0) {
    elizaLogger.info(`[Twitter Client] Processing tweet: ${currentTweet.id}`, {
      id: currentTweet.id,
      inReplyToStatusId: currentTweet.inReplyToStatusId,
      depth: depth,
    });

    if (!currentTweet) {
      elizaLogger.info(
        '[Twitter Client] No current tweet found for thread building',
      );
      return;
    }

    if (depth >= maxReplies) {
      elizaLogger.info('[Twitter Client] Reached maximum reply depth', depth);
      return;
    }

    if (visited.has(currentTweet.id)) {
      elizaLogger.info(
        '[Twitter Client] Already visited tweet:',
        currentTweet.id,
      );
      return;
    }

    visited.add(currentTweet.id);
    thread.unshift(currentTweet);

    elizaLogger.debug('[Twitter Client] Current thread state:', {
      length: thread.length,
      currentDepth: depth,
      tweetId: currentTweet.id,
    });

    if (currentTweet.inReplyToStatusId) {
      elizaLogger.info(
        'Fetching parent tweet:',
        currentTweet.inReplyToStatusId,
      );
      try {
        const parentTweet = await twitterService.getTweet(
          currentTweet.inReplyToStatusId,
        );

        if (parentTweet) {
          elizaLogger.info('[Twitter Client] Found parent tweet:', {
            id: parentTweet.id,
            text: parentTweet.text?.slice(0, 50),
          });
          await processThread(parentTweet, depth + 1);
        } else {
          elizaLogger.info(
            '[Twitter Client] No parent tweet found for:',
            currentTweet.inReplyToStatusId,
          );
        }
      } catch (error) {
        elizaLogger.info('[Twitter Client] Error fetching parent tweet:', {
          tweetId: currentTweet.inReplyToStatusId,
          error,
        });
      }
    } else {
      elizaLogger.info(
        '[Twitter Client] Reached end of reply chain at:',
        currentTweet.id,
      );
    }
  }

  await processThread(tweet, 0);

  elizaLogger.debug(
    '[Twitter Client] Final thread built:',
    thread.length,
    thread.map((t) => ({
      id: t.id,
      text: t.text?.slice(0, 50),
    })),
  );

  return thread;
}
