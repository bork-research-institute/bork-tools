import { BarChart2, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils/cn';
import { formatNumber } from '../lib/utils/format-number';

type ChainStatsProps = {
  price: number;
  volume24h: number;
  volumeChange24h: number;
};

export function ChainStats({
  price,
  volume24h,
  volumeChange24h,
}: ChainStatsProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-white">${formatNumber(price)}</span>
      </div>
      <div className="flex items-center space-x-2">
        <BarChart2 className="h-4 w-4 text-emerald-400" />
        <div className="flex items-center space-x-1">
          <span className="text-sm text-white">${formatNumber(volume24h)}</span>
          <div
            className={cn(
              'flex items-center text-xs',
              volumeChange24h >= 0 ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {volumeChange24h >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(volumeChange24h).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
