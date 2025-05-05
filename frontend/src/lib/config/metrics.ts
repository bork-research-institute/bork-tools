// Calculate available height by subtracting header and banner
export const PANEL_HEIGHT =
  'calc(100vh - theme(spacing.header) - theme(spacing.banner))';

export const PANEL_TYPES = {
  SOCIALS: 'socials',
  MINDSHARE: 'mindshare',
  TRENDING: 'trending',
  MARKET: 'market',
} as const;

export const TAB_TYPES = {
  MINDSHARE: 'mindshare',
  YAPS: 'yaps',
  RELATIONSHIPS: 'relationships',
  TWEETS: 'tweets',
  TOKEN_TWEETS: 'tokenTweets',
  NEWS: 'news',
  MARKET: 'market',
  RISK: 'risk',
} as const;
