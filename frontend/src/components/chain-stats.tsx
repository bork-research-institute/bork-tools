import { Skeleton } from '@/components/ui/skeleton';
import { getChainStats } from '@/lib/services/defillama';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format-number';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart2,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export function ChainStats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['chain-stats', 'Solana'],
    queryFn: () => getChainStats('Solana'),
  });

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-400">
        <AlertTriangle className="h-4 w-4" />
        <span>Error loading chain stats</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-4 w-4 text-emerald-400" />
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm text-white">
            ${formatNumber(data?.price ?? 0)}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <BarChart2 className="h-4 w-4 text-emerald-400" />
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-white">
              ${formatNumber(data?.volume24h ?? 0)}
            </span>
            {data?.volumeChange24h !== undefined && (
              <div
                className={cn(
                  'flex items-center text-xs space-x-1',
                  data.volumeChange24h >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400',
                )}
              >
                {data.volumeChange24h >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
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
