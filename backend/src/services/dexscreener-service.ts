import axios from 'axios';
import { backOff } from 'exponential-backoff';

interface TokenLink {
  type?: string;
  label?: string;
  url: string; // URI
}

interface Website {
  url: string;
}

interface Social {
  platform: string;
  handle: string;
}

interface TokenInfo {
  imageUrl?: string;
  websites?: Website[];
  socials?: Social[];
}

interface Token {
  address: string;
  name: string;
  symbol: string;
}

interface Liquidity {
  usd: number;
  base: number;
  quote: number;
}

interface TransactionData {
  buys: number;
  sells: number;
}

interface TokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: Token;
  quoteToken: Token;
  priceNative: string;
  priceUsd: string;
  txns: { [key: string]: TransactionData };
  volume: { [key: string]: number };
  priceChange: { [key: string]: number };
  liquidity: Liquidity;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: TokenInfo;
  boosts?: {
    active: number;
  };
}

interface TokenProfile {
  url: string; // URI
  chainId: string;
  tokenAddress: string;
  icon?: string; // URI
  header?: string; // URI
  description?: string;
  links?: TokenLink[];
}

interface ExtendedTokenProfile extends TokenProfile {
  amount: number;
  totalAmount: number;
}

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

  async getTokenPairs(
    chainId: string,
    tokenAddresses: string[],
  ): Promise<TokenPair[]> {
    if (tokenAddresses.length > 30) {
      throw new Error('Maximum of 30 token addresses allowed');
    }

    const addresses = tokenAddresses.join(',');
    return this.makeRequest<TokenPair[]>(`/tokens/v1/${chainId}/${addresses}`);
  }

  // TODO Add method to get pools for a token to fetch more data
  // /token-pairs/v1/{chainId}/{tokenAddress}
}

// Export a singleton instance
export const dexScreenerService = DexScreenerService.getInstance();
