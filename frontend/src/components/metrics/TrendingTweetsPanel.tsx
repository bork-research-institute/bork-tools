'use client';

import type { ScoreFilter, TrendingTweet } from '@/lib/services/tweets';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Panel } from './Panel';

interface TrendingTweetsPanelProps {
  maxHeight?: string;
  tweets: TrendingTweet[];
  loading: boolean;
}

const scoreFilterOptions: { label: string; value: ScoreFilter }[] = [
  { label: 'Overall', value: 'aggregate' },
  { label: 'Impact', value: 'impact_score' },
  { label: 'Relevance', value: 'content_relevance' },
  { label: 'Quality', value: 'content_quality' },
  { label: 'Engagement', value: 'content_engagement' },
  { label: 'Authenticity', value: 'content_authenticity' },
  { label: 'Value', value: 'content_value_add' },
];

const getScoreColor = (score: number): string => {
  if (score >= 90) {
    return 'text-green-400';
  }
  if (score >= 80) {
    return 'text-green-500';
  }
  if (score >= 70) {
    return 'text-green-600';
  }
  if (score >= 60) {
    return 'text-green-700';
  }
  return 'text-green-800';
};

export function TrendingTweetsPanel({
  maxHeight,
  tweets,
  loading,
}: TrendingTweetsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedFilter, setSelectedFilter] =
    useState<ScoreFilter>('aggregate');
  const [filteredTweets, setFilteredTweets] = useState<TrendingTweet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
    setFilteredTweets(tweets);
  }, [tweets]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const filtered = tweets.filter((tweet) =>
      tweet.username.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    setFilteredTweets(
      [...filtered].sort((a, b) => {
        if (selectedFilter === 'aggregate') {
          return b.aggregate_score - a.aggregate_score;
        }
        return b[selectedFilter] - a[selectedFilter];
      }),
    );
  }, [tweets, selectedFilter, mounted, searchQuery]);

  // Show loading state during initial render
  if (!mounted) {
    return (
      <Panel maxHeight={maxHeight}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-[200px] rounded-md bg-white/5 animate-pulse" />
            <div className="h-9 w-[140px] rounded-md bg-white/5 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-800/50 rounded-lg p-4 space-y-3 animate-pulse"
              >
                <div className="h-6 bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px] bg-white/5 border-white/10 text-white"
          />
          <Select
            value={selectedFilter}
            onValueChange={(value: ScoreFilter) => setSelectedFilter(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {scoreFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-white/60">Loading trending tweets...</div>
        ) : filteredTweets.length === 0 ? (
          <div className="text-white/60">
            {searchQuery
              ? 'No tweets found for this username'
              : 'No trending tweets found'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTweets.map((tweet) => (
              <div
                key={tweet.tweet_id}
                className="bg-gray-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <a
                      href={`https://twitter.com/${tweet.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {tweet.name}
                    </a>
                    <span className="text-white/40 text-sm">
                      @{tweet.username}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      getScoreColor(
                        tweet[
                          selectedFilter === 'aggregate'
                            ? 'aggregate_score'
                            : selectedFilter
                        ],
                      ),
                    )}
                  >
                    {
                      tweet[
                        selectedFilter === 'aggregate'
                          ? 'aggregate_score'
                          : selectedFilter
                      ]
                    }
                  </div>
                </div>

                <p className="text-white/90">{tweet.content}</p>

                {tweet.photos && tweet.photos.length > 0 && (
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                    <img
                      src={tweet.photos[0]}
                      alt="Tweet media"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-white/60">
                    <div className="flex items-center gap-1">
                      <span>💬</span>
                      <span>{tweet.replies.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🔄</span>
                      <span>{tweet.retweets.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>❤️</span>
                      <span>{tweet.likes.toLocaleString()}</span>
                    </div>
                  </div>
                  <a
                    href={tweet.permanent_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Tweet →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
