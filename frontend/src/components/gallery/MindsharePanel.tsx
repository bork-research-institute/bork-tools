'use client';
import {} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type TopicWeight,
  mindshareService,
} from '@/lib/services/mindshare-service';
import { cn } from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Brain,
  Circle,
  Eye,
  Heart,
  MessageCircle,
  Quote,
  Repeat2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import squarify from 'squarify';
import { Panel } from './Panel';

interface MindsharePanelProps {
  maxHeight?: string;
}

interface TreemapData {
  topic: string;
  value: number;
  percentage: number;
  percentage_change: number;
  engagement_score: number;
  engagement_metrics: TopicWeight['engagement_metrics'];
  tweet_id: string;
  created_at: string;
}

interface InfoAreaProps {
  data: TreemapData | null;
  timeFrame: string;
  onClose: () => void;
}

const timeFrameOptions = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7D' },
  { value: '30d', label: 'Last 30D' },
  { value: '3m', label: 'Last 3M' },
  { value: '6m', label: 'Last 6M' },
  { value: '12m', label: 'Last 12M' },
] as const;

function MetricWithTooltip({
  icon: Icon,
  value,
  tooltip,
  className,
}: {
  icon: typeof Brain;
  value: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <div className="flex items-center gap-1.5 cursor-help">
            <Icon className={cn('h-3 w-3', className)} />
            <span className={cn('text-xs font-medium tabular-nums', className)}>
              {value}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-black/90 backdrop-blur-sm border-white/10 text-white"
          sideOffset={4}
        >
          <p className="text-xs text-white">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const engagementMetrics = {
  replies: { icon: MessageCircle, label: 'Replies' },
  likes: { icon: Heart, label: 'Likes' },
  retweets: { icon: Repeat2, label: 'Retweets' },
  quotes: { icon: Quote, label: 'Quotes' },
  impressions: { icon: Eye, label: 'Impressions' },
} as const;

function InfoArea({ data, timeFrame, onClose }: InfoAreaProps) {
  if (!data) {
    return (
      <div className="rounded-lg bg-white/5 flex items-center justify-center text-white/60 text-xs p-3">
        Click a topic to see details
      </div>
    );
  }

  const getChangeIcon = (change: number) => {
    if (Math.abs(change) < 0.1) {
      return <Circle className="h-3 w-3 text-white/60" />;
    }
    return change > 0 ? (
      <ArrowUpIcon className="h-3 w-3 text-green-400" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 text-red-400" />
    );
  };

  const getBrainColor = (percentage: number) => {
    if (percentage >= 20) {
      return 'text-emerald-400';
    }
    if (percentage >= 10) {
      return 'text-emerald-500';
    }
    if (percentage >= 5) {
      return 'text-emerald-600';
    }
    if (percentage >= 1) {
      return 'text-emerald-700';
    }
    return 'text-emerald-800';
  };

  const timeframeLabel =
    timeFrameOptions
      .find((opt) => opt.value === timeFrame)
      ?.label.toLowerCase() || timeFrame;

  return (
    <div className="rounded-lg bg-white/5 px-3 py-2 flex flex-col">
      {/* Top Row - Title and Primary Metrics */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 min-w-0">
          <h3 className="font-medium text-xs text-white/90 truncate">
            {data.topic}
          </h3>
          <div className="flex items-center gap-3">
            <MetricWithTooltip
              icon={Brain}
              value={`${data.percentage.toFixed(1)}%`}
              tooltip="Mindshare: Percentage of total engagement across all topics"
              className={getBrainColor(data.percentage)}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <div className="flex items-center gap-1 cursor-help">
                    {getChangeIcon(data.percentage_change)}
                    <span
                      className={cn(
                        'text-[10px]',
                        Math.abs(data.percentage_change) < 0.1
                          ? 'text-white/60'
                          : data.percentage_change > 0
                            ? 'text-green-400'
                            : 'text-red-400',
                      )}
                    >
                      {`${data.percentage_change >= 0 ? '+' : ''}${data.percentage_change.toFixed(1)}%`}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-black/90 backdrop-blur-sm border-white/10 text-white"
                  sideOffset={4}
                >
                  <p className="text-xs text-white">
                    {`Change in mindshare over the ${timeframeLabel}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Row - Engagement Metrics */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {data.engagement_metrics &&
          Object.entries(data.engagement_metrics).map(([key, value]) => {
            const metricInfo =
              engagementMetrics[key as keyof typeof engagementMetrics];
            if (!metricInfo) {
              return null;
            }

            return (
              <div
                key={key}
                className={cn(
                  'px-2 py-1 rounded bg-white/5 flex-shrink-0',
                  key === 'impressions' && 'bg-white/10',
                )}
              >
                <MetricWithTooltip
                  key={key}
                  icon={metricInfo.icon}
                  value={(value || 0).toLocaleString()}
                  tooltip={`${metricInfo.label}: ${(value || 0).toLocaleString()}`}
                  className={cn(
                    'text-white/60',
                    key === 'impressions' && 'text-white/80',
                  )}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function MindsharePanel({ maxHeight }: MindsharePanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treemapRects, setTreemapRects] = useState<
    (TreemapData & {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    })[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeFrame, setTimeFrame] = useState<string>('24h');
  const [selectedData, setSelectedData] = useState<TreemapData | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Calculate timeframe dates
        const end = new Date();
        const start = new Date();
        const timeFrameValue = timeFrame.replace(/[^0-9]/g, '');
        const timeFrameUnit = timeFrame.replace(/[0-9]/g, '');

        switch (timeFrameUnit) {
          case 'h':
            start.setHours(start.getHours() - Number.parseInt(timeFrameValue));
            break;
          case 'd':
            start.setDate(start.getDate() - Number.parseInt(timeFrameValue));
            break;
          case 'm':
            start.setMonth(start.getMonth() - Number.parseInt(timeFrameValue));
            break;
        }

        const data = await mindshareService.getTopicWeights({
          timeframe: { start, end },
        });

        // Filter by search query if present
        const filteredData = debouncedSearch
          ? data.filter((item) =>
              item.topic.toLowerCase().includes(debouncedSearch.toLowerCase()),
            )
          : data;

        const totalEngagementScore = filteredData.reduce(
          (sum, item) => sum + item.engagement_score,
          0,
        );

        // Create a Map to keep only unique topics with their latest data
        const uniqueTopics = new Map();
        for (const item of filteredData) {
          uniqueTopics.set(item.topic, {
            ...item,
            percentage: (item.engagement_score / totalEngagementScore) * 100,
          });
        }

        const processedData = Array.from(uniqueTopics.values())
          .map((item) => ({
            topic: item.topic,
            value: item.engagement_score,
            percentage: item.percentage,
            percentage_change: item.percentage_change,
            engagement_score: item.engagement_score,
            engagement_metrics: item.engagement_metrics,
            tweet_id: item.tweet_id,
            created_at: item.created_at,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 25);

        // Define container dimensions
        const container = { x0: 0, y0: 0, x1: 100, y1: 100 };

        // Generate treemap layout
        const layout = squarify<TreemapData>(processedData, container);

        setTreemapRects(layout);
      } catch (err) {
        console.error('Error fetching mindshare data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load mindshare data',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeFrame, debouncedSearch]);

  const getBackgroundColor = (percentage: number, percentageChange: number) => {
    // Ensure minimum alpha for visibility
    const alpha = Math.max(0.4, Math.min(0.9, 0.4 + percentage * 0.01));

    // Use more vibrant colors
    const hue = percentageChange > 0 ? 145 : percentageChange < 0 ? 0 : 210;

    // Higher base saturation and lightness for better visibility
    const saturation =
      Math.abs(percentageChange) < 0.1
        ? 30 // More visible grey for no change
        : Math.min(100, 60 + Math.abs(percentageChange) * 0.4);

    // Increase lightness for better visibility
    const lightness = Math.max(25, Math.min(45, 25 + percentage * 0.2));

    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  };

  const handleRectClick = (rect: TreemapData) => {
    setSelectedData(rect);
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
      <div className="flex flex-col h-full gap-4">
        {/* Search and timeframe controls - Fixed height */}
        <div className="flex gap-2 h-9 flex-shrink-0">
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={timeFrame} onValueChange={setTimeFrame}>
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

        {/* Info area - Fixed height */}
        <div className="h-[72px] flex-shrink-0">
          <InfoArea
            data={selectedData}
            timeFrame={timeFrame}
            onClose={() => setSelectedData(null)}
          />
        </div>

        {/* Treemap container - Remaining height */}
        <div
          className="flex-1 min-h-[300px] relative bg-black/20 rounded-lg overflow-hidden"
          onClick={() => setSelectedData(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedData(null);
            }
          }}
          role="presentation"
        >
          <div className="absolute inset-0">
            {treemapRects.map((rect, index) => {
              // Calculate cell dimensions as percentages
              const width = rect.x1 - rect.x0;
              const height = rect.y1 - rect.y0;
              const area = width * height;

              // Much stricter thresholds
              const isSmall = width < 15 || height < 15 || area < 225; // No percentage
              const isTiny = width < 8 || height < 8 || area < 100; // No content at all

              return (
                <button
                  type="button"
                  key={`${rect.topic}-${index}`}
                  className={cn(
                    'absolute cursor-pointer transition-all duration-200 rounded-lg overflow-hidden hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background text-left',
                    !isTiny && 'p-2',
                    selectedData?.topic === rect.topic &&
                      'ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                  style={{
                    left: `${rect.x0}%`,
                    top: `${rect.y0}%`,
                    width: `${Math.max(width, 0.1)}%`,
                    height: `${Math.max(height, 0.1)}%`,
                    backgroundColor: getBackgroundColor(
                      rect.percentage,
                      rect.percentage_change,
                    ),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRectClick(rect);
                  }}
                  title={`${rect.topic} (${rect.percentage.toFixed(1)}%)`}
                >
                  {!isTiny && (
                    <div className="h-full flex flex-col justify-between">
                      <div className="font-medium text-xs text-white/90 truncate">
                        {rect.topic}
                      </div>
                      {!isSmall && (
                        <div className="text-[10px] text-white/60 mt-1">
                          {rect.percentage.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
