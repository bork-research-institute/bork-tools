'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3,
  Clock,
  LineChart,
  MessageCircle,
  Newspaper,
  Shield,
  Twitter,
  Users,
} from 'lucide-react';
import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout';
import {
  mockMarketMetrics,
  mockNetworkMetrics,
  mockSocialMetrics,
  newsItems,
  prices,
  tweets,
  unlocks,
} from '../../mocks/metricsData';
import { ScrollArea } from '../ui/scroll-area';
import { Panel } from './Panel';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useCallback, useState } from 'react';

const ResponsiveGridLayout = WidthProvider(GridLayout);

// Define the initial layout with varying heights
const defaultLayout: Layout[] = [
  { i: 'technical', x: 0, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'market', x: 1, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'network', x: 2, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'sentiment', x: 3, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'community', x: 0, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'quality', x: 1, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'news', x: 2, y: 2, w: 2, h: 3, minH: 2, maxH: 6 }, // News takes 2 columns
  { i: 'tweets', x: 0, y: 4, w: 2, h: 3, minH: 2, maxH: 6 }, // Tweets takes 2 columns
  { i: 'prices', x: 2, y: 5, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'unlocks', x: 3, y: 5, w: 1, h: 2, minH: 2, maxH: 4 },
];

export function MetricsGallery() {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  return (
    <div className="p-6 bg-[#030712]">
      <ResponsiveGridLayout
        className="layout"
        layout={layout}
        cols={4}
        rowHeight={180}
        width={1600}
        margin={[16, 16]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        resizeHandles={['se']}
        isBounded={true}
      >
        <div key="technical">
          <Panel
            title="Technical Analysis"
            icon={<LineChart className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">RSI (14)</div>
                    <div
                      className={cn(
                        'text-lg font-medium',
                        mockMarketMetrics.technicalAnalysis.indicators.rsi14 >
                          70
                          ? 'text-red-400'
                          : mockMarketMetrics.technicalAnalysis.indicators
                                .rsi14 < 30
                            ? 'text-green-400'
                            : 'text-white',
                      )}
                    >
                      {mockMarketMetrics.technicalAnalysis.indicators.rsi14}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">VWAP</div>
                    <div className="text-lg font-medium text-white">
                      $
                      {mockMarketMetrics.technicalAnalysis.indicators.vwap24h.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">MACD</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Line</div>
                      <div className="text-white">
                        {
                          mockMarketMetrics.technicalAnalysis.indicators.macd
                            .macdLine
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Signal</div>
                      <div className="text-white">
                        {
                          mockMarketMetrics.technicalAnalysis.indicators.macd
                            .signalLine
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Histogram</div>
                      <div
                        className={
                          mockMarketMetrics.technicalAnalysis.indicators.macd
                            .histogram > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {
                          mockMarketMetrics.technicalAnalysis.indicators.macd
                            .histogram
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">ATR (14)</div>
                  <div className="text-lg font-medium text-white">
                    {mockMarketMetrics.technicalAnalysis.indicators.atr14}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="market">
          <Panel
            title="Market Stats"
            icon={<BarChart3 className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">24h Volume</div>
                    <div className="text-lg font-medium text-white">
                      $
                      {Number(
                        mockMarketMetrics.technicalAnalysis.latestCandle.volume,
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">TVL</div>
                    <div className="text-lg font-medium text-white">
                      ${mockMarketMetrics.liquidity.tvl.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Spread</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-medium text-white">
                      ${mockMarketMetrics.orderBook.spread}
                    </div>
                    <div className="text-sm text-gray-400">
                      ({mockMarketMetrics.orderBook.spreadPercentage}%)
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">24h Price Change</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Open</div>
                      <div className="text-white">
                        ${mockMarketMetrics.technicalAnalysis.latestCandle.open}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Close</div>
                      <div className="text-white">
                        $
                        {mockMarketMetrics.technicalAnalysis.latestCandle.close}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="network">
          <Panel
            title="Network Activity"
            icon={<Users className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Validators</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Active</div>
                      <div className="text-white">
                        {mockNetworkMetrics.staking.activeValidators}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Staking Rate</div>
                      <div className="text-white">
                        {mockNetworkMetrics.staking.stakingRate}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Transactions</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">24h Count</div>
                      <div className="text-white">
                        {mockNetworkMetrics.transactions.daily.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Avg Gas</div>
                      <div className="text-white">
                        {mockNetworkMetrics.transactions.avgGasFee} ETH
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Governance</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">
                        Active Proposals
                      </div>
                      <div className="text-white">
                        {mockNetworkMetrics.governance.activeProposals}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Participation</div>
                      <div className="text-white">
                        {mockNetworkMetrics.governance.votingParticipation}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="sentiment">
          <Panel
            title="Sentiment Analysis"
            icon={<MessageCircle className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Overall Sentiment</div>
                  <div
                    className={cn(
                      'text-lg font-medium',
                      mockSocialMetrics.sentiment.overall === 'Positive'
                        ? 'text-green-400'
                        : mockSocialMetrics.sentiment.overall === 'Negative'
                          ? 'text-red-400'
                          : 'text-white',
                    )}
                  >
                    {mockSocialMetrics.sentiment.overall}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Confidence Score</div>
                  <div className="text-lg font-medium text-white">
                    {mockSocialMetrics.sentiment.confidence}%
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="community">
          <Panel
            title="Community Engagement"
            icon={<Users className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Active Users</div>
                    <div className="text-lg font-medium text-white">
                      {mockSocialMetrics.engagement.activeUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Daily Posts</div>
                    <div className="text-lg font-medium text-white">
                      {mockSocialMetrics.engagement.dailyPosts.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    Average Interactions
                  </div>
                  <div className="text-lg font-medium text-white">
                    {mockSocialMetrics.engagement.avgInteractions}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="quality">
          <Panel
            title="Content Quality"
            icon={<Shield className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Quality Score</div>
                  <div className="text-lg font-medium text-white">
                    {mockSocialMetrics.contentQuality.qualityScore}/100
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Spam Rate</div>
                    <div className="text-lg font-medium text-white">
                      {mockSocialMetrics.contentQuality.spamRate}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Authenticity</div>
                    <div className="text-lg font-medium text-white">
                      {mockSocialMetrics.contentQuality.authenticity}%
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="news">
          <Panel
            title="Latest News"
            icon={<Newspaper className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-4">
                {newsItems.map((item) => (
                  <div
                    key={`${item.source}-${item.title}`}
                    className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-400">
                        {item.source}
                      </span>
                      <span className="text-sm text-gray-600">•</span>
                      <span className="text-sm text-gray-400">
                        {item.timeAgo}
                      </span>
                    </div>
                    <div className="text-blue-400 text-sm mb-1">
                      {item.category}
                    </div>
                    <h3 className="text-white text-sm font-medium mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="tweets">
          <Panel
            title="Latest Tweets"
            icon={<Twitter className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-4">
                {tweets.map((tweet) => (
                  <div
                    key={`${tweet.source}-${tweet.content}`}
                    className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-400">
                        {tweet.source}
                      </span>
                      <span className="text-sm text-gray-600">•</span>
                      <span className="text-sm text-gray-400">
                        {tweet.timeAgo}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-relaxed">
                      {tweet.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="prices">
          <Panel
            title="Top Prices"
            icon={<BarChart3 className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-4">
                {prices.map((price) => (
                  <div
                    key={`${price.symbol}-${price.name}`}
                    className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 font-medium min-w-[1.5rem]">
                        {price.rank}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {price.name}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {price.symbol}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {price.price}
                        </div>
                        <div
                          className={
                            price.isPositive ? 'text-green-400' : 'text-red-400'
                          }
                        >
                          {price.change24h}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Panel>
        </div>

        <div key="unlocks">
          <Panel
            title="Upcoming Unlocks"
            icon={<Clock className="h-4 w-4" />}
            className="h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
          >
            <ScrollArea className="h-[calc(100%-2rem)] pr-4">
              <div className="space-y-4">
                {unlocks.map((unlock) => (
                  <div
                    key={`${unlock.name}-${unlock.timeLeft}`}
                    className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            {unlock.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-400">
                            Unlock in: {unlock.timeLeft}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {unlock.value}
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-gray-400 text-sm">
                            {unlock.price}
                          </span>
                          <span
                            className={
                              unlock.isPositive
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {unlock.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Panel>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
