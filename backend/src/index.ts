import { elizaLogger } from '@elizaos/core';
import './config/env'; // Load environment variables
import { startAgents } from './eliza';

startAgents().catch((error) => {
  elizaLogger.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
