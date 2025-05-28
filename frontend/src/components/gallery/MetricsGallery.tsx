'use client';
import { OnboardingTutorial } from '@/components/tutorial/onboarding-tutorial';
import { useTutorial } from '@/hooks/use-tutorial';
import { PANEL_HEIGHT } from '@/lib/config/metrics';
import type { UserRelationship } from '@/lib/services/relationships';
import { relationshipsService } from '@/lib/services/relationships';
import { tokenMetricsService } from '@/lib/services/token-metrics-service';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import type { RelationshipsPanelProps } from '@/types/metrics/gallery';
import type {
  TokenSnapshot,
  TokenWithEngagement,
} from '@/types/token-monitor/token';
import { Filter, Maximize2, Network, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
import { KaitoLeaderboard } from './KaitoLeaderboard';
import { LaunchedTokensPanel } from './LaunchedTokensPanel';
import { MarketStatsPanel } from './MarketStatsPanel';
import { MindsharePanel } from './MindsharePanel';
import { NewsPanel } from './NewsPanel';
import { TokenTweetsPanel } from './TokenTweetsPanel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';

const RelationshipsPanel = dynamic<RelationshipsPanelProps>(
  () => import('./RelationshipsPanel').then((mod) => mod.RelationshipsPanel),
  { ssr: false },
);

type RightTab = 'tweets' | 'news' | 'tokenTweets';

interface MetricsGalleryState {
  tokenAddress: string;
  isDialogOpen: boolean;
  maximizedPanel: 'socials' | 'mindshare' | 'trending' | 'market' | null;
  relationships: UserRelationship[];
  relationshipsLoading: boolean;
  tokensWithEngagement: TokenWithEngagement[];
  tokenSnapshotsLoading: boolean;
  tokenSnapshots: TokenSnapshot[];
  selectedToken: TokenWithEngagement | null;
  activeRightTab: RightTab;
}

export function MetricsGallery() {
  const { isTutorialOpen, closeTutorial } = useTutorial();
  const [state, setState] = useState<MetricsGalleryState>({
    tokenAddress: '',
    isDialogOpen: false,
    maximizedPanel: null,
    relationships: [],
    relationshipsLoading: true,
    tokensWithEngagement: [],
    tokenSnapshotsLoading: true,
    tokenSnapshots: [],
    selectedToken: null,
    activeRightTab: 'tweets',
  });

  const [timeframe, setTimeframe] = useState<TimeFrame>('1d');

  // Add event listener for switchToTrending
  useEffect(() => {
    const handleSwitchToTrending = () => {
      setState((prev) => ({ ...prev, activeRightTab: 'tweets' }));
    };

    window.addEventListener(
      'switchToTrending',
      handleSwitchToTrending as EventListener,
    );
    return () => {
      window.removeEventListener(
        'switchToTrending',
        handleSwitchToTrending as EventListener,
      );
    };
  }, []);

  // Add timeframe handler
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
    tokenMetricsService.setTimeframe(newTimeframe);
  };

  // Initial token snapshots fetch - runs only once on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) {
        return;
      }

      setState((prev) => ({ ...prev, tokenSnapshotsLoading: true }));
      try {
        tokenMetricsService.setTimeframe(timeframe);
        const snapshots =
          await tokenMetricsService.fetchInitialTokenSnapshots();
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            tokenSnapshots: snapshots,
          }));
        }
      } catch (error) {
        console.error('Error fetching initial token snapshots:', error);
      } finally {
        if (isMounted) {
          setState((prev) => ({ ...prev, tokenSnapshotsLoading: false }));
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  // Token snapshots subscription - updates when timeframe changes
  useEffect(() => {
    const setupSubscription = async () => {
      const unsubscribe = await tokenMetricsService.setupSubscription(
        (snapshots) => {
          setState((prev) => ({
            ...prev,
            tokenSnapshots: snapshots,
          }));
        },
      );
      return unsubscribe;
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  // Fetch relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const relationships =
          await relationshipsService.getTopUserRelationships();
        setState((prev) => ({
          ...prev,
          relationships,
          relationshipsLoading: false,
        }));
      } catch (error) {
        console.error('Error fetching relationships:', error);
        setState((prev) => ({
          ...prev,
          relationshipsLoading: false,
        }));
      }
    };

    fetchRelationships();
  }, []);

  // Update token snapshots with engagement
  useEffect(() => {
    const updateTokensWithEngagement = async () => {
      if (state.tokenSnapshots.length === 0) {
        return;
      }

      try {
        const tokensWithEngagement =
          await tokenMetricsService.fetchTweetEngagement(state.tokenSnapshots);
        setState((prev) => ({
          ...prev,
          tokensWithEngagement,
        }));
      } catch (error) {
        console.error('Error updating tokens with engagement:', error);
      }
    };

    updateTokensWithEngagement();
  }, [state.tokenSnapshots]);

  // Handle token selection
  const handleTokenSelect = (token: TokenWithEngagement | null) => {
    const newTab: RightTab = token ? 'tokenTweets' : 'tweets';
    setState((prev) => ({
      ...prev,
      selectedToken: token,
      activeRightTab: newTab,
      tokenAddress: token?.token_address || '',
    }));
  };

  const renderMaximizedContent = () => {
    switch (state.maximizedPanel) {
      case 'socials':
        return (
          <Tabs defaultValue="mindshare" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  socials
                </h2>
              </div>
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="mindshare"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  mindshare
                </TabsTrigger>
                <TabsTrigger
                  value="yaps"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  yaps
                </TabsTrigger>
                <TabsTrigger
                  value="relationships"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  links
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="yaps" className="h-full">
                <KaitoLeaderboard maxHeight={PANEL_HEIGHT} />
              </TabsContent>
              <TabsContent value="relationships" className="h-full">
                <RelationshipsPanel
                  maxHeight={PANEL_HEIGHT}
                  relationships={state.relationships}
                  loading={state.relationshipsLoading}
                />
              </TabsContent>
              <TabsContent value="mindshare" className="h-full">
                <MindsharePanel maxHeight={PANEL_HEIGHT} />
              </TabsContent>
            </div>
          </Tabs>
        );
      case 'mindshare':
        return null;
      case 'trending':
        return (
          <Tabs defaultValue="tweets" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  tweets
                </h2>
              </div>
              <TabsList className="bg-transparent">
                {state.selectedToken && (
                  <TabsTrigger
                    value="tokenTweets"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    token tweets
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="tweets"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                >
                  trending
                </TabsTrigger>
                <TabsTrigger
                  value="news"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                >
                  news
                </TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-white/40 hover:text-white"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    maximizedPanel: 'trending',
                  }))
                }
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tweets" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <TrendingTweetsPanel
                    maxHeight={PANEL_HEIGHT}
                    className={
                      state.maximizedPanel === 'trending' ? 'expanded' : ''
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <NewsPanel
                    maxHeight={PANEL_HEIGHT}
                    className={
                      state.maximizedPanel === 'trending' ? 'expanded' : ''
                    }
                  />
                </div>
              </TabsContent>
              {state.selectedToken && (
                <TabsContent
                  value="tokenTweets"
                  className="h-full overflow-auto"
                >
                  <div className="h-full overflow-auto">
                    <TokenTweetsPanel
                      tweetIds={state.selectedToken.tweet_ids || []}
                      tweets={
                        (state.selectedToken as TokenWithEngagement).engagement
                          ?.tweets
                      }
                    />
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        );
      case 'market':
        return (
          <Tabs defaultValue="trending" className="h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  tokens
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Dialog
                  open={state.isDialogOpen}
                  onOpenChange={(open) =>
                    setState((prev) => ({ ...prev, isDialogOpen: open }))
                  }
                >
                  <DialogTrigger asChild={true}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white"
                    >
                      <Filter className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-sm text-white lowercase tracking-wide font-display">
                        set token address
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="enter token address (0x...)"
                        value={state.tokenAddress}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            tokenAddress: e.target.value,
                          }))
                        }
                        className="bg-white/5 border-white/10 text-xs text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full text-xs lowercase tracking-wide font-display"
                        onClick={() =>
                          setState((prev) => ({ ...prev, isDialogOpen: false }))
                        }
                      >
                        apply
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="trending"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="launched"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    launched
                  </TabsTrigger>
                  <TabsTrigger
                    value="mindshare"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    mindshare
                  </TabsTrigger>
                  <TabsTrigger
                    value="yaps"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    yaps
                  </TabsTrigger>
                  <TabsTrigger
                    value="relationships"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    links
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="trending" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MarketStatsPanel
                    tokenSnapshots={state.tokensWithEngagement}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    loading={state.tokenSnapshotsLoading}
                    error={null}
                    selectedTokenAddress={state.selectedToken?.token_address}
                    onTokenSelect={handleTokenSelect}
                    selectedToken={state.selectedToken as TokenWithEngagement}
                  />
                </div>
              </TabsContent>
              <TabsContent value="launched" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <LaunchedTokensPanel />
                </div>
              </TabsContent>
              <TabsContent value="mindshare" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MindsharePanel />
                </div>
              </TabsContent>
              <TabsContent value="yaps" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <KaitoLeaderboard />
                </div>
              </TabsContent>
              <TabsContent
                value="relationships"
                className="h-full overflow-auto"
              >
                <div className="h-full overflow-auto">
                  <RelationshipsPanel
                    relationships={state.relationships}
                    loading={state.relationshipsLoading}
                  />
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
    <div className="py-2 px-4 h-[calc(100vh-theme(spacing.header)-theme(spacing.banner))] overflow-hidden">
      <Dialog
        open={state.maximizedPanel !== null}
        onOpenChange={() =>
          setState((prev) => ({ ...prev, maximizedPanel: null }))
        }
      >
        <DialogContent className="max-w-[80vw] w-[1200px] max-h-[80vh] h-[800px] bg-black/90 border-white/10">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {state.maximizedPanel
                ? `${state.maximizedPanel} panel`
                : 'panel view'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            {renderMaximizedContent()}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-12 gap-2 h-full relative">
        {/* Vertical divider */}
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/5" />

        {/* Left Column - Market (8/12 = 2/3 width) */}
        <div
          className="col-span-8 flex flex-col min-h-0"
          data-tutorial="market-section"
        >
          <Tabs
            defaultValue="trending"
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  market
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Dialog
                  open={state.isDialogOpen}
                  onOpenChange={(open) =>
                    setState((prev) => ({ ...prev, isDialogOpen: open }))
                  }
                >
                  <DialogTrigger asChild={true}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white"
                    >
                      <Filter className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-sm text-white lowercase tracking-wide font-display">
                        set token address
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="enter token address (0x...)"
                        value={state.tokenAddress}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            tokenAddress: e.target.value,
                          }))
                        }
                        className="bg-white/5 border-white/10 text-xs text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full text-xs lowercase tracking-wide font-display"
                        onClick={() =>
                          setState((prev) => ({ ...prev, isDialogOpen: false }))
                        }
                      >
                        apply
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <TabsList
                  className="bg-transparent"
                  data-tutorial="market-tabs"
                >
                  <TabsTrigger
                    value="trending"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="launched"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    launched
                  </TabsTrigger>
                  <TabsTrigger
                    value="mindshare"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    mindshare
                  </TabsTrigger>
                  <TabsTrigger
                    value="yaps"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    yaps
                  </TabsTrigger>
                  <TabsTrigger
                    value="relationships"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    links
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-white/40 hover:text-white"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      maximizedPanel: 'market',
                    }))
                  }
                  data-tutorial="maximize-button"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TabsContent value="trending" className="h-full overflow-auto">
                <div
                  className="h-full overflow-auto"
                  data-tutorial="token-list"
                >
                  <MarketStatsPanel
                    tokenSnapshots={state.tokensWithEngagement}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    loading={state.tokenSnapshotsLoading}
                    error={null}
                    selectedTokenAddress={state.selectedToken?.token_address}
                    onTokenSelect={handleTokenSelect}
                    selectedToken={state.selectedToken as TokenWithEngagement}
                  />
                </div>
              </TabsContent>
              <TabsContent value="launched" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <LaunchedTokensPanel />
                </div>
              </TabsContent>
              <TabsContent value="mindshare" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MindsharePanel />
                </div>
              </TabsContent>
              <TabsContent value="yaps" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <KaitoLeaderboard />
                </div>
              </TabsContent>
              <TabsContent
                value="relationships"
                className="h-full overflow-auto"
              >
                <div className="h-full overflow-auto">
                  <RelationshipsPanel
                    relationships={state.relationships}
                    loading={state.relationshipsLoading}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column - Tweets (4/12 = 1/3 width) */}
        <div
          className="col-span-4 flex flex-col min-h-0"
          data-tutorial="tweets-section"
        >
          <Tabs
            value={state.activeRightTab}
            onValueChange={(value) => {
              if (
                value === 'tweets' ||
                value === 'news' ||
                value === 'tokenTweets'
              ) {
                setState((prev) => ({ ...prev, activeRightTab: value }));
              }
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  tweets
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList
                  className="bg-transparent"
                  data-tutorial="tweets-tabs"
                >
                  {state.selectedToken && (
                    <TabsTrigger
                      value="tokenTweets"
                      className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                    >
                      token
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="tweets"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="news"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    news
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-white/40 hover:text-white"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      maximizedPanel: 'trending',
                    }))
                  }
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TabsContent value="tweets" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <TrendingTweetsPanel
                    maxHeight={PANEL_HEIGHT}
                    className={
                      state.maximizedPanel === 'trending' ? 'expanded' : ''
                    }
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <NewsPanel
                    maxHeight={PANEL_HEIGHT}
                    className={
                      state.maximizedPanel === 'trending' ? 'expanded' : ''
                    }
                  />
                </div>
              </TabsContent>
              {state.selectedToken && (
                <TabsContent
                  value="tokenTweets"
                  className="h-full overflow-auto"
                >
                  <div className="h-full overflow-auto">
                    <TokenTweetsPanel
                      tweetIds={state.selectedToken.tweet_ids || []}
                      tweets={
                        (state.selectedToken as TokenWithEngagement).engagement
                          ?.tweets
                      }
                    />
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {/* Tutorial Component */}
      <OnboardingTutorial isOpen={isTutorialOpen} onClose={closeTutorial} />
    </div>
  );
}
