import type { TimeFrame } from '@/types/token-monitor/market-stats';

export const PANEL_HEIGHT =
  'calc(100vh - theme(spacing.header) - theme(spacing.banner))';

export const TIMEFRAME_LABELS: Record<TimeFrame, string> = {
  '1d': 'D',
  '1w': 'W',
  '1m': 'M',
};

export const FIELD_OPTIONS = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume', label: 'Volume' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'likes', label: 'Likes' },
  { key: 'replies', label: 'Replies' },
  { key: 'retweets', label: 'Retweets' },
  { key: 'views', label: 'Views' },
  { key: 'score', label: 'Score' },
] as const;
