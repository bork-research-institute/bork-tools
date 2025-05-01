import {
  AgentRuntime,
  type Character,
  type ICacheManager,
  type IDatabaseAdapter,
  type IDatabaseCacheAdapter,
  elizaLogger,
  settings,
  stringToUuid,
} from '@elizaos/core';
import { PostgresDatabaseAdapter } from 'src/bork-protocol/plugins/adapter-postgres';
import { initializeClients } from 'src/eliza/clients';
import { ApiClient } from '../api/api';
import { configureApiRoutes } from '../config/api-routes';
import { getEnv } from '../config/env';
import {
  getTokenForProvider,
  loadCharacters,
  parseArguments,
} from '../config/index';
import { character } from './character';
import { initializeDbCache } from './db-cache';

export function createAgent(
  character: Character,
  db: IDatabaseAdapter & IDatabaseCacheAdapter,
  cache: ICacheManager,
  token: string,
) {
  // Use type assertion to handle plugin version mismatch
  const plugins = [];

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins,
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
  });
}

async function startAgent(
  character: Character,
  directClient: ApiClient,
  db: IDatabaseAdapter & IDatabaseCacheAdapter,
) {
  try {
    elizaLogger.info(
      `[Initialize] Starting agent for character: ${character.name}`,
    );
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);
    if (!token) {
      elizaLogger.error(
        `[Initialize]No token found for provider ${character.modelProvider}`,
      );
      throw new Error(`No token found for provider ${character.modelProvider}`);
    }
    elizaLogger.info('[Initialize] Initializing database cache');
    const cache = initializeDbCache(character, db);
    const runtime = createAgent(character, db, cache, token);
    await runtime.initialize();
    runtime.clients = await initializeClients(character, runtime);
    directClient.registerAgent(runtime);

    return runtime;
  } catch (error) {
    elizaLogger.error(
      `[Initialize]Error starting agent for character ${character.name}:`,
      error,
    );
    if (db) {
      elizaLogger.info('Closing database connection due to error');
      await db.close();
    }
    throw error;
  }
}

export const startAgents = async () => {
  console.log('Starting agents initialization');
  elizaLogger.info('[Initialize] Starting agents initialization');
  const directClient = new ApiClient();
  configureApiRoutes(directClient.app);
  const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
  const args = parseArguments();

  const charactersArg = args.characters || args.character;
  let characters = [character];

  if (charactersArg) {
    characters = await loadCharacters(charactersArg);
  }
  elizaLogger.info('[Initialize] Loading database adapter');
  let db: (IDatabaseAdapter & IDatabaseCacheAdapter) | undefined;
  try {
    db = new PostgresDatabaseAdapter({
      connectionString: getEnv().POSTGRES_URL,
      parseInputs: true,
    });

    // Test the connection
    await db.init();
  } catch (error) {
    elizaLogger.error('[Initialize] Error initializing database:', error);
    throw error;
  }

  elizaLogger.info('[Initialize] Starting agents');
  try {
    for (const character of characters) {
      await startAgent(character, directClient as ApiClient, db);
    }
  } catch (error) {
    elizaLogger.error('[Initialize] Error starting agents:', error);
    throw error;
  }

  // upload some agent functionality into directClient
  directClient.startAgent = async (character: Character) => {
    return startAgent(character, directClient, db);
  };
  directClient.start(serverPort);

  // Handle graceful shutdown
  let isShuttingDown = false;

  const shutdown = async () => {
    elizaLogger.info('Shutdown handler triggered');

    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      elizaLogger.info('Already shutting down, skipping...');
      return;
    }

    isShuttingDown = true;
    elizaLogger.info('Starting graceful shutdown...');

    // For debugging purposes, print a stack trace to see what triggered shutdown
    console.trace('Shutdown stack trace');

    // Just exit the process immediately - don't try to close connections
    // This avoids all the pool closing errors at the cost of not closing connections cleanly
    process.exit(0);
  };

  // Handle different shutdown signals - remove any existing handlers first
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
