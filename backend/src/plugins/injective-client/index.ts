/**
 * @module injective-client
 * @description Client for interacting with Injective Protocol and performing market analysis
 */

import {
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import { Network } from '@injectivelabs/networks';
import {
  DEFAULT_MARKET_ANALYSIS_CONFIG,
  DEFAULT_MARKET_ANALYSIS_INTERVAL,
  MARKET_ANALYSIS_INTERVALS,
} from '../../config/injective';
import { DatabaseService } from './services/database-service';
import { InjectiveService } from './services/injective-service';
import { MarketAnalysisService } from './services/market-analysis-service';

/**
 * Client for interacting with Injective Protocol
 * Handles market analysis and data storage
 */
export class InjectiveClient implements ClientInstance {
  private readonly runtime: IAgentRuntime;
  private injectiveService: InjectiveService | null = null;
  private marketAnalysisService: MarketAnalysisService | null = null;
  private databaseService: DatabaseService | null = null;
  private analysisInterval: NodeJS.Timer | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  private async runMarketAnalysis(): Promise<void> {
    try {
      elizaLogger.info('[InjectiveClient] Running market analysis');

      const analysis = await this.marketAnalysisService?.analyzeMarketsByConfig(
        DEFAULT_MARKET_ANALYSIS_CONFIG,
      );
      if (analysis) {
        await this.databaseService?.storeMarketAnalysis(analysis);
        elizaLogger.info(
          '[InjectiveClient] Market analysis completed and stored',
        );
      }
    } catch (error) {
      elizaLogger.error('[InjectiveClient] Error in market analysis:', error);
    }
  }

  async start(): Promise<void> {
    elizaLogger.info('[InjectiveClient] Starting Injective client');

    try {
      // Initialize services
      const network = Network.Mainnet;
      this.injectiveService = new InjectiveService(network);
      this.marketAnalysisService = new MarketAnalysisService(network);
      this.databaseService = new DatabaseService(this.runtime);

      // Get analysis interval from config or use default
      const configInterval = Number.parseInt(
        this.runtime.getSetting('MARKET_ANALYSIS_INTERVAL') ||
          DEFAULT_MARKET_ANALYSIS_INTERVAL.toString(),
        10,
      );

      // Validate interval
      const validIntervals = Object.values(MARKET_ANALYSIS_INTERVALS);
      if (
        !validIntervals.includes(
          configInterval as typeof DEFAULT_MARKET_ANALYSIS_INTERVAL,
        )
      ) {
        throw new Error(
          `Invalid analysis interval. Must be one of: ${validIntervals.join(
            ', ',
          )}`,
        );
      }

      // Run initial analysis immediately
      await this.runMarketAnalysis();

      // Schedule periodic market analysis
      this.analysisInterval = setInterval(
        () => this.runMarketAnalysis(),
        configInterval,
      );

      elizaLogger.info(
        '[InjectiveClient] Injective client started successfully',
      );
    } catch (error) {
      elizaLogger.error(
        '[InjectiveClient] Error starting Injective client:',
        error,
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('[InjectiveClient] Stopping Injective client');
    try {
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = null;
      }

      // Clean up services if needed
      this.injectiveService = null;
      this.marketAnalysisService = null;
      this.databaseService = null;

      elizaLogger.info(
        '[InjectiveClient] Injective client stopped successfully',
      );
    } catch (error) {
      elizaLogger.error(
        '[InjectiveClient] Error stopping Injective client:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get the current market analysis service instance
   * @returns The market analysis service instance or null if not initialized
   */
  getMarketAnalysisService(): MarketAnalysisService | null {
    return this.marketAnalysisService;
  }

  /**
   * Get the current injective service instance
   * @returns The injective service instance or null if not initialized
   */
  getInjectiveService(): InjectiveService | null {
    return this.injectiveService;
  }

  /**
   * Get the current database service instance
   * @returns The database service instance or null if not initialized
   */
  getDatabaseService(): DatabaseService | null {
    return this.databaseService;
  }
}

/**
 * Start the Injective client
 * @param runtime The agent runtime instance
 * @returns A promise that resolves to the client instance
 */
export async function startInjectiveClient(
  runtime: IAgentRuntime,
): Promise<ClientInstance> {
  const client = new InjectiveClient(runtime);
  await client.start();
  return client;
}

// Export services and types for external use
export { InjectiveService } from './services/injective-service';
export { MarketAnalysisService } from './services/market-analysis-service';
export { DatabaseService } from './services/database-service';
export * from './types/market-history';
export * from './types/technical-analysis';
