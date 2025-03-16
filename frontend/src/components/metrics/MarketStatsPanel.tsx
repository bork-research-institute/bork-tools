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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type MarketStat,
  type TimeFrame,
  marketStatsService,
} from '@/lib/services/market-stats-service';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Panel } from './Panel';

type SortConfig = {
  key: keyof MarketStat;
  direction: 'asc' | 'desc';
};

interface MarketStatsPanelProps {
  maxHeight?: string;
}

const columns: {
  key: keyof MarketStat;
  label: string;
  getLabelWithTimeframe?: (timeframe: TimeFrame) => string;
}[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  {
    key: 'change24h',
    label: 'Change',
    getLabelWithTimeframe: (timeframe: TimeFrame) => {
      switch (timeframe) {
        case '5m':
          return '5m Change';
        case '1h':
          return '1h Change';
        case '4h':
          return '4h Change';
        case '1d':
          return '24h Change';
        case '1w':
          return '1w Change';
      }
    },
  },
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'volume', label: 'Volume' },
  { key: 'spreadPercentage', label: 'Spread %' },
  { key: 'liquidity', label: 'Liquidity' },
];

const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (num >= 1_000_000_000) {
    return `$${formatNumber(num / 1_000_000_000)}B`;
  }
  if (num >= 1_000_000) {
    return `$${formatNumber(num / 1_000_000)}M`;
  }
  if (num >= 1_000) {
    return `$${formatNumber(num / 1_000)}K`;
  }
  return `$${formatNumber(num)}`;
};

export function MarketStatsPanel({ maxHeight }: MarketStatsPanelProps) {
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'symbol',
    direction: 'asc',
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof MarketStat>>(
    new Set(columns.map((col) => col.key)),
  );
  const [timeframe, setTimeframe] = useState<TimeFrame>('1h');

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        setIsChangingTimeframe(true);
        setError(null);
        marketStatsService.setTimeframe(timeframe);
        const stats = await marketStatsService.getMarketStats();
        if (isSubscribed) {
          setMarketStats(stats);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch market stats',
          );
        }
      } finally {
        if (isSubscribed) {
          setIsChangingTimeframe(false);
          setIsLoading(false);
        }
      }
    };

    const setupSubscription = async () => {
      try {
        const unsubscribe = await marketStatsService.subscribeToMarketStats(
          (stats) => {
            if (isSubscribed) {
              setMarketStats(stats);
            }
          },
        );
        return unsubscribe;
      } catch (err) {
        console.error('Error setting up subscription:', err);
        return () => {};
      }
    };

    let unsubscribe = () => {};

    fetchData();
    setupSubscription().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [timeframe]);

  const handleSort = (columnKey: keyof MarketStat) => {
    setSortConfig((current) => ({
      key: columnKey,
      direction:
        current.key === columnKey && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    return [...marketStats].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [marketStats, sortConfig]);

  const formatValue = (
    key: keyof MarketStat,
    value: string | number | boolean,
  ): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (key === 'price' || key === 'volume' || key === 'liquidity') {
      return formatCurrency(value.toString());
    }
    if (key === 'spreadPercentage' || key === 'change24h') {
      return `${formatNumber(Number(value), 2)}%`;
    }
    if (key === 'rsi' || key === 'macd') {
      return formatNumber(value as number, 2);
    }
    return value.toString();
  };

  if (isLoading || isChangingTimeframe) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex items-center justify-center h-32">
          <span className="text-emerald-400/60">
            {isChangingTimeframe
              ? 'Updating timeframe...'
              : 'Loading market stats...'}
          </span>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex items-center justify-center h-32">
          <span className="text-red-400">{error}</span>
        </div>
      </Panel>
    );
  }

  if (!marketStats.length) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex items-center justify-center h-32">
          <span className="text-emerald-400/60">No market stats available</span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b border-emerald-400/10">
          <h2 className="text-sm font-medium text-emerald-400">Market Stats</h2>
          <div className="flex items-center gap-2">
            <Select
              value={timeframe}
              onValueChange={(value: TimeFrame) => setTimeframe(value)}
            >
              <SelectTrigger className="w-24 h-7 px-2 text-xs bg-transparent border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 transition-colors">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent className="bg-[#020617] border-emerald-400/20">
                <SelectItem
                  value="5m"
                  className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                >
                  5 Min
                </SelectItem>
                <SelectItem
                  value="1h"
                  className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                >
                  1 Hour
                </SelectItem>
                <SelectItem
                  value="4h"
                  className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                >
                  4 Hours
                </SelectItem>
                <SelectItem
                  value="1d"
                  className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                >
                  1 Day
                </SelectItem>
                <SelectItem
                  value="1w"
                  className="text-xs text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/5"
                >
                  1 Week
                </SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs bg-transparent border-emerald-400/20 text-emerald-400/60 hover:text-emerald-400 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
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
          </div>
        </div>
        <div className="min-w-[800px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {columns.map(
                  (column) =>
                    visibleColumns.has(column.key) && (
                      <th
                        key={column.key}
                        className="sticky top-0 z-10 bg-[#020617]/80 border-b border-emerald-400/20 px-3 py-1 text-left"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-400/60 hover:text-emerald-400 transition-colors"
                        >
                          {column.getLabelWithTimeframe?.(timeframe) ||
                            column.label}
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
              {sortedData.map((stat) => (
                <tr
                  key={`${stat.symbol}-${timeframe}-${stat.timestamp}`}
                  className="hover:bg-emerald-400/5 transition-colors group"
                >
                  {Array.from(visibleColumns).map((columnKey) => {
                    const value = stat[columnKey];
                    const formattedValue = formatValue(columnKey, value);

                    return (
                      <td
                        key={columnKey}
                        className={cn(
                          'px-3 py-1 text-xs border-b border-emerald-400/10 group-hover:border-emerald-400/20',
                          {
                            'font-medium':
                              columnKey === 'symbol' || columnKey === 'name',
                            'text-right': [
                              'price',
                              'volume',
                              'liquidity',
                            ].includes(columnKey),
                            'text-center': [
                              'rsi',
                              'macd',
                              'change24h',
                            ].includes(columnKey),
                          },
                        )}
                      >
                        {columnKey === 'change24h' ? (
                          <span
                            className={
                              stat.isPositive
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {formattedValue}
                          </span>
                        ) : columnKey === 'rsi' ? (
                          <span
                            className={cn(
                              stat.rsi > 70
                                ? 'text-red-400'
                                : stat.rsi < 30
                                  ? 'text-emerald-400'
                                  : 'text-emerald-400/60',
                            )}
                          >
                            {formattedValue}
                          </span>
                        ) : columnKey === 'macd' ? (
                          <span
                            className={
                              stat.macd > 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {formattedValue}
                          </span>
                        ) : (
                          <span className="text-emerald-400/60">
                            {formattedValue}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
