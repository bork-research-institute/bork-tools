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
import { FIELD_OPTIONS, TIMEFRAME_LABELS } from '@/lib/config/market-stats';
import { renderValue } from '@/lib/helpers/market-stats';
import { dexscreenerService } from '@/lib/services/dexscreener-service';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPrice } from '@/lib/utils/format-number';
import { calculateTokenScore } from '@/lib/utils/market-stats';
import type { DexScreenerPair } from '@/types/dexscreener';
import type {
  MarketStatsPanelProps,
  SortConfig,
  TimeFrame,
} from '@/types/token-monitor/market-stats';
import type { TokenWithEngagement } from '@/types/token-monitor/token';
import type { TweetWithAnalysis } from '@/types/tweets-analysis';
import { ArrowUpDown, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '../ui/spinner';
import { Panel } from './Panel';
import { ScoreBar } from './ScoreBar';
import { TokenInfoPanel } from './TokenInfoPanel';

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
    'price',
    'holders',
    'tweets',
    'marketCap',
    'volume',
    'lastUpdated',
    'likes',
    'replies',
    'retweets',
    'views',
    'score',
  ]);
  const [dexData, setDexData] = useState<Map<string, DexScreenerPair>>(
    new Map(),
  );
  const [dexLoading, setDexLoading] = useState(false);

  // Fetch DexScreener data when tokenSnapshots change
  useEffect(() => {
    const fetchDexData = async () => {
      if (!tokenSnapshots || tokenSnapshots.length === 0) {
        return;
      }

      setDexLoading(true);
      try {
        const addresses = tokenSnapshots.map(
          (snapshot) => snapshot.token_address,
        );
        await dexscreenerService.getTokenData(
          'solana',
          addresses,
          (batchData) => {
            setDexData((prev) => new Map([...prev, ...batchData]));
          },
        );
      } catch (error) {
        console.error('Error fetching DexScreener data:', error);
      } finally {
        setDexLoading(false);
      }
    };

    // Clear existing data when tokenSnapshots change
    setDexData(new Map());
    fetchDexData();
  }, [tokenSnapshots]);

  const sortedData = useMemo(() => {
    if (!tokenSnapshots) {
      return [];
    }

    return [...tokenSnapshots].sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue: number | string | null | undefined;
      let bValue: number | string | null | undefined;

      // Add DexScreener data to sorting
      switch (key) {
        case 'price': {
          const aPair = dexData.get(a.token_address);
          const bPair = dexData.get(b.token_address);
          aValue = aPair ? Number.parseFloat(aPair.priceUsd) : null;
          bValue = bPair ? Number.parseFloat(bPair.priceUsd) : null;
          break;
        }
        case 'marketCap': {
          const aPair = dexData.get(a.token_address);
          const bPair = dexData.get(b.token_address);
          aValue = aPair?.marketCap || null;
          bValue = bPair?.marketCap || null;
          break;
        }
        case 'volume': {
          const aPair = dexData.get(a.token_address);
          const bPair = dexData.get(b.token_address);
          aValue = aPair?.volume.h24 || null;
          bValue = bPair?.volume.h24 || null;
          break;
        }
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
          aValue = calculateTokenScore(
            a,
            a.engagement?.tweets?.filter(
              (t: TweetWithAnalysis) =>
                t.analysis !== null && t.analysis !== undefined,
            ),
          );
          bValue = calculateTokenScore(
            b,
            b.engagement?.tweets?.filter(
              (t: TweetWithAnalysis) =>
                t.analysis !== null && t.analysis !== undefined,
            ),
          );
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
  }, [tokenSnapshots, sortConfig, dexData]);

  // Update the table cell rendering to include DexScreener data
  const renderTableCell = (snapshot: TokenWithEngagement, field: string) => {
    let value: string | number | React.ReactNode;
    const dexPair = dexData.get(snapshot.token_address.toLowerCase());

    switch (field) {
      case 'price': {
        if (dexLoading && !dexPair) {
          value = <Spinner size="sm" />;
        } else {
          value = dexPair?.priceUsd
            ? formatPrice(Number(dexPair.priceUsd))
            : 'N/A';
        }
        break;
      }
      case 'marketCap': {
        if (dexLoading && !dexPair) {
          value = <Spinner size="sm" />;
        } else {
          value = dexPair?.marketCap
            ? formatCurrency(dexPair.marketCap)
            : 'N/A';
        }
        break;
      }
      case 'volume': {
        if (dexLoading && !dexPair) {
          value = <Spinner size="sm" />;
        } else {
          value = dexPair?.volume?.h24
            ? formatCurrency(dexPair.volume.h24)
            : 'N/A';
        }
        break;
      }
      case 'tweets': {
        const nonSpamTweets =
          snapshot.engagement?.tweets?.filter(
            (t: TweetWithAnalysis) => t.status !== 'spam',
          ) || [];
        const totalTweets = nonSpamTweets.length;
        const totalLikes = nonSpamTweets.reduce(
          (sum, t) => sum + (t.likes || 0),
          0,
        );
        const totalReplies = nonSpamTweets.reduce(
          (sum, t) => sum + (t.replies || 0),
          0,
        );
        const totalRetweets = nonSpamTweets.reduce(
          (sum, t) => sum + (t.retweets || 0),
          0,
        );
        const totalViews = nonSpamTweets.reduce(
          (sum, t) => sum + (t.views || 0),
          0,
        );
        value = `${totalTweets} (${totalLikes}/${totalReplies}/${totalRetweets}/${totalViews})`;
        break;
      }
      case 'score': {
        const validTweets = snapshot.engagement?.tweets?.filter(
          (t: TweetWithAnalysis) =>
            t.analysis !== null && t.analysis !== undefined,
        );
        value = calculateTokenScore(snapshot, validTweets);
        break;
      }
      default: {
        value = renderValue(snapshot, field);
      }
    }

    if (field === 'score' && typeof value === 'number') {
      return <ScoreBar score={value} />;
    }
    return value;
  };

  // Add debug logging to see what data we're getting
  useEffect(() => {
    if (dexData.size > 0) {
      console.log('DexScreener data:', Array.from(dexData.entries()));
    }
  }, [dexData]);

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
            {(Object.entries(TIMEFRAME_LABELS) as [TimeFrame, string][]).map(
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
                {FIELD_OPTIONS.map((field) => (
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
                        'price',
                        'marketCap',
                        'volume',
                        'holders',
                        'lastUpdated',
                        'tweets',
                        'score',
                      ].map((field) => {
                        let label: React.ReactNode = field;
                        if (field === 'price') {
                          label = 'Price';
                        } else if (field === 'holders') {
                          label = 'Holders';
                        } else if (field === 'marketCap') {
                          label = 'MCap';
                        } else if (field === 'lastUpdated') {
                          label = '🕒';
                        } else if (field === 'tweets') {
                          label = 'Tweets (❤️/💬/🔄/👁️)';
                        } else {
                          label =
                            FIELD_OPTIONS.find((opt) => opt.key === field)
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
                            'price',
                            'marketCap',
                            'volume',
                            'holders',
                            'lastUpdated',
                            'tweets',
                            'score',
                          ].map((field) => (
                            <td
                              key={field}
                              className="px-2 py-2 border-b border-emerald-400/10 whitespace-nowrap"
                            >
                              {renderTableCell(snapshot, field)}
                            </td>
                          ))}
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
