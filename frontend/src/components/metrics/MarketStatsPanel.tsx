'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPrice,
  formatSupply,
} from '@/lib/utils/format-number';
import { getTimeAgo } from '@/lib/utils/format-time';
import { calculateTokenScore } from '@/lib/utils/market-stats';
import type {
  FieldOption,
  MarketStatsPanelProps,
  SortConfig,
  TimeframeLabels,
} from '@/types/token-monitor/market-stats';
import type { TokenWithEngagement } from '@/types/token-monitor/token';
import type { TweetWithAnalysis } from '@/types/tweets-analysis';
import { ArrowUpDown, Clock, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Spinner } from '../ui/spinner';
import { Panel } from './Panel';
import { TokenInfoPanel } from './TokenInfoPanel';

const timeframeLabels: TimeframeLabels = {
  '1d': 'D',
  '1w': 'W',
  '1m': 'M',
};

const fieldOptions: FieldOption[] = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume', label: 'Volume' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'likes', label: 'Likes' },
  { key: 'replies', label: 'Replies' },
  { key: 'retweets', label: 'Retweets' },
  { key: 'views', label: 'Views' },
  { key: 'score', label: 'Score' },
];

export function MarketStatsPanel({
  maxHeight,
  tokenSnapshots,
  loading,
  error,
  timeframe,
  onTimeframeChange,
  selectedTokenAddress,
  onTokenSelect,
  selectedToken,
}: MarketStatsPanelProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'score',
    direction: 'desc',
  });
  const [visibleFields, setVisibleFields] = useState<string[]>([
    'marketCap',
    'volume',
    'lastUpdated',
    'likes',
    'replies',
    'retweets',
    'views',
    'score',
  ]);

  const sortedData = useMemo(() => {
    if (!tokenSnapshots) {
      return [];
    }

    return [...tokenSnapshots].sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue: number | string | null | undefined;
      let bValue: number | string | null | undefined;

      // Add engagement metrics to sorting
      switch (key) {
        case 'likes': {
          aValue = a.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.likes || 0),
              0,
            );
          bValue = b.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.likes || 0),
              0,
            );
          break;
        }
        case 'replies': {
          aValue = a.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.replies || 0),
              0,
            );
          bValue = b.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.replies || 0),
              0,
            );
          break;
        }
        case 'retweets': {
          aValue = a.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.retweets || 0),
              0,
            );
          bValue = b.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.retweets || 0),
              0,
            );
          break;
        }
        case 'views': {
          aValue = a.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.views || 0),
              0,
            );
          bValue = b.engagement?.tweets
            ?.filter((t: TweetWithAnalysis) => t.status !== 'spam')
            .reduce(
              (sum: number, t: TweetWithAnalysis) => sum + (t.views || 0),
              0,
            );
          break;
        }
        case 'marketCap': {
          aValue = a.data?.marketCap;
          bValue = b.data?.marketCap;
          break;
        }
        case 'volume': {
          aValue = a.data?.liquidityMetrics?.volumeMetrics?.volume24h;
          bValue = b.data?.liquidityMetrics?.volumeMetrics?.volume24h;
          break;
        }
        case 'price': {
          aValue = a.data?.priceInfo?.price;
          bValue = b.data?.priceInfo?.price;
          break;
        }
        case 'holders': {
          aValue = a.data?.holderCount;
          bValue = b.data?.holderCount;
          break;
        }
        case 'supply': {
          aValue = a.data?.supply;
          bValue = b.data?.supply;
          break;
        }
        case 'lastUpdated': {
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        }
        case 'score': {
          aValue = calculateTokenScore(a, a.engagement?.tweets);
          bValue = calculateTokenScore(b, b.engagement?.tweets);
          break;
        }
        default: {
          aValue = a.data?.marketCap;
          bValue = b.data?.marketCap;
          break;
        }
      }

      if (aValue === bValue) {
        return 0;
      }
      if (aValue == null || aValue === 'N/A') {
        return 1;
      }
      if (bValue == null || bValue === 'N/A') {
        return -1;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [tokenSnapshots, sortConfig]);

  // Update the table row rendering to include engagement metrics
  const renderValue = (
    snapshot: TokenWithEngagement,
    field: string,
  ): React.ReactNode => {
    switch (field) {
      case 'marketCap': {
        return snapshot.data?.marketCap
          ? formatCurrency(snapshot.data.marketCap)
          : 'N/A';
      }
      case 'volume': {
        return snapshot.data?.liquidityMetrics?.volumeMetrics?.volume24h
          ? formatCurrency(
              snapshot.data.liquidityMetrics.volumeMetrics.volume24h,
            )
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
        return snapshot.data?.supply
          ? formatSupply(snapshot.data.supply)
          : 'N/A';
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
        const score = calculateTokenScore(
          snapshot,
          snapshot.engagement?.tweets,
        );
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
      default: {
        return 'N/A';
      }
    }
  };

  // Always render the header row (controls)
  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col h-full">
        {/* Token Info Section */}
        {selectedToken && (
          <div className="h-[50%] min-h-0 overflow-auto border-t border-emerald-400/10 mb-4 pb-4">
            <TokenInfoPanel
              selectedToken={selectedToken}
              onClose={() => onTokenSelect?.(null)}
            />
          </div>
        )}
        <div className="flex items-center justify-end border-b border-emerald-400/10 gap-3 px-3 mb-2">
          <div className="flex items-center gap-1">
            {(Object.entries(timeframeLabels) as [TimeFrame, string][]).map(
              ([value, label]) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="sm"
                  onClick={() => onTimeframeChange(value)}
                  className={cn(
                    'h-7 px-3 text-xs bg-transparent hover:bg-emerald-400/5',
                    timeframe === value
                      ? 'text-emerald-400 border-b-2 border-emerald-400 rounded-none'
                      : 'text-emerald-400/60 hover:text-emerald-400',
                  )}
                >
                  {label}
                </Button>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center bg-transparent border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-[#020617] border-emerald-400/20"
              >
                <DropdownMenuLabel className="text-xs text-emerald-400/60">
                  Display Fields
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-emerald-400/20" />
                {fieldOptions.map((field) => (
                  <DropdownMenuCheckboxItem
                    key={field.key}
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                    checked={visibleFields.includes(field.key)}
                    onCheckedChange={(checked) => {
                      setVisibleFields((prev) => {
                        if (checked) {
                          return [...prev, field.key];
                        }
                        return prev.filter((f) => f !== field.key);
                      });
                    }}
                  >
                    {field.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          className={cn(
            'flex-1 min-h-0 flex flex-col',
            selectedToken && 'h-full', // Ensure parent takes full height when token selected
          )}
        >
          {/* Table Section */}
          <div className={cn('min-h-0', selectedToken ? 'h-[50%]' : 'h-full')}>
            <div className="h-full overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Spinner size="lg" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-32">
                  <span className="text-red-400">{error}</span>
                </div>
              ) : tokenSnapshots && tokenSnapshots.length > 0 ? (
                <table className="min-w-full text-xs text-white/90 border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="sticky top-0 left-0 z-30 bg-[#0f172a] px-2 py-2 border-b border-emerald-400/10 text-emerald-400/80 font-semibold text-left">
                        Token
                      </th>
                      {/* Render default fields first */}
                      {[
                        'marketCap',
                        'volume',
                        'lastUpdated',
                        ...visibleFields.filter(
                          (f) =>
                            !['marketCap', 'volume', 'lastUpdated'].includes(f),
                        ),
                      ].map((field) => {
                        let label: React.ReactNode = field;
                        if (field === 'marketCap') {
                          label = 'MCAP';
                        } else if (field === 'volume') {
                          label = '24H VOL';
                        } else if (field === 'lastUpdated') {
                          label = (
                            <Clock
                              className="inline w-4 h-4 text-emerald-400/80"
                              aria-label="Last Updated"
                            />
                          );
                        } else {
                          label =
                            fieldOptions.find((opt) => opt.key === field)
                              ?.label || field;
                        }
                        return (
                          <th
                            key={field}
                            scope="col"
                            className={cn(
                              'sticky top-0 z-20 bg-[#0f172a] px-2 py-2 border-b border-emerald-400/10 text-emerald-400/80 font-semibold text-left whitespace-nowrap',
                              sortConfig.key === field && 'text-emerald-400',
                            )}
                            aria-sort={
                              sortConfig.key === field
                                ? sortConfig.direction === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : 'none'
                            }
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-auto p-0 font-semibold hover:bg-transparent hover:text-emerald-400 flex items-center gap-1',
                                sortConfig.key === field && 'text-emerald-400',
                              )}
                              onClick={() => {
                                setSortConfig((prev) => ({
                                  key: field,
                                  direction:
                                    prev.key === field &&
                                    prev.direction === 'desc'
                                      ? 'asc'
                                      : 'desc',
                                }));
                              }}
                            >
                              {label}
                              {sortConfig.key === field && (
                                <ArrowUpDown
                                  className={cn(
                                    'w-3 h-3 transition-transform',
                                    sortConfig.direction === 'asc' &&
                                      'rotate-180',
                                  )}
                                />
                              )}
                            </Button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((snapshot, index) => {
                      const isSelected =
                        selectedTokenAddress === snapshot.token_address;
                      return (
                        <tr
                          key={snapshot.token_address}
                          className={cn(
                            'transition-colors cursor-pointer group',
                            isSelected
                              ? 'bg-emerald-400/10 border-l-4 border-emerald-400'
                              : 'hover:bg-emerald-400/5',
                          )}
                          onClick={() => {
                            if (isSelected) {
                              onTokenSelect?.(null);
                              // Emit custom event to notify gallery to switch back to trending
                              window.dispatchEvent(
                                new CustomEvent('switchToTrending'),
                              );
                            } else {
                              onTokenSelect?.(snapshot);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (isSelected) {
                                onTokenSelect?.(null);
                                // Emit custom event to notify gallery to switch back to trending
                                window.dispatchEvent(
                                  new CustomEvent('switchToTrending'),
                                );
                              } else {
                                onTokenSelect?.(snapshot);
                              }
                            }
                          }}
                          tabIndex={0}
                          aria-label={`Select token ${snapshot.data?.ticker || ''}`}
                        >
                          <td className="sticky left-0 z-10 bg-[#0f172a] px-2 py-2 border-b border-emerald-400/10">
                            <span className="text-emerald-400/40 text-xs mr-1 font-mono">
                              #{index + 1}
                            </span>
                            <span className="text-white/90 font-bold text-xs truncate">
                              {snapshot.data?.ticker || 'N/A'}
                            </span>
                          </td>
                          {/* Render default fields first, then others */}
                          {[
                            'marketCap',
                            'volume',
                            'lastUpdated',
                            ...visibleFields.filter(
                              (f) =>
                                ![
                                  'marketCap',
                                  'volume',
                                  'lastUpdated',
                                ].includes(f),
                            ),
                          ].map((field) => {
                            let value: React.ReactNode = 'N/A';
                            if (field === 'marketCap') {
                              value = snapshot.data?.marketCap
                                ? formatCurrency(snapshot.data.marketCap)
                                : 'N/A';
                            } else if (field === 'volume') {
                              value = snapshot.data?.liquidityMetrics
                                ?.volumeMetrics?.volume24h
                                ? formatCurrency(
                                    snapshot.data.liquidityMetrics.volumeMetrics
                                      .volume24h,
                                  )
                                : 'N/A';
                            } else if (field === 'price') {
                              value = snapshot.data?.priceInfo?.price
                                ? formatPrice(snapshot.data.priceInfo.price)
                                : 'N/A';
                            } else if (field === 'holders') {
                              value = snapshot.data?.holderCount
                                ? formatSupply(snapshot.data.holderCount)
                                : 'N/A';
                            } else if (field === 'supply') {
                              value = snapshot.data?.supply
                                ? formatSupply(snapshot.data.supply)
                                : 'N/A';
                            } else if (field === 'lastUpdated') {
                              value = snapshot.timestamp
                                ? getTimeAgo(snapshot.timestamp)
                                : 'N/A';
                            } else {
                              value = renderValue(snapshot, field);
                            }
                            return (
                              <td
                                key={field}
                                className="px-2 py-2 border-b border-emerald-400/10 whitespace-nowrap"
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <span className="text-emerald-400/60">
                    No token data available
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
