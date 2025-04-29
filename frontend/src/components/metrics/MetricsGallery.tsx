'use client';
import {
  type MarketStat,
  type TimeFrame,
  marketStatsService,
} from '@/lib/services/market-stats-service';
import {
  type UserRelationship,
  relationshipsService,
} from '@/lib/services/relationships';
import { type TrendingTweet, tweetService } from '@/lib/services/tweets';
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

  // Add new states for market stats
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [marketStatsLoading, setMarketStatsLoading] = useState(true);
  const [marketStatsError, setMarketStatsError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1h');

  useEffect(() => {
    const fetchTweets = async () => {
      setLoading(true);
      try {
        // Fetch regular tweets
        const trendingData = await tweetService.getTrendingTweets(20);
        // Create a Map to store unique tweets by tweet_id
        const uniqueTrendingTweets = new Map(
          trendingData.map((tweet) => [tweet.tweet_id, tweet]),
        );
        setTrendingTweets(Array.from(uniqueTrendingTweets.values()));

        // Fetch news tweets
        const newsData = await tweetService.getNewsTweets(20);
        // Create a Map to store unique tweets by tweet_id
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

  // Initialize market stats service
  useEffect(() => {
    console.log('Initializing market stats service...');
    // Ensure we're using the singleton instance
    const service = marketStatsService;
    console.log('Market stats service initialized:', service);
  }, []);

  // Add useEffect for market stats
  useEffect(() => {
    let isSubscribed = true;

    const fetchMarketStats = async () => {
      try {
        console.log('Fetching market stats with timeframe:', timeframe);
        setMarketStatsLoading(true);
        setMarketStatsError(null);
        marketStatsService.setTimeframe(timeframe);

        // Add more detailed logging for the Supabase query
        const stats = await marketStatsService.getMarketStats();
        console.log('Received market stats:', {
          count: stats.length,
          timeframe,
          firstItem: stats[0],
          stats,
        });

        if (isSubscribed) {
          setMarketStats(stats);
        }
      } catch (err) {
        console.error('Error fetching market stats:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          timeframe,
        });
        if (isSubscribed) {
          setMarketStatsError(
            err instanceof Error ? err.message : 'Failed to fetch market stats',
          );
        }
      } finally {
        if (isSubscribed) {
          setMarketStatsLoading(false);
        }
      }
    };

    const setupMarketStatsSubscription = async () => {
      try {
        console.log(
          'Setting up market stats subscription with timeframe:',
          timeframe,
        );
        const unsubscribe = await marketStatsService.subscribeToMarketStats(
          (stats) => {
            console.log('Received stats from subscription:', {
              count: stats.length,
              timeframe,
              firstItem: stats[0],
              stats,
            });
            if (isSubscribed) {
              setMarketStats(stats);
            }
          },
        );
        return unsubscribe;
      } catch (err) {
        console.error('Error setting up market stats subscription:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          timeframe,
        });
        return () => {};
      }
    };

    let unsubscribe = () => {};

    fetchMarketStats();
    setupMarketStatsSubscription().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      console.log(
        'Cleaning up market stats subscription for timeframe:',
        timeframe,
      );
      isSubscribed = false;
      unsubscribe();
    };
  }, [timeframe]);

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
                  trending
                </h2>
              </div>
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="tweets"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  tweets
                </TabsTrigger>
                <TabsTrigger
                  value="news"
                  className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                >
                  news
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="tweets" className="h-full">
                <TrendingTweetsPanel
                  tweets={trendingTweets}
                  loading={loading}
                />
              </TabsContent>
              <TabsContent value="news" className="h-full">
                <NewsPanel
                  maxHeight={PANEL_HEIGHT}
                  tweets={newsTweets}
                  loading={loading}
                />
              </TabsContent>
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
                  market
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild={true}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/40 hover:text-white"
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
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                  >
                    technicals
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/5 lowercase tracking-wide font-display"
                  >
                    risk analysis (mock data)
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="market" className="h-full">
                <MarketStatsPanel
                  maxHeight={PANEL_HEIGHT}
                  marketStats={marketStats}
                  isLoading={marketStatsLoading}
                  error={marketStatsError}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                />
              </TabsContent>
              <TabsContent value="risk" className="h-full">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <BundlerPanel
                    maxHeight={PANEL_HEIGHT}
                    tokenAddress={tokenAddress}
                  />
                  <TokenHolderPanel maxHeight={PANEL_HEIGHT} />
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
    <div className="p-4 h-[calc(100vh-theme(spacing.header)-theme(spacing.banner))] overflow-hidden">
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

      <div className="grid grid-cols-12 gap-6 h-full relative">
        {/* Vertical dividers */}
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/5" />

        {/* Left Column - Socials (Full Height) */}
        <div className="col-span-4 flex flex-col min-h-0">
          <Tabs
            defaultValue="mindshare"
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  socials
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="bg-transparent">
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
                  onClick={() => setMaximizedPanel('socials')}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
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
              <TabsContent value="mindshare" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MindsharePanel />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Middle Column - Market */}
        <div className="col-span-4 flex flex-col min-h-0">
          <Tabs defaultValue="market" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
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
                    value="market"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    technicals
                  </TabsTrigger>
                  <TabsTrigger
                    value="risk"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    risk analysis (mock data)
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
              <TabsContent value="market" className="h-full overflow-auto">
                <div className="h-full overflow-auto">
                  <MarketStatsPanel
                    marketStats={marketStats}
                    isLoading={marketStatsLoading}
                    error={marketStatsError}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                  />
                </div>
              </TabsContent>
              <TabsContent value="risk" className="h-full overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full overflow-auto">
                  <BundlerPanel tokenAddress={tokenAddress} />
                  <TokenHolderPanel />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column - Trending */}
        <div className="col-span-4 flex flex-col min-h-0">
          <Tabs defaultValue="tweets" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-white/60" />
                <h2 className="text-sm text-white/90 lowercase tracking-wide font-display">
                  trending
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="bg-transparent">
                  <TabsTrigger
                    value="tweets"
                    className="text-xs text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/50 lowercase tracking-wide font-display"
                  >
                    tweets
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
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
