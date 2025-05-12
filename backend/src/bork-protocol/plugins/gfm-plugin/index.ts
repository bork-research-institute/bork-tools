import type { Plugin } from '@elizaos/core';
import launchToken from './action';
import { walletProvider } from './provider';

export const gfmPlugin: Plugin = {
  name: 'gfm',
  description: 'GoFundMeme token launcher plugin',
  actions: [launchToken],
  evaluators: [],
  providers: [walletProvider],
};

export default gfmPlugin;
