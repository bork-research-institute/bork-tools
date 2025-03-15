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
import type { Layout } from 'react-grid-layout';

export const panelConfigs = {
  market: {
    title: 'Market Stats',
    icon: <BarChart3 className="h-4 w-4" />,
    w: 3,
    h: 2,
  },
  technical: {
    title: 'Technical Analysis',
    icon: <LineChart className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  network: {
    title: 'Network Activity',
    icon: <Users className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  sentiment: {
    title: 'Sentiment Analysis',
    icon: <MessageCircle className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  community: {
    title: 'Community Engagement',
    icon: <Users className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  quality: {
    title: 'Content Quality',
    icon: <Shield className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  news: {
    title: 'Latest News',
    icon: <Newspaper className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  tweets: {
    title: 'Latest Tweets',
    icon: <Twitter className="h-4 w-4" />,
    w: 2,
    h: 3,
  },
  prices: {
    title: 'Top Prices',
    icon: <BarChart3 className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  unlocks: {
    title: 'Upcoming Unlocks',
    icon: <Clock className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  trending_tweets: {
    title: 'Trending Tweets',
    icon: <Twitter className="h-4 w-4" />,
    w: 1,
    h: 4,
  },
} as const;

export type PanelId = keyof typeof panelConfigs;

// Define the initial layout with varying heights
export const defaultLayout: Layout[] = [
  { i: 'market', x: 0, y: 0, w: 3, h: 2, minH: 2, maxH: 4 },
  { i: 'technical', x: 0, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'network', x: 1, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'sentiment', x: 2, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'community', x: 0, y: 4, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'quality', x: 1, y: 4, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'news', x: 2, y: 4, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'tweets', x: 0, y: 6, w: 2, h: 3, minH: 2, maxH: 4 },
  { i: 'prices', x: 2, y: 6, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'unlocks', x: 0, y: 8, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'trending_tweets', x: 3, y: 0, w: 1, h: 4, minH: 2, maxH: 6 },
];
