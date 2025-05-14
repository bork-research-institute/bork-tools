import { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import { TwitterService } from '@/services/twitter-service';
import { tweetQueries } from '@bork/db/queries';
import {
  twitterMessageHandlerTemplate,
  twitterShouldRespondTemplate,
} from '@bork/templates/interaction';
import {
  sendTweetAndCreateMemory,
  wait,
} from '@bork/utils/active-tweeting/tweet';
import {
  type Client,
  type ClientInstance,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  generateShouldRespond,
  stringToUuid,
} from '@elizaos/core';
import { SearchMode, type Tweet } from 'agent-twitter-client';

export class InteractionsClient implements Client, ClientInstance {
  name = 'InteractionsClient';
  private interactionLoopTimeout: ReturnType<typeof setInterval> | null = null;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info('[TwitterInteraction] Twitter interactions starting');

    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[InteractionsClient] Twitter service not found');
      return;
    }

    // TODO maybe should move this to a generic service vs. twitter discover config service
    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryService] Twitter config service not found',
      );
      return;
    }

    this.interactionLoopTimeout = setInterval(
      () => this.handleTwitterInteractions(runtime, twitterService),
      configService.getCharacterConfig().twitterPollInterval,
    );

    return this;
  }

  async stop(): Promise<void> {
    if (this.interactionLoopTimeout) {
      clearTimeout(this.interactionLoopTimeout);
      this.interactionLoopTimeout = null;
    }
  }

  async handleTwitterInteractions(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
  ): Promise<void> {
    elizaLogger.info('[TwitterInteraction] Checking Twitter interactions');
    const profile = twitterService.getProfile();
    const twitterUsername = profile.username;
    try {
      // Fetch mentions
      const { tweets: mentionCandidates, spammedTweets } =
        await twitterService.searchTweets(
          `@${twitterUsername}`,
          20,
          SearchMode.Latest,
          '[TwitterInteraction]',
        );
      elizaLogger.debug(
        `[TwitterInteraction] Found ${mentionCandidates.length} mention candidates for ${twitterUsername} (filtered ${spammedTweets} spam tweets)`,
      );

      let uniqueTweetCandidates = [...new Set(mentionCandidates)];

      uniqueTweetCandidates = uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== profile.userId);

      const lastCheckedId = await twitterService.getLatestCheckedTweetId(
        profile.username,
      );
      for (const tweet of uniqueTweetCandidates) {
        if (!lastCheckedId || BigInt(tweet.id) > lastCheckedId) {
          const tweetId = stringToUuid(`${tweet.id}-${runtime.agentId}`);
          const existingResponse =
            await runtime.messageManager.getMemoryById(tweetId);

          if (existingResponse) {
            elizaLogger.debug(
              `[TwitterInteraction] Already responded to tweet ${tweet.id}, skipping`,
            );
            continue;
          }

          elizaLogger.debug(
            `[TwitterInteraction] New Tweet found: ${tweet.permanentUrl}`,
          );

          const roomId = stringToUuid(
            `${tweet.conversationId}-${runtime.agentId}`,
          );
          const userIdUUID = tweet.userId
            ? tweet.userId === profile.userId
              ? runtime.agentId
              : stringToUuid(tweet.userId)
            : stringToUuid('unknown-user');

          await runtime.ensureConnection(
            userIdUUID,
            roomId,
            tweet.username,
            tweet.name,
            'twitter',
          );

          const thread = await this.buildConversationThread(
            runtime,
            twitterService,
            tweet,
          );
          const message = {
            content: { text: tweet.text },
            agentId: runtime.agentId,
            userId: userIdUUID,
            roomId,
          };

          await this.handleTweet(
            runtime,
            twitterService,
            tweet,
            message,
            thread,
          );

          await twitterService.updateLatestCheckedTweetId(
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

  private async handleTweet(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    tweet: Tweet,
    message: Memory,
    thread: Tweet[],
  ): Promise<void> {
    const profile = twitterService.getProfile();
    if (!profile || tweet.userId === profile.userId) {
      return;
    }

    if (!message.content.text) {
      elizaLogger.debug(
        `[TwitterInteraction] Skipping Tweet with no text: ${tweet.id}`,
      );
      return;
    }

    elizaLogger.debug(`[TwitterInteraction] Processing Tweet: ${tweet.id}`);

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
    const cachedTimeline = await twitterService.getUserTimeline(
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

    let state = await runtime.composeState(message, {
      twitterService,
      twitterUserName: runtime.getSetting('TWITTER_USERNAME'),
      currentPost,
      formattedConversation,
      timeline: formattedTimeline,
    });

    const shouldRespondContext = composeContext({
      state,
      template:
        runtime.character.templates?.twitterShouldRespondTemplate ||
        runtime.character?.templates?.shouldRespondTemplate ||
        twitterShouldRespondTemplate,
    });

    const shouldRespond = await generateShouldRespond({
      runtime,
      context: shouldRespondContext,
      modelClass: ModelClass.SMALL,
    });

    // Handle spam detection from shouldRespond
    if (shouldRespond.startsWith('SPAM')) {
      try {
        const spamJson = shouldRespond.substring(4).trim(); // Remove 'SPAM' prefix
        const spamData = JSON.parse(spamJson);

        elizaLogger.debug(
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
        runtime.character.templates?.twitterMessageHandlerTemplate ||
        runtime.character?.templates?.messageHandlerTemplate ||
        twitterMessageHandlerTemplate,
    });

    elizaLogger.debug(`[TwitterInteraction] Interactions prompt:\n${context}`);

    const response = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.MEDIUM,
    });

    const removeQuotes = (str: string) => str.replace(/^['"](.*)['"]$/, '$1');
    response.text = removeQuotes(response.text);

    if (response.text) {
      try {
        const responseMessages = await sendTweetAndCreateMemory(
          twitterService,
          response,
          message.roomId,
          message.agentId,
          message.userId,
          tweet.id,
        );

        state = (await runtime.updateRecentMessageState(state)) as State;

        for (const responseMessage of responseMessages) {
          if (
            responseMessage === responseMessages[responseMessages.length - 1]
          ) {
            responseMessage.content.action = response.action;
          } else {
            responseMessage.content.action = 'CONTINUE';
          }
          await runtime.messageManager.createMemory(responseMessage);
        }

        await runtime.evaluate(message, state);
        await runtime.processActions(message, responseMessages, state);

        await twitterService.cacheResponseInfo(
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
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    tweet: Tweet,
    maxReplies = 10,
  ): Promise<Tweet[]> {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    const processThread = async (currentTweet: Tweet, depth = 0) => {
      elizaLogger.debug(
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
        elizaLogger.debug(
          '[TwitterInteraction] Reached maximum reply depth',
          depth,
        );
        return;
      }

      // Handle memory storage
      const memory = await runtime.messageManager.getMemoryById(
        stringToUuid(`${currentTweet.id}-${runtime.agentId}`),
      );
      if (!memory) {
        const roomId = stringToUuid(
          `${currentTweet.conversationId}-${runtime.agentId}`,
        );
        const userId = stringToUuid(currentTweet.userId);

        await runtime.ensureConnection(
          userId,
          roomId,
          currentTweet.username,
          currentTweet.name,
          'twitter',
        );

        const memory: Memory = {
          id: stringToUuid(`${currentTweet.id}-${runtime.agentId}`),
          agentId: runtime.agentId,
          content: {
            text: currentTweet.text,
            source: 'twitter',
            url: currentTweet.permanentUrl,
            inReplyTo: currentTweet.inReplyToStatusId
              ? stringToUuid(
                  `${currentTweet.inReplyToStatusId}-${runtime.agentId}`,
                )
              : undefined,
          },
          createdAt: currentTweet.timestamp * 1000,
          roomId,
          userId:
            currentTweet.userId === twitterService.getProfile()?.userId
              ? runtime.agentId
              : stringToUuid(currentTweet.userId),
        };

        // Generate embedding before creating memory
        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);
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
        elizaLogger.debug(
          'Fetching parent tweet:',
          currentTweet.inReplyToStatusId,
        );
        try {
          const parentTweet = await twitterService.getTweet(
            currentTweet.inReplyToStatusId,
          );

          if (parentTweet) {
            elizaLogger.debug('[TwitterInteraction] Found parent tweet:', {
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
          elizaLogger.error(
            '[TwitterInteraction] Error fetching parent tweet:',
            {
              tweetId: currentTweet.inReplyToStatusId,
              error,
            },
          );
        }
      } else {
        elizaLogger.debug(
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
