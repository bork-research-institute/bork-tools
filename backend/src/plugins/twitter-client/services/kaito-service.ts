import { elizaLogger } from '@elizaos/core';
import axios from 'axios';

export interface YapsResponse {
  user_id: string;
  username: string;
  yaps_all: number;
  yaps_l24h: number;
  yaps_l48h: number;
  yaps_l7d: number;
  yaps_l30d: number;
  yaps_l3m: number;
  yaps_l6m: number;
  yaps_l12m: number;
}

export class KaitoService {
  private readonly baseUrl = 'https://api.kaito.ai/api/v1';
  private readonly rateLimitCalls = 100;
  private readonly rateLimitWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
  private callCount = 0;
  private lastResetTime = Date.now();

  constructor() {
    // Reset call count every rate limit window
    setInterval(() => {
      this.callCount = 0;
      this.lastResetTime = Date.now();
    }, this.rateLimitWindow);
  }

  private async checkRateLimit(): Promise<boolean> {
    if (Date.now() - this.lastResetTime >= this.rateLimitWindow) {
      this.callCount = 0;
      this.lastResetTime = Date.now();
    }

    if (this.callCount >= this.rateLimitCalls) {
      elizaLogger.warn('[KaitoService] Rate limit reached, waiting for reset');
      return false;
    }

    this.callCount++;
    return true;
  }

  public async getYaps(params: {
    userId?: string;
    username?: string;
  }): Promise<YapsResponse | null> {
    try {
      if (!params.userId && !params.username) {
        throw new Error('Either userId or username must be provided');
      }

      if (!(await this.checkRateLimit())) {
        return null;
      }

      const queryParams = new URLSearchParams();
      if (params.userId) {
        queryParams.append('user_id', params.userId);
      }
      if (params.username) {
        queryParams.append('username', params.username);
      }

      const response = await axios.get<YapsResponse>(
        `${this.baseUrl}/yaps?${queryParams.toString()}`,
      );

      elizaLogger.info('[KaitoService] Successfully fetched Yaps data', {
        userId: params.userId,
        username: params.username,
      });

      return response.data;
    } catch (error) {
      elizaLogger.error('[KaitoService] Error fetching Yaps data:', {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
        username: params.username,
      });
      return null;
    }
  }

  public async getYapsForAccounts(
    accounts: Array<{ userId?: string; username: string }>,
  ): Promise<Map<string, YapsResponse>> {
    const results = new Map<string, YapsResponse>();

    for (const account of accounts) {
      try {
        const yaps = await this.getYaps({
          userId: account.userId,
          username: account.username,
        });

        if (yaps) {
          results.set(account.username, yaps);
        }
      } catch (error) {
        elizaLogger.error('[KaitoService] Error fetching Yaps for account:', {
          error: error instanceof Error ? error.message : String(error),
          account,
        });
      }
    }

    return results;
  }
}
