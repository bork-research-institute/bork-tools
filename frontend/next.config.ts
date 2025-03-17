import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'assets.coingecko.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // For server-side rendering, alias 'lru-cache' to ensure compatibility.
    if (isServer) {
      config.resolve.alias['lru-cache'] = require.resolve('lru-cache');
    }
    return config;
  },
};

export default nextConfig;
