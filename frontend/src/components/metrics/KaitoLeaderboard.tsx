'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type LeaderboardEntry,
  type TimeFrame,
  yapsService,
} from '@/lib/services/yaps';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Panel } from './Panel';

interface KaitoLeaderboardProps {
  maxHeight?: string;
}

const timeFrameOptions: { value: TimeFrame; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '12m', label: 'Last 12 Months' },
];

const SKELETON_ITEMS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;

export function KaitoLeaderboard({ maxHeight }: KaitoLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const data = await yapsService.getLeaderboard(
          10,
          timeFrame,
          debouncedSearch,
        );
        setLeaderboard(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [timeFrame, debouncedSearch]);

  const getBackgroundColor = (rank: number): string => {
    if (rank === 1) {
      return 'bg-amber-500/20';
    }
    if (rank === 2) {
      return 'bg-slate-400/20';
    }
    if (rank === 3) {
      return 'bg-orange-900/20';
    }
    return 'bg-white/5';
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) {
      return 'text-amber-500';
    }
    if (rank === 2) {
      return 'text-slate-400';
    }
    if (rank === 3) {
      return 'text-orange-700';
    }
    return 'text-white/40';
  };

  return (
    <Panel maxHeight={maxHeight}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={timeFrame}
            onValueChange={(value: TimeFrame) => setTimeFrame(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFrameOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          {isLoading ? (
            SKELETON_ITEMS.map((key) => (
              <div
                key={`skeleton-${key}`}
                className="flex items-center gap-3 p-2 rounded bg-white/5 animate-pulse"
              >
                <div className="w-6 h-4 bg-white/10 rounded" />
                <div className="flex-1 h-4 bg-white/10 rounded" />
                <div className="w-20 h-4 bg-white/10 rounded" />
              </div>
            ))
          ) : leaderboard.length > 0 ? (
            leaderboard.map((user) => (
              <div
                key={user.username}
                className={cn(
                  'flex items-center gap-3 p-2 rounded transition-colors',
                  getBackgroundColor(user.rank),
                )}
              >
                <div
                  className={cn(
                    'w-6 text-center font-bold shrink-0',
                    getRankColor(user.rank),
                  )}
                >
                  #{user.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white/90 truncate">
                    {user.username.toLowerCase()}
                  </div>
                </div>
                <div className="text-sm font-medium text-white/60 shrink-0">
                  {user.yaps.toFixed(1).toLocaleString()} yaps
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-white/60 py-4">No users found</div>
          )}
        </div>
      </div>
    </Panel>
  );
}
