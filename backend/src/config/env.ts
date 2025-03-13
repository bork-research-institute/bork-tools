import path from 'node:path';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'VAULT_FACTORY_ADDRESS',
  'EVM_PRIVATE_KEY',
  'SONIC_RPC_URL',
  'SONIC_STAKING_ADDRESS',
  'EVM_PROVIDER_URL',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  VAULT_FACTORY_ADDRESS: process.env.VAULT_FACTORY_ADDRESS as `0x${string}`,
  EVM_PRIVATE_KEY: process.env.EVM_PRIVATE_KEY as `0x${string}`,
  SONIC_RPC_URL: process.env.SONIC_RPC_URL,
  SONIC_STAKING_ADDRESS: process.env.SONIC_STAKING_ADDRESS as `0x${string}`,
  EVM_PROVIDER_URL: process.env.EVM_PROVIDER_URL,
} as const;
