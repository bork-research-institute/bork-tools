import { elizaLogger } from '@elizaos/core';
import { startAgents } from './eliza';

startAgents().catch((error) => {
  elizaLogger.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
