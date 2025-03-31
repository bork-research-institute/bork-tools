import { useCallback, useEffect, useState } from 'react';

export interface TechnicalIndicators {
  sma24h: number;
  ema24h: number;
  vwap24h: number;
  rsi14: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  atr14: number;
  stochastic: {
    k: number;
    d: number;
  };
  adx14: number;
}

export interface MarketMetrics {
  technicalAnalysis: {
    latestCandle: {
      timestamp: number;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    };
    indicators: TechnicalIndicators;
  };
  orderBook: {
    spread: number;
    spreadPercentage: number;
    bidDepth: number;
    askDepth: number;
  };
  liquidity: {
    tvl: number;
    slippage: Array<{
      price: number;
      slippagePercentage: number;
    }>;
  };
}

export interface NetworkMetrics {
  transactions: {
    daily: number;
    activeAddresses: number;
    avgGasFee: string;
  };
  staking: {
    totalStaked: string;
    stakingRate: number;
    activeValidators: number;
  };
  governance: {
    activeProposals: number;
    votingParticipation: number;
  };
}

export interface SocialMetrics {
  sentiment: {
    overall: string;
    confidence: number;
  };
  engagement: {
    activeUsers: number;
    dailyPosts: number;
    avgInteractions: number;
  };
  contentQuality: {
    qualityScore: number;
    spamRate: number;
    authenticity: number;
  };
}

interface UseMetricsReturn {
  market: MarketMetrics | null;
  network: NetworkMetrics | null;
  social: SocialMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMetrics(): UseMetricsReturn {
  const [market, setMarket] = useState<MarketMetrics | null>(null);
  const [network, setNetwork] = useState<NetworkMetrics | null>(null);
  const [social, setSocial] = useState<SocialMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch market metrics
      const marketResponse = await fetch('/api/metrics/market');
      const marketData = await marketResponse.json();
      setMarket(marketData);

      // Fetch network metrics
      const networkResponse = await fetch('/api/metrics/network');
      const networkData = await networkResponse.json();
      setNetwork(networkData);

      // Fetch social metrics
      const socialResponse = await fetch('/api/metrics/social');
      const socialData = await socialResponse.json();
      setSocial(socialData);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch metrics'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    market,
    network,
    social,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}
