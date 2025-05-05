import type {
  JupiterPriceResponse,
  TokenPriceDetails,
} from '@/types/token-monitor/token';
import { elizaLogger } from '@elizaos/core';
import axios, { type AxiosError } from 'axios';

export class MarketDataService {
  private static instance: MarketDataService;
  private readonly jupiterBaseUrl = 'https://api.jup.ag/price/v2';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  private constructor() {}

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      const delay = this.retryDelay * (this.maxRetries - retries + 1);
      elizaLogger.warn(
        `Retrying operation after ${delay}ms. Retries left: ${retries - 1}`,
      );

      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
      return this.retryWithBackoff(operation, retries - 1);
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<TokenPriceDetails | null> {
    try {
      const response = await this.retryWithBackoff(async () => {
        try {
          return await axios.get<JupiterPriceResponse>(
            `${this.jupiterBaseUrl}?ids=${tokenAddress}&showExtraInfo=true`,
            {
              timeout: 5000, // 5 second timeout
              headers: {
                Accept: 'application/json',
                'User-Agent': 'bork-tools/1.0',
              },
            },
          );
        } catch (error) {
          const axiosError = error as AxiosError;
          elizaLogger.error(
            `Jupiter API request failed for token ${tokenAddress}:`,
            {
              status: axiosError.response?.status,
              statusText: axiosError.response?.statusText,
              error: axiosError.message,
            },
          );
          throw error;
        }
      });

      const tokenData = response.data.data[tokenAddress];
      if (!tokenData) {
        elizaLogger.warn(`No price data found for token ${tokenAddress}`);
        return null;
      }

      const { price, extraInfo } = tokenData;
      const {
        quotedPrice,
        confidenceLevel,
        lastSwappedPrice,
        depth: { buyPriceImpactRatio, sellPriceImpactRatio },
      } = extraInfo;

      return {
        price: Number(price),
        buyPrice: Number(quotedPrice.buyPrice),
        sellPrice: Number(quotedPrice.sellPrice),
        confidenceLevel,
        lastTradeAt: new Date(
          Math.max(
            lastSwappedPrice.lastJupiterBuyAt,
            lastSwappedPrice.lastJupiterSellAt,
          ) * 1000,
        ),
        buyImpact: buyPriceImpactRatio.depth,
        sellImpact: sellPriceImpactRatio.depth,
      };
    } catch (error) {
      elizaLogger.error(
        `Failed to fetch price for token ${tokenAddress} after all retries:`,
        error,
      );
      return null;
    }
  }
}

export const marketDataService = MarketDataService.getInstance();
