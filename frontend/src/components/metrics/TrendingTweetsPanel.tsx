'use client';

import type { ScoreFilter, TrendingTweet } from '@/lib/services/tweets';
import { cn } from '@/lib/utils';
import type { TweetMediaItem } from '@/types/media';
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
  selectedTokenTicker?: string;
  onReset?: () => void;
}

const scoreFilterOptions: { label: string; value: ScoreFilter }[] = [
  { label: 'Overall', value: 'aggregate' },
  { label: 'Impact', value: 'impact_score' },
  { label: 'Engagement', value: 'engagement_score' },
  { label: 'Relevance', value: 'relevance' },
  { label: 'Clarity', value: 'clarity' },
  { label: 'Authenticity', value: 'authenticity' },
  { label: 'Value', value: 'value_add' },
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
  selectedTokenTicker,
  onReset,
}: TrendingTweetsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedFilter, setSelectedFilter] =
    useState<ScoreFilter>('aggregate');
  const [filteredTweets, setFilteredTweets] = useState<TrendingTweet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
    if (tweets) {
      setFilteredTweets(tweets);
    }
  }, [tweets]);

  useEffect(() => {
    if (!mounted || !tweets) {
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
        if (selectedFilter === 'engagement_score') {
          return b.engagement_score - a.engagement_score;
        }
        // For quality metrics, multiply by 100 to convert from 0-1 to 0-100
        if (
          ['relevance', 'clarity', 'authenticity', 'value_add'].includes(
            selectedFilter,
          )
        ) {
          return b[selectedFilter] * 100 - a[selectedFilter] * 100;
        }
        return b[selectedFilter] - a[selectedFilter];
      }),
    );
  }, [tweets, selectedFilter, mounted, searchQuery]);

  return (
    <Panel maxHeight={maxHeight}>
      <div className="flex flex-col gap-4">
        {/* Deletable tag for selected token */}
        {selectedTokenTicker && (
          <div className="flex items-center mb-2">
            <span className="bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              {selectedTokenTicker}
              <button
                type="button"
                onClick={onReset}
                aria-label="Clear selected token"
                className="ml-1 text-emerald-400 hover:text-red-400 focus:outline-none"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-3 h-3"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          </div>
        )}
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
                  <div className="flex flex-col flex-1 min-w-0 mr-4">
                    <a
                      href={`https://twitter.com/${tweet.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-medium text-xs truncate"
                    >
                      {tweet.name}
                    </a>
                    <span className="text-white/40 text-[10px] truncate">
                      @{tweet.username}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-xl font-bold shrink-0',
                      getScoreColor(
                        selectedFilter === 'aggregate'
                          ? tweet.aggregate_score
                          : selectedFilter === 'engagement_score'
                            ? tweet.engagement_score
                            : tweet[selectedFilter],
                      ),
                    )}
                  >
                    {Math.round(
                      selectedFilter === 'aggregate'
                        ? tweet.aggregate_score
                        : selectedFilter === 'engagement_score'
                          ? tweet.engagement_score
                          : tweet[selectedFilter],
                    )}
                  </div>
                </div>

                {/* Original Tweet Content */}
                <p className="text-white/90 text-xs break-words whitespace-pre-wrap">
                  {tweet.content}
                </p>

                {/* Media Display */}
                {tweet.photos && tweet.photos.length > 0 && (
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                    {tweet.photos.map((photo: TweetMediaItem, idx: number) => {
                      let mediaUrl: string | undefined;
                      let previewUrl: string | undefined;
                      let mediaKey: string | number = idx;
                      if (typeof photo === 'string') {
                        mediaUrl = photo;
                        mediaKey = photo;
                      } else if (photo && typeof photo === 'object') {
                        mediaUrl = photo.url;
                        previewUrl = photo.preview || photo.url;
                        mediaKey = photo.id || idx;
                      }
                      if (!mediaUrl) {
                        // Skip rendering if URL is missing
                        return null;
                      }
                      const isVideo =
                        mediaUrl.includes('video.twimg.com') ||
                        mediaUrl.includes('ext_tw_video');
                      if (isVideo) {
                        return (
                          <div key={mediaKey} className="w-full h-full">
                            <video
                              controls={true}
                              preload="none"
                              poster={previewUrl}
                              className="absolute inset-0 w-full h-full object-cover"
                              aria-label="Tweet video content"
                              tabIndex={0}
                              onError={(e) => {
                                // Hide video if it fails to load
                                (
                                  e.currentTarget as HTMLVideoElement
                                ).style.display = 'none';
                              }}
                            >
                              <source src={mediaUrl} type="video/mp4" />
                              <track
                                kind="captions"
                                src=""
                                label="English captions"
                                srcLang="en"
                                default={true}
                              />
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        );
                      }
                      return (
                        <img
                          key={mediaKey}
                          src={mediaUrl}
                          alt="Tweet media"
                          aria-label="Tweet image content"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = 'none';
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Engagement Metrics */}
                <div className="flex items-center justify-between text-[10px]">
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
                    className="text-blue-400 hover:text-blue-300 text-[10px] break-all"
                  >
                    View Tweet →
                  </a>
                </div>

                {/* Content Analysis (Secondary) */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <details className="text-[10px]">
                    <summary className="text-white/60 cursor-pointer hover:text-white/80">
                      View Analysis
                    </summary>
                    <div className="mt-2 text-white/80 space-y-2">
                      <p className="text-[10px] break-words whitespace-pre-wrap">
                        {tweet.content_summary}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tweet.topics.map((topic) => (
                          <span
                            key={`${tweet.tweet_id}-${topic}`}
                            className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] break-words"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
