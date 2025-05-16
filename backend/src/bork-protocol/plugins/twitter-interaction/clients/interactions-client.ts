import { TwitterService } from '@/services/twitter-service';
import { TWITTER_MENTION_POLL_INTERVAL } from '@bork/plugins/twitter-interaction/config/interaction';
import { twitterMessageHandlerTemplate } from '@bork/templates/interaction';
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
  type UUID,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';
import { SearchMode, type Tweet } from 'agent-twitter-client';

export class InteractionsClient implements Client, ClientInstance {
  name = 'InteractionsClient';
  private interactionLoopTimeout: ReturnType<typeof setInterval> | null = null;
  private isHandlingInteractions = false;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info('[TwitterInteraction] Twitter interactions starting');

    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error('[InteractionsClient] Twitter service not found');
      return;
    }

    this.interactionLoopTimeout = setInterval(async () => {
      try {
        await this.handleTwitterInteractions(runtime, twitterService);
      } catch (err) {
        elizaLogger.error('[TwitterInteraction] Error in interval:', err);
      }
    }, TWITTER_MENTION_POLL_INTERVAL);

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
    if (this.isHandlingInteractions) {
      elizaLogger.info(
        '[TwitterInteraction] Already handling interactions, skipping',
      );
      return;
    }

    this.isHandlingInteractions = true;
    elizaLogger.info('[TwitterInteraction] Checking Twitter interactions');
    const profile = twitterService.getProfile();
    const twitterUsername = profile.username;
    try {
      // Fetch mentions
      const { tweets: mentionCandidates } = await twitterService.searchTweets(
        `@${twitterUsername}`,
        20,
        SearchMode.Latest,
        '[TwitterInteraction]',
      );

      let uniqueTweetCandidates = [...new Set(mentionCandidates)];

      elizaLogger.debug(
        `[TwitterInteraction] Found ${uniqueTweetCandidates.length} unique tweet candidates`,
      );

      uniqueTweetCandidates = uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== profile.userId);

      for (const tweet of uniqueTweetCandidates) {
        // We don't want to respond to tweets with no text
        if (tweet.text.length === 0) {
          continue;
        }
        const roomId = stringToUuid(
          `${tweet.conversationId}-${runtime.agentId}`,
        );
        const existingResponses =
          await runtime.messageManager.getMemoriesByRoomIds({
            roomIds: [roomId],
            // TODO Should be a config?
            limit: 10,
          });
        const sortedResponses = existingResponses.sort(
          (a, b) => b.createdAt - a.createdAt,
        );

        if (
          sortedResponses &&
          sortedResponses.length > 0 &&
          sortedResponses[sortedResponses.length - 1].userId === runtime.agentId
        ) {
          // If there are no responses or the last response is from the agent, we don't need to answer
          continue;
        }

        // We know that the last response is not from the agent
        await runtime.ensureConnection(
          runtime.agentId,
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

        await this.handleTweet(runtime, twitterService, tweet, thread);

        await twitterService.updateLatestCheckedTweetId(
          profile.username,
          BigInt(tweet.id),
        );
      }

      elizaLogger.info(
        '[TwitterInteraction] Finished checking Twitter interactions',
      );
    } catch (error) {
      console.log('error:', error);
      elizaLogger.error(
        '[TwitterInteraction] Error handling Twitter interactions:',
        error,
      );
    } finally {
      this.isHandlingInteractions = false;
    }
  }

  private async handleTweet(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    tweet: Tweet,
    thread: Tweet[],
  ): Promise<void> {
    const profile = twitterService.getProfile();
    elizaLogger.debug(`[TwitterInteraction] Processing Tweet: ${tweet.id}`);

    const currentPost = `ID: ${tweet.id}
      From: ${tweet.name} (@${tweet.username})
      Text: ${tweet.text}`;
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

    // Fetch the saved memory for this tweet
    let message = await runtime.messageManager.getMemoryById(
      stringToUuid(`${tweet.id}-${runtime.agentId}`),
    );
    if (!message) {
      const memory: Memory = {
        id: stringToUuid(`${tweet.id}-${runtime.agentId}`),
        agentId: runtime.agentId,
        userId: stringToUuid(tweet.userId),
        roomId: stringToUuid(`${tweet.conversationId}-${runtime.agentId}`),
        content: {
          text: tweet.text,
          source: 'twitter',
          url: tweet.permanentUrl,
          inReplyTo: tweet.inReplyToStatusId
            ? stringToUuid(`${tweet.inReplyToStatusId}-${runtime.agentId}`)
            : undefined,
        },
      };
      await runtime.messageManager.addEmbeddingToMemory(memory);
      await runtime.messageManager.createMemory(memory);
      message = memory;
    }

    let state = await runtime.composeState(message, {
      currentPost,
      formattedConversation,
      // TODO Timeline doesnt seem to be used
      timeline: formattedTimeline,
    });

    // For now we always respond, we need to validate the should respond template
    // const shouldRespondContext = composeContext({
    //   state,
    //   template: twitterShouldRespondTemplate,
    // });

    // const shouldRespond = await generateShouldRespond({
    //   runtime,
    //   context: shouldRespondContext,
    //   modelClass: ModelClass.SMALL,
    // });

    // elizaLogger.info(`[TwitterInteraction] Should respond: ${shouldRespond}`);

    // // Handle spam detection from shouldRespond
    // if (shouldRespond.startsWith('SPAM')) {
    //   try {
    //     const spamJson = shouldRespond.substring(4).trim(); // Remove 'SPAM' prefix
    //     const spamData = JSON.parse(spamJson);

    //     elizaLogger.debug(
    //       `[TwitterInteraction] Tweet ${tweet.id} identified as spam`,
    //       {
    //         spamScore: spamData.spamScore,
    //         reasons: spamData.reasons,
    //         userId: tweet.userId,
    //         username: tweet.username,
    //       },
    //     );

    //     // Update spam user data in the database
    //     await tweetQueries.updateSpamUser(
    //       tweet.userId,
    //       spamData.spamScore,
    //       spamData.reasons,
    //     );

    //     return; // Exit without responding
    //   } catch (error) {
    //     elizaLogger.error(
    //       '[TwitterInteraction] Error processing spam response:',
    //       error,
    //     );
    //   }
    // }

    // if (shouldRespond !== 'RESPOND') {
    //   elizaLogger.info('[TwitterInteraction] Not responding to message');
    //   return;
    // }

    const context = composeContext({
      state,
      template: twitterMessageHandlerTemplate,
    });

    elizaLogger.debug(`[TwitterInteraction] Interactions prompt:\n${context}`);

    const response = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
    });

    // Remove quotes from the response text and ensure it's within Twitter's character limit
    response.text = response.text.replace(/^['"](.*)['"]$/, '$1');
    const MAX_TWEET_LENGTH = 280; // Twitter's character limit
    if (response.text.length > MAX_TWEET_LENGTH) {
      // Find the last complete sentence within the character limit
      const truncatedText = response.text.substring(0, MAX_TWEET_LENGTH);
      const lastSentenceEnd = Math.max(
        truncatedText.lastIndexOf('. '),
        truncatedText.lastIndexOf('! '),
        truncatedText.lastIndexOf('? '),
        truncatedText.lastIndexOf('.\n'),
        truncatedText.lastIndexOf('!\n'),
        truncatedText.lastIndexOf('?\n'),
      );

      // If we found a sentence end, cut there; otherwise, cut at the last space
      if (lastSentenceEnd > 0) {
        response.text = response.text.substring(0, lastSentenceEnd + 1);
      } else {
        const lastSpace = truncatedText.lastIndexOf(' ');
        response.text = `${response.text.substring(0, lastSpace)}...`;
      }
    }

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

        for (let responseMessage of responseMessages) {
          if (
            responseMessage === responseMessages[responseMessages.length - 1]
          ) {
            responseMessage.content.action = response.action;
          } else {
            responseMessage.content.action = 'CONTINUE';
          }
          // save response to memory
          responseMessage = {
            id: stringToUuid(`${responseMessage}-${runtime.agentId}`),
            ...message,
            userId: runtime.agentId,
            roomId: message.roomId,
            content: response,
            createdAt: Date.now(),
          };
          elizaLogger.info(
            '[TwitterInteraction] Creating memory',
            responseMessage,
          );
          await runtime.messageManager.addEmbeddingToMemory(responseMessage);
          elizaLogger.info('[TwitterInteraction] Adding memory');
          await runtime.messageManager.createMemory(responseMessage);
          elizaLogger.info('[TwitterInteraction] Created memory');
        }

        state = await runtime.updateRecentMessageState(state);

        await runtime.processActions(message, responseMessages, state);
        await runtime.evaluate(message, state);

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
        elizaLogger.warn(
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

        const memory = this.createMemoryFromTweet(runtime, currentTweet);

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

  private createMemoryFromTweet(
    runtime: IAgentRuntime,
    tweet: Tweet,
    userId?: UUID,
  ): Memory {
    const roomId = stringToUuid(`${tweet.conversationId}-${runtime.agentId}`);
    return {
      id: stringToUuid(`${tweet.id}-${runtime.agentId}`),
      agentId: runtime.agentId,
      content: {
        text: tweet.text,
        source: 'twitter',
        url: tweet.permanentUrl,
        inReplyTo: tweet.inReplyToStatusId
          ? stringToUuid(`${tweet.inReplyToStatusId}-${runtime.agentId}`)
          : undefined,
      },
      createdAt: tweet.timestamp * 1000,
      roomId,
      userId: userId ?? stringToUuid(tweet.userId),
    };
  }

  private async handleSingleTweet() {}
}
