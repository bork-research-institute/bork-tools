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
import {} from '@/components/ui/tooltip';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPrice,
  formatSupply,
} from '@/lib/utils/format-number';
import { getTimeAgo } from '@/lib/utils/format-time';
import type { TokenSnapshot } from '@/types/token-monitor/token';
import { ArrowUpDown, Clock, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Panel } from './Panel';
import { TokenInfoPanel } from './TokenInfoPanel';

interface MarketStatsPanelProps {
  maxHeight?: string;
  tokenSnapshots?: TokenSnapshot[];
  isLoading: boolean;
  error: string | null;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  selectedTokenAddress?: string;
  onTokenSelect?: (snapshot: TokenSnapshot) => void;
  selectedToken?: TokenSnapshot | null;
}

const timeframeLabels: Record<TimeFrame, string> = {
  '1d': 'D',
  '1w': 'W',
  '1m': 'M',
};

// Fields available for display
const FIELD_OPTIONS = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume', label: 'Volume (24h)' },
  { key: 'lastUpdated', label: 'Last Updated' },
  { key: 'price', label: 'Price' },
  { key: 'holders', label: 'Holders' },
  { key: 'supply', label: 'Supply' },
];

export function MarketStatsPanel({
  maxHeight,
  tokenSnapshots,
  isLoading,
  error,
  timeframe,
  onTimeframeChange,
  selectedTokenAddress,
  onTokenSelect,
  selectedToken,
}: MarketStatsPanelProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'marketCap',
    direction: 'desc',
  });
  const [visibleFields, setVisibleFields] = useState<string[]>([
    'marketCap',
    'volume',
    'lastUpdated',
  ]);

  // Debug logging
  console.log('MarketStatsPanel props:', {
    tokenSnapshots,
    isLoading,
    error,
    timeframe,
  });

  const sortedData = useMemo(() => {
    if (!tokenSnapshots) {
      return [];
    }

    return [...tokenSnapshots].sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue: number | string | null | undefined;
      let bValue: number | string | null | undefined;

      switch (key) {
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

  // Debug logging for sorted data
  console.log('Sorted data:', sortedData);

  // Always render the header row (controls)
  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-auto">
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
                        key: key as string,
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

          <div>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-emerald-400/60">
                  Loading token data...
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-red-400">{error}</span>
              </div>
            ) : tokenSnapshots && tokenSnapshots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 p-0">
                {sortedData.map((snapshot, index) => {
                  const isSelected =
                    selectedTokenAddress === snapshot.token_address;
                  return (
                    <div
                      key={snapshot.token_address}
                      className={cn(
                        'bg-[#101c2c] rounded-md p-2 border transition-colors cursor-pointer group w-full',
                        isSelected
                          ? 'border-emerald-400/60 shadow-lg'
                          : 'border-emerald-400/10 hover:border-emerald-400/30',
                      )}
                      onClick={() => onTokenSelect?.(snapshot)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onTokenSelect?.(snapshot);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-emerald-400/40 text-xs mr-1">
                          #{index + 1}
                        </span>
                        <span className="text-white/90 font-bold text-xs truncate">
                          {snapshot.data?.ticker || 'N/A'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[11px] text-white/90">
                        {visibleFields.includes('marketCap') && (
                          <div>
                            <span className="font-semibold text-emerald-400/80">
                              MCap:{' '}
                            </span>
                            {snapshot.data?.marketCap
                              ? formatCurrency(snapshot.data.marketCap)
                              : 'N/A'}
                          </div>
                        )}
                        {visibleFields.includes('volume') && (
                          <div>
                            <span className="font-semibold text-emerald-400/80">
                              24h Vol:{' '}
                            </span>
                            {snapshot.data?.liquidityMetrics?.volumeMetrics
                              ?.volume24h
                              ? formatCurrency(
                                  snapshot.data.liquidityMetrics.volumeMetrics
                                    .volume24h,
                                )
                              : 'N/A'}
                          </div>
                        )}
                        {visibleFields.includes('price') && (
                          <div>
                            <span className="font-semibold text-emerald-400/80">
                              Price:{' '}
                            </span>
                            {snapshot.data?.priceInfo?.price
                              ? formatPrice(snapshot.data.priceInfo.price)
                              : 'N/A'}
                          </div>
                        )}
                        {visibleFields.includes('holders') && (
                          <div>
                            <span className="font-semibold text-emerald-400/80">
                              Holders:{' '}
                            </span>
                            {snapshot.data?.holderCount
                              ? formatSupply(snapshot.data.holderCount)
                              : 'N/A'}
                          </div>
                        )}
                        {visibleFields.includes('supply') && (
                          <div>
                            <span className="font-semibold text-emerald-400/80">
                              Supply:{' '}
                            </span>
                            {snapshot.data?.supply
                              ? formatSupply(snapshot.data.supply)
                              : 'N/A'}
                          </div>
                        )}
                        {visibleFields.includes('lastUpdated') && (
                          <div className="flex items-center gap-1">
                            <Clock
                              className="w-3 h-3 text-emerald-400/80"
                              aria-label="Last Updated"
                            />
                            <span>
                              {snapshot.timestamp
                                ? getTimeAgo(snapshot.timestamp)
                                : 'N/A'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <span className="text-emerald-400/60">
                  No token data available
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <TokenInfoPanel selectedToken={selectedToken ?? null} />
        </div>
      </div>
    </Panel>
  );
}
