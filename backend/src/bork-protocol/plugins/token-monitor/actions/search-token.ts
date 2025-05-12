import { dexScreenerService } from '@/bork-protocol/plugins/token-monitor/services/dexscreener-service';
import { TokenMonitorService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-service';
import { searchTokenTemplate } from '@/bork-protocol/plugins/token-monitor/types/search-token-template';
import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { z } from 'zod';

export const searchToken: Action = {
  name: 'SEARCH_TOKEN',
  description: 'Search for a token',
  similes: ['SEARCH_TOKENS', 'SEARCH_TOKEN_FOR_ADDRESS', 'SEARCH_TOKEN_FOR_CA'],
  validate: async (runtime: IAgentRuntime) => {
    const tokenMonitorService = runtime.services.get(
      TokenMonitorService.serviceType,
    ) as TokenMonitorService;
    if (!tokenMonitorService) {
      elizaLogger.error('[SearchTokenAction] Token monitor service not found');
      return false;
    }
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    const tokenMonitorService = runtime.services.get(
      TokenMonitorService.serviceType,
    ) as TokenMonitorService;

    let currentState: State;
    if (state) {
      currentState = await runtime.updateRecentMessageState(state);
    } else {
      currentState = (await runtime.composeState(message)) as State;
    }

    const searchTokenContext = composeContext({
      state: currentState,
      template: searchTokenTemplate,
      templatingEngine: 'handlebars',
    });

    const content = await generateObject({
      runtime,
      context: searchTokenContext,
      modelClass: ModelClass.LARGE,
      schema: z.string(),
    });

    const tokenAddress = content.object as string;

    const tokens =
      await dexScreenerService.getTokenPairsAsProfiles(tokenAddress);
    for (const token of tokens) {
      const enrichedToken = await tokenMonitorService.enrichToken(token);
      await tokenMonitorService.searchTokenTweets(enrichedToken.tokenAddress);
    }

    if (callback) {
      callback({
        text: 'TODO',
      });
    }

    return true;
  },
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Check my balance of Safe',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll help you check your balance of Safe",
          action: 'GET_BALANCE',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Show my balance',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll help you check Safe balance...",
          action: 'GET_BALANCE',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Check my wallet balance on Safe',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll help you check your wallet balance on Safe",
          action: 'GET_BALANCE',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'What is my balance?',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll help you check your balance...",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
