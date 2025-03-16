'use client';

import { cn } from '@/lib/utils';
import { mockMarketStats } from '@/mocks/marketStats';
import type { MarketStat } from '@/types/responses/injective';
import { BarChart3, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Panel } from './Panel';

type SortConfig = {
  key: keyof MarketStat;
  direction: 'asc' | 'desc';
};

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

type MarketStatsPanelProps = {
  onClose?: () => void;
};

export function MarketStatsPanel({ onClose }: MarketStatsPanelProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof MarketStat>>(
    new Set(columns.map((col) => col.key)),
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'symbol',
    direction: 'asc',
  });

  const toggleColumn = (columnKey: keyof MarketStat) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnKey)) {
      newVisibleColumns.delete(columnKey);
    } else {
      newVisibleColumns.add(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
  };

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
    <Panel
      title="Market Stats"
      icon={<BarChart3 className="h-3.5 w-3.5" />}
      className="w-full h-full border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
      headerContent={
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <button type="button" className="p-1 hover:bg-white/10 rounded">
              <Settings2 className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-black border-white/10">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.has(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
                className="text-white text-xs"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="absolute inset-x-0 bottom-0 top-[2.5rem] overflow-auto">
        <div className="relative min-w-[800px]">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {columns.map(
                  (column) =>
                    visibleColumns.has(column.key) && (
                      <th
                        key={column.key}
                        className="sticky top-0 z-10 bg-black border-b border-white/10 px-3 py-1 text-left"
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                          {column.label}
                          {sortConfig.key === column.key &&
                            (sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            ))}
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
                  className="hover:bg-white/5 transition-colors group"
                >
                  {columns.map(
                    (column) =>
                      visibleColumns.has(column.key) && (
                        <td
                          key={column.key}
                          className={cn(
                            'px-3 py-1 text-xs border-b border-white/5 group-hover:border-white/10',
                            {
                              'font-medium':
                                column.key === 'symbol' ||
                                column.key === 'name',
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
                                  ? 'text-green-400'
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
                                    ? 'text-green-400'
                                    : 'text-white',
                              )}
                            >
                              {stat[column.key]}
                            </span>
                          ) : column.key === 'macd' ? (
                            <span
                              className={
                                stat.macd > 0
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }
                            >
                              {stat[column.key]}
                            </span>
                          ) : (
                            <span className="text-white">
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
      </div>
    </Panel>
  );
}
