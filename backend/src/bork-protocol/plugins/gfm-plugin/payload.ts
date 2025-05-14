import { NETWORK } from '@gofundmeme/sdk';

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
  amountIn: 0, // Initial SOL to seed the pool
  network: NETWORK.MAINNET,
  creatorWalletAddress: '',
  supply: 1_000_000_000, // Total supply
};
