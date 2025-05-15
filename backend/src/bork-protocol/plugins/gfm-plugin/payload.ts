import { NETWORK } from '@gofundmeme/sdk';
import { GFM_CONFIG } from './config';

export const payload = {
  token: {
    base64: 'BASE64 (Image/Gif)', // Base64 image of token logo
    name: 'MyToken',
    symbol: 'MTK',
    description: 'A community-driven token',
    website: 'https://mytoken.io',
    twitter: 'https://twitter.com/mytoken',
    discord: 'https://discord.gg/mytoken',
    telegram: 'https://t.me/mytoken',
  },
  amountIn: GFM_CONFIG.amountIn,
  network: NETWORK.MAINNET,
  creatorWalletAddress: '',
  supply: GFM_CONFIG.supply,
};
