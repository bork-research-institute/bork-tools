import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPrice,
  formatSupply,
} from '@/lib/utils/format-number';
import { getTimeAgo } from '@/lib/utils/format-time';
import { calculateTokenScore } from '@/lib/utils/market-stats';
import type { TokenWithEngagement } from '@/types/token-monitor/token';
import type { TweetWithAnalysis } from '@/types/tweets-analysis';
import type { ReactNode } from 'react';

interface ScoreBarProps {
  score: number;
}

function ScoreBar({ score }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-1 bg-emerald-400/20 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            score >= 80
              ? 'bg-emerald-400'
              : score >= 60
                ? 'bg-emerald-400/80'
                : score >= 40
                  ? 'bg-emerald-400/60'
                  : score >= 20
                    ? 'bg-emerald-400/40'
                    : 'bg-emerald-400/20',
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span>{score.toFixed(1)}</span>
    </div>
  );
}

export const renderValue = (
  snapshot: TokenWithEngagement,
  field: string,
): ReactNode => {
  switch (field) {
    case 'marketCap': {
      return snapshot.data?.marketCap
        ? formatCurrency(snapshot.data.marketCap)
        : 'N/A';
    }
    case 'volume': {
      return snapshot.data?.liquidityMetrics?.volumeMetrics?.volume24h
        ? formatCurrency(snapshot.data.liquidityMetrics.volumeMetrics.volume24h)
        : 'N/A';
    }
    case 'price': {
      return snapshot.data?.priceInfo?.price
        ? formatPrice(snapshot.data.priceInfo.price)
        : 'N/A';
    }
    case 'holders': {
      return snapshot.data?.holderCount
        ? formatSupply(snapshot.data.holderCount)
        : 'N/A';
    }
    case 'supply': {
      return snapshot.data?.supply ? formatSupply(snapshot.data.supply) : 'N/A';
    }
    case 'lastUpdated': {
      return snapshot.timestamp ? getTimeAgo(snapshot.timestamp) : 'N/A';
    }
    case 'likes': {
      const nonSpamTweets =
        snapshot.engagement?.tweets?.filter(
          (t: TweetWithAnalysis) => t.status !== 'spam',
        ) || [];
      return (
        nonSpamTweets
          .reduce(
            (sum: number, t: TweetWithAnalysis) => sum + (t.likes || 0),
            0,
          )
          .toLocaleString() || 'N/A'
      );
    }
    case 'replies': {
      const nonSpamTweets =
        snapshot.engagement?.tweets?.filter(
          (t: TweetWithAnalysis) => t.status !== 'spam',
        ) || [];
      return (
        nonSpamTweets
          .reduce(
            (sum: number, t: TweetWithAnalysis) => sum + (t.replies || 0),
            0,
          )
          .toLocaleString() || 'N/A'
      );
    }
    case 'retweets': {
      const nonSpamTweets =
        snapshot.engagement?.tweets?.filter(
          (t: TweetWithAnalysis) => t.status !== 'spam',
        ) || [];
      return (
        nonSpamTweets
          .reduce(
            (sum: number, t: TweetWithAnalysis) => sum + (t.retweets || 0),
            0,
          )
          .toLocaleString() || 'N/A'
      );
    }
    case 'views': {
      const nonSpamTweets =
        snapshot.engagement?.tweets?.filter(
          (t: TweetWithAnalysis) => t.status !== 'spam',
        ) || [];
      return (
        nonSpamTweets
          .reduce(
            (sum: number, t: TweetWithAnalysis) => sum + (t.views || 0),
            0,
          )
          .toLocaleString() || 'N/A'
      );
    }
    case 'score': {
      const score = calculateTokenScore(snapshot, snapshot.engagement?.tweets);
      return <ScoreBar score={score} />;
    }
    default: {
      return 'N/A';
    }
  }
};
