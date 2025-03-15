'use client';

import { cn } from '@/lib/utils';
import {
  LineChart,
  MessageCircle,
  Newspaper,
  Shield,
  Users,
} from 'lucide-react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import {
  mockMarketMetrics,
  mockNetworkMetrics,
  mockSocialMetrics,
  newsItems,
} from '../../mocks/metricsData';
import { ScrollArea } from '../ui/scroll-area';
import { MarketStatsPanel } from './MarketStatsPanel';
import { Panel } from './Panel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePanels } from '@/lib/contexts/PanelContext';

const ResponsiveGridLayout = WidthProvider(GridLayout);

export function MetricsGallery() {
  const { layout, visiblePanels, handleLayoutChange, handleRemovePanel } =
    usePanels();

  return (
    <div className="bg-[#030712]">
      <ResponsiveGridLayout
        className="layout"
        layout={layout}
        cols={4}
        rowHeight={140}
        margin={[8, 8]}
        containerPadding={[8, 8]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        resizeHandles={['se']}
        preventCollision={false}
        useCSSTransforms={false}
        transformScale={1}
        isDraggable={true}
        compactType="vertical"
        verticalCompact={true}
        onDragStart={() => {
          const grid = document.querySelector('.layout') as HTMLElement;
          if (grid) {
            grid.style.transition = 'none';
          }
        }}
        onDragStop={() => {
          const grid = document.querySelector('.layout') as HTMLElement;
          if (grid) {
            grid.style.transition = '';
          }
        }}
      >
        {visiblePanels.has('market') && (
          <div key="market" className="h-full">
            <MarketStatsPanel onClose={() => handleRemovePanel('market')} />
          </div>
        )}

        {visiblePanels.has('technical') && (
          <div key="technical" className="h-full">
            <Panel
              title="Technical Analysis"
              icon={<LineChart className="h-3.5 w-3.5" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('technical')}
            >
              <ScrollArea className="h-[calc(100%-2rem)] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">RSI (14)</div>
                      <div
                        className={cn(
                          'text-base font-medium',
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
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">VWAP</div>
                      <div className="text-base font-medium text-white">
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
        )}

        {visiblePanels.has('network') && (
          <div key="network" className="h-full">
            <Panel
              title="Network Activity"
              icon={<Users className="h-4 w-4" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('network')}
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
                        <div className="text-xs text-gray-500">
                          Staking Rate
                        </div>
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
                        <div className="text-xs text-gray-500">
                          Participation
                        </div>
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
        )}

        {visiblePanels.has('sentiment') && (
          <div key="sentiment" className="h-full">
            <Panel
              title="Sentiment Analysis"
              icon={<MessageCircle className="h-4 w-4" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('sentiment')}
            >
              <ScrollArea className="h-[calc(100%-2rem)] pr-4">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">
                      Overall Sentiment
                    </div>
                    <div
                      className={cn(
                        'text-base font-medium',
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

                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">
                      Confidence Score
                    </div>
                    <div className="text-base font-medium text-white">
                      {mockSocialMetrics.sentiment.confidence}%
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Panel>
          </div>
        )}

        {visiblePanels.has('community') && (
          <div key="community" className="h-full">
            <Panel
              title="Community Engagement"
              icon={<Users className="h-4 w-4" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('community')}
            >
              <ScrollArea className="h-[calc(100%-2rem)] pr-4">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Active Users</div>
                    <div className="text-base font-medium text-white">
                      {mockSocialMetrics.engagement.activeUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Daily Posts</div>
                    <div className="text-base font-medium text-white">
                      {mockSocialMetrics.engagement.dailyPosts.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">
                      Average Interactions
                    </div>
                    <div className="text-base font-medium text-white">
                      {mockSocialMetrics.engagement.avgInteractions}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Panel>
          </div>
        )}

        {visiblePanels.has('quality') && (
          <div key="quality" className="h-full">
            <Panel
              title="Content Quality"
              icon={<Shield className="h-4 w-4" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('quality')}
            >
              <ScrollArea className="h-[calc(100%-2rem)] pr-4">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Quality Score</div>
                    <div className="text-base font-medium text-white">
                      {mockSocialMetrics.contentQuality.qualityScore}/100
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Spam Rate</div>
                      <div className="text-base font-medium text-white">
                        {mockSocialMetrics.contentQuality.spamRate}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Authenticity</div>
                      <div className="text-base font-medium text-white">
                        {mockSocialMetrics.contentQuality.authenticity}%
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Panel>
          </div>
        )}

        {visiblePanels.has('news') && (
          <div key="news" className="h-full">
            <Panel
              title="Latest News"
              icon={<Newspaper className="h-4 w-4" />}
              className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
              onClose={() => handleRemovePanel('news')}
            >
              <ScrollArea className="h-[calc(100%-2rem)] pr-4">
                <div className="space-y-4">
                  {newsItems.map((item) => (
                    <div
                      key={`${item.source}-${item.title}`}
                      className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">
                          {item.source}
                        </span>
                        <span className="text-xs text-gray-600">•</span>
                        <span className="text-xs text-gray-400">
                          {item.timeAgo}
                        </span>
                      </div>
                      <div className="text-xs text-blue-400 mb-1">
                        {item.category}
                      </div>
                      <h3 className="text-white text-sm font-medium mb-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Panel>
          </div>
        )}

        {visiblePanels.has('trending_tweets') && (
          <div key="trending_tweets" className="h-full">
            <TrendingTweetsPanel
              onClose={() => handleRemovePanel('trending_tweets')}
            />
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
}
