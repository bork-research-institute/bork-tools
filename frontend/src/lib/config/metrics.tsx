import {
  BarChart3,
  Box,
  Brain,
  Coins,
  Network,
  Newspaper,
  Trophy,
  Twitter,
} from 'lucide-react';
import type { Layout } from 'react-grid-layout';

export const panelConfigs = {
  market: {
    title: 'Market Stats',
    icon: <BarChart3 className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  news: {
    title: 'Latest News',
    icon: <Newspaper className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  trending_tweets: {
    title: 'Trending Tweets',
    icon: <Twitter className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  relationships: {
    title: 'User Relationships',
    icon: <Network className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  mindshare: {
    title: 'Topic Mindshare',
    icon: <Brain className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  kaito_leaderboard: {
    title: 'Yap Leaderboard',
    icon: <Trophy className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  token_holders: {
    title: 'Token Holder Analysis',
    icon: <Coins className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
  bundlers: {
    title: 'Bundler Analysis',
    icon: <Box className="h-4 w-4" />,
    w: 1,
    h: 2,
  },
} as const;

export type PanelId = keyof typeof panelConfigs;

// Define the initial layout with varying heights
export const defaultLayout: Layout[] = [
  { i: 'trending_tweets', x: 0, y: 0, w: 1, h: 2, minH: 2, maxH: 6 },
  { i: 'news', x: 1, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'mindshare', x: 2, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'kaito_leaderboard', x: 3, y: 0, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'market', x: 0, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'relationships', x: 1, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'token_holders', x: 2, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
  { i: 'bundlers', x: 3, y: 2, w: 1, h: 2, minH: 2, maxH: 4 },
];
