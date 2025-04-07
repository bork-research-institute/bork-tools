import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { PostgresDatabaseAdapter } from '@/plugins/adapter-postgres';
import {
  AgentRuntime,
  type Character,
  ModelProviderName,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';
import { ApiClient } from '../../api/api';
import { initializeDbCache } from '../../cache/initialize-db-cache';
import { getTokenForProvider } from '../../config';
import { getEnv } from '../../config/env';
import { testGetRelatedTopics } from '../clients/get-related-topics.test';

describe('Eliza Agent', () => {
  let db: PostgresDatabaseAdapter;
  let runtime: AgentRuntime;
  let isShuttingDown = false;

  const cleanup = async () => {
    elizaLogger.info('Running cleanup...');

    if (isShuttingDown) {
      elizaLogger.info('Already cleaning up, skipping...');
      return;
    }

    isShuttingDown = true;

    // Stop the runtime first
    if (runtime) {
      try {
        await runtime.stop();
        runtime = null;
      } catch (error) {
        elizaLogger.error('Error stopping runtime:', { error });
      }
    }

    // Then close the database
    if (db) {
      try {
        await db.close();
        db = null;
      } catch (error) {
        elizaLogger.error('Error closing database:', { error });
      }
    }

    isShuttingDown = false;
  };

  beforeAll(async () => {
    // Setup test database adapter
    try {
      db = new PostgresDatabaseAdapter({
        connectionString: getEnv().POSTGRES_URL,
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
    const directClient = new ApiClient();

    // Test character configuration
    const testCharacter: Character = {
      id: stringToUuid('test-agent'),
      name: 'Test Agent',
      username: 'test-agent',
      modelProvider: ModelProviderName.OPENAI,
      system: 'You are a test agent.',
      plugins: [],
      settings: {
        secrets: {},
      },
      bio: ['Test agent for unit testing'],
      lore: ['Created for testing Eliza agent functionality'],
      messageExamples: [],
      postExamples: [],
      adjectives: ['helpful', 'precise'],
      topics: ['testing', 'agents'],
      style: {
        all: ['be concise', 'be helpful'],
        chat: ['respond clearly'],
        post: ['write clearly'],
      },
    };

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
    directClient.registerAgent(runtime);

    return { runtime, directClient };
  }

  it('should start agent with direct client, run tests, and handle shutdown', async () => {
    let directClient: ApiClient | undefined;
    try {
      const result = await startTestAgent();
      runtime = result.runtime;
      directClient = result.directClient;

      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(AgentRuntime);

      // Run topic selection test
      const topicResults = await testGetRelatedTopics(runtime);
      expect(topicResults.topicWeights).toBeDefined();
      expect(topicResults.analysis).toBeDefined();
      expect(topicResults.selectedTopic).toBeDefined();
    } catch (error) {
      elizaLogger.error('Error in agent test:', { error });
      throw error;
    } finally {
      elizaLogger.info('Running test cleanup...');

      // First stop the API client
      if (directClient) {
        try {
          await directClient.app.stop();
          directClient = null;
        } catch (cleanupError) {
          elizaLogger.error('Error stopping directClient during cleanup:', {
            error: cleanupError,
          });
        }
      }

      // Then run the full cleanup
      await cleanup();
    }
  });
});
