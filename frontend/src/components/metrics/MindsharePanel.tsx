'use client';

import { mockMindshareData } from '@/mocks/metricsData';
import { useMemo } from 'react';
import { Panel } from './Panel';

interface MindsharePanelProps {
  maxHeight?: string;
}

export function MindsharePanel({ maxHeight }: MindsharePanelProps) {
  const mindshareData = useMemo(() => {
    const totalWeight = mockMindshareData.reduce(
      (sum, item) => sum + item.weight,
      0,
    );
    return mockMindshareData
      .map((item) => ({
        ...item,
        percentage: (item.weight / totalWeight) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, []);

  const getBackgroundColor = (percentage: number) => {
    return `rgba(16, 185, 129, ${Math.min(0.4, 0.1 + percentage * 0.02)})`;
  };

  const getTextColor = (percentage: number) => {
    return percentage > 2 ? 'text-white' : 'text-emerald-400/60';
  };

  return (
    <Panel maxHeight={maxHeight}>
      <div className="grid grid-cols-4 gap-1">
        {mindshareData.map((item) => (
          <div
            key={item.topic}
            className={`flex flex-col items-center justify-center p-2 rounded ${getTextColor(
              item.percentage,
            )}`}
            style={{
              backgroundColor: getBackgroundColor(item.percentage),
              aspectRatio: '1',
            }}
          >
            <div className="text-xs font-medium text-center truncate w-full">
              {item.topic}
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
