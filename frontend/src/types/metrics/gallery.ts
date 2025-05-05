import type { UserRelationship } from '@/lib/services/relationships';
import type { TrendingTweet } from '@/lib/services/tweets';
import type {
  TokenSnapshot,
  TokenWithEngagement,
} from '@/types/token-monitor/token';

export interface RelationshipsPanelProps {
  maxHeight?: string;
  relationships: UserRelationship[];
  loading: boolean;
}

export interface MetricsGalleryState {
  tokenAddress: string;
  isDialogOpen: boolean;
  maximizedPanel: string | null;
  trendingTweets: TrendingTweet[];
  newsTweets: TrendingTweet[];
  loading: boolean;
  relationships: UserRelationship[];
  relationshipsLoading: boolean;
  tokensWithEngagement: TokenWithEngagement[];
  tokenSnapshotsLoading: boolean;
  tokenSnapshots: TokenSnapshot[];
  selectedToken: TokenSnapshot | null;
  activeRightTab: string;
}
