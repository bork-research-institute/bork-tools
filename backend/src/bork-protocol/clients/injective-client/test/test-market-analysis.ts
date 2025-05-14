import { marketAnalysisService } from '@bork/services/injective/market-analysis-service';
import type { TimeResolution } from '@bork/types/injective/market-history';
import type {
  DerivativesMetrics,
  LiquidityAnalysis,
  OrderBookAnalysis,
  TechnicalAnalysis,
} from '../../../types/injective/technical-analysis';

const MARKET_CONFIG = {
  type: 'spot' as const,
  resolution: '60' as TimeResolution,
  countback: 24,
  limit: 3,
  sma: 24,
  ema: 24,
  rsi: 14,
  bollinger: {
    period: 20,
    stdDev: 2,
  },
  macd: {
    fast: 12,
    slow: 26,
    signal: 9,
  },
  atr: 14,
  stochastic: {
    k: 14,
    d: 3,
  },
  adx: 14,
};

function logTechnicalAnalysis(
  ticker: string,
  technicalAnalysis: TechnicalAnalysis | null,
  orderBook: OrderBookAnalysis,
  liquidity: LiquidityAnalysis | null,
  derivativesMetrics: DerivativesMetrics | null,
) {
  console.log(`\nTechnical Analysis for ${ticker}:`);

  if (technicalAnalysis) {
    console.log('\nLatest Candle:');
    console.log(
      `  Timestamp: ${new Date(technicalAnalysis.latestCandle.timestamp).toISOString()}`,
    );
    console.log(`  Open: ${technicalAnalysis.latestCandle.open}`);
    console.log(`  High: ${technicalAnalysis.latestCandle.high}`);
    console.log(`  Low: ${technicalAnalysis.latestCandle.low}`);
    console.log(`  Close: ${technicalAnalysis.latestCandle.close}`);
    console.log(`  Volume: ${technicalAnalysis.latestCandle.volume}`);

    console.log('\nMoving Averages:');
    console.log(`  SMA (24h): ${technicalAnalysis.indicators.sma24h}`);
    console.log(`  EMA (24h): ${technicalAnalysis.indicators.ema24h}`);
    console.log(`  VWAP (24h): ${technicalAnalysis.indicators.vwap24h}`);

    console.log('\nMomentum Indicators:');
    console.log(`  RSI (14): ${technicalAnalysis.indicators.rsi14}`);
    console.log('  Stochastic Oscillator:');
    console.log(`    %K: ${technicalAnalysis.indicators.stochastic.k}`);
    console.log(`    %D: ${technicalAnalysis.indicators.stochastic.d}`);
    console.log(`  ADX (14): ${technicalAnalysis.indicators.adx14}`);

    console.log('\nVolatility Indicators:');
    console.log(`  ATR (14): ${technicalAnalysis.indicators.atr14}`);
    console.log('  Bollinger Bands:');
    console.log(
      `    Upper: ${technicalAnalysis.indicators.bollingerBands.upper}`,
    );
    console.log(
      `    Middle: ${technicalAnalysis.indicators.bollingerBands.middle}`,
    );
    console.log(
      `    Lower: ${technicalAnalysis.indicators.bollingerBands.lower}`,
    );

    console.log('\nTrend Indicators:');
    console.log('  MACD:');
    console.log(`    MACD Line: ${technicalAnalysis.indicators.macd.macdLine}`);
    console.log(
      `    Signal Line: ${technicalAnalysis.indicators.macd.signalLine}`,
    );
    console.log(
      `    Histogram: ${technicalAnalysis.indicators.macd.histogram}`,
    );
  } else {
    console.log('  Technical analysis data not available');
  }

  console.log('\nOrder Book Analysis:');
  console.log(`  Spread: ${orderBook.spread} (${orderBook.spreadPercentage}%)`);
  console.log(`  Bid Depth: ${orderBook.bidDepth}`);
  console.log(`  Ask Depth: ${orderBook.askDepth}`);
  console.log(`  Bid Density: ${orderBook.bidDensity} orders/price`);
  console.log(`  Ask Density: ${orderBook.askDensity} orders/price`);

  console.log('\nTop 5 Bids:');
  for (const bid of orderBook.topBids.slice(0, 5)) {
    console.log(`  ${bid.price} - ${bid.quantity}`);
  }

  console.log('\nTop 5 Asks:');
  for (const ask of orderBook.topAsks.slice(0, 5)) {
    console.log(`  ${ask.price} - ${ask.quantity}`);
  }

  if (liquidity) {
    console.log('\nLiquidity Pool Analysis:');
    console.log(`  TVL: $${liquidity.tvl}`);

    console.log('\nPool Composition:');
    console.log(
      `  ${liquidity.poolComposition.token1.symbol}: ${liquidity.poolComposition.token1.amount} (${liquidity.poolComposition.token1.percentage}%)`,
    );
    console.log(
      `  ${liquidity.poolComposition.token2.symbol}: ${liquidity.poolComposition.token2.amount} (${liquidity.poolComposition.token2.percentage}%)`,
    );

    console.log('\nSlippage Analysis:');
    for (const level of liquidity.slippage) {
      console.log(`  ${level.slippagePercentage}%: $${level.price}`);
    }
  }

  if (derivativesMetrics) {
    console.log('\nDerivatives Metrics:');
    console.log('  Funding Rate:');
    console.log(
      `    Current Rate: ${(derivativesMetrics.fundingRate.current * 100).toFixed(4)}%`,
    );
    console.log(
      `    Last Updated: ${new Date(derivativesMetrics.fundingRate.timestamp).toISOString()}`,
    );

    console.log('\n  Open Interest:');
    console.log(`    Total: ${derivativesMetrics.openInterest.total}`);
    console.log(`    Long: ${derivativesMetrics.openInterest.long}`);
    console.log(`    Short: ${derivativesMetrics.openInterest.short}`);
    console.log(
      `    Long/Short Ratio: ${derivativesMetrics.openInterest.longShortRatio.toFixed(2)}`,
    );
  }
}

async function main() {
  try {
    // Test spot markets
    console.log('\n=== Analyzing Top Spot Markets ===');
    const spotConfig = { ...MARKET_CONFIG, type: 'spot' as const };
    const spotAnalysis =
      await marketAnalysisService.analyzeMarketsByConfig(spotConfig);
    for (const analysis of spotAnalysis) {
      logTechnicalAnalysis(
        analysis.ticker,
        analysis.technicalAnalysis,
        analysis.orderBook,
        analysis.liquidity,
        analysis.derivativesMetrics,
      );
    }

    // Test derivatives markets
    console.log('\n=== Analyzing Top Derivatives Markets ===');
    const derivativesConfig = {
      ...MARKET_CONFIG,
      type: 'derivatives' as const,
    };
    const derivativesAnalysis =
      await marketAnalysisService.analyzeMarketsByConfig(derivativesConfig);
    for (const analysis of derivativesAnalysis) {
      logTechnicalAnalysis(
        analysis.ticker,
        analysis.technicalAnalysis,
        analysis.orderBook,
        analysis.liquidity,
        analysis.derivativesMetrics,
      );
    }
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main();
