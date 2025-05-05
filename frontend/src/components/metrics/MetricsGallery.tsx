'use client';
import { PANEL_HEIGHT } from '@/lib/config/metrics';
import { transformSnapshots } from '@/lib/helpers/metrics';
import { relationshipsService } from '@/lib/services/relationships';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { tokenSnapshotService } from '@/lib/services/token-snapshot-service';
import { tweetService } from '@/lib/services/tweets';
import type {
  MetricsGalleryState,
  RelationshipsPanelProps,
} from '@/types/metrics/gallery';
import type { TokenWithEngagement } from '@/types/token-monitor/token';
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
import { BundlerPanel } from './BundlerPanel';
import { KaitoLeaderboard } from './KaitoLeaderboard';
import { MarketStatsPanel } from './MarketStatsPanel';
import { MindsharePanel } from './MindsharePanel';
import { NewsPanel } from './NewsPanel';
import { TokenHolderPanel } from './TokenHolderPanel';
import { TokenTweetsPanel } from './TokenTweetsPanel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';

const RelationshipsPanel = dynamic<RelationshipsPanelProps>(
  () => import('./RelationshipsPanel').then((mod) => mod.RelationshipsPanel),
  { ssr: false },
);

export function MetricsGallery() {
  const [state, setState] = useState<MetricsGalleryState>({
    tokenAddress: '',
    isDialogOpen: false,
    maximizedPanel: null,
    trendingTweets: [],
    newsTweets: [],
    loading: true,
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

    window.addEventListener('switchToTrending', handleSwitchToTrending);
    return () => {
      window.removeEventListener('switchToTrending', handleSwitchToTrending);
    };
  }, []);

  // Add timeframe handler
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
  };

  // Initial token snapshots fetch - runs only once on mount
  useEffect(() => {
    let isMounted = true;

    const fetchInitialTokenSnapshots = async () => {
      if (!isMounted) {
        return;
      }
      setState((prev) => ({ ...prev, tokenSnapshotsLoading: true }));
      try {
        tokenSnapshotService.setTimeframe(timeframe);
        const snapshots = await tokenSnapshotService.getTokenSnapshots();
        if (isMounted) {
          const transformedSnapshots = transformSnapshots(snapshots);
          setState((prev) => ({
            ...prev,
            tokenSnapshots: transformedSnapshots,
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

    fetchInitialTokenSnapshots();

    return () => {
      isMounted = false;
    };
  }, [timeframe]); // Include timeframe in dependencies since we're using it

  // Token snapshots subscription - updates when timeframe changes
  useEffect(() => {
    const setupSubscription = async () => {
      tokenSnapshotService.setTimeframe(timeframe);
      const unsubscribe = await tokenSnapshotService.subscribeToTokenSnapshots(
        (snapshots) => {
          const transformedSnapshots = transformSnapshots(snapshots);
          setState((prev) => ({
            ...prev,
            tokenSnapshots: transformedSnapshots,
          }));
        },
      );
      return unsubscribe;
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then((unsubscribe) => unsubscribe?.());
    };
  }, [timeframe]);

  // Fetch tweets and calculate engagement for tokens
  useEffect(() => {
    const fetchTweetEngagement = async () => {
      if (!state.tokenSnapshots) {
        return;
      }

      const updatedTokens = await Promise.all(
        state.tokenSnapshots.map(async (token) => {
          if (!token.tweet_ids || token.tweet_ids.length === 0) {
            return {
              ...token,
              engagement: {
                likes: 0,
                replies: 0,
                retweets: 0,
                views: 0,
                tweets: [],
              },
            } as TokenWithEngagement;
          }

          try {
            // Fetch tweets with analyses once
            const tweets = await tweetService.getTweetsAndAnalysesByIds(
              token.tweet_ids,
            );

            // Filter out spam tweets
            const validTweets = tweets.filter(
              (tweet) => tweet.status !== 'spam',
            );

            // Return token with both aggregated metrics and full tweet data
            return {
              ...token,
              engagement: {
                tweets: validTweets, // Include full tweet objects with analyses
              },
            } as TokenWithEngagement;
          } catch (error) {
            console.error('Error fetching tweet data:', error);
            return {
              ...token,
              engagement: {
                likes: 0,
                replies: 0,
                retweets: 0,
                views: 0,
                tweets: [],
              },
            } as TokenWithEngagement;
          }
        }),
      );

      setState((prev) => ({ ...prev, tokensWithEngagement: updatedTokens }));
    };

    fetchTweetEngagement();
  }, [state.tokenSnapshots]);

  // Fetch trending and news tweets
  useEffect(() => {
    const fetchTweets = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        // Fetch regular tweets
        const trendingData = await tweetService.getTrendingTweets(20);
        const uniqueTrendingTweets = new Map(
          trendingData.map((tweet) => [tweet.tweet_id, tweet]),
        );

        // Fetch news tweets
        const newsData = await tweetService.getNewsTweets(20);
        const uniqueNewsTweets = new Map(
          newsData.map((tweet) => [tweet.tweet_id, tweet]),
        );

        setState((prev) => ({
          ...prev,
          trendingTweets: Array.from(uniqueTrendingTweets.values()),
          newsTweets: Array.from(uniqueNewsTweets.values()),
        }));
      } catch (error) {
        console.error('Error fetching tweets:', error);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchTweets();
  }, []);

  // Add useEffect for fetching relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      setState((prev) => ({ ...prev, relationshipsLoading: true }));
      try {
        const data = await relationshipsService.getTopUserRelationships(100);
        setState((prev) => ({ ...prev, relationships: data }));
      } catch (error) {
        console.error('Error fetching relationships:', error);
      } finally {
        setState((prev) => ({ ...prev, relationshipsLoading: false }));
      }
    };

    fetchRelationships();
  }, []);

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
                    tweets={state.trendingTweets}
                    loading={state.loading}
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full">
                <NewsPanel
                  maxHeight={PANEL_HEIGHT}
                  tweets={state.newsTweets}
                  loading={state.loading}
                />
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
              <TabsContent value="trending" className="h-full">
                <MarketStatsPanel
                  tokenSnapshots={state.tokensWithEngagement}
                  timeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                  loading={state.tokenSnapshotsLoading}
                  error={null}
                  selectedTokenAddress={state.selectedToken?.token_address}
                  onTokenSelect={(token) => {
                    setState((prev) => ({
                      ...prev,
                      selectedToken: token,
                      activeRightTab: token === null ? 'tweets' : 'tokenTweets',
                    }));
                  }}
                  selectedToken={state.selectedToken as TokenWithEngagement}
                />
              </TabsContent>
              <TabsContent value="risk" className="h-full overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full overflow-auto">
                  <BundlerPanel tokenAddress={state.tokenAddress} />
                  <TokenHolderPanel />
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
        <div className="col-span-8 flex flex-col min-h-0">
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
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="trending"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    trending
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
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TabsContent value="trending" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MarketStatsPanel
                    tokenSnapshots={state.tokensWithEngagement}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    loading={state.tokenSnapshotsLoading}
                    error={null}
                    selectedTokenAddress={state.selectedToken?.token_address}
                    onTokenSelect={(token) => {
                      setState((prev) => ({
                        ...prev,
                        selectedToken: token,
                        activeRightTab:
                          token === null ? 'tweets' : 'tokenTweets',
                      }));
                    }}
                    selectedToken={state.selectedToken as TokenWithEngagement}
                  />
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
        <div className="col-span-4 flex flex-col min-h-0">
          <Tabs
            value={state.activeRightTab}
            onValueChange={(value) =>
              setState((prev) => ({ ...prev, activeRightTab: value }))
            }
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
                <TabsList className="bg-transparent">
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
                    tweets={state.trendingTweets}
                    loading={state.loading}
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <NewsPanel
                    tweets={state.newsTweets}
                    loading={state.loading}
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
    </div>
  );
}
