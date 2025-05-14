import type {
  JupiterPriceResponse,
  TokenPriceDetails,
} from '@/bork-protocol/plugins/token-monitor/types/token';
import axios from 'axios';

export class MarketDataService {
  private static instance: MarketDataService;
  private readonly jupiterBaseUrl = 'https://api.jup.ag/price/v2';

  private constructor() {}

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  async getTokenPrice(tokenAddress: string): Promise<TokenPriceDetails | null> {
    try {
      const response = await axios.get<JupiterPriceResponse>(
        `${this.jupiterBaseUrl}?ids=${tokenAddress}&showExtraInfo=true`,
      );

      const tokenData = response.data.data[tokenAddress];
      if (!tokenData) {
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
      console.error(`Error fetching price for ${tokenAddress}:`, error);
      return null;
    }
  }
}

export const marketDataService = MarketDataService.getInstance();
