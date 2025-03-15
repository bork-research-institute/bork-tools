import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { db } from '../../bork-extensions/src/db';
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
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (market_id) DO UPDATE SET
            ticker = EXCLUDED.ticker,
            technical_analysis = EXCLUDED.technical_analysis,
            order_book = EXCLUDED.order_book,
            liquidity = EXCLUDED.liquidity,
            created_at = EXCLUDED.created_at`,
          [
            analysis.marketId,
            analysis.ticker,
            JSON.stringify(analysis.technicalAnalysis),
            JSON.stringify(analysis.orderBook),
            JSON.stringify(analysis.liquidity),
            new Date().toISOString(),
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
