import { twitterService } from '@/services/twitter-service';
import createAndPostThread from '@bork/plugins/x-thread-plugin/action';
import type { Plugin } from '@elizaos/core';

export const xThreadPlugin: Plugin = {
  name: 'xThread',
  description: 'On-demand thread generation and publication plugin',
  actions: [createAndPostThread],
  services: [twitterService],
};

export default xThreadPlugin;
