import { elizaLogger } from '@elizaos/core';
import { Pool } from 'pg';
import { getEnv } from '../../config/env';
import { knowledgeQueries } from './knowledge';
import * as queries from './queries';
import * as schema from './schema';

/**
 * A singleton database pool manager that ensures we only have
 * one database pool instance and proper cleanup
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null;
  private isClosing: boolean;
  private closePromise: Promise<void> | null;
  private closeResolver: (() => void) | null;

  private constructor() {
    this.pool = null;
    this.isClosing = false;
    this.closePromise = null;
    this.closeResolver = null;
    this.initPool();
    this.setupShutdownHandlers();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize the database pool
   */
  private initPool(): void {
    if (!this.pool && !this.isClosing) {
      const env = getEnv();

      this.pool = new Pool({
        connectionString: env.POSTGRES_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        elizaLogger.error('[DatabaseManager] Unexpected pool error:', err);
      });

      elizaLogger.info('[DatabaseManager] Database pool initialized');
    }
  }

  /**
   * Set up shutdown handlers
   */
  private setupShutdownHandlers(): void {
    // Use a single handler for all shutdown signals
    const shutdownHandler = () => {
      this.cleanup().catch((err) => {
        elizaLogger.error(
          '[DatabaseManager] Unhandled error during pool cleanup:',
          err,
        );
      });
    };

    // Setup handler on these signals just once
    process.once('SIGINT', shutdownHandler);
    process.once('SIGTERM', shutdownHandler);
    process.once('beforeExit', shutdownHandler);
  }

  /**
   * Get the database pool
   */
  public getPool(): Pool {
    if (!this.pool) {
      this.initPool();
    }

    if (!this.pool) {
      throw new Error('Failed to initialize database pool');
    }

    return this.pool;
  }

  /**
   * Clean up the database pool
   */
  public async cleanup(): Promise<void> {
    // If already closing, return the existing promise
    if (this.isClosing && this.closePromise) {
      return this.closePromise;
    }

    // If pool doesn't exist, just resolve
    if (!this.pool) {
      return Promise.resolve();
    }

    // Set up the closing state
    this.isClosing = true;
    this.closePromise = new Promise<void>((resolve) => {
      this.closeResolver = resolve;
    });

    // Try to end the pool
    try {
      elizaLogger.info('[DatabaseManager] Closing database pool...');

      // Add a timeout just in case
      const timeoutId = setTimeout(() => {
        elizaLogger.error(
          '[DatabaseManager] Pool end timeout - forcing cleanup',
        );
        this.pool = null;
        if (this.closeResolver) {
          this.closeResolver();
        }
      }, 3000);

      // Attempt to end the pool
      await this.pool.end();

      // Clear the timeout
      clearTimeout(timeoutId);

      // Clean up
      elizaLogger.info('[DatabaseManager] Database pool closed successfully');
      this.pool = null;

      // Resolve the promise
      if (this.closeResolver) {
        this.closeResolver();
      }
    } catch (error) {
      elizaLogger.error(
        '[DatabaseManager] Error closing database pool:',
        error,
      );

      // Clean up anyway
      this.pool = null;

      // Resolve the promise even if it failed
      if (this.closeResolver) {
        this.closeResolver();
      }
    }

    return this.closePromise;
  }
}

// Create the database manager instance
const dbManager = DatabaseManager.getInstance();

// Export the database pool through the manager
export const db = dbManager.getPool();
export const cleanupPool = () => dbManager.cleanup();

// Export schemas and queries
export { schema, queries, knowledgeQueries };
