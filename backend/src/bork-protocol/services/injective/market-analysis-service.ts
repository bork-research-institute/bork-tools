import type { TimeResolution } from '@/types/injective/market-history';
import type {
  LiquidityAnalysis,
  MarketAnalysis,
  OrderBookAnalysis,
  TechnicalAnalysis,
} from '@/types/injective/technical-analysis';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import {
  type DerivativeOrderHistory,
  type DerivativeTrade,
  IndexerGrpcDerivativesApi,
  IndexerGrpcSpotApi,
  IndexerRestMarketChronosApi,
  IndexerRestSpotChronosApi,
  type OrderbookWithSequence,
  type PriceLevel,
  type SpotOrderHistory,
  type SpotTrade,
} from '@injectivelabs/sdk-ts';
import type { OrderSide } from '@injectivelabs/ts-types';

export interface TimeframeConfig {
  type: 'spot' | 'derivatives';
  resolution: TimeResolution;
  countback: number;
  limit: number;
  sma: number;
  ema: number;
  rsi: number;
  bollinger: {
    period: number;
    stdDev: number;
  };
  macd: {
    fast: number;
    slow: number;
    signal: number;
  };
  atr: number;
  stochastic: {
    k: number;
    d: number;
  };
  adx: number;
}

/**
 * Service for fetching market data useful for technical analysis
 */
export class MarketAnalysisService {
  private readonly spotApi: IndexerGrpcSpotApi;
  private readonly derivativesApi: IndexerGrpcDerivativesApi;
  private readonly marketChronosApi: IndexerRestMarketChronosApi;
  private readonly spotChronosApi: IndexerRestSpotChronosApi;

