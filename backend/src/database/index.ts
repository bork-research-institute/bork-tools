import type { Goal, Memory, UUID } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { PostgresDatabaseAdapter } from '../plugins/adapter-postgres';

export class ExtendedPostgresDatabaseAdapter extends PostgresDatabaseAdapter {
  private isInitialized = false;
  private isClosing = false;
  private static isInitializing = false;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    const postgresUrl = process.env.POSTGRES_URL;
    if (!postgresUrl) {
      throw new Error('POSTGRES_URL environment variable is required');
    }
    super({
      connectionString: postgresUrl,
      parseInputs: true,
      maxRetries: ExtendedPostgresDatabaseAdapter.MAX_RETRIES,
      retryDelay: ExtendedPostgresDatabaseAdapter.RETRY_DELAY,
    });

    // Set up process signal handlers
    process.on('SIGINT', () => {
      this.close().catch((error) => {
        elizaLogger.error('Error during SIGINT shutdown:', error);
      });
    });

    process.on('SIGTERM', () => {
      this.close().catch((error) => {
        elizaLogger.error('Error during SIGTERM shutdown:', error);
      });
    });

    process.on('uncaughtException', (error) => {
      elizaLogger.error('Uncaught exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      elizaLogger.error('Unhandled rejection at', promise, 'reason:', reason);
      this.close().catch((closeError) => {
        elizaLogger.error('Error during rejection shutdown:', closeError);
      });
    });
  }

  async init() {
    if (this.isInitialized) {
      return;
    }

    if (ExtendedPostgresDatabaseAdapter.isInitializing) {
      return;
    }

    ExtendedPostgresDatabaseAdapter.isInitializing = true;

    try {
      await super.init();
      this.isInitialized = true;
      elizaLogger.success('Database connection initialized successfully');
    } catch (error) {
      elizaLogger.error('Database initialization failed:', error);
      throw error;
    } finally {
      ExtendedPostgresDatabaseAdapter.isInitializing = false;
    }
  }

  async close() {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;

    try {
      await super.close();
      this.isInitialized = false;
      elizaLogger.success('Database connection closed successfully');
    } catch (error) {
      elizaLogger.error('Error closing database connection:', error);
      throw error;
    } finally {
      this.isClosing = false;
    }
  }

  async createMemory(memory: Memory, tableName: string): Promise<void> {
    try {
      await super.createMemory(memory, tableName);
    } catch (error) {
      elizaLogger.error('Error creating memory:', error);
      throw error;
    }
  }

  async getGoals(params: {
    roomId: UUID;
    userId?: UUID | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<Goal[]> {
    try {
      return await super.getGoals(params);
    } catch (error) {
      elizaLogger.error('Error getting goals:', error);
      return [];
    }
  }

  async getMemories(params: {
    roomId: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    agentId?: UUID;
    start?: number;
    end?: number;
  }): Promise<Memory[]> {
    const startDate = params.start
      ? new Date(params.start).toISOString()
      : undefined;

    const endDate = params.end ? new Date(params.end).toISOString() : undefined;

    return super.getMemories({
      ...params,
      start: startDate ? new Date(startDate).getTime() : undefined,
      end: endDate ? new Date(endDate).getTime() : undefined,
    });
  }

  async getMemoriesByIds(ids: UUID[], tableName: string): Promise<Memory[]> {
    try {
      const result = await this.query(
        `SELECT * FROM ${tableName} WHERE id = ANY($1) ORDER BY created_at DESC`,
        [ids],
      );
      return result.rows;
    } catch (error) {
      elizaLogger.error('Error getting memories by IDs:', error);
      return [];
    }
  }
}

// Create a singleton instance
const instance = new ExtendedPostgresDatabaseAdapter();
export default instance;
