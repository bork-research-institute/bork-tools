import {
  type AgentRuntime,
  type Content,
  type HandlerCallback,
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
import { startTweetReviewEngine } from '../../bork-extensions/src/index';
import type { ClientBase } from './base';
import { buildConversationThread, sendTweet, wait } from './lib/utils';
import {
  twitterMessageHandlerTemplate,
  twitterShouldRespondTemplate,
} from './templates/interaction.js';

export class TwitterInteractionClient {
  client: ClientBase;
  runtime: IAgentRuntime;
  private interactionLoopTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(client: ClientBase, runtime: IAgentRuntime) {
    this.client = client;
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[Twitter Client] Twitter interactions starting');

    // Check if client and profile are properly initialized
    if (!this.client || !this.client.profile) {
      elizaLogger.error('[Twitter Client] Client or profile not initialized');
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
    void startTweetReviewEngine(this.runtime as AgentRuntime);
  }

  async stop(): Promise<void> {
    if (this.interactionLoopTimeout) {
      clearTimeout(this.interactionLoopTimeout);
      this.interactionLoopTimeout = null;
    }
  }

  async handleTwitterInteractions(): Promise<void> {
    elizaLogger.info('[Twitter Client] Checking Twitter interactions');

    // Check if client and profile are properly initialized
    if (!this.client?.profile?.username) {
      elizaLogger.error(
        '[Twitter Client] Twitter profile not properly initialized',
      );
      return;
    }

    const twitterUsername = this.client.profile.username;
    try {
      // Fetch mentions
      const mentionCandidates = (
        await this.client.fetchSearchTweets(
          `@${twitterUsername}`,
          20,
          SearchMode.Latest,
        )
      ).tweets;

      elizaLogger.info(
        'mentionCandidates:',
        mentionCandidates,
        `for user @${twitterUsername}`,
      );

      let uniqueTweetCandidates = [...new Set(mentionCandidates)];

      // Process target users if configured
      const TARGET_USERS = this.client.twitterConfig.TWITTER_TARGET_USERS;
      if (TARGET_USERS.length > 0) {
        elizaLogger.info(
          '[Twitter Client] Processing target users:',
          TARGET_USERS,
        );

        // Create a map to store tweets by user
        const tweetsByUser = new Map<string, Tweet[]>();

        // Fetch tweets from all target users
        for (const username of TARGET_USERS) {
          try {
            const userTweets = (
              await this.client.fetchSearchTweets(
                `from:${username}`,
                3,
                SearchMode.Latest,
              )
            ).tweets;

            // Filter for unprocessed, non-reply, recent tweets
            const validTweets = userTweets.filter((tweet) => {
              const isUnprocessed =
                !this.client.lastCheckedTweetId ||
                BigInt(tweet.id) > this.client.lastCheckedTweetId;
              const isRecent =
                Date.now() - tweet.timestamp * 1000 < 2 * 60 * 60 * 1000; // 2 hours

              elizaLogger.info(`[Twitter Client] Tweet ${tweet.id} checks:`, {
                isUnprocessed,
                isRecent,
                isReply: tweet.isReply,
                isRetweet: tweet.isRetweet,
              });

              return (
                isUnprocessed && !tweet.isReply && !tweet.isRetweet && isRecent
              );
            });

            if (validTweets.length > 0) {
              tweetsByUser.set(username, validTweets);
              elizaLogger.info(
                `[Twitter Client] Found ${validTweets.length} valid tweets from ${username}`,
              );
            }
          } catch (error) {
            elizaLogger.error(
              `[Twitter Client] Error fetching tweets for ${username}:`,
              error,
            );
          }
        }

        // Select one tweet from each user that has tweets
        const selectedTweets: Tweet[] = [];
        for (const [username, tweets] of tweetsByUser) {
          if (tweets.length > 0) {
            // Randomly select one tweet from this user
            const randomTweet =
              tweets[Math.floor(Math.random() * tweets.length)];
            selectedTweets.push(randomTweet);
            elizaLogger.info(
              `[Twitter Client] Selected tweet from ${username}: ${randomTweet.text?.substring(0, 100)}`,
            );
          }
        }

        // Add selected tweets to candidates
        uniqueTweetCandidates = [...uniqueTweetCandidates, ...selectedTweets];
      }

      uniqueTweetCandidates = uniqueTweetCandidates
        .sort((a, b) => a.id.localeCompare(b.id))
        .filter((tweet) => tweet.userId !== this.client.profile.id);

      for (const tweet of uniqueTweetCandidates) {
        if (
          !this.client.lastCheckedTweetId ||
          BigInt(tweet.id) > this.client.lastCheckedTweetId
        ) {
          const tweetId = stringToUuid(`${tweet.id}-${this.runtime.agentId}`);
          const existingResponse =
            await this.runtime.messageManager.getMemoryById(tweetId);

          if (existingResponse) {
            elizaLogger.info(
              `[Twitter Client] Already responded to tweet ${tweet.id}, skipping`,
            );
            continue;
          }

          elizaLogger.info(
            `[Twitter Client] New Tweet found: ${tweet.permanentUrl}`,
          );

          const roomId = stringToUuid(
            `${tweet.conversationId}-${this.runtime.agentId}`,
          );
          const userIdUUID = tweet.userId
            ? tweet.userId === this.client.profile.id
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

          const thread = await buildConversationThread(tweet, this.client);
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

          this.client.lastCheckedTweetId = BigInt(tweet.id);
        }
      }

      await this.client.cacheLatestCheckedTweetId();
      elizaLogger.info(
        '[Twitter Client] Finished checking Twitter interactions',
      );
    } catch (error) {
      elizaLogger.error(
        '[Twitter Client] Error handling Twitter interactions:',
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
    if (tweet.userId === this.client.profile.id) {
      return;
    }

    if (!message.content.text) {
      elizaLogger.info(
        `[Twitter Client] Skipping Tweet with no text: ${tweet.id}`,
      );
      return;
    }

    elizaLogger.info(`[Twitter Client] Processing Tweet: ${tweet.id}`);
    const formatTweet = (tweet: Tweet) => `ID: ${tweet.id}
From: ${tweet.name} (@${tweet.username})
Text: ${tweet.text}`;

    const currentPost = formatTweet(tweet);
    elizaLogger.debug(`[Twitter Client] Thread: ${thread}`);

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
      `[Twitter Client] formattedConversation: ${formattedConversation}`,
    );

    let homeTimeline: Tweet[] = [];
    const cachedTimeline = await this.client.getCachedTimeline();
    if (cachedTimeline) {
      homeTimeline = cachedTimeline;
    } else {
      homeTimeline = await this.client.fetchHomeTimeline(50);
      await this.client.cacheTimeline(homeTimeline);
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
      twitterClient: this.client.twitterClient,
      twitterUserName: this.runtime.getSetting('TWITTER_USERNAME'),
      currentPost,
      formattedConversation,
      timeline: formattedTimeline,
    });

    const tweetId = stringToUuid(`${tweet.id}-${this.runtime.agentId}`);
    const tweetExists =
      await this.runtime.messageManager.getMemoryById(tweetId);

    if (!tweetExists) {
      elizaLogger.info(
        `[Twitter Client] Tweet ${tweet.id} does not exist, saving`,
      );
      const userIdUUID = stringToUuid(tweet.userId as string);
      const roomId = stringToUuid(
        `${tweet.conversationId}-${this.runtime.agentId}`,
      );

      const message = {
        id: stringToUuid(`${tweet.id}-${this.runtime.agentId}`),
        agentId: this.runtime.agentId,
        content: {
          text: tweet.text,
          url: tweet.permanentUrl,
          inReplyTo: tweet.inReplyToStatusId
            ? stringToUuid(`${tweet.inReplyToStatusId}-${this.runtime.agentId}`)
            : undefined,
        },
        userId: userIdUUID,
        roomId,
        createdAt: tweet.timestamp * 1000,
      };
      await this.client.saveRequestMessage(message, state);
    }

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
      modelClass: ModelClass.MEDIUM,
    });

    if (shouldRespond !== 'RESPOND') {
      elizaLogger.info('[Twitter Client] Not responding to message');
      return;
    }

    const context = composeContext({
      state,
      template:
        this.runtime.character.templates?.twitterMessageHandlerTemplate ||
        this.runtime.character?.templates?.messageHandlerTemplate ||
        twitterMessageHandlerTemplate,
    });

    elizaLogger.debug(`[Twitter Client] Interactions prompt:\n${context}`);

    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass.MEDIUM,
    });

    const removeQuotes = (str: string) => str.replace(/^['"](.*)['"]$/, '$1');
    const stringId = stringToUuid(`${tweet.id}-${this.runtime.agentId}`);
    response.inReplyTo = stringId;
    response.text = removeQuotes(response.text);

    if (response.text) {
      try {
        const callback: HandlerCallback = async (response: Content) => {
          const memories = await sendTweet(
            this.client,
            response,
            message.roomId,
            this.runtime.getSetting('TWITTER_USERNAME'),
            tweet.id,
          );
          return memories;
        };

        const responseMessages = await callback(response);
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

        const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;
        await this.runtime.cacheManager.set(
          `twitter/tweet_generation_${tweet.id}.txt`,
          responseInfo,
        );
        await wait();
      } catch (error) {
        elizaLogger.error(
          `[Twitter Client] Error sending response tweet: ${error}`,
        );
      }
    }
  }

  async buildConversationThread(
    tweet: Tweet,
    maxReplies = 10,
  ): Promise<Tweet[]> {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentTweet: Tweet, depth = 0) {
      elizaLogger.info(
        `[Twitter Client] Processing tweet: ${currentTweet.id}`,
        {
          id: currentTweet.id,
          inReplyToStatusId: currentTweet.inReplyToStatusId,
          depth: depth,
        },
      );

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

        this.runtime.messageManager.createMemory({
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
            currentTweet.userId === this.twitterUserId
              ? this.runtime.agentId
              : stringToUuid(currentTweet.userId),
          embedding: getEmbeddingZeroVector(),
        });
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
          const parentTweet = await this.twitterClient.getTweet(
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

    // Need to bind this context for the inner function
    await processThread.bind(this)(tweet, 0);

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
}
