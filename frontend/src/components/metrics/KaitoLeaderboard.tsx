import { cn } from '@/lib/utils';
import { mockKaitoLeaderboard } from '@/mocks/metricsData';
import { Trophy } from 'lucide-react';
import { Panel } from './Panel';

interface KaitoLeaderboardProps {
  onClose: () => void;
}

export function KaitoLeaderboard({ onClose }: KaitoLeaderboardProps) {
  const getBackgroundColor = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-yellow-900/50 to-yellow-600/50';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-gray-700/50 to-gray-400/50';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-amber-900/50 to-amber-600/50';
    }
    return 'bg-black/40';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) {
      return 'text-yellow-500';
    }
    if (rank === 2) {
      return 'text-gray-400';
    }
    if (rank === 3) {
      return 'text-amber-600';
    }
    return 'text-gray-500';
  };

  return (
    <Panel
      title="Yaps Leaderboard"
      icon={<Trophy className="h-3.5 w-3.5" />}
      className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
    >
      <div className="flex flex-col h-[calc(100%-2rem)]">
        <div className="flex-1 space-y-1">
          {mockKaitoLeaderboard.map((user) => (
            <div
              key={user.username}
              className={cn(
                'flex items-center gap-3 p-2 rounded transition-colors',
                getBackgroundColor(user.rank),
              )}
            >
              <div
                className={cn(
                  'w-6 text-center font-bold',
                  getRankColor(user.rank),
                )}
              >
                #{user.rank}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {user.username}
                </div>
              </div>
              <div className="text-sm font-medium text-white">
                {user.yaps.toLocaleString()} yaps
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-center text-gray-500 mt-2 pb-2">
          Powered by Kaito
        </div>
      </div>
    </Panel>
  );
}
