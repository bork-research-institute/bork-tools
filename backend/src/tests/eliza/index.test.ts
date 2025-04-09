import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresDatabaseAdapter } from '@/plugins/adapter-postgres';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import { ApiClient } from '../../api/api';
import { initializeDbCache } from '../../cache/initialize-db-cache';
import { getTokenForProvider } from '../../config';
import { getEnv } from '../../config/env';
import {
  type TestResult,
  testCharacter,
  testConfig,
} from '../config/test-config';
import { startTestTwitterClient } from '../config/test-twitter-client';

describe('Eliza Agent', () => {
  let db: PostgresDatabaseAdapter;
  let runtime: AgentRuntime;
  let isShuttingDown = false;
  let directClient: ApiClient | undefined;

  const cleanup = async () => {
    elizaLogger.info('Running cleanup...');

    if (isShuttingDown) {
      elizaLogger.info('Already cleaning up, skipping...');
      return;
    }

    isShuttingDown = true;

    try {
      // First stop the API client to prevent new requests
      if (directClient?.app?.server) {
        elizaLogger.info('Stopping API client...');
        await directClient.app.stop();
        directClient = undefined;
      }

      // Then stop the runtime which might have pending operations
      if (runtime) {
        elizaLogger.info('Stopping runtime...');
        await runtime.stop();
        runtime = undefined;
      }

      // Wait a short time for any in-flight DB operations to complete
      elizaLogger.info('Waiting for pending operations to complete...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Finally close the database
      if (db) {
        elizaLogger.info('Closing database connection...');
        try {
          // Close the database connection which will properly end the pool
          await db.close();
          db = undefined;
          elizaLogger.info('Database connection closed successfully');
        } catch (dbError) {
          elizaLogger.error('Error closing database:', {
            error: dbError instanceof Error ? dbError.message : dbError,
          });
        }
      }

      elizaLogger.info('Cleanup completed successfully');
    } catch (error) {
      elizaLogger.error('Error during cleanup:', {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
      });
    } finally {
      isShuttingDown = false;
    }
  };

  beforeAll(async () => {
    // Validate environment variables
    const env = getEnv();
    elizaLogger.info('[Test] Environment validated successfully');

    // Setup test database adapter
    try {
      db = new PostgresDatabaseAdapter({
        connectionString: env.POSTGRES_URL,
        parseInputs: true,
      });

      // Initialize database
      await db.init();

      // Setup cleanup handlers
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      elizaLogger.error('Error in test setup:', { error });
      await cleanup();
      throw error;
    }
  });

  afterAll(async () => {
    await cleanup();
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);
  });

  async function startTestAgent() {
    directClient = new ApiClient();

    // Start the API server
    await directClient.app.listen(0); // Use port 0 for random available port
    elizaLogger.info('Started API server on port:', {
      port: directClient.app.server.port,
    });

    const token = getTokenForProvider(
      testCharacter.modelProvider,
      testCharacter,
    );
    if (!token) {
      throw new Error(
        `No token found for provider ${testCharacter.modelProvider}`,
      );
    }

    const cache = initializeDbCache(testCharacter, db);
    runtime = new AgentRuntime({
      databaseAdapter: db,
      token,
      modelProvider: testCharacter.modelProvider,
      evaluators: [],
      character: testCharacter,
      plugins: [],
      providers: [],
      actions: [],
      services: [],
      managers: [],
      cacheManager: cache,
    });

    await runtime.initialize();

    // Initialize test Twitter client
    const twitterClient = await startTestTwitterClient(runtime);
    runtime.clients = [twitterClient];

    directClient.registerAgent(runtime);

    return { runtime, directClient };
  }

  it('should start agent with direct client, run tests, and handle shutdown', async () => {
    try {
      const result = await startTestAgent();
      runtime = result.runtime;
      directClient = result.directClient;

      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(AgentRuntime);

      // Run enabled tests from config
      const testResults = new Map<string, TestResult>();

      for (const test of testConfig) {
        if (!test.enabled) {
          elizaLogger.info(`[Test] Skipping disabled test: ${test.name}`);
          continue;
        }

        elizaLogger.info(`[Test] Running test: ${test.name}`);
        try {
          const data = await test.testFn(runtime);
          testResults.set(test.name, { success: true, data });
          elizaLogger.info(`[Test] Successfully completed: ${test.name}`);
        } catch (error) {
          elizaLogger.error(`[Test] Failed: ${test.name}`, { error });
          testResults.set(test.name, {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      // Verify all enabled tests ran successfully
      for (const [testName, result] of testResults) {
        expect(result.success, `Test "${testName}" should succeed`).toBe(true);
        if (!result.success) {
          elizaLogger.error(`Test "${testName}" failed:`, {
            error: result.error,
          });
        }
      }
    } catch (error) {
      elizaLogger.error('Error in agent test:', { error });
      throw error;
    }
  });
});
