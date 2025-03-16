'use client';

import { Panel } from './Panel';

interface TrendingTweetsPanelProps {
  maxHeight?: string;
}

export function TrendingTweetsPanel({ maxHeight }: TrendingTweetsPanelProps) {
  return (
    <Panel maxHeight={maxHeight}>
      <div className="text-white/60">Coming soon...</div>
    </Panel>
  );
}
