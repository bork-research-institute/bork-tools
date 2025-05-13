import type { Plugin } from '@elizaos/core';
import createAndPostThread from './action';

export const xThreadPlugin: Plugin = {
  name: 'xThread',
  description: 'On-demand thread generation and publication plugin',
  actions: [createAndPostThread],
  evaluators: [],
  providers: [],
};

export default xThreadPlugin;
