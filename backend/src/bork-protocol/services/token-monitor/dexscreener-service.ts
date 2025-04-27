import type {
  DexScreenerPair,
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

  async getTokenInfo(
    tokenAddress: string,
  ): Promise<{ name: string; symbol: string } | null> {
    try {
      const pairs = await this.makeRequest<DexScreenerPair[]>(
        `/tokens/v1/solana/${tokenAddress}`,
      );

      if (!pairs || pairs.length === 0) {
        return null;
      }

      // Find the pair where our token is either the base or quote token
      const pair = pairs.find(
        (p) =>
          p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase() ||
          p.quoteToken.address.toLowerCase() === tokenAddress.toLowerCase(),
      );

      if (!pair) {
        return null;
      }

      // Return the token info for our token (either base or quote)
      const token =
        pair.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()
          ? pair.baseToken
          : pair.quoteToken;

      return {
        name: token.name,
        symbol: token.symbol,
      };
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);
      return null;
    }
  }
}

// Export a singleton instance
export const dexScreenerService = DexScreenerService.getInstance();