  constructor(network: Network = Network.Mainnet) {
    const endpoints = getNetworkEndpoints(network);
    this.spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
    this.derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);
    this.marketChronosApi = new IndexerRestMarketChronosApi(
      `${endpoints.chronos}/api/chronos/v1/market`,
    );
    this.spotChronosApi = new IndexerRestSpotChronosApi(
      `${endpoints.chronos}/api/chronos/v1/spot`,
    );
  }

  /**
   * Fetch order book data for a spot market
   * Useful for: Market depth analysis, liquidity analysis, order book imbalance
   */
  async getSpotOrderbook(marketId: string): Promise<OrderbookWithSequence> {
    const response = await this.spotApi.fetchOrderbookV2(marketId);
    return {
      sequence: response.sequence,
      buys: response.buys,
      sells: response.sells,
    };
  }

  /**
   * Fetch order book data for a derivatives market
   * Useful for: Futures market depth, derivatives liquidity analysis
   */
  async getDerivativesOrderbook(
    marketId: string,
  ): Promise<OrderbookWithSequence> {
    const response = await this.derivativesApi.fetchOrderbookV2(marketId);
    return {
      sequence: response.sequence,
      buys: response.buys,
      sells: response.sells,
    };
  }

  /**
   * Fetch recent trades for a spot market
   * Useful for: Volume analysis, price action study, trade flow
   */
  async getSpotTrades(marketId: string, limit = 100): Promise<SpotTrade[]> {
    const response = await this.spotApi.fetchTrades({
      marketId,
      pagination: { limit },
    });
    return response.trades;
  }

  /**
   * Fetch recent trades for a derivatives market
   * Useful for: Futures volume analysis, derivatives trade flow
   */
  async getDerivativesTrades(
    marketId: string,
    limit = 100,
  ): Promise<DerivativeTrade[]> {
    const response = await this.derivativesApi.fetchTrades({
      marketId,
      pagination: { limit },
    });
    return response.trades;
  }

  /**
   * Fetch order history for a spot market
   * Useful for: Historical order flow analysis, market participant behavior
   */
  async getSpotOrderHistory(
    marketId: string,
    subaccountId?: string,
    orderTypes?: OrderSide[],
  ): Promise<SpotOrderHistory[]> {
    const response = await this.spotApi.fetchOrderHistory({
      marketId,
      subaccountId,
      orderTypes,
    });
    return response.orderHistory;
  }

  /**
   * Fetch order history for a derivatives market
   * Useful for: Futures order flow analysis, derivatives trading patterns
   */
  async getDerivativesOrderHistory(
    marketId: string,
    subaccountId?: string,
    orderTypes?: OrderSide[],
  ): Promise<DerivativeOrderHistory[]> {
    const response = await this.derivativesApi.fetchOrderHistory({
      marketId,
      subaccountId,
      orderTypes,
    });
    return response.orderHistory;
  }

  /**
   * Fetch aggregated market data
   * Useful for: OHLCV data, candlestick analysis, technical indicators
   */
  async getMarketsHistory(
    marketIds: string[],
    resolution: string,
    countback: number,
  ) {
    const response = await this.marketChronosApi.fetchMarketsHistory({
      marketIds,
      resolution,
      countback,
    });

    return marketIds.map((marketId) => {
      const marketHistory = response.find((item) => item.marketID === marketId);

      if (!marketHistory) {
        return { marketId, history: [] };
      }

      const history = marketHistory.t.map((timestamp, index) => ({
        timestamp,
        open: marketHistory.o[index].toString(),
        high: marketHistory.h[index].toString(),
        low: marketHistory.l[index].toString(),
        close: marketHistory.c[index].toString(),
        volume: marketHistory.v[index].toString(),
      }));

      return { marketId, history };
    });
  }

  /**
   * Get order book snapshot
   * Useful for: Real-time market depth analysis, liquidity monitoring
   */
  async getOrderbookSnapshot(
    marketId: string,
    type: 'spot' | 'derivatives' = 'spot',
  ) {
    const api = type === 'spot' ? this.spotApi : this.derivativesApi;
    const response = await api.fetchOrderbookV2(marketId);
    return {
      buys: response.buys as PriceLevel[],
      sells: response.sells as PriceLevel[],
      sequence: response.sequence,
    };
  }

  /**
   * Fetch funding rates (derivatives only)
   * Useful for: Funding rate analysis, carry trade opportunities
   */
  async getFundingRates(marketId: string) {
    return await this.derivativesApi.fetchFundingRates({ marketId });
  }

  /**
   * Fetch positions for a derivatives market
   * Useful for: Open interest analysis, market sentiment
   */
  async getPositions(marketId: string, subaccountId?: string) {
    return await this.derivativesApi.fetchPositions({ marketId, subaccountId });
  }

  // Technical Analysis Helper Functions
  calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  calculateRSI(prices: number[], period = 14): number {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map((change) => {
      if (change > 0) {
        return change;
      }
      return 0;
    });
    const losses = changes.map((change) => {
      if (change < 0) {
        return -change;
      }
      return 0;
    });

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      return 100;
    }
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14,
  ): number {
    const trs = highs.map((high, i) => {
      if (i === 0) {
        return high - lows[i];
      }
      const prevClose = closes[i - 1];
      const tr1 = high - lows[i];
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(lows[i] - prevClose);
      return Math.max(tr1, tr2, tr3);
    });

    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  calculateStochastic(
    closes: number[],
    highs: number[],
    lows: number[],
    kPeriod = 14,
    dPeriod = 3,
  ): { k: number; d: number } {
    const lowestLow = Math.min(...lows.slice(-kPeriod));
    const highestHigh = Math.max(...highs.slice(-kPeriod));
    const currentClose = closes[closes.length - 1];

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = this.calculateSMA(
      closes
        .slice(-dPeriod)
        .map(
          (close) => ((close - lowestLow) / (highestHigh - lowestLow)) * 100,
        ),
      dPeriod,
    );

    return { k, d };
  }

  calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14,
  ): number {
    // Calculate +DM and -DM
    const plusDM = highs.slice(1).map((high, i) => {
      const diff = high - highs[i];
      return diff > 0 && diff > lows[i + 1] - lows[i] ? diff : 0;
    });

    const minusDM = lows.slice(1).map((low, i) => {
      const diff = lows[i] - low;
      return diff > 0 && diff > highs[i + 1] - highs[i] ? diff : 0;
    });

    // Calculate TR
    const tr = highs.slice(1).map((high, i) => {
      const prevClose = closes[i];
      return Math.max(
        high - lows[i + 1],
        Math.abs(high - prevClose),
        Math.abs(lows[i + 1] - prevClose),
      );
    });

    // Calculate smoothed averages
    const smoothedTR = this.calculateEMA(tr, period);
    const smoothedPlusDM = this.calculateEMA(plusDM, period);
    const smoothedMinusDM = this.calculateEMA(minusDM, period);

    // Calculate +DI and -DI
    const plusDI = (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = (smoothedMinusDM / smoothedTR) * 100;

    // Calculate DX and ADX
    const dx = Math.abs((plusDI - minusDI) / (plusDI + minusDI)) * 100;
    return this.calculateEMA([...Array(period - 1).fill(dx), dx], period);
  }

  calculateSMA(prices: number[], period: number): number {
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  calculateBollingerBands(
    prices: number[],
    period = 20,
    stdDev = 2,
  ): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    const squaredDiffs = prices
      .slice(-period)
      .map((price) => (price - sma) ** 2);
    const standardDeviation = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / period,
    );

    return {
      upper: sma + standardDeviation * stdDev,
      middle: sma,
      lower: sma - standardDeviation * stdDev,
    };
  }

  calculateMACD(
    prices: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    const signalLine = this.calculateEMA(
      [...Array(signalPeriod - 1).fill(macdLine), macdLine],
      signalPeriod,
    );
    const histogram = macdLine - signalLine;

    return {
      macdLine,
      signalLine,
      histogram,
    };
  }

  calculateTechnicalAnalysis(
    marketHistory: {
      history: Array<{
        timestamp: number;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
      }>;
    },
    config: TimeframeConfig,
  ): TechnicalAnalysis | null {
    if (!marketHistory?.history?.length) {
      return null;
    }

    const lastCandle = marketHistory.history[marketHistory.history.length - 1];
    const closes = marketHistory.history.map((candle) => Number(candle.close));
    const highs = marketHistory.history.map((candle) => Number(candle.high));
    const lows = marketHistory.history.map((candle) => Number(candle.low));
    const volumes = marketHistory.history.map((candle) =>
      Number(candle.volume),
    );

    // Calculate all indicators using config periods
    const sma = this.calculateSMA(closes, config.sma);
    const ema = this.calculateEMA(closes, config.ema);
    const vwap =
      marketHistory.history.reduce((acc, candle) => {
        return acc + Number(candle.close) * Number(candle.volume);
      }, 0) / volumes.reduce((a, b) => a + b, 0);
    const rsi = this.calculateRSI(closes, config.rsi);
    const bollingerBands = this.calculateBollingerBands(
      closes,
      config.bollinger.period,
      config.bollinger.stdDev,
    );
    const macd = this.calculateMACD(
      closes,
      config.macd.fast,
      config.macd.slow,
      config.macd.signal,
    );
    const atr = this.calculateATR(highs, lows, closes, config.atr);
    const stochastic = this.calculateStochastic(
      closes,
      highs,
      lows,
      config.stochastic.k,
      config.stochastic.d,
    );
    const adx = this.calculateADX(highs, lows, closes, config.adx);

    return {
      latestCandle: {
        timestamp: lastCandle.timestamp * 1000,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastCandle.volume,
      },
      indicators: {
        sma24h: Number(sma.toFixed(4)),
        ema24h: Number(ema.toFixed(4)),
        vwap24h: Number(vwap.toFixed(4)),
        rsi14: Number(rsi.toFixed(4)),
        bollingerBands: {
          upper: Number(bollingerBands.upper.toFixed(4)),
          middle: Number(bollingerBands.middle.toFixed(4)),
          lower: Number(bollingerBands.lower.toFixed(4)),
        },
        macd: {
          macdLine: Number(macd.macdLine.toFixed(4)),
          signalLine: Number(macd.signalLine.toFixed(4)),
          histogram: Number(macd.histogram.toFixed(4)),
        },
        atr14: Number(atr.toFixed(4)),
        stochastic: {
          k: Number(stochastic.k.toFixed(4)),
          d: Number(stochastic.d.toFixed(4)),
        },
        adx14: Number(adx.toFixed(4)),
      },
    };
  }

  /**
   * Analyze order book depth and liquidity
   * Useful for: Market depth analysis, liquidity analysis, order book imbalance
   */
  async analyzeOrderBook(
    marketId: string,
    type: 'spot' | 'derivatives' = 'spot',
    depth = 20,
  ): Promise<OrderBookAnalysis> {
    const orderbook = await this.getOrderbookSnapshot(marketId, type);
    const bids = orderbook.buys.slice(0, depth);
    const asks = orderbook.sells.slice(0, depth);

    // Get market info to get decimals
    const markets = await (type === 'spot'
      ? this.spotApi.fetchMarkets()
      : this.derivativesApi.fetchMarkets());
    const market = markets.find((m) => m.marketId === marketId);
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    // Convert quantities to human readable amounts
    const baseDecimals =
      type === 'spot' && 'baseToken' in market ? market.baseToken.decimals : 18;
    const convertToHumanReadable = (quantity: string) => {
      return Number(quantity) / 10 ** baseDecimals;
    };

    // Calculate spread
    const bestBid = Number(bids[0]?.price || 0);
    const bestAsk = Number(asks[0]?.price || 0);
    const spread = bestAsk - bestBid;
    const spreadPercentage = (spread / bestBid) * 100;

    // Calculate depth (convert to human readable amounts)
    const bidDepth = bids.reduce(
      (sum, bid) => sum + convertToHumanReadable(bid.quantity),
      0,
    );
    const askDepth = asks.reduce(
      (sum, ask) => sum + convertToHumanReadable(ask.quantity),
      0,
    );

    // Calculate density (orders per price level)
    const bidDensity =
      bids.length / (bestBid - Number(bids[bids.length - 1]?.price || bestBid));
    const askDensity =
      asks.length / (Number(asks[asks.length - 1]?.price || bestAsk) - bestAsk);

    return {
      spread,
      spreadPercentage,
      bidDepth,
      askDepth,
      bidDensity,
      askDensity,
      topBids: bids.map((bid) => ({
        price: bid.price,
        quantity: convertToHumanReadable(bid.quantity).toString(),
      })),
      topAsks: asks.map((ask) => ({
        price: ask.price,
        quantity: convertToHumanReadable(ask.quantity).toString(),
      })),
    };
  }

  /**
   * Analyze liquidity pool metrics (for AMMs)
   * Useful for: TVL analysis, pool composition, slippage analysis
   */
  async analyzeLiquidityPool(marketId: string): Promise<LiquidityAnalysis> {
    try {
      // Get market info to get token symbols
      const markets = await this.spotApi.fetchMarkets();
      const market = markets.find((m) => m.marketId === marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      // Fetch market summary from Chronos API
      const marketSummary =
        await this.spotChronosApi.fetchMarketSummary(marketId);
      console.log(
        'Market Summary Response:',
        JSON.stringify(marketSummary, null, 2),
      );

      // Calculate TVL using volume
      const tvl = Number(marketSummary.volume);

      // Calculate pool composition using price and volume data
      const price = Number(marketSummary.price);
      const volume = Number(marketSummary.volume);

      // For simplicity, we'll assume equal distribution of tokens
      // In a real implementation, you would fetch actual pool token amounts
      const token1Amount = volume / 2;
      const token2Amount = (volume / 2) * price;

      const poolComposition = {
        token1: {
          symbol: market.baseToken.symbol,
          amount: token1Amount,
          percentage: 50,
        },
        token2: {
          symbol: market.quoteToken.symbol,
          amount: token2Amount,
          percentage: 50,
        },
      };

      // Calculate slippage curve based on current price
      const currentPrice = Number(marketSummary.price);

      const slippage = [0.1, 0.5, 1, 2, 5].map((percentage) => {
        const slippagePrice = currentPrice * (1 + percentage / 100);
        return {
          price: slippagePrice,
          slippagePercentage: percentage,
        };
      });

      return {
        tvl,
        poolComposition,
        slippage,
      };
    } catch (error) {
      console.error('Failed to fetch liquidity pool data:', error);
      throw error;
    }
  }

  /**
   * Analyze top N markets by volume
   * @param config Analysis configuration
   * @returns Promise containing market analysis results
   */
  async analyzeTopMarkets(config: TimeframeConfig): Promise<MarketAnalysis[]> {
    try {
      console.log(`Fetching available ${config.type} markets...`);
      const markets = await (config.type === 'spot'
        ? this.spotApi.fetchMarkets()
        : this.derivativesApi.fetchMarkets());

      // Get market summaries to sort by volume
      const marketSummaries = await Promise.all(
        markets.map(async (market) => {
          try {
            let volume = 0;
            if (config.type === 'spot') {
              const summary = await this.spotChronosApi.fetchMarketSummary(
                market.marketId,
              );
              volume = Number(summary.volume || 0);
            } else {
              // For derivatives, use recent trades to estimate volume
              const trades = await this.getDerivativesTrades(
                market.marketId,
                100,
              );
              volume = trades.length > 0 ? 1000000 : 0; // Assign higher volume to active markets
            }
            return {
              market,
              volume,
            };
          } catch (error) {
            console.log(`Failed to fetch summary for ${market.ticker}:`, error);
            return {
              market,
              volume: 0,
            };
          }
        }),
      );

      // Sort by volume and take top N
      const selectedMarkets = marketSummaries
        .sort((a, b) => b.volume - a.volume)
        .slice(0, config.limit)
        .map(({ market }) => market);

      console.log(`Selected top ${config.limit} markets by volume:`);
      for (const market of selectedMarkets) {
        console.log(
          `  ${market.ticker}: ${marketSummaries.find((m) => m.market.marketId === market.marketId)?.volume || 0} volume`,
        );
      }

      return this.analyzeMarkets(
        config,
        selectedMarkets.map((m) => m.marketId),
      );
    } catch (error) {
      console.error('Error analyzing top markets:', error);
      throw error;
    }
  }

  /**
   * Analyze specific markets by their IDs
   * @param config Analysis configuration
   * @param marketIds Array of market IDs to analyze
   * @returns Promise containing market analysis results
   */
  async analyzeMarkets(
    config: TimeframeConfig,
    marketIds: string[],
  ): Promise<MarketAnalysis[]> {
    try {
      // Get all markets to find the ones we want to analyze
      const markets = await (config.type === 'spot'
        ? this.spotApi.fetchMarkets()
        : this.derivativesApi.fetchMarkets());

      const selectedMarkets = markets.filter((m) =>
        marketIds.includes(m.marketId),
      );

      if (selectedMarkets.length === 0) {
        throw new Error('No valid markets found for the provided market IDs');
      }

      const analysisResults: MarketAnalysis[] = [];

      for (const market of selectedMarkets) {
        console.log(
          `\nAnalyzing ${config.type} market: ${market.ticker} (${market.marketId})`,
        );

        // Get order book analysis
        console.log('\nAnalyzing order book...');
        const orderBookAnalysis = await this.analyzeOrderBook(
          market.marketId,
          config.type,
        );

        // Get liquidity analysis (for spot markets) or derivatives metrics (for futures)
        let liquidityAnalysis: LiquidityAnalysis | null = null;
        let derivativesMetrics = null;

        if (config.type === 'spot') {
          try {
            console.log('\nAnalyzing liquidity pool...');
            liquidityAnalysis = await this.analyzeLiquidityPool(
              market.marketId,
            );
          } catch (error: unknown) {
            if (error instanceof Error) {
              console.log(
                `Liquidity pool analysis not available: ${error.message}`,
              );
            } else {
              console.log(
                'Liquidity pool analysis not available for this market',
              );
            }
          }
        } else {
          // For derivatives markets, fetch funding rates and open interest
          console.log('\nAnalyzing derivatives metrics...');
          derivativesMetrics = await this.analyzeDerivativesMetrics(
            market.marketId,
          );
        }

        // Get recent trades for volume analysis
        console.log('Fetching recent trades...');
        const trades = await (config.type === 'spot'
          ? this.getSpotTrades(market.marketId, 10)
          : this.getDerivativesTrades(market.marketId, 10));

        // Get historical data for technical analysis
        console.log('Fetching historical data...');
        const marketHistories = await this.getMarketsHistory(
          [market.marketId],
          config.resolution,
          config.countback,
        );

        const marketHistory = marketHistories[0];
        const technicalAnalysis = this.calculateTechnicalAnalysis(
          marketHistory,
          config,
        );

        analysisResults.push({
          marketId: market.marketId,
          ticker: market.ticker,
          orderBook: orderBookAnalysis,
          liquidity: liquidityAnalysis,
          derivativesMetrics,
          recentTrades: trades.map((trade) => ({
            price: trade.price,
            quantity: trade.quantity,
            direction: trade.tradeDirection,
          })),
          technicalAnalysis,
          timeframe: config.resolution,
        });
      }

      return analysisResults;
    } catch (error) {
      console.error('Error running market analysis:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * Analyze markets based on configuration
   * @param config Analysis configuration
   * @returns Promise containing market analysis results
   */
  async analyzeMarketsByConfig(
    config: TimeframeConfig,
  ): Promise<MarketAnalysis[]> {
    // Use the limit from config to analyze top markets
    return this.analyzeTopMarkets(config);
  }

  /**
   * Analyze derivatives market metrics
   * Useful for: Funding rates, open interest, and position analysis
   */
  async analyzeDerivativesMetrics(marketId: string) {
    try {
      // Fetch funding rates
      const fundingRates = await this.getFundingRates(marketId);
      const latestRate = fundingRates.fundingRates[0];

      // Fetch positions for open interest
      const positions = await this.getPositions(marketId);
      const longPositions = positions.positions.filter(
        (p) => p.direction === 'long',
      );
      const shortPositions = positions.positions.filter(
        (p) => p.direction === 'short',
      );

      // Calculate total open interest
      const totalOpenInterest = positions.positions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0,
      );
      const longOpenInterest = longPositions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0,
      );
      const shortOpenInterest = shortPositions.reduce(
        (sum, pos) => sum + Number(pos.quantity),
        0,
      );

      return {
        fundingRate: {
          current: Number(latestRate?.rate || 0),
          timestamp: latestRate?.timestamp || 0,
        },
        openInterest: {
          total: totalOpenInterest,
          long: longOpenInterest,
          short: shortOpenInterest,
          longShortRatio: longOpenInterest / (shortOpenInterest || 1),
        },
      };
    } catch (error) {
      console.error('Failed to fetch derivatives metrics:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const marketAnalysisService = new MarketAnalysisService();
