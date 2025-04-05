import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { db } from '../../../extensions/src/db';
import type { MarketAnalysis } from '../types/technical-analysis';

export class DatabaseService {
  private readonly runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async storeMarketAnalysis(analyses: MarketAnalysis[]): Promise<void> {
    try {
      elizaLogger.info('[DatabaseService] Storing market analysis data');

      // Store each market analysis in the database
      for (const analysis of analyses) {
        await db.query(
          `INSERT INTO market_analysis (
            market_id,
            ticker,
            technical_analysis,
            order_book,
            liquidity,
            created_at,
            timeframe
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            analysis.marketId,
            analysis.ticker,
            JSON.stringify(analysis.technicalAnalysis),
            JSON.stringify(analysis.orderBook),
            JSON.stringify(analysis.liquidity),
            new Date().toISOString(),
            analysis.timeframe,
          ],
        );
      }

      elizaLogger.info(
        '[DatabaseService] Market analysis data stored successfully',
      );
    } catch (error) {
      elizaLogger.error(
        '[DatabaseService] Error storing market analysis:',
        error,
      );
      throw error;
    }
  }
}
