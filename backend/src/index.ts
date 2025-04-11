import { elizaLogger } from '@elizaos/core';
import { getEnv } from './config/env';
import { startAgents } from './eliza';

getEnv();

startAgents().catch((error) => {
  elizaLogger.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
