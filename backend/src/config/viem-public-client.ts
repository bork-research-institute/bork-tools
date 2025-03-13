import { http, createPublicClient } from 'viem';
import { sonic } from 'viem/chains';
import { env } from './env';

export const viemPublicClient = createPublicClient({
  chain: sonic,
  transport: http(env.EVM_PROVIDER_URL!),
});
