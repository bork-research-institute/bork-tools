import type {
  ExtendedTokenProfile,
  TokenProfile,
} from '@/types/token-monitor/token';
import axios from 'axios';
import { backOff } from 'exponential-backoff';

export class DexScreenerService {
  private static instance: DexScreenerService;
  private readonly basePath = 'https://api.dexscreener.com';

  private constructor() {}

  public static getInstance(): DexScreenerService {
    if (!DexScreenerService.instance) {
      DexScreenerService.instance = new DexScreenerService();
    }
    return DexScreenerService.instance;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await backOff(() =>
        axios.get<T>(`${this.basePath}${endpoint}`, {
          headers: {
            Accept: 'application/json',
          },
        }),
      );

      if (!response.data) {
        throw new Error('No data received from DexScreener API');
      }

      // The response is directly the array
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.error || error.message;
        throw new Error(
          `DexScreener API error (${statusCode}): ${errorMessage}`,
        );
      }
      throw error;
    }
  }

  async getLatestTokenProfiles(): Promise<TokenProfile[]> {
    return this.makeRequest<TokenProfile[]>('/token-profiles/latest/v1');
  }

  async getLatestTokenBoosts(): Promise<ExtendedTokenProfile[]> {
    return this.makeRequest<ExtendedTokenProfile[]>('/token-boosts/latest/v1');
  }

  async getTopTokenBoosts(): Promise<ExtendedTokenProfile[]> {
    return this.makeRequest<ExtendedTokenProfile[]>('/token-boosts/top/v1');
  }

  // TODO Add method to get pools for a token to fetch more data
  // /token-pairs/v1/{chainId}/{tokenAddress}
}

// Export a singleton instance
export const dexScreenerService = DexScreenerService.getInstance();
