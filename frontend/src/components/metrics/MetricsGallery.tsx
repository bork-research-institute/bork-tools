'use client';
import { Brain, Filter, Maximize2, Network, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { newsItems } from '../../mocks/metricsData';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BundlerPanel } from './BundlerPanel';
import { KaitoLeaderboard } from './KaitoLeaderboard';
import { MarketStatsPanel } from './MarketStatsPanel';
import { MindsharePanel } from './MindsharePanel';
import { TokenHolderPanel } from './TokenHolderPanel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';

interface RelationshipsPanelProps {
  maxHeight?: string;
}

const RelationshipsPanel = dynamic<RelationshipsPanelProps>(
  () => import('./RelationshipsPanel').then((mod) => mod.RelationshipsPanel),
  { ssr: false },
);

const ROW_HEIGHT = 300; // Base height for single row panels
const DOUBLE_ROW_HEIGHT = ROW_HEIGHT * 2 + 24; // Height for double row panels, including gap

export function MetricsGallery() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);

  const renderMaximizedContent = () => {
    switch (maximizedPanel) {
      case 'socials':
        return (
          <Tabs defaultValue="yaps" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  socials
                </h2>
              </div>
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="yaps"
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  top users
                </TabsTrigger>
                <TabsTrigger
                  value="relationships"
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  map
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="yaps" className="h-full">
                <KaitoLeaderboard maxHeight="calc(90vh - 120px)" />
              </TabsContent>
              <TabsContent value="relationships" className="h-full">
                <RelationshipsPanel maxHeight="calc(90vh - 120px)" />
              </TabsContent>
            </div>
          </Tabs>
        );
      case 'mindshare':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  mindshare
                </h2>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <MindsharePanel maxHeight="calc(90vh - 120px)" />
            </div>
          </div>
        );
      case 'trending':
        return (
          <Tabs defaultValue="tweets" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  trending
                </h2>
              </div>
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="tweets"
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  tweets
                </TabsTrigger>
                <TabsTrigger
                  value="news"
                  className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  news
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tweets" className="h-full">
                <TrendingTweetsPanel maxHeight="calc(90vh - 120px)" />
              </TabsContent>
              <TabsContent value="news" className="h-full">
                <div className="space-y-6">
                  {newsItems.map((item) => (
                    <div
                      key={`${item.source}-${item.title}`}
                      className="pb-6 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/40 lowercase font-display">
                          {item.source.toLowerCase()}
                        </span>
                        <span className="text-xs text-white/20">•</span>
                        <span className="text-xs text-white/40">
                          {item.timeAgo}
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mb-2 lowercase font-display">
                        {item.category.toLowerCase()}
                      </div>
                      <h3 className="text-white/90 text-sm mb-2 lowercase font-display">
                        {item.title.toLowerCase()}
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        );
      case 'market':
        return (
          <Tabs defaultValue="market" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  market
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild={true}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-white lowercase tracking-wide font-display">
                        set token address
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="enter token address (0x...)"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        className="bg-white/5 border-white/10 text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full lowercase tracking-wide font-display"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        apply
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="market"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                  >
                    technicals
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                  >
                    risk analysis
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="market" className="h-full">
                <MarketStatsPanel maxHeight="calc(90vh - 120px)" />
              </TabsContent>
              <TabsContent value="risk" className="h-full">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <BundlerPanel
                    maxHeight="calc(90vh - 120px)"
                    tokenAddress={tokenAddress}
                  />
                  <TokenHolderPanel maxHeight="calc(90vh - 120px)" />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <Dialog
        open={maximizedPanel !== null}
        onOpenChange={() => setMaximizedPanel(null)}
      >
        <DialogContent className="max-w-[80vw] w-[1200px] max-h-[80vh] h-[800px] bg-black/90 border-white/10">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {maximizedPanel ? `${maximizedPanel} panel` : 'panel view'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            {renderMaximizedContent()}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)] relative">
        {/* Vertical dividers */}
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/5" />
        {/* Horizontal divider */}
        <div
          className="absolute left-0 right-0 top-1/2 h-px bg-white/5"
          style={{ width: '66.666667%' }}
        />

        {/* Top Row */}
        <div className="col-span-4" style={{ height: ROW_HEIGHT }}>
          <Tabs defaultValue="yaps" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  socials
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="yaps"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    top users
                  </TabsTrigger>
                  <TabsTrigger
                    value="relationships"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    map
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-white/40 hover:text-white"
                  onClick={() => setMaximizedPanel('socials')}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="yaps" className="h-full">
                <KaitoLeaderboard maxHeight={`${ROW_HEIGHT - 48}px`} />
              </TabsContent>
              <TabsContent value="relationships" className="h-full">
                <RelationshipsPanel maxHeight={`${ROW_HEIGHT - 48}px`} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="col-span-4" style={{ height: ROW_HEIGHT }}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  mindshare
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-white/40 hover:text-white"
                onClick={() => setMaximizedPanel('mindshare')}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MindsharePanel maxHeight={`${ROW_HEIGHT - 48}px`} />
            </div>
          </div>
        </div>

        <div
          className="col-span-4 row-span-2"
          style={{ height: DOUBLE_ROW_HEIGHT }}
        >
          <Tabs defaultValue="tweets" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  trending
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="tweets"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    tweets
                  </TabsTrigger>
                  <TabsTrigger
                    value="news"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    news
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-white/40 hover:text-white"
                  onClick={() => setMaximizedPanel('trending')}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tweets" className="h-full">
                <TrendingTweetsPanel
                  maxHeight={`${DOUBLE_ROW_HEIGHT - 48}px`}
                />
              </TabsContent>
              <TabsContent value="news" className="h-full">
                <div className="space-y-6">
                  {newsItems.map((item) => (
                    <div
                      key={`${item.source}-${item.title}`}
                      className="pb-6 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/40 lowercase font-display">
                          {item.source.toLowerCase()}
                        </span>
                        <span className="text-xs text-white/20">•</span>
                        <span className="text-xs text-white/40">
                          {item.timeAgo}
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mb-2 lowercase font-display">
                        {item.category.toLowerCase()}
                      </div>
                      <h3 className="text-white/90 text-sm mb-2 lowercase font-display">
                        {item.title.toLowerCase()}
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Bottom Row */}
        <div className="col-span-8" style={{ height: ROW_HEIGHT }}>
          <Tabs defaultValue="market" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/60" />
                <h2 className="text-lg text-white/90 lowercase tracking-wide font-display">
                  market
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild={true}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-white lowercase tracking-wide font-display">
                        set token address
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="enter token address (0x...)"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        className="bg-white/5 border-white/10 text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full lowercase tracking-wide font-display"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        apply
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="market"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    technicals
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    risk analysis
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-white/40 hover:text-white"
                  onClick={() => setMaximizedPanel('market')}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="market" className="h-full">
                <MarketStatsPanel maxHeight={`${ROW_HEIGHT - 48}px`} />
              </TabsContent>
              <TabsContent value="risk" className="h-full">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <BundlerPanel
                    maxHeight={`${ROW_HEIGHT - 48}px`}
                    tokenAddress={tokenAddress}
                  />
                  <TokenHolderPanel maxHeight={`${ROW_HEIGHT - 48}px`} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
