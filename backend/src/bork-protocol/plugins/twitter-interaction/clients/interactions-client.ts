import { messageHandlerTemplate } from '@/eliza/base-templates';
import { TwitterService } from '@/services/twitter-service';
import { TWITTER_MENTION_POLL_INTERVAL } from '@bork/plugins/twitter-interaction/config/interaction';
import { wait } from '@bork/utils/active-tweeting/tweet';
import {
  type Client,
  type ClientInstance,
  type Content,
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
      elizaLogger.debug(
        '[TwitterInteraction] Checking Twitter interactions:',
        twitterUsername,
      );
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
        // We exclude tweets from the agent
        .filter((tweet) => tweet.userId !== profile.userId)
        // We exclude tweets with no text
        .filter((tweet) => tweet.text.length > 0);

      elizaLogger.debug(
        '[TwitterInteraction] filtered uniqueTweetCandidates:',
        uniqueTweetCandidates.length,
      );

      for (const tweet of uniqueTweetCandidates) {
        const roomId = stringToUuid(`${tweet.userId}-${runtime.agentId}`);

        await runtime.ensureConnection(
          runtime.agentId,
          roomId,
          tweet.username,
          tweet.name,
          'twitter',
        );
        elizaLogger.debug('[TwitterInteraction] roomId:', roomId);
        const existingResponsesRaw = await runtime.messageManager.getMemories({
          roomId,
          unique: true,
          // TODO Should be a config?
          count: 10,
        });
        // This is a hack, the return of getMemories is an object with numeric keys, we need to convert it to an array
        const existingResponses = this.objectToArray<Memory>(
          existingResponsesRaw,
        ) as Memory[];
        const sortedResponses = (existingResponses as Memory[]).sort(
          (a, b) => (a.createdAt as number) - (b.createdAt as number),
        );

        if (
          sortedResponses &&
          sortedResponses.length > 0 &&
          sortedResponses[sortedResponses.length - 1].userId === runtime.agentId
        ) {
          elizaLogger.debug(
            '[TwitterInteraction] skipping tweet because it has responses:',
            tweet.id,
          );
          // If there are no responses or the last response is from the agent, we don't need to answer
          continue;
        }

        // TODO: For now we don't build thread, we simply reply to tweets to the agent
        // const thread = await this.buildConversationThread(
        //   runtime,
        //   twitterService,
        //   tweet,
        // );

        await this.handleTweet(runtime, twitterService, tweet, roomId);

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
    roomId: UUID,
  ): Promise<void> {
    elizaLogger.debug(`[TwitterInteraction] Processing Tweet: ${tweet.id}`);

    const userId = stringToUuid(tweet.userId);
    const id = stringToUuid(`${tweet.id}-${userId}`);
    const currentPost = `ID: ${tweet.id}
      From: ${tweet.name} (@${tweet.username})
      Text: ${tweet.text}`;

    elizaLogger.debug(
      `[TwitterInteraction] checking to reply to: ${currentPost}`,
    );
    // Fetch the saved memory for this tweet
    let message = await runtime.messageManager.getMemoryById(id);
    // If the message is not found, its a new conversation
    if (!message) {
      const memory = this.createMemoryFromTweet(
        runtime,
        tweet,
        id,
        roomId,
        userId,
      );
      await runtime.messageManager.addEmbeddingToMemory(memory);
      await runtime.messageManager.createMemory(memory);
      message = memory;
    }

    let state = await runtime.composeState(message);
    // TODO: Right now we always respond, we need to validate the should respond template
    // const shouldRespondContext = composeContext({
    //   state,
    //   template: twitterMessageHandlerTemplate,
    // });

    // const shouldRespond = await generateShouldRespond({
    //   runtime,
    //   context: shouldRespondContext,
    //   modelClass: ModelClass.SMALL,
    // });

    // if (shouldRespond !== 'RESPOND') {
    //   elizaLogger.debug(
    //     `[TwitterInteraction] Not responding to message: ${shouldRespond}`,
    //   );
    //   return;
    // }

    // TODO: We should use a different template for the response
    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });

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
        const responseMessages = await this.sendTweetAndCreateMemory(
          runtime,
          twitterService,
          response,
          stringToUuid(`${tweet.id}-${runtime.agentId}`),
          roomId,
          runtime.agentId,
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
          await runtime.messageManager.addEmbeddingToMemory(responseMessage);
          elizaLogger.debug('[TwitterInteraction] Adding memory');
          await runtime.messageManager.createMemory(responseMessage);
          elizaLogger.debug('[TwitterInteraction] Created memory');
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

  private createMemoryFromTweet(
    runtime: IAgentRuntime,
    tweet: Tweet,
    id: UUID,
    roomId: UUID,
    userId: UUID,
  ): Memory {
    return {
      id,
      agentId: runtime.agentId,
      userId,
      roomId,
      content: {
        text: tweet.text,
        source: 'twitter',
        url: tweet.permanentUrl,
        inReplyTo: tweet.inReplyToStatusId
          ? stringToUuid(tweet.inReplyToStatusId)
          : undefined,
      },
      createdAt: tweet.timestamp * 1000,
    };
  }

  private async sendTweetAndCreateMemory(
    runtime: IAgentRuntime,
    twitterService: TwitterService,
    response: Content,
    id: UUID,
    roomId: UUID,
    userId: UUID,
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
        id,
        agentId: runtime.agentId,
        content: {
          text: tweet.text,
          source: 'twitter',
          url: tweet.permanentUrl,
          inReplyTo: inReplyToId ? stringToUuid(inReplyToId) : undefined,
        },
        createdAt: tweet.timestamp * 1000,
        roomId,
        userId,
      };
      memories.push(memory);
    } catch (error) {
      elizaLogger.error('[Twitter Client] Error sending tweet:', error);
    }

    return memories;
  }

  // Helper to convert object with numeric keys to array
  private objectToArray<T>(obj: unknown): T[] {
    if (Array.isArray(obj)) {
      return obj;
    }
    if (obj && typeof obj === 'object') {
      // Only convert if all keys are numeric
      const keys = Object.keys(obj);
      if (keys.every((k) => !Number.isNaN(Number(k)))) {
        return keys
          .map(Number)
          .sort((a, b) => a - b)
          .map((k) => (obj as Record<string, T>)[k]);
      }
    }
    return [];
  }
}
