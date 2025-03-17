import { supabaseClient } from '@/lib/config/client-supabase';

export type TimeFrame = '5m' | '1h' | '4h' | '1d';

interface MarketAnalysisRecord {
  market_id: string;
  ticker: string;
  timeframe: string;
  technical_analysis: {
    latestCandle: {
      close: string;
      volume: string;
      timestamp?: string;
    };
    indicators: {
      rsi14: number;
      macd: {
        macdLine: number;
        signalLine: number;
        histogram: number;
      };
    };
  };
  order_book: {
    spread: number;
    spreadPercentage: number;
  };
  liquidity?: {
    tvl: number;
  };
  created_at: string;
}

interface TimeframeConfig {
  resolution: string;
  duration: number; // in hours
  requiredSamples: number;
}

export interface MarketStat {
  symbol: string;
  name: string;
  price: string;
  volume: string;
  change24h: string;
  isPositive: boolean;
  rsi: number;
  macd: number;
  spread: string;
  spreadPercentage: string;
  liquidity: string;
  timestamp: string;
}

export class MarketStatsService {
  private static instance: MarketStatsService;
  private currentTimeframe: TimeFrame = '1h';

  private readonly timeframeConfigs: Record<TimeFrame, TimeframeConfig> = {
    '5m': { resolution: '5', duration: 0.0833, requiredSamples: 1 },
    '1h': { resolution: '60', duration: 1, requiredSamples: 1 },
    '4h': { resolution: '60', duration: 4, requiredSamples: 4 },
    '1d': { resolution: '60', duration: 24, requiredSamples: 24 },
  };

  private constructor() {}

  public static getInstance(): MarketStatsService {
    if (!MarketStatsService.instance) {
      MarketStatsService.instance = new MarketStatsService();
    }
    return MarketStatsService.instance;
  }

  setTimeframe(timeframe: TimeFrame) {
    this.currentTimeframe = timeframe;
  }

  private getTimeframeConfig(): TimeframeConfig {
    return this.timeframeConfigs[this.currentTimeframe];
  }

  private async fetchMarketData(
    timeframeCutoff: Date,
    resolution: string,
  ): Promise<MarketAnalysisRecord[]> {
    console.log('Fetching market data with params:', {
      timeframeCutoff: timeframeCutoff.toISOString(),
      resolution,
    });

    // First try without any restrictions to see if the table has any data at all
    const { data: allData, error: checkError } = await supabaseClient
      .from('market_analysis')
      .select('count')
      .single();

    console.log('Total records in market_analysis:', allData);

    if (checkError) {
      console.error('Error checking market analysis:', checkError);
      throw new Error(`Failed to check market analysis: ${checkError.message}`);
    }

    // If we have no data at all, let's check if we can connect to the table
    if (!allData || allData.count === 0) {
      console.log(
        'No data found in market_analysis table. Checking table structure...',
      );
      const { data: tableInfo, error: tableError } = await supabaseClient
        .from('market_analysis')
        .select('*')
        .limit(1);

      console.log('Table structure check:', {
        hasError: !!tableError,
        error: tableError,
        canConnect: !!tableInfo,
      });

      if (tableError) {
        throw new Error(
          `Cannot connect to market_analysis table: ${tableError.message}`,
        );
      }
    }

    // Now try to get the most recent data first, without time restriction
    const { data: recentData, error: recentError } = await supabaseClient
      .from('market_analysis')
      .select('*')
      .eq('timeframe', resolution)
      .order('created_at', { ascending: false })
      .limit(100);

    console.log('Recent market data (no time filter):', {
      count: recentData?.length ?? 0,
      resolution,
      firstRecord: recentData?.[0],
      error: recentError,
    });

    if (recentError) {
      console.error('Error fetching recent market data:', recentError);
      throw new Error(`Failed to fetch market data: ${recentError.message}`);
    }

    // If we have recent data, use it
    if (recentData && recentData.length > 0) {
      return recentData as MarketAnalysisRecord[];
    }

    // If no recent data, try with time restriction as a fallback
    const { data, error } = await supabaseClient
      .from('market_analysis')
      .select('*')
      .eq('timeframe', resolution)
      .gt('created_at', timeframeCutoff.toISOString())
      .order('created_at', { ascending: false });

    console.log('Fetched market data with time filter:', {
      count: data?.length ?? 0,
      timeframeCutoff: timeframeCutoff.toISOString(),
      resolution,
      error,
      firstRecord: data?.[0],
    });

    if (error) {
      console.error('Error fetching market analysis:', error);
      throw new Error(`Failed to fetch market analysis: ${error.message}`);
    }

    return (data || []) as MarketAnalysisRecord[];
  }

  private calculatePriceChange(
    currentPrice: number,
    historicalRecords: MarketAnalysisRecord[],
  ): string {
    if (historicalRecords.length === 0) {
      return '0';
    }

    // Sort by created_at in ascending order to get the oldest first
    const sortedRecords = [...historicalRecords].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // Get the oldest price
    const oldestPrice = Number(
      sortedRecords[0].technical_analysis.latestCandle.close,
    );

    if (oldestPrice === 0) {
      return '0';
    }

    const change = ((currentPrice - oldestPrice) / oldestPrice) * 100;
    return change.toFixed(2);
  }

  private aggregateVolume(records: MarketAnalysisRecord[]): string {
    return records
      .reduce((sum, record) => {
        return sum + Number(record.technical_analysis.latestCandle.volume);
      }, 0)
      .toString();
  }

