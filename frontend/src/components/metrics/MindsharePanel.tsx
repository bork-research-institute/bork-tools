import { mockMindshareData } from '@/mocks/metricsData';
import { Brain } from 'lucide-react';
import { useMemo } from 'react';
import { Panel } from './Panel';

interface MindsharePanelProps {
  onClose: () => void;
}

export function MindsharePanel({ onClose }: MindsharePanelProps) {
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
    // Dark red color scheme
    return `rgb(${Math.min(255, 120 + percentage * 8)}, 20, 60)`;
  };

  const getTextColor = (percentage: number) => {
    return percentage > 2 ? 'text-white' : 'text-white/70';
  };

  return (
    <Panel
      title="Topic Mindshare"
      icon={<Brain className="h-3.5 w-3.5" />}
      className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
    >
      <div className="grid grid-cols-4 gap-1 p-2 h-[calc(100%-2rem)]">
        {mindshareData.map((item) => (
          <div
            key={item.topic}
            className={`flex flex-col items-center justify-center p-2 rounded ${getTextColor(item.percentage)}`}
            style={{
              backgroundColor: getBackgroundColor(item.percentage),
              aspectRatio: '1',
            }}
          >
            <div className="text-xs font-medium text-center truncate w-full">
              {item.topic}
            </div>
            <div className="text-lg font-bold">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
