import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import {
  type AllChronosMarketHistory,
  IndexerGrpcSpotApi,
  IndexerRestMarketChronosApi,
} from '@injectivelabs/sdk-ts';
import {
  type MarketHistoryItem,
  type MarketHistoryResponse,
  TimeResolution,
} from '../types/responses/market-history';

/**
 * Service for interacting with the Injective Protocol's market data
 */
export class InjectiveService {
  private readonly marketChronosApi: IndexerRestMarketChronosApi;
  private readonly spotApi: IndexerGrpcSpotApi;

  constructor(network: Network = Network.Mainnet) {
    const endpoints = getNetworkEndpoints(network);
    this.marketChronosApi = new IndexerRestMarketChronosApi(
      `${endpoints.chronos}/api/chronos/v1/market`,
    );
    this.spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
  }

  /**
   * Fetches all available spot markets
   * @returns Promise containing market data
   */
  async getMarkets() {
    try {
      const markets = await this.spotApi.fetchMarkets();
      return markets;
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      throw new Error('Failed to fetch markets');
    }
  }

  /**
   * Fetches market history for specified markets
   * @param marketIds Array of market IDs to fetch history for
   * @param resolution Time resolution for the history data
   * @param countback Number of historical data points to fetch (in hours)
   * @returns Promise containing market history data
   */
  async getMarketsHistory(
    marketIds: string[],
    resolution: TimeResolution = TimeResolution.Hour,
    countback = 24,
  ): Promise<MarketHistoryResponse[]> {
    try {
      const marketsHistory = await this.marketChronosApi.fetchMarketsHistory({
        marketIds,
        resolution,
        countback,
      });

      return marketIds.map((marketId) => {
        const marketHistory = (
          marketsHistory as AllChronosMarketHistory[]
        ).find((item) => item.marketID === marketId);

        if (!marketHistory) {
          return { marketId, history: [] };
        }

        const history: MarketHistoryItem[] = marketHistory.t.map(
          (timestamp, index) => ({
            timestamp,
            open: marketHistory.o[index].toString(),
            high: marketHistory.h[index].toString(),
            low: marketHistory.l[index].toString(),
            close: marketHistory.c[index].toString(),
            volume: marketHistory.v[index].toString(),
          }),
        );

        return { marketId, history };
      });
    } catch (error) {
      console.error('Failed to fetch markets history:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const injectiveService = new InjectiveService();
