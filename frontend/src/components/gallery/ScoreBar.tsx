'use client';

import { cn } from '@/lib/utils';

interface ScoreBarProps {
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-1 bg-emerald-400/20 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            score >= 80
              ? 'bg-emerald-400'
              : score >= 60
                ? 'bg-emerald-400/80'
                : score >= 40
                  ? 'bg-emerald-400/60'
                  : score >= 20
                    ? 'bg-emerald-400/40'
                    : 'bg-emerald-400/20',
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span>{score.toFixed(1)}</span>
    </div>
  );
}
