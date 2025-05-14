import type {
  EnrichedToken,
  TokenSnapshot,
} from '@bork/plugins/token-monitor/types/token';
import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type { TokenMetricsHistory, TokenSnapshotRow } from './token-schema';

export const tokenQueries = {
  /**
   * Creates a new token snapshot
   */
  async createSnapshot(
    enrichedToken: EnrichedToken,
    tweetIds?: string[],
  ): Promise<void> {
    try {
      const snapshot: TokenSnapshot = {
        tokenAddress: enrichedToken.tokenAddress,
        timestamp: new Date(),
        name: enrichedToken.metrics.name,
        ticker: enrichedToken.metrics.ticker,
        holderCount: enrichedToken.metrics.holderCount,
        mintAuthority: enrichedToken.metrics.mintAuthority,
        freezeAuthority: enrichedToken.metrics.freezeAuthority,
        isMintable: enrichedToken.metrics.isMintable,
        isFreezable: enrichedToken.metrics.isFreezable,
        supply: enrichedToken.metrics.supply,
        decimals: enrichedToken.metrics.decimals,
        isInvalidToken: enrichedToken.metrics.isInvalidToken,
        liquidityMetrics: enrichedToken.metrics.liquidityMetrics,
        volumeMetrics: enrichedToken.metrics.volumeMetrics,
        marketCap: enrichedToken.metrics.marketCap,
        priceInfo: enrichedToken.metrics.priceInfo,
        description: enrichedToken.description,
        icon: enrichedToken.icon,
        links: enrichedToken.links,
      };

      await db.query(
        `INSERT INTO token_snapshots (
          id,
          token_address,
          timestamp,
          data,
          tweet_ids
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(),
          snapshot.tokenAddress,
          snapshot.timestamp,
          snapshot,
          tweetIds ?? null,
        ],
      );

      // Also store key metrics in the history table for time-series analysis
      await tokenQueries.recordMetricsHistory(enrichedToken);

      elizaLogger.debug(
        `[TokenQueries] Created snapshot for token ${snapshot.tokenAddress}`,
      );
    } catch (error) {
      elizaLogger.error(
        `[TokenQueries] Error creating snapshot for token ${enrichedToken.tokenAddress}:`,
        { error },
      );
      throw error;
    }
  },

  /**
   * Records key metrics in the history table for time-series analysis
   */
  async recordMetricsHistory(enrichedToken: EnrichedToken): Promise<void> {
    try {
      const metrics: TokenMetricsHistory = {
        id: uuidv4(),
        token_address: enrichedToken.tokenAddress,
        timestamp: new Date(),
        holder_count: enrichedToken.metrics.holderCount,
        supply: enrichedToken.metrics.supply,
        market_cap: enrichedToken.metrics.marketCap,
        price: enrichedToken.metrics.priceInfo?.price,
        volume_24h: enrichedToken.metrics.volumeMetrics?.volume24h,
        liquidity: enrichedToken.metrics.liquidityMetrics?.totalLiquidity,
      };

      await db.query(
        `INSERT INTO token_metrics_history (
          id,
          token_address,
          timestamp,
          holder_count,
          supply,
          market_cap,
          price,
          volume_24h,
          liquidity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          metrics.id,
          metrics.token_address,
          metrics.timestamp,
          metrics.holder_count,
          metrics.supply,
          metrics.market_cap,
          metrics.price,
          metrics.volume_24h,
          metrics.liquidity,
        ],
      );
    } catch (error) {
      elizaLogger.error(
        `[TokenQueries] Error recording metrics history for token ${enrichedToken.tokenAddress}:`,
        { error },
      );
      throw error;
    }
  },

  /**
   * Gets the latest snapshot for a token
   */
  async getLatestSnapshot(tokenAddress: string): Promise<TokenSnapshot | null> {
    try {
      const result = await db.query<TokenSnapshotRow>(
        `SELECT * FROM token_snapshots
         WHERE token_address = $1
         ORDER BY timestamp DESC
         LIMIT 1`,
        [tokenAddress],
      );

      return result.rows[0]?.data || null;
    } catch (error) {
      elizaLogger.error(
        `[TokenQueries] Error fetching latest snapshot for token ${tokenAddress}:`,
        { error },
      );
      throw error;
    }
  },

  /**
   * Gets historical snapshots for a token
   */
  async getSnapshots(
    tokenAddress: string,
    limit = 100,
  ): Promise<TokenSnapshot[]> {
    try {
      const result = await db.query<TokenSnapshotRow>(
        `SELECT * FROM token_snapshots
         WHERE token_address = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [tokenAddress, limit],
      );

      return result.rows.map((row) => row.data);
    } catch (error) {
      elizaLogger.error(
        `[TokenQueries] Error fetching snapshots for token ${tokenAddress}:`,
        { error },
      );
      throw error;
    }
  },

  /**
   * Gets historical metrics for a token within a time range
   */
  async getMetricsHistory(
    tokenAddress: string,
    startTime: Date,
    endTime: Date,
  ): Promise<TokenMetricsHistory[]> {
    try {
      const result = await db.query<TokenMetricsHistory>(
        `SELECT * FROM token_metrics_history
         WHERE token_address = $1
         AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp ASC`,
        [tokenAddress, startTime, endTime],
      );

      return result.rows;
    } catch (error) {
      elizaLogger.error(
        `[TokenQueries] Error fetching metrics history for token ${tokenAddress}:`,
        { error },
      );
      throw error;
    }
  },

  /**
   * Gets the latest metrics for multiple tokens
   */
  async getLatestMetrics(
    tokenAddresses: string[],
  ): Promise<TokenMetricsHistory[]> {
    try {
      const result = await db.query<TokenMetricsHistory>(
        `WITH latest_metrics AS (
           SELECT DISTINCT ON (token_address) *
           FROM token_metrics_history
           WHERE token_address = ANY($1)
           ORDER BY token_address, timestamp DESC
         )
         SELECT * FROM latest_metrics`,
        [tokenAddresses],
      );

      return result.rows;
    } catch (error) {
      elizaLogger.error(
        '[TokenQueries] Error fetching latest metrics for tokens:',
        { error, tokenAddresses },
      );
      throw error;
    }
  },
};
