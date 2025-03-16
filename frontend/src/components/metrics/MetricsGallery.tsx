'use client';

import { Newspaper } from 'lucide-react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import { newsItems } from '../../mocks/metricsData';
import { ScrollArea } from '../ui/scroll-area';
import { MarketStatsPanel } from './MarketStatsPanel';
import { MindsharePanel } from './MindsharePanel';
import { Panel } from './Panel';
import { RelationshipsPanel } from './RelationshipsPanel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePanels } from '@/lib/contexts/PanelContext';
import { BundlerPanel } from './BundlerPanel';
import { KaitoLeaderboard } from './KaitoLeaderboard';
import { TokenHolderPanel } from './TokenHolderPanel';

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

        {visiblePanels.has('relationships') && (
          <div key="relationships" className="h-full">
            <RelationshipsPanel
              onClose={() => handleRemovePanel('relationships')}
            />
          </div>
        )}

        {visiblePanels.has('mindshare') && (
          <div key="mindshare" className="h-full">
            <MindsharePanel onClose={() => handleRemovePanel('mindshare')} />
          </div>
        )}

        {visiblePanels.has('kaito_leaderboard') && (
          <div key="kaito_leaderboard" className="h-full">
            <KaitoLeaderboard
              onClose={() => handleRemovePanel('kaito_leaderboard')}
            />
          </div>
        )}

        {visiblePanels.has('token_holders') && (
          <div key="token_holders" className="h-full">
            <TokenHolderPanel
              onClose={() => handleRemovePanel('token_holders')}
            />
          </div>
        )}

        {visiblePanels.has('bundlers') && (
          <div key="bundlers" className="h-full">
            <BundlerPanel onClose={() => handleRemovePanel('bundlers')} />
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
}
