'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPrice,
  formatSupply,
} from '@/lib/utils/format-number';
import { getTimeAgo } from '@/lib/utils/format-time';
import type { TokenSnapshot } from '@/types/token-monitor/token';
import { ArrowUpDown, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Panel } from './Panel';

type ColumnKey =
  | 'timestamp'
  | 'name'
  | 'symbol'
  | 'price'
  | 'volume'
  | 'marketCap'
  | 'liquidity'
  | 'holders'
  | 'supply';

type SortConfig = {
  key: ColumnKey;
  direction: 'asc' | 'desc';
};

type ColumnDef = {
  key: ColumnKey;
  label: string;
  format: (snapshot: TokenSnapshot, index: number) => string | JSX.Element;
  getChange?: (
    current: TokenSnapshot,
    previous: TokenSnapshot,
  ) => string | null;
  getSortValue?: (
    snapshot: TokenSnapshot,
  ) => number | string | null | undefined;
};

interface MarketStatsPanelProps {
  maxHeight?: string;
  tokenSnapshots?: TokenSnapshot[];
  isLoading: boolean;
  error: string | null;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
}

const calculatePercentageChange = (
  current: number,
  previous: number,
): string => {
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

const timeframeLabels: Record<TimeFrame, string> = {
  '1d': 'D',
  '1w': 'W',
  '1m': 'M',
};

const columns: ColumnDef[] = [
  {
    key: 'name',
    label: 'Token',
    format: (snapshot, index) => {
      const symbol = snapshot.data?.ticker || 'N/A';
      const name = snapshot.data?.name || 'N/A';
      return (
        <div className="flex items-center">
          <span className="text-emerald-400/40 text-[10px] mr-2">
            #{index + 1}
          </span>
          <span>
            {symbol} / {name}
          </span>
        </div>
      );
    },
    getSortValue: (snapshot) => {
      const symbol = snapshot.data?.ticker || '';
      const name = snapshot.data?.name || '';
      return `${symbol} / ${name}`;
    },
  },
  {
    key: 'price',
    label: 'Price',
    format: (snapshot) => {
      const priceInfo = snapshot.data?.priceInfo;
      return priceInfo?.price ? formatPrice(priceInfo.price) : 'N/A';
    },
    getChange: (current, previous) => {
      const currentPrice = current.data?.priceInfo?.price;
      const previousPrice = previous.data?.priceInfo?.price;
      if (currentPrice && previousPrice) {
        return calculatePercentageChange(currentPrice, previousPrice);
      }
      return null;
    },
    getSortValue: (snapshot) => snapshot.data?.priceInfo?.price ?? null,
  },
  {
    key: 'volume',
    label: 'Volume (24h)',
    format: (snapshot) => {
      const volumeMetrics = snapshot.data?.liquidityMetrics?.volumeMetrics;
      return volumeMetrics?.volume24h
        ? formatCurrency(volumeMetrics.volume24h)
        : 'N/A';
    },
    getChange: (current, previous) => {
      const currentVolume =
        current.data?.liquidityMetrics?.volumeMetrics?.volume24h;
      const previousVolume =
        previous.data?.liquidityMetrics?.volumeMetrics?.volume24h;
      if (currentVolume && previousVolume) {
        return calculatePercentageChange(currentVolume, previousVolume);
      }
      return null;
    },
    getSortValue: (snapshot) =>
      snapshot.data?.liquidityMetrics?.volumeMetrics?.volume24h ?? null,
  },
  {
    key: 'marketCap',
    label: 'Market Cap',
    format: (snapshot) => {
      const marketCap = snapshot.data?.marketCap;
      return marketCap ? formatCurrency(marketCap) : 'N/A';
    },
    getChange: (current, previous) => {
      const currentMarketCap = current.data?.marketCap;
      const previousMarketCap = previous.data?.marketCap;
      if (currentMarketCap && previousMarketCap) {
        return calculatePercentageChange(currentMarketCap, previousMarketCap);
      }
      return null;
    },
    getSortValue: (snapshot) => snapshot.data?.marketCap ?? null,
  },
  {
    key: 'liquidity',
    label: 'Liquidity',
    format: (snapshot) => {
      const liquidityMetrics = snapshot.data?.liquidityMetrics;
      return liquidityMetrics?.totalLiquidity
        ? formatCurrency(liquidityMetrics.totalLiquidity)
        : 'N/A';
    },
    getChange: (current, previous) => {
      const currentLiquidity = current.data?.liquidityMetrics?.totalLiquidity;
      const previousLiquidity = previous.data?.liquidityMetrics?.totalLiquidity;
      if (currentLiquidity && previousLiquidity) {
        return calculatePercentageChange(currentLiquidity, previousLiquidity);
      }
      return null;
    },
    getSortValue: (snapshot) =>
      snapshot.data?.liquidityMetrics?.totalLiquidity ?? null,
  },
  {
    key: 'holders',
    label: 'Holders',
    format: (snapshot) => {
      const holderCount = snapshot.data?.holderCount;
      return holderCount ? formatSupply(holderCount) : 'N/A';
    },
    getChange: (current, previous) => {
      const currentHolders = current.data?.holderCount;
      const previousHolders = previous.data?.holderCount;
      if (currentHolders && previousHolders) {
        return calculatePercentageChange(currentHolders, previousHolders);
      }
      return null;
    },
    getSortValue: (snapshot) => snapshot.data?.holderCount ?? null,
  },
  {
    key: 'supply',
    label: 'Supply',
    format: (snapshot) => {
      const supply = snapshot.data?.supply;
      return supply ? formatSupply(supply) : 'N/A';
    },
    getChange: (current, previous) => {
      const currentSupply = current.data?.supply;
      const previousSupply = previous.data?.supply;
      if (currentSupply && previousSupply) {
        return calculatePercentageChange(currentSupply, previousSupply);
      }
      return null;
    },
    getSortValue: (snapshot) => snapshot.data?.supply ?? null,
  },
  {
    key: 'timestamp',
    label: 'Last Updated',
    format: (snapshot) =>
      snapshot.timestamp ? getTimeAgo(snapshot.timestamp) : 'N/A',
    getSortValue: (snapshot) => snapshot.timestamp ?? null,
  },
];

export function MarketStatsPanel({
  maxHeight,
  tokenSnapshots,
  isLoading,
  error,
  timeframe,
  onTimeframeChange,
}: MarketStatsPanelProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'marketCap',
    direction: 'desc',
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(columns.map((col) => col.key)),
  );

  // Debug logging
  console.log('MarketStatsPanel props:', {
    tokenSnapshots,
    isLoading,
    error,
    timeframe,
    visibleColumns: Array.from(visibleColumns),
  });

  const handleSort = (columnKey: ColumnKey) => {
    setSortConfig((current) => ({
      key: columnKey,
      direction:
        current.key === columnKey && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    if (!tokenSnapshots) {
      return [];
    }

    return [...tokenSnapshots].sort((a, b) => {
      const columnKey = sortConfig.key;
      // Get the corresponding column definition
      const column = columns.find((col) => col.key === columnKey);
      let aValue: unknown;
      let bValue: unknown;

      if (column?.getSortValue) {
        aValue = column.getSortValue(a);
        bValue = column.getSortValue(b);
      } else if (columnKey === 'timestamp') {
        aValue = a.timestamp;
        bValue = b.timestamp;
      } else if (column) {
        aValue = column.format(a, 0);
        bValue = column.format(b, 0);
      }

      if (aValue === bValue) {
        return 0;
      }
      if (aValue === null || aValue === undefined || aValue === 'N/A') {
        return 1;
      }
      if (bValue === null || bValue === undefined || bValue === 'N/A') {
        return -1;
      }

      // If both are numbers, compare numerically
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      // Otherwise, compare as strings
      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [tokenSnapshots, sortConfig]);

  // Debug logging for sorted data
  console.log('Sorted data:', sortedData);

  // Always render the header row (controls)
  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-emerald-400/10 px-3">
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
                  Visible Columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-emerald-400/20" />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                    checked={visibleColumns.has(column.key)}
                    onCheckedChange={(checked) => {
                      const newVisibleColumns = new Set(visibleColumns);
                      if (checked) {
                        newVisibleColumns.add(column.key);
                      } else {
                        newVisibleColumns.delete(column.key);
                      }
                      setVisibleColumns(newVisibleColumns);
                    }}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 flex items-center justify-center bg-transparent border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-[#020617] border-emerald-400/20"
              >
                <DropdownMenuLabel className="text-xs text-emerald-400/60">
                  Sort Rank By
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-emerald-400/20" />
                <DropdownMenuRadioGroup
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onValueChange={(value) => {
                    const [key, direction] = value.split('-');
                    setSortConfig({
                      key: key as ColumnKey,
                      direction: direction as 'asc' | 'desc',
                    });
                  }}
                >
                  <DropdownMenuRadioItem
                    value="marketCap-desc"
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                  >
                    Market Cap (High to Low)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="marketCap-asc"
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                  >
                    Market Cap (Low to High)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="timestamp-desc"
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                  >
                    Most Recent
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            {Object.entries(timeframeLabels).map(([value, label]) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => onTimeframeChange(value as TimeFrame)}
                className={cn(
                  'h-7 px-3 text-xs bg-transparent hover:bg-emerald-400/5',
                  timeframe === value
                    ? 'text-emerald-400 border-b-2 border-emerald-400 rounded-none'
                    : 'text-emerald-400/60 hover:text-emerald-400',
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Conditional rendering for table or messages */}
        <div className="min-w-[800px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-emerald-400/60">Loading token data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-red-400">{error}</span>
            </div>
          ) : tokenSnapshots && tokenSnapshots.length > 0 ? (
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {columns.map(
                    (column) =>
                      visibleColumns.has(column.key) && (
                        <th
                          key={column.key}
                          className={cn(
                            'sticky top-0 z-10 bg-[#020617]/80 border-b border-emerald-400/20 px-3 py-1',
                            {
                              'text-left': column.label === 'Token',
                              'text-right': column.label !== 'Token',
                            },
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(column.key)}
                            className={cn(
                              'flex items-center gap-1 text-xs font-medium text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase',
                              {
                                'text-right justify-end w-full':
                                  column.label !== 'Token',
                                'text-left justify-start':
                                  column.label === 'Token',
                              },
                            )}
                          >
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="text-emerald-400/60">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </th>
                      ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((snapshot, index) => (
                  <tr
                    key={`${snapshot.token_address}-${snapshot.timestamp}`}
                    className="hover:bg-emerald-400/5 transition-colors group"
                  >
                    {Array.from(visibleColumns).map((columnKey) => {
                      const column = columns.find(
                        (col) => col.key === columnKey,
                      );
                      if (!column) {
                        return null;
                      }
                      const formattedValue = column.format(snapshot, index);

                      return (
                        <td
                          key={columnKey}
                          className={cn(
                            'px-3 py-1 text-xs border-b border-emerald-400/10 group-hover:border-emerald-400/20',
                            {
                              'text-left': column.label === 'Token',
                              'text-right': column.label !== 'Token',
                            },
                          )}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild={true}>
                                <span className="text-white">
                                  {formattedValue}
                                </span>
                              </TooltipTrigger>
                              {column.getChange && (
                                <TooltipContent side="top">
                                  {(() => {
                                    const previousSnapshots = sortedData.filter(
                                      (s) =>
                                        s.token_address ===
                                          snapshot.token_address &&
                                        s.timestamp < snapshot.timestamp,
                                    );

                                    if (!previousSnapshots?.length) {
                                      return null;
                                    }

                                    const changes = previousSnapshots
                                      .map((prevSnapshot) => {
                                        const change = column.getChange?.(
                                          snapshot,
                                          prevSnapshot,
                                        );
                                        if (!change) {
                                          return null;
                                        }
                                        const timeDiff = getTimeAgo(
                                          prevSnapshot.timestamp,
                                        );
                                        return {
                                          change,
                                          timeDiff,
                                          timestamp: prevSnapshot.timestamp,
                                        };
                                      })
                                      .filter(
                                        (
                                          c,
                                        ): c is {
                                          change: string;
                                          timeDiff: string;
                                          timestamp: string;
                                        } => c !== null,
                                      );

                                    if (!changes.length) {
                                      return null;
                                    }

                                    return (
                                      <div className="flex flex-col gap-1 text-xs">
                                        <div className="font-medium">
                                          Changes:
                                        </div>
                                        {changes.map((changeInfo) => (
                                          <div
                                            key={`${changeInfo.timestamp}-${changeInfo.change}`}
                                            className="text-emerald-400/60"
                                          >
                                            {`${changeInfo.change} (${changeInfo.timeDiff} ago)`}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
    </Panel>
  );
}
