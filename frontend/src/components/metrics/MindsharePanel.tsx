'use client';

import {
  type TopicWeight,
  mindshareService,
} from '@/lib/services/mindshare-service';
import { useEffect, useState } from 'react';
import { Panel } from './Panel';

interface MindsharePanelProps {
  maxHeight?: string;
}

export function MindsharePanel({ maxHeight }: MindsharePanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindshareData, setMindshareData] = useState<
    (TopicWeight & { percentage: number })[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await mindshareService.getTopicWeights();
        const totalWeight = data.reduce((sum, item) => sum + item.weight, 0);

        const processedData = data.map((item) => ({
          ...item,
          percentage: (item.weight / totalWeight) * 100,
        }));

        setMindshareData(processedData);
      } catch (err) {
        console.error('Error fetching mindshare data:', err);
        setError('Failed to load mindshare data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBackgroundColor = (percentage: number, impactScore: number) => {
    const alpha = Math.min(0.9, 0.3 + percentage * 0.03);
    const hue = impactScore >= 0.5 ? 160 : 0;
    return `hsla(${hue}, 45%, 25%, ${alpha})`;
  };

  const getGridClass = (index: number) => {
    // First row items are larger
    if (index < 3) {
      return 'col-span-4 row-span-3';
    }
    // Second row items are medium
    if (index < 7) {
      return 'col-span-3 row-span-2';
    }
    // Rest are smaller
    return 'col-span-2 row-span-2';
  };

  if (loading) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex items-center justify-center h-full">
          <div className="text-white/60">Loading mindshare data...</div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">{error}</div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel maxHeight={maxHeight}>
      <div className="grid grid-cols-12 auto-rows-fr gap-2 h-full">
        {mindshareData.slice(0, 12).map((item, index) => {
          const fontSize =
            index < 3 ? 'text-lg' : index < 7 ? 'text-sm' : 'text-xs';
          const percentSize = index < 3 ? 'text-sm' : 'text-xs';

          return (
            <div
              key={item.topic}
              className={`${getGridClass(
                index,
              )} flex flex-col items-start p-3 rounded-lg transition-all duration-200 overflow-hidden`}
              style={{
                backgroundColor: getBackgroundColor(
                  item.percentage,
                  item.impact_score,
                ),
              }}
            >
              <div className="flex flex-col gap-0.5 w-full">
                <div
                  className={`font-medium ${fontSize} text-white/90 truncate`}
                >
                  {item.topic}
                </div>
                <div className={`${percentSize} text-white/60`}>
                  {item.percentage.toFixed(2)}%
                </div>
              </div>
              <div className="w-full h-8 flex items-end mt-auto">
                <div className="w-full h-[1px] bg-white/10 relative">
                  <div
                    className="absolute bottom-0 left-0 w-full h-6 opacity-50"
                    style={{
                      background: `linear-gradient(to top, ${getBackgroundColor(
                        item.percentage,
                        item.impact_score,
                      )}, transparent)`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
