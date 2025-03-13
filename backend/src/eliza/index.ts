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
import evmPlugin from '@elizaos/plugin-evm';
import { initializeDbCache } from '../cache/initialize-db-cache';
import { startChat } from '../chat';
import { initializeClients } from '../clients';
import { configureApiRoutes } from '../config/api-routes';
import {
  getTokenForProvider,
  loadCharacters,
  parseArguments,
} from '../config/index';
import { PostgresDatabaseAdapter } from '../plugins/adapter-postgres';
import { ApiClient } from './api';
import { character } from './character';

let postgresAdapter: PostgresDatabaseAdapter;

async function initializeDatabase() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  elizaLogger.info('Initializing PostgreSQL connection...');
  postgresAdapter = new PostgresDatabaseAdapter({
    connectionString: process.env.POSTGRES_URL,
    parseInputs: true,
  });

  // Test the connection
  await postgresAdapter.init();
  elizaLogger.success('Successfully connected to PostgreSQL database');
  return postgresAdapter;
}

export function createAgent(
  character: Character,
  db: IDatabaseAdapter & IDatabaseCacheAdapter,
  cache: ICacheManager,
  token: string,
) {
  // Use type assertion to handle plugin version mismatch
  const plugins = [evmPlugin as unknown as Plugin];

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

async function startAgent(character: Character, directClient: ApiClient) {
  let db: (IDatabaseAdapter & IDatabaseCacheAdapter) | undefined;
  try {
    elizaLogger.info(`Starting agent for character: ${character.name}`);
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);
    if (!token) {
      elizaLogger.error(
        `No token found for provider ${character.modelProvider}`,
      );
      throw new Error(`No token found for provider ${character.modelProvider}`);
    }
    db = await initializeDatabase();
    const cache = initializeDbCache(character, db);

    const runtime = createAgent(character, db, cache, token);

    await runtime.initialize();
    runtime.clients = await initializeClients(character, runtime);

    directClient.registerAgent(runtime);

    return runtime;
  } catch (error) {
    elizaLogger.error(
      `Error starting agent for character ${character.name}:`,
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
  elizaLogger.info('Starting agents initialization');
  const directClient = new ApiClient();
  configureApiRoutes(directClient.app);
  const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
  const args = parseArguments();

  const charactersArg = args.characters || args.character;
  let characters = [character];

  if (charactersArg) {
    characters = await loadCharacters(charactersArg);
  }

  try {
    for (const character of characters) {
      await startAgent(character, directClient as ApiClient);
    }
  } catch (error) {
    elizaLogger.error('Error starting agents:', error);
    throw error;
  }

  // upload some agent functionality into directClient
  directClient.startAgent = async (character: Character) => {
    return startAgent(character, directClient);
  };

  directClient.start(serverPort);
  elizaLogger.info(`Server started successfully on port ${serverPort}`);

  const isDaemonProcess = process.env.DAEMON_PROCESS === 'true';
  if (!isDaemonProcess) {
    elizaLogger.info("Chat started. Type 'exit' to quit.");
    const chat = startChat(characters);
    chat();
  }

  // Handle graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    elizaLogger.info('Shutdown handler triggered');
    elizaLogger.debug('Stack trace:', new Error().stack);

    if (isShuttingDown) {
      elizaLogger.info('Already shutting down, skipping...');
      return;
    }

    isShuttingDown = true;
    elizaLogger.info('Starting graceful shutdown...');

    try {
      // Close any running servers first
      if (directClient.server) {
        elizaLogger.info('Closing server...');
        // @ts-ignore - Elysia's server type doesn't include close method, but it exists at runtime
        await directClient.server.close();
        elizaLogger.info('Server closed successfully');
      }

      // Then close database connection
      if (postgresAdapter) {
        elizaLogger.info('Closing database connection...');
        await postgresAdapter.close();
        elizaLogger.info('Database connection closed successfully');
      }

      process.exit(0);
    } catch (error) {
      elizaLogger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals - remove any existing handlers first
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
