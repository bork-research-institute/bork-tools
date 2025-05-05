import type { TokenWithEngagement } from './token';

export type TimeFrame = '1d' | '1w' | '1m';

export interface MarketStatsPanelProps {
  maxHeight?: string;
  tokenSnapshots?: TokenWithEngagement[];
  loading?: boolean;
  error: string | null;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  selectedTokenAddress?: string;
  onTokenSelect?: (snapshot: TokenWithEngagement | null) => void;
  selectedToken?: TokenWithEngagement | null;
}

export interface FieldOption {
  key: string;
  label: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export type TimeframeLabels = Record<TimeFrame, string>;
