import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type { DatabaseTokenLaunch, TokenLaunch } from './token-launch-schema';

export const tokenLaunchQueries = {
  async insertTokenLaunch(
    userId: string,
    tokenName: string,
    tokenSymbol: string,
    tokenDescription: string,
    tokenImage: string,
    mintAddress: string,
    transactionId: string,
    campaignUrl: string,
    metadata: {
      website?: string;
      twitter?: string;
      discord?: string;
      telegram?: string;
    } = {},
  ): Promise<TokenLaunch> {
    try {
      const pool = await db;
      const result = await pool.query<DatabaseTokenLaunch>(
        'INSERT INTO token_launches (id, user_id, token_name, token_symbol, token_description, token_image, mint_address, transaction_id, campaign_url, status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [
          uuidv4(),
          userId,
          tokenName,
          tokenSymbol,
          tokenDescription,
          tokenImage,
          mintAddress,
          transactionId,
          campaignUrl,
          'success',
          JSON.stringify(metadata),
        ],
      );

      const launch = result.rows[0];
      return mapDatabaseToTokenLaunch(launch);
    } catch (error) {
      elizaLogger.error('[TokenLaunchQueries] Error inserting token launch:', {
        error,
        userId,
        tokenName,
        tokenSymbol,
      });
      throw error;
    }
  },

  async updateTokenLaunchStatus(
    id: string,
    status: 'pending' | 'success' | 'failed',
    error?: string,
  ): Promise<TokenLaunch> {
    try {
      const pool = await db;
      const result = await pool.query<DatabaseTokenLaunch>(
        'UPDATE token_launches SET status = $1, error = $2 WHERE id = $3 RETURNING *',
        [status, error, id],
      );

      const launch = result.rows[0];
      return mapDatabaseToTokenLaunch(launch);
    } catch (error) {
      elizaLogger.error(
        '[TokenLaunchQueries] Error updating token launch status:',
        {
          error,
          id,
          status,
        },
      );
      throw error;
    }
  },

  async getTokenLaunchById(id: string): Promise<TokenLaunch | null> {
    try {
      const pool = await db;
      const result = await pool.query<DatabaseTokenLaunch>(
        'SELECT * FROM token_launches WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapDatabaseToTokenLaunch(result.rows[0]);
    } catch (error) {
      elizaLogger.error(
        '[TokenLaunchQueries] Error getting token launch by id:',
        {
          error,
          id,
        },
      );
      throw error;
    }
  },

  async getTokenLaunchByMintAddress(
    mintAddress: string,
  ): Promise<TokenLaunch | null> {
    try {
      const pool = await db;
      const result = await pool.query<DatabaseTokenLaunch>(
        'SELECT * FROM token_launches WHERE mint_address = $1',
        [mintAddress],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapDatabaseToTokenLaunch(result.rows[0]);
    } catch (error) {
      elizaLogger.error(
        '[TokenLaunchQueries] Error getting token launch by mint address:',
        {
          error,
          mintAddress,
        },
      );
      throw error;
    }
  },

  async getUserTokenLaunches(
    userId: string,
    limit = 10,
    offset = 0,
  ): Promise<TokenLaunch[]> {
    try {
      const pool = await db;
      const result = await pool.query<DatabaseTokenLaunch>(
        'SELECT * FROM token_launches WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset],
      );

      return result.rows.map(mapDatabaseToTokenLaunch);
    } catch (error) {
      elizaLogger.error(
        '[TokenLaunchQueries] Error getting user token launches:',
        {
          error,
          userId,
        },
      );
      throw error;
    }
  },
};

function mapDatabaseToTokenLaunch(db: DatabaseTokenLaunch): TokenLaunch {
  return {
    id: db.id,
    createdAt: db.created_at,
    userId: db.user_id,
    tokenName: db.token_name,
    tokenSymbol: db.token_symbol,
    tokenDescription: db.token_description,
    tokenImage: db.token_image,
    mintAddress: db.mint_address,
    transactionId: db.transaction_id,
    campaignUrl: db.campaign_url,
    status: db.status,
    error: db.error,
    metadata: db.metadata,
  };
}
