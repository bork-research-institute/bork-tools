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
  MARKET_ANALYSIS_INTERVALS,
} from '../../config/injective';
import { DatabaseService } from './services/database-service';
import { InjectiveService } from './services/injective-service';
import { MarketAnalysisService } from './services/market-analysis-service';
import { TimeResolution } from './types/market-history';

const RETRY_DELAY_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Define the timeframes we want to analyze
const ANALYSIS_TIMEFRAMES = {
  FIVE_MINUTES: {
    resolution: TimeResolution.FiveMinutes,
    interval: MARKET_ANALYSIS_INTERVALS.FIVE_MINUTES,
    countback: 12, // 1 hour worth of 5-min data
  },
  HOUR: {
    resolution: TimeResolution.Hour,
    interval: MARKET_ANALYSIS_INTERVALS.HOUR,
    countback: 24, // 24 hours worth of hourly data
  },
} as const;

/**
 * Client for interacting with Injective Protocol
 * Handles market analysis and data storage
 */
export class InjectiveClient implements ClientInstance {
  private readonly runtime: IAgentRuntime;
  private injectiveService: InjectiveService | null = null;
  private marketAnalysisService: MarketAnalysisService | null = null;
  private databaseService: DatabaseService | null = null;
  private analysisIntervals: { [key: string]: NodeJS.Timer } = {};
  private isAnalyzing: { [key: string]: boolean } = {};
  private retryTimeouts: { [key: string]: NodeJS.Timeout } = {};

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  private scheduleRetry(timeframe: keyof typeof ANALYSIS_TIMEFRAMES): void {
    // Clear any existing retry timeout
    if (this.retryTimeouts[timeframe]) {
      clearTimeout(this.retryTimeouts[timeframe]);
    }

    // Schedule retry in 15 minutes
    this.retryTimeouts[timeframe] = setTimeout(() => {
      elizaLogger.info(
        `[InjectiveClient] Retrying analysis for timeframe ${timeframe} after delay`,
      );
      this.runMarketAnalysis(timeframe).catch((error) => {
        elizaLogger.error(
          `[InjectiveClient] Retry attempt failed for timeframe ${timeframe}:`,
          error,
        );
      });
    }, RETRY_DELAY_MS);
  }

  private async runMarketAnalysis(
    timeframe: keyof typeof ANALYSIS_TIMEFRAMES,
  ): Promise<void> {
    // Skip if already analyzing this timeframe
    if (this.isAnalyzing[timeframe]) {
      elizaLogger.warn(
        `[InjectiveClient] Analysis for timeframe ${timeframe} already in progress, skipping`,
      );
      return;
    }

    this.isAnalyzing[timeframe] = true;

    try {
      const timeframeConfig = ANALYSIS_TIMEFRAMES[timeframe];
      elizaLogger.info(
        `[InjectiveClient] Running market analysis for timeframe ${timeframeConfig.resolution}`,
      );

      const config = {
        ...DEFAULT_MARKET_ANALYSIS_CONFIG,
        resolution: timeframeConfig.resolution,
        countback: timeframeConfig.countback,
      };

      const analysis =
        await this.marketAnalysisService?.analyzeMarketsByConfig(config);
      if (analysis) {
        await this.databaseService?.storeMarketAnalysis(analysis);
        elizaLogger.info(
          `[InjectiveClient] Market analysis completed and stored for timeframe ${timeframeConfig.resolution}`,
        );
      }

      // Clear any retry timeout on successful completion
      if (this.retryTimeouts[timeframe]) {
        clearTimeout(this.retryTimeouts[timeframe]);
        delete this.retryTimeouts[timeframe];
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          elizaLogger.warn(
            `[InjectiveClient] Timeout during market analysis for timeframe ${timeframe}, scheduling retry in 15 minutes`,
          );
          this.scheduleRetry(timeframe);
        } else {
          elizaLogger.error(
            `[InjectiveClient] Error in market analysis for timeframe ${timeframe}: ${error.message}`,
          );
          this.scheduleRetry(timeframe);
        }
      } else {
        elizaLogger.error(
          `[InjectiveClient] Unknown error in market analysis for timeframe ${timeframe}:`,
          error,
        );
        this.scheduleRetry(timeframe);
      }
    } finally {
      this.isAnalyzing[timeframe] = false;
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

      // Initialize analysis flags
      for (const timeframe of Object.keys(ANALYSIS_TIMEFRAMES)) {
        this.isAnalyzing[timeframe] = false;
      }

      // Run initial analysis for each timeframe with delay between them
      for (const [timeframe] of Object.entries(ANALYSIS_TIMEFRAMES)) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay between initial analyses
        await this.runMarketAnalysis(
          timeframe as keyof typeof ANALYSIS_TIMEFRAMES,
        ).catch((error) => {
          elizaLogger.error(
            `[InjectiveClient] Initial analysis failed for timeframe ${timeframe}:`,
            error,
          );
        });
      }

      // Schedule periodic market analysis for each timeframe with offset
      let index = 0;
      for (const [timeframe, config] of Object.entries(ANALYSIS_TIMEFRAMES)) {
        // Add offset to prevent all analyses running at the same time
        const offsetMs = index * 30000; // 30 second offset between timeframes
        setTimeout(() => {
          this.analysisIntervals[timeframe] = setInterval(
            () =>
              this.runMarketAnalysis(
                timeframe as keyof typeof ANALYSIS_TIMEFRAMES,
              ).catch((error) => {
                elizaLogger.error(
                  `[InjectiveClient] Scheduled analysis failed for timeframe ${timeframe}:`,
                  error,
                );
              }),
            config.interval,
          );
        }, offsetMs);
        index++;
      }

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
      // Clear all analysis intervals and timeouts
      for (const interval of Object.values(this.analysisIntervals)) {
        clearInterval(interval);
      }
      for (const timeout of Object.values(this.retryTimeouts)) {
        clearTimeout(timeout);
      }
      this.analysisIntervals = {};
      this.retryTimeouts = {};
      this.isAnalyzing = {};

      // Clean up services
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