  async getMarketStats(): Promise<MarketStat[]> {
    try {
      const config = this.getTimeframeConfig();
      const timeframeCutoff = new Date();
      timeframeCutoff.setHours(timeframeCutoff.getHours() - config.duration);

      console.log('Getting market stats:', {
        timeframe: this.currentTimeframe,
        config,
        cutoff: timeframeCutoff.toISOString(),
      });

      // For 5m timeframe, fetch directly
      if (this.currentTimeframe === '5m') {
        const records = await this.fetchMarketData(timeframeCutoff, '5');
        return this.processMarketRecords(records, []);
      }

      // For other timeframes, fetch 1h data and aggregate
      const records = await this.fetchMarketData(timeframeCutoff, '60');

      console.log('Processing records:', {
        count: records.length,
        timeframe: this.currentTimeframe,
        firstRecord: records[0],
      });

      // Group records by market for processing
      const marketGroups = records.reduce(
        (acc, record) => {
          if (!acc[record.market_id]) {
            acc[record.market_id] = [];
          }
          acc[record.market_id].push(record);
          return acc;
        },
        {} as Record<string, MarketAnalysisRecord[]>,
      );

      // Process each market's data
      const results: MarketStat[] = [];
      for (const [marketId, marketRecords] of Object.entries(marketGroups)) {
        if (marketRecords.length < config.requiredSamples) {
          console.warn(
            `Insufficient data for market ${marketId} at timeframe ${this.currentTimeframe}. ` +
              `Required: ${config.requiredSamples}, Found: ${marketRecords.length}`,
          );
          continue;
        }

        const processedStats = this.processMarketRecords(
          [marketRecords[0]], // Use latest record for current values
          marketRecords, // Pass all records for historical calculations
        );

        if (processedStats.length > 0) {
          results.push(processedStats[0]);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in getMarketStats:', error);
      throw error;
    }
  }

  private processMarketRecords(
    currentRecords: MarketAnalysisRecord[],
    historicalRecords: MarketAnalysisRecord[],
  ): MarketStat[] {
    return currentRecords.map((record) => {
      const currentPrice = Number(record.technical_analysis.latestCandle.close);
      const change = this.calculatePriceChange(currentPrice, historicalRecords);

      return {
        symbol: record.ticker,
        name: record.ticker,
        price: record.technical_analysis.latestCandle.close,
        volume:
          historicalRecords.length > 0
            ? this.aggregateVolume(historicalRecords)
            : record.technical_analysis.latestCandle.volume,
        change24h: change,
        isPositive: Number(change) >= 0,
        rsi: record.technical_analysis.indicators.rsi14,
        macd: record.technical_analysis.indicators.macd.macdLine,
        spread: record.order_book.spread.toString(),
        spreadPercentage: record.order_book.spreadPercentage.toString(),
        liquidity: record.liquidity?.tvl.toString() || '0',
        timestamp: record.created_at,
      };
    });
  }

  async subscribeToMarketStats(
    callback: (stats: MarketStat[]) => void,
  ): Promise<() => void> {
    try {
      const config = this.getTimeframeConfig();
      const currentMarkets: Record<string, MarketAnalysisRecord> = {};

      const subscription = supabaseClient
        .channel('market_analysis_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'market_analysis',
            filter: `timeframe=eq.${config.resolution}`,
          },
          async (payload) => {
            if (payload.new && this.isMarketAnalysisRecord(payload.new)) {
              try {
                const record = payload.new as MarketAnalysisRecord;
                currentMarkets[record.market_id] = record;

                // Fetch historical data for change calculation
                const timeframeCutoff = new Date();
                timeframeCutoff.setHours(
                  timeframeCutoff.getHours() - config.duration,
                );
                const historicalRecords = await this.fetchMarketData(
                  timeframeCutoff,
                  config.resolution,
                );

                const stats = this.processMarketRecords(
                  [record],
                  historicalRecords,
                );

                callback(stats);
              } catch (error) {
                console.error('Error processing market update:', error);
              }
            }
          },
        )
        .subscribe();

      // Initialize with current data
      this.getMarketStats().then((stats) => callback(stats));

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up market stats subscription:', error);
      throw error;
    }
  }

  private isMarketAnalysisRecord(data: unknown): data is MarketAnalysisRecord {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Partial<MarketAnalysisRecord>;
    return !!(
      typeof record.market_id === 'string' &&
      typeof record.ticker === 'string' &&
      typeof record.timeframe === 'string' &&
      record.technical_analysis &&
      typeof record.technical_analysis === 'object' &&
      record.technical_analysis.latestCandle &&
      typeof record.technical_analysis.latestCandle === 'object' &&
      typeof record.technical_analysis.latestCandle.close === 'string' &&
      typeof record.technical_analysis.latestCandle.volume === 'string' &&
      record.technical_analysis.indicators &&
      typeof record.technical_analysis.indicators === 'object' &&
      typeof record.technical_analysis.indicators.rsi14 === 'number' &&
      record.technical_analysis.indicators.macd &&
      typeof record.technical_analysis.indicators.macd === 'object' &&
      typeof record.technical_analysis.indicators.macd.macdLine === 'number' &&
      record.order_book &&
      typeof record.order_book === 'object' &&
      typeof record.order_book.spread === 'number' &&
      typeof record.order_book.spreadPercentage === 'number'
    );
  }
}

// Export singleton instance
export const marketStatsService = MarketStatsService.getInstance();
