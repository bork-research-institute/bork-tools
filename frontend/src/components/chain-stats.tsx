'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { getChainStats } from '@/lib/services/defillama';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatPrice } from '@/lib/utils/format-number';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Image from 'next/image';

export function ChainStats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['chain-stats', 'Solana'],
    queryFn: () => getChainStats('Solana'),
  });

  if (isError) {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-red-400">
        <AlertTriangle className="h-3 w-3" />
        <span>Error loading chain stats</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center space-x-4 text-xs"
      data-tutorial="chain-stats"
    >
      <div className="flex items-center space-x-1.5">
        <Image
          src="/assets/solana-logo.png"
          alt="Solana"
          width={14}
          height={14}
          className="text-emerald-400"
        />
        {isLoading ? (
          <Skeleton className="h-3.5 w-14" />
        ) : (
          <span className="text-xs text-white">
            {formatPrice(data?.price ?? 0)}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-1.5">
        <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
        {isLoading ? (
          <Skeleton className="h-3.5 w-20" />
        ) : (
          <div className="flex items-center space-x-1">
            <span className="text-xs text-white">
              {formatCurrency(data?.volume24h ?? 0)}
            </span>
            {data?.volumeChange24h !== undefined && (
              <div
                className={cn(
                  'flex items-center text-[10px] space-x-0.5',
                  data.volumeChange24h >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400',
                )}
              >
                {data.volumeChange24h >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                <span>{Math.abs(data.volumeChange24h).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
