import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  generateShouldRespond,
  getEmbeddingZeroVector,
  stringToUuid,
} from '@elizaos/core';
import { SearchMode, type Tweet } from 'agent-twitter-client';
import { tweetQueries } from '../../bork-extensions/src/db/queries';
import type { TwitterService } from '../lib/services/twitter-service';
import {
  twitterMessageHandlerTemplate,
  twitterShouldRespondTemplate,
} from '../lib/templates/interaction';
import { wait } from '../lib/utils';
import { sendTweetAndCreateMemory } from '../lib/utils/send-tweet-and-create-memory';

export class TwitterInteractionClient {
  private readonly twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private interactionLoopTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(twitterService: TwitterService, runtime: IAgentRuntime) {
    this.twitterService = twitterService;
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterInteraction] Twitter interactions starting');

    // Check if service and profile are properly initialized
    if (!this.twitterService || !this.twitterService.getProfile()) {
      elizaLogger.error(
        '[TwitterInteraction] Service or profile not initialized',
      );
      return;
    }

    const handleTwitterInteractionsLoop = () => {
      void this.handleTwitterInteractions();
      this.interactionLoopTimeout = setTimeout(
        handleTwitterInteractionsLoop,
        Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
      );
    };
    handleTwitterInteractionsLoop();
  }

  async stop(): Promise<void> {
    if (this.interactionLoopTimeout) {
      clearTimeout(this.interactionLoopTimeout);
      this.interactionLoopTimeout = null;
    }
  }

  async handleTwitterInteractions(): Promise<void> {
    elizaLogger.info('[TwitterInteraction] Checking Twitter interactions');

    // Check if service and profile are properly initialized
    const profile = this.twitterService.getProfile();
    if (!profile?.username) {
      elizaLogger.error(
        '[TwitterInteraction] Twitter profile not properly initialized',
      );
      return;
    }

    const twitterUsername = profile.username;
    try {
      // Fetch mentions
      const { tweets: mentionCandidates, spammedTweets } =
        await this.twitterService.searchTweets(
          `@${twitterUsername}`,
          20,
          SearchMode.Latest,
          '[TwitterInteraction]',
        );
      elizaLogger.info(
        `[TwitterInteraction] Found ${mentionCandidates.length} mention candidates for ${twitterUsername} (filtered ${spammedTweets} spam tweets)`,
      );

      let uniqueTweetCandidates = [...new Set(mentionCandidates)];

      uniqueTweetCandidates = uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== profile.id);

      const lastCheckedId = await this.twitterService.getLatestCheckedTweetId(
        profile.username,
      );
      for (const tweet of uniqueTweetCandidates) {
        if (!lastCheckedId || BigInt(tweet.id) > lastCheckedId) {
          const tweetId = stringToUuid(`${tweet.id}-${this.runtime.agentId}`);
          const existingResponse =
            await this.runtime.messageManager.getMemoryById(tweetId);

          if (existingResponse) {
            elizaLogger.info(
              `[TwitterInteraction] Already responded to tweet ${tweet.id}, skipping`,
            );
            continue;
          }

          elizaLogger.info(
            `[TwitterInteraction] New Tweet found: ${tweet.permanentUrl}`,
          );

          const roomId = stringToUuid(
            `${tweet.conversationId}-${this.runtime.agentId}`,
          );
          const userIdUUID = tweet.userId
            ? tweet.userId === profile.id
              ? this.runtime.agentId
              : stringToUuid(tweet.userId)
            : stringToUuid('unknown-user');

          await this.runtime.ensureConnection(
            userIdUUID,
            roomId,
            tweet.username,
            tweet.name,
            'twitter',
          );

          const thread = await this.buildConversationThread(tweet);
          const message = {
            content: { text: tweet.text },
            agentId: this.runtime.agentId,
            userId: userIdUUID,
            roomId,
          };

          await this.handleTweet({
            tweet,
            message,
            thread,
          });

          await this.twitterService.updateLatestCheckedTweetId(
            profile.username,
            BigInt(tweet.id),
          );
        }
      }

      elizaLogger.info(
        '[TwitterInteraction] Finished checking Twitter interactions',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterInteraction] Error handling Twitter interactions:',
        error,
      );
    }
  }

  private async handleTweet({
    tweet,
    message,
    thread,
  }: {
    tweet: Tweet;
    message: Memory;
    thread: Tweet[];
  }): Promise<void> {
    const profile = this.twitterService.getProfile();
    if (!profile || tweet.userId === profile.id) {
      return;
    }

    if (!message.content.text) {
      elizaLogger.info(
        `[TwitterInteraction] Skipping Tweet with no text: ${tweet.id}`,
      );
      return;
    }

    elizaLogger.info(`[TwitterInteraction] Processing Tweet: ${tweet.id}`);

    const formatTweet = (tweet: Tweet) => `ID: ${tweet.id}
From: ${tweet.name} (@${tweet.username})
Text: ${tweet.text}`;

    const currentPost = formatTweet(tweet);
    elizaLogger.debug(`[TwitterInteraction] Thread: ${thread}`);

    const formattedConversation = thread
      .map(
        (tweet) => `@${tweet.username} (${new Date(
          tweet.timestamp * 1000,
        ).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        })}):
      ${tweet.text}`,
      )
      .join('\n\n');

    elizaLogger.debug(
      `[TwitterInteraction] formattedConversation: ${formattedConversation}`,
    );

    let homeTimeline: Tweet[] = [];
    const cachedTimeline = await this.twitterService.getUserTimeline(
      profile.username,
      50,
    );
    if (cachedTimeline.tweets.length > 0) {
      homeTimeline = cachedTimeline.tweets;
    }

    const formattedTimeline = homeTimeline
      .map(
        (tweet) => `ID: ${tweet.id}
From: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? `\nIn reply to: ${tweet.inReplyToStatusId}` : ''}
Text: ${tweet.text}
---`,
      )
      .join('\n');

    let state = await this.runtime.composeState(message, {
      twitterService: this.twitterService,
      twitterUserName: this.runtime.getSetting('TWITTER_USERNAME'),
      currentPost,
      formattedConversation,
      timeline: formattedTimeline,
    });

    const shouldRespondContext = composeContext({
      state,
      template:
        this.runtime.character.templates?.twitterShouldRespondTemplate ||
        this.runtime.character?.templates?.shouldRespondTemplate ||
        twitterShouldRespondTemplate,
    });

    const shouldRespond = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass.SMALL,
    });

    // Handle spam detection from shouldRespond
    if (shouldRespond.startsWith('SPAM')) {
      try {
        const spamJson = shouldRespond.substring(4).trim(); // Remove 'SPAM' prefix
        const spamData = JSON.parse(spamJson);

        elizaLogger.info(
          `[TwitterInteraction] Tweet ${tweet.id} identified as spam`,
          {
            spamScore: spamData.spamScore,
            reasons: spamData.reasons,
            userId: tweet.userId,
            username: tweet.username,
          },
        );

        // Update spam user data in the database
        await tweetQueries.updateSpamUser(
          tweet.userId,
          spamData.spamScore,
          spamData.reasons,
        );

        return; // Exit without responding
      } catch (error) {
        elizaLogger.error(
          '[TwitterInteraction] Error processing spam response:',
          error,
        );
      }
    }

    if (shouldRespond !== 'RESPOND') {
      elizaLogger.info('[TwitterInteraction] Not responding to message');
      return;
    }

    const context = composeContext({
      state,
      template:
        this.runtime.character.templates?.twitterMessageHandlerTemplate ||
        this.runtime.character?.templates?.messageHandlerTemplate ||
        twitterMessageHandlerTemplate,
    });

    elizaLogger.debug(`[TwitterInteraction] Interactions prompt:\n${context}`);

    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass.MEDIUM,
    });

    const removeQuotes = (str: string) => str.replace(/^['"](.*)['"]$/, '$1');
    response.text = removeQuotes(response.text);

    if (response.text) {
      try {
        const responseMessages = await sendTweetAndCreateMemory(
          this.twitterService,
          response,
          message.roomId,
          message.agentId,
          message.userId,
          tweet.id,
        );

        state = (await this.runtime.updateRecentMessageState(state)) as State;

        for (const responseMessage of responseMessages) {
          if (
            responseMessage === responseMessages[responseMessages.length - 1]
          ) {
            responseMessage.content.action = response.action;
          } else {
            responseMessage.content.action = 'CONTINUE';
          }
          await this.runtime.messageManager.createMemory(responseMessage);
        }

        await this.runtime.evaluate(message, state);
        await this.runtime.processActions(message, responseMessages, state);

        await this.twitterService.cacheResponseInfo(
          tweet.id,
          context,
          tweet,
          response.text,
        );
        await wait();
      } catch (error) {
        elizaLogger.error(
          `[TwitterInteraction] Error sending response tweet: ${error}`,
        );
      }
    }
  }

  private async buildConversationThread(
    tweet: Tweet,
    maxReplies = 10,
  ): Promise<Tweet[]> {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    const processThread = async (currentTweet: Tweet, depth = 0) => {
      elizaLogger.info(
        `[TwitterInteraction] Processing tweet: ${currentTweet.id}`,
        {
          id: currentTweet.id,
          inReplyToStatusId: currentTweet.inReplyToStatusId,
          depth: depth,
        },
      );

      if (!currentTweet) {
        elizaLogger.info(
          '[TwitterInteraction] No current tweet found for thread building',
        );
        return;
      }

      if (depth >= maxReplies) {
        elizaLogger.info(
          '[TwitterInteraction] Reached maximum reply depth',
          depth,
        );
        return;
      }

      // Handle memory storage
      const memory = await this.runtime.messageManager.getMemoryById(
        stringToUuid(`${currentTweet.id}-${this.runtime.agentId}`),
      );
      if (!memory) {
        const roomId = stringToUuid(
          `${currentTweet.conversationId}-${this.runtime.agentId}`,
        );
        const userId = stringToUuid(currentTweet.userId);

        await this.runtime.ensureConnection(
          userId,
          roomId,
          currentTweet.username,
          currentTweet.name,
          'twitter',
        );

        await this.runtime.messageManager.createMemory({
          id: stringToUuid(`${currentTweet.id}-${this.runtime.agentId}`),
          agentId: this.runtime.agentId,
          content: {
            text: currentTweet.text,
            source: 'twitter',
            url: currentTweet.permanentUrl,
            inReplyTo: currentTweet.inReplyToStatusId
              ? stringToUuid(
                  `${currentTweet.inReplyToStatusId}-${this.runtime.agentId}`,
                )
              : undefined,
          },
          createdAt: currentTweet.timestamp * 1000,
          roomId,
          userId:
            currentTweet.userId === this.twitterService.getProfile()?.id
              ? this.runtime.agentId
              : stringToUuid(currentTweet.userId),
          embedding: getEmbeddingZeroVector(),
        });
      }

      if (visited.has(currentTweet.id)) {
        elizaLogger.info(
          '[TwitterInteraction] Already visited tweet:',
          currentTweet.id,
        );
        return;
      }

      visited.add(currentTweet.id);
      thread.unshift(currentTweet);

      elizaLogger.debug('[TwitterInteraction] Current thread state:', {
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
          const parentTweet = await this.twitterService.getTweet(
            currentTweet.inReplyToStatusId,
          );

          if (parentTweet) {
            elizaLogger.info('[TwitterInteraction] Found parent tweet:', {
              id: parentTweet.id,
              text: parentTweet.text?.slice(0, 50),
            });
            await processThread(parentTweet, depth + 1);
          } else {
            elizaLogger.info(
              '[TwitterInteraction] No parent tweet found for:',
              currentTweet.inReplyToStatusId,
            );
          }
        } catch (error) {
          elizaLogger.info(
            '[TwitterInteraction] Error fetching parent tweet:',
            {
              tweetId: currentTweet.inReplyToStatusId,
              error,
            },
          );
        }
      } else {
        elizaLogger.info(
          '[TwitterInteraction] Reached end of reply chain at:',
          currentTweet.id,
        );
      }
    };

    await processThread(tweet, 0);

    elizaLogger.debug(
      '[TwitterInteraction] Final thread built:',
      thread.length,
      thread.map((t) => ({
        id: t.id,
        text: t.text?.slice(0, 50),
      })),
    );

    return thread;
  }
}
