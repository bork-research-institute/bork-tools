'use client';

import { cn } from '@/lib/utils';
import { mockMarketStats } from '@/mocks/marketStats';
import type { MarketStat } from '@/types/responses/injective';
import { useMemo, useState } from 'react';
import { Panel } from './Panel';

type SortConfig = {
  key: keyof MarketStat;
  direction: 'asc' | 'desc';
};

interface MarketStatsPanelProps {
  maxHeight?: string;
}

const columns: { key: keyof MarketStat; label: string }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  { key: 'change24h', label: '24h Change' },
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'volume', label: 'Volume' },
  { key: 'spread', label: 'Spread' },
  { key: 'spreadPercentage', label: 'Spread %' },
  { key: 'liquidity', label: 'Liquidity' },
];

export function MarketStatsPanel({ maxHeight }: MarketStatsPanelProps) {
  const visibleColumns = new Set(columns.map((col) => col.key));
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'symbol',
    direction: 'asc',
  });

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
    return [...mockMarketStats].sort((a, b) => {
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
  }, [sortConfig]);

  return (
    <Panel maxHeight={maxHeight}>
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
            {sortedData.map((stat) => (
              <tr
                key={stat.symbol}
                className="hover:bg-emerald-400/5 transition-colors group"
              >
                {columns.map(
                  (column) =>
                    visibleColumns.has(column.key) && (
                      <td
                        key={column.key}
                        className={cn(
                          'px-3 py-1 text-xs border-b border-emerald-400/10 group-hover:border-emerald-400/20',
                          {
                            'font-medium':
                              column.key === 'symbol' || column.key === 'name',
                            'text-right': [
                              'price',
                              'volume',
                              'spread',
                              'liquidity',
                            ].includes(column.key),
                            'text-center': [
                              'rsi',
                              'macd',
                              'change24h',
                              'spreadPercentage',
                            ].includes(column.key),
                          },
                        )}
                      >
                        {column.key === 'change24h' ? (
                          <span
                            className={
                              stat.isPositive
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {stat[column.key]}
                          </span>
                        ) : column.key === 'rsi' ? (
                          <span
                            className={cn(
                              stat.rsi > 70
                                ? 'text-red-400'
                                : stat.rsi < 30
                                  ? 'text-emerald-400'
                                  : 'text-emerald-400/60',
                            )}
                          >
                            {stat[column.key]}
                          </span>
                        ) : column.key === 'macd' ? (
                          <span
                            className={
                              stat.macd > 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {stat[column.key]}
                          </span>
                        ) : (
                          <span className="text-emerald-400/60">
                            {stat[column.key]}
                          </span>
                        )}
                      </td>
                    ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
