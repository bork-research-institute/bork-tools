'use client';
import {
  type UserRelationship,
  relationshipsService,
} from '@/lib/services/relationships';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { tokenSnapshotService } from '@/lib/services/token-snapshot-service';
import { type TrendingTweet, tweetService } from '@/lib/services/tweets';
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
import { BundlerPanel } from './BundlerPanel';
import { KaitoLeaderboard } from './KaitoLeaderboard';
import { MarketStatsPanel } from './MarketStatsPanel';
import { MindsharePanel } from './MindsharePanel';
import { NewsPanel } from './NewsPanel';
import { TokenHolderPanel } from './TokenHolderPanel';
import { TokenTweetsPanel } from './TokenTweetsPanel';
import { TrendingTweetsPanel } from './TrendingTweetsPanel';

interface RelationshipsPanelProps {
  maxHeight?: string;
  relationships: UserRelationship[];
  loading: boolean;
}

const RelationshipsPanel = dynamic<RelationshipsPanelProps>(
  () => import('./RelationshipsPanel').then((mod) => mod.RelationshipsPanel),
  { ssr: false },
);

// Calculate available height by subtracting header and banner
const PANEL_HEIGHT =
  'calc(100vh - theme(spacing.header) - theme(spacing.banner))';

export function MetricsGallery() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [trendingTweets, setTrendingTweets] = useState<TrendingTweet[]>([]);
  const [newsTweets, setNewsTweets] = useState<TrendingTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<UserRelationship[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [tokensWithEngagement, setTokensWithEngagement] = useState<
    TokenWithEngagement[]
  >([]);
  const [tokenSnapshotsLoading, setTokenSnapshotsLoading] = useState(true);

  const [timeframe, setTimeframe] = useState<TimeFrame>('1d');
  const [tokenSnapshots, setTokenSnapshots] = useState<TokenSnapshot[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenSnapshot | null>(
    null,
  );
  const [activeRightTab, setActiveRightTab] = useState('tweets');

  // Add event listener for switchToTrending
  useEffect(() => {
    const handleSwitchToTrending = () => {
      setActiveRightTab('tweets');
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
      setTokenSnapshotsLoading(true);
      try {
        tokenSnapshotService.setTimeframe(timeframe);
        const snapshots = await tokenSnapshotService.getTokenSnapshots();
        if (isMounted) {
          const transformedSnapshots = transformSnapshots(snapshots);
          setTokenSnapshots(transformedSnapshots);
        }
      } catch (error) {
        console.error('Error fetching initial token snapshots:', error);
      } finally {
        if (isMounted) {
          setTokenSnapshotsLoading(false);
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
          setTokenSnapshots(transformedSnapshots);
        },
      );
      return unsubscribe;
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then((unsubscribe) => unsubscribe?.());
    };
  }, [timeframe]);

  // Helper function to transform snapshots
  const transformSnapshots = (snapshots: TokenSnapshot[]): TokenSnapshot[] => {
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      token_address: snapshot.token_address,
      timestamp: snapshot.timestamp,
      created_at: snapshot.created_at,
      tweet_ids: snapshot.tweet_ids || [],
      data: {
        ...snapshot.data,
        timestamp: snapshot.data.timestamp || snapshot.timestamp,
        priceInfo: snapshot.data.priceInfo
          ? {
              ...snapshot.data.priceInfo,
              lastTradeAt: snapshot.data.priceInfo.lastTradeAt,
            }
          : undefined,
        liquidityMetrics: snapshot.data.liquidityMetrics
          ? {
              ...snapshot.data.liquidityMetrics,
              volumeMetrics: snapshot.data.liquidityMetrics.volumeMetrics
                ? {
                    ...snapshot.data.liquidityMetrics.volumeMetrics,
                  }
                : undefined,
            }
          : undefined,
      },
    }));
  };

  // Fetch tweets and calculate engagement for tokens
  useEffect(() => {
    const fetchTweetEngagement = async () => {
      if (!tokenSnapshots) {
        return;
      }

      const updatedTokens = await Promise.all(
        tokenSnapshots.map(async (token) => {
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

            // Calculate engagement metrics from valid tweets
            const engagement = validTweets.reduce(
              (acc, tweet) => ({
                likes: acc.likes + (tweet.likes || 0),
                replies: acc.replies + (tweet.replies || 0),
                retweets: acc.retweets + (tweet.retweets || 0),
                views: acc.views + (tweet.views || 0),
              }),
              { likes: 0, replies: 0, retweets: 0, views: 0 },
            );

            // Return token with both aggregated metrics and full tweet data
            return {
              ...token,
              engagement: {
                ...engagement,
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

      setTokensWithEngagement(updatedTokens);
    };

    fetchTweetEngagement();
  }, [tokenSnapshots]);

  // Fetch trending and news tweets
  useEffect(() => {
    const fetchTweets = async () => {
      setLoading(true);
      try {
        // Fetch regular tweets
        const trendingData = await tweetService.getTrendingTweets(20);
        const uniqueTrendingTweets = new Map(
          trendingData.map((tweet) => [tweet.tweet_id, tweet]),
        );
        setTrendingTweets(Array.from(uniqueTrendingTweets.values()));

        // Fetch news tweets
        const newsData = await tweetService.getNewsTweets(20);
        const uniqueNewsTweets = new Map(
          newsData.map((tweet) => [tweet.tweet_id, tweet]),
        );
        setNewsTweets(Array.from(uniqueNewsTweets.values()));
      } catch (error) {
        console.error('Error fetching tweets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, []);

  // Add useEffect for fetching relationships
  useEffect(() => {
    const fetchRelationships = async () => {
      setRelationshipsLoading(true);
      try {
        const data = await relationshipsService.getTopUserRelationships(100);
        setRelationships(data);
      } catch (error) {
        console.error('Error fetching relationships:', error);
      } finally {
        setRelationshipsLoading(false);
      }
    };

    fetchRelationships();
  }, []);

  const renderMaximizedContent = () => {
    switch (maximizedPanel) {
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
                  relationships={relationships}
                  loading={relationshipsLoading}
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
                {selectedToken && (
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
                onClick={() => setMaximizedPanel('trending')}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tweets" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <TrendingTweetsPanel
                    tweets={trendingTweets}
                    loading={loading}
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full">
                <NewsPanel
                  maxHeight={PANEL_HEIGHT}
                  tweets={newsTweets}
                  loading={loading}
                />
              </TabsContent>
              {selectedToken && (
                <TabsContent
                  value="tokenTweets"
                  className="h-full overflow-auto"
                >
                  <div className="h-full overflow-auto">
                    <TokenTweetsPanel
                      tweetIds={selectedToken.tweet_ids || []}
                      tweets={
                        (selectedToken as TokenWithEngagement).engagement
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
          <Tabs defaultValue="market" className="h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  tokens
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
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        className="bg-white/5 border-white/10 text-xs text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full text-xs lowercase tracking-wide font-display"
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
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    risk eval
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="market" className="h-full">
                <MarketStatsPanel
                  tokenSnapshots={tokensWithEngagement}
                  timeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                  loading={tokenSnapshotsLoading}
                  error={null}
                  selectedTokenAddress={selectedToken?.token_address}
                  onTokenSelect={(token) => {
                    setSelectedToken(token);
                    if (token) {
                      setActiveRightTab('tokenTweets');
                    } else {
                      setActiveRightTab('tweets');
                    }
                  }}
                  selectedToken={selectedToken as TokenWithEngagement}
                />
              </TabsContent>
              <TabsContent value="risk" className="h-full overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full overflow-auto">
                  <BundlerPanel tokenAddress={tokenAddress} />
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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        className="bg-white/5 border-white/10 text-xs text-white lowercase tracking-wide"
                      />
                      <Button
                        className="w-full text-xs lowercase tracking-wide font-display"
                        onClick={() => setIsDialogOpen(false)}
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
                  onClick={() => setMaximizedPanel('market')}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TabsContent value="trending" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MarketStatsPanel
                    tokenSnapshots={tokensWithEngagement}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    loading={tokenSnapshotsLoading}
                    error={null}
                    selectedTokenAddress={selectedToken?.token_address}
                    onTokenSelect={(token) => {
                      setSelectedToken(token);
                      if (token) {
                        setActiveRightTab('tokenTweets');
                      } else {
                        setActiveRightTab('tweets');
                      }
                    }}
                    selectedToken={selectedToken as TokenWithEngagement}
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
                    relationships={relationships}
                    loading={relationshipsLoading}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column - Tweets (4/12 = 1/3 width) */}
        <div className="col-span-4 flex flex-col min-h-0">
          <Tabs
            value={activeRightTab}
            onValueChange={setActiveRightTab}
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
                  {selectedToken && (
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
                  onClick={() => setMaximizedPanel('trending')}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TabsContent value="tweets" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <TrendingTweetsPanel
                    tweets={trendingTweets}
                    loading={loading}
                  />
                </div>
              </TabsContent>
              <TabsContent value="news" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <NewsPanel tweets={newsTweets} loading={loading} />
                </div>
              </TabsContent>
              {selectedToken && (
                <TabsContent
                  value="tokenTweets"
                  className="h-full overflow-auto"
                >
                  <div className="h-full overflow-auto">
                    <TokenTweetsPanel
                      tweetIds={selectedToken.tweet_ids || []}
                      tweets={
                        (selectedToken as TokenWithEngagement).engagement
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
