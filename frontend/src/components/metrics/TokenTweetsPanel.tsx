import { tweetService } from '@/lib/services/tweets';
import { cn } from '@/lib/utils';
import type { TweetMediaItem } from '@/types/media';
import type { TweetWithAnalysis } from '@/types/tweets-analysis';
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

interface TokenTweetsPanelProps {
  tweetIds: string[];
  loading?: boolean;
}

type ScoreFilter =
  | 'aggregate'
  | 'impact_score'
  | 'engagement_score'
  | 'relevance'
  | 'clarity'
  | 'authenticity'
  | 'value_add';

const scoreFilterOptions: { label: string; value: ScoreFilter }[] = [
  { label: 'Overall', value: 'aggregate' },
  { label: 'Impact', value: 'impact_score' },
  { label: 'Engagement', value: 'engagement_score' },
  { label: 'Relevance', value: 'relevance' },
  { label: 'Clarity', value: 'clarity' },
  { label: 'Authenticity', value: 'authenticity' },
  { label: 'Value', value: 'value_add' },
];

// Calculate engagement score (0-100) based on likes, replies, retweets, views, and bookmarks
const calculateEngagementScore = (tweet: TweetWithAnalysis): number => {
  // Base engagement from core metrics
  const baseEngagement =
    (tweet.likes || 0) * 1 + // 1 point per like
    (tweet.replies || 0) * 2 + // 2 points per reply
    (tweet.retweets || 0) * 3; // 3 points per retweet

  // Additional engagement from views and bookmarks
  const viewsScore = tweet.views ? Math.min(tweet.views / 1000, 50) : 0; // Up to 50 points for 50k+ views
  const bookmarkScore = tweet.bookmarkCount
    ? Math.min(tweet.bookmarkCount * 2, 20)
    : 0; // Up to 20 points for 10+ bookmarks

  // Total score capped at 100
  return Math.min(
    Math.round((baseEngagement / 1000) * 100 + viewsScore + bookmarkScore),
    100,
  );
};

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

// Calculate aggregate score based on all metrics
const calculateAggregateScore = (tweet: TweetWithAnalysis): number => {
  if (!tweet.analysis) {
    return calculateEngagementScore(tweet);
  }

  const engagementWeight = 0.4;
  const qualityWeight = 0.6;

  const engagementScore = calculateEngagementScore(tweet);

  const qualityScore = Math.round(
    (tweet.analysis.relevance * 100 +
      tweet.analysis.clarity * 100 +
      tweet.analysis.authenticity * 100 +
      tweet.analysis.value_add * 100) /
      4,
  );

  return Math.round(
    engagementScore * engagementWeight + qualityScore * qualityWeight,
  );
};

// Get score based on selected filter
const getScore = (tweet: TweetWithAnalysis, filter: ScoreFilter): number => {
  switch (filter) {
    case 'aggregate':
      return calculateAggregateScore(tweet);
    case 'engagement_score':
      return calculateEngagementScore(tweet);
    case 'relevance':
    case 'clarity':
    case 'authenticity':
    case 'value_add':
      return tweet.analysis ? Math.round(tweet.analysis[filter] * 100) : 0;
    default:
      return calculateAggregateScore(tweet);
  }
};

export function TokenTweetsPanel({
  tweetIds,
  loading: parentLoading,
}: TokenTweetsPanelProps) {
  const [tweets, setTweets] = useState<TweetWithAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSpam, setShowSpam] = useState(false);
  const [selectedFilter, setSelectedFilter] =
    useState<ScoreFilter>('aggregate');
  const [filteredTweets, setFilteredTweets] = useState<TweetWithAnalysis[]>([]);

  console.log('TokenTweetsPanel render', tweetIds);

  useEffect(() => {
    if (!tweetIds || tweetIds.length === 0) {
      console.log('TokenTweetsPanel: No tweet IDs provided, clearing tweets');
      setTweets([]);
      return;
    }
    console.log('TokenTweetsPanel: Fetching tweets for IDs:', tweetIds);
    setLoading(true);
    tweetService
      .getTweetsAndAnalysesByIds(tweetIds)
      .then((data) => {
        console.log('TokenTweetsPanel: Fetched tweets:', data);
        setTweets(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('TokenTweetsPanel: Error fetching tweets:', error);
        setLoading(false);
      });
  }, [tweetIds]);

  // Filter and sort tweets based on search query and selected filter
  useEffect(() => {
    const filtered = tweets.filter((tweet) =>
      (tweet.username || '').toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sorted = [...filtered].sort((a, b) => {
      // If one is spam and the other isn't, sort spam to bottom
      if (a.status === 'spam' && b.status !== 'spam') {
        return 1;
      }
      if (a.status !== 'spam' && b.status === 'spam') {
        return -1;
      }

      // If both are spam or both are not spam, sort by selected score
      const aScore = getScore(a, selectedFilter);
      const bScore = getScore(b, selectedFilter);
      return bScore - aScore;
    });

    setFilteredTweets(sorted);
  }, [tweets, searchQuery, selectedFilter]);

  const nonSpamTweets = filteredTweets.filter(
    (tweet) => tweet.status !== 'spam',
  );
  const spamTweets = filteredTweets.filter((tweet) => tweet.status === 'spam');

  console.log('TokenTweetsPanel: Filtered and sorted tweets:', {
    totalTweets: tweets.length,
    filteredCount: filteredTweets.length,
    nonSpamCount: nonSpamTweets.length,
    spamCount: spamTweets.length,
    searchQuery,
  });

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) {
      return 'Unknown date';
    }
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Panel>
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
        {parentLoading || loading ? (
          <div className="text-white/60">Loading token tweets...</div>
        ) : filteredTweets.length === 0 ? (
          <div className="text-white/60">No tweets found for this token.</div>
        ) : (
          <>
            {/* Non-spam tweets */}
            <div className="space-y-4">
              {nonSpamTweets.map((tweet) => (
                <div
                  key={tweet.tweet_id}
                  className={cn(
                    'bg-gray-800 rounded-lg p-4 space-y-3',
                    tweet.status === 'spam' && 'border-2 border-red-500/50',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col flex-1 min-w-0 mr-4">
                      <a
                        href={`https://twitter.com/${tweet.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium text-xs truncate"
                      >
                        {tweet.name || tweet.username}
                      </a>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-[10px] truncate">
                          @{tweet.username}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            tweet.status === 'spam'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-emerald-500/20 text-emerald-400',
                          )}
                        >
                          {tweet.status}
                        </span>
                        <span className="text-white/40 text-[10px]">
                          {formatDate(tweet.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-xl font-bold shrink-0',
                        getScoreColor(getScore(tweet, selectedFilter)),
                      )}
                    >
                      {getScore(tweet, selectedFilter)}
                    </div>
                  </div>

                  {/* Original Tweet Content */}
                  <p className="text-white/90 text-xs break-words whitespace-pre-wrap">
                    {tweet.originalText || tweet.text}
                  </p>

                  {/* Media Display */}
                  {tweet.photos && tweet.photos.length > 0 && (
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                      {tweet.photos.map(
                        (photo: TweetMediaItem, idx: number) => {
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
                        },
                      )}
                    </div>
                  )}

                  {/* Hashtags and Mentions */}
                  {tweet.entities &&
                    (tweet.entities.hashtags?.length > 0 ||
                      tweet.entities.mentions?.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {tweet.entities.hashtags?.map((tag: string) => (
                          <span key={tag} className="text-[10px] text-blue-400">
                            #{tag}
                          </span>
                        ))}
                        {tweet.entities.mentions?.map(
                          (mention: { username: string; id: string }) => (
                            <span
                              key={mention.id}
                              className="text-[10px] text-blue-400"
                            >
                              @{mention.username}
                            </span>
                          ),
                        )}
                      </div>
                    )}

                  {/* Engagement Metrics */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-4 text-white/60">
                      <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{(tweet.replies || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔄</span>
                        <span>{(tweet.retweets || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>❤️</span>
                        <span>{(tweet.likes || 0).toLocaleString()}</span>
                      </div>
                      {tweet.views !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>👁️</span>
                          <span>{tweet.views.toLocaleString()}</span>
                        </div>
                      )}
                      {tweet.bookmarkCount !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>🔖</span>
                          <span>{tweet.bookmarkCount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://twitter.com/${tweet.username}/status/${tweet.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-[10px] break-all"
                    >
                      View Tweet →
                    </a>
                  </div>

                  {/* Analysis Section */}
                  {(tweet.analysis || tweet.structuredContent) && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <details className="text-[10px]">
                        <summary className="text-white/60 cursor-pointer hover:text-white/80">
                          View Analysis
                        </summary>
                        <div className="mt-2 text-white/80 space-y-2">
                          {/* Tweet Analysis */}
                          {tweet.analysis && (
                            <>
                              {/* Original Analysis Text */}
                              <p className="text-[10px] break-words whitespace-pre-wrap">
                                {tweet.analysis.tweet_text}
                              </p>

                              {/* Content Summary */}
                              <p className="text-[10px] break-words whitespace-pre-wrap mt-2">
                                {tweet.analysis.content_summary}
                              </p>

                              {/* Topics */}
                              {tweet.analysis.topics.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {tweet.analysis.topics.map((topic) => (
                                    <span
                                      key={topic}
                                      className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] break-words"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Quality Metrics */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                    Relevance:{' '}
                                    {Math.round(tweet.analysis.relevance * 100)}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                    Clarity:{' '}
                                    {Math.round(tweet.analysis.clarity * 100)}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                    Authenticity:{' '}
                                    {Math.round(
                                      tweet.analysis.authenticity * 100,
                                    )}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                    Value:{' '}
                                    {Math.round(tweet.analysis.value_add * 100)}
                                  </span>
                                </div>

                                {/* Ticker and Sentiment */}
                                {tweet.analysis.ticker && (
                                  <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] break-words">
                                    {tweet.analysis.ticker}
                                  </span>
                                )}
                                {tweet.analysis.sentiment && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-full text-[10px] break-words',
                                      tweet.analysis.sentiment === 'positive' &&
                                        'bg-green-500/20 text-green-400',
                                      tweet.analysis.sentiment === 'negative' &&
                                        'bg-red-500/20 text-red-400',
                                      tweet.analysis.sentiment === 'neutral' &&
                                        'bg-blue-500/20 text-blue-400',
                                    )}
                                  >
                                    {tweet.analysis.sentiment}
                                  </span>
                                )}
                              </div>
                            </>
                          )}

                          {/* Structured Content */}
                          {tweet.structuredContent && (
                            <>
                              <div className="mt-4">
                                <h4 className="text-white/80 font-medium mb-2">
                                  Main Tweet
                                </h4>
                                <p className="text-[10px] break-words whitespace-pre-wrap">
                                  {tweet.structuredContent.mainTweet}
                                </p>
                              </div>

                              {/* Replies */}
                              {tweet.structuredContent.replies.length > 0 && (
                                <div className="mt-3">
                                  <h4 className="text-white/80 font-medium mb-2">
                                    Replies
                                  </h4>
                                  {tweet.structuredContent.replies.map(
                                    (reply) => (
                                      <div
                                        key={`${reply.username}-${reply.text.substring(0, 20)}`}
                                        className="mb-2"
                                      >
                                        <span className="text-blue-400">
                                          @{reply.username}:{' '}
                                        </span>
                                        <span className="text-white/80">
                                          {reply.text}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* Quotes */}
                              {tweet.structuredContent.quotes.length > 0 && (
                                <div className="mt-3">
                                  <h4 className="text-white/80 font-medium mb-2">
                                    Quotes
                                  </h4>
                                  {tweet.structuredContent.quotes.map(
                                    (quote) => (
                                      <div
                                        key={`${quote.username}-${quote.text.substring(0, 20)}`}
                                        className="mb-2"
                                      >
                                        <span className="text-blue-400">
                                          @{quote.username}:{' '}
                                        </span>
                                        <span className="text-white/80">
                                          {quote.text}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* Retweets */}
                              {tweet.structuredContent.retweets.length > 0 && (
                                <div className="mt-3">
                                  <h4 className="text-white/80 font-medium mb-2">
                                    Retweets
                                  </h4>
                                  {tweet.structuredContent.retweets.map(
                                    (retweet) => (
                                      <div
                                        key={`${retweet.username}-${retweet.text.substring(0, 20)}`}
                                        className="mb-2"
                                      >
                                        <span className="text-blue-400">
                                          @{retweet.username}:{' '}
                                        </span>
                                        <span className="text-white/80">
                                          {retweet.text}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Spam tweets section */}
            {spamTweets.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowSpam(!showSpam)}
                  className="flex items-center gap-2 text-white/60 hover:text-white/80 text-sm"
                >
                  <span>{showSpam ? '▼' : '▶'}</span>
                  <span>Show Spam Tweets ({spamTweets.length})</span>
                </button>
                {showSpam && (
                  <div className="space-y-4 mt-4">
                    {spamTweets.map((tweet) => (
                      <div
                        key={tweet.tweet_id}
                        className={cn(
                          'bg-gray-800 rounded-lg p-4 space-y-3',
                          tweet.status === 'spam' &&
                            'border-2 border-red-500/50',
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col flex-1 min-w-0 mr-4">
                            <a
                              href={`https://twitter.com/${tweet.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-medium text-xs truncate"
                            >
                              {tweet.name || tweet.username}
                            </a>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-[10px] truncate">
                                @{tweet.username}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded',
                                  tweet.status === 'spam'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-emerald-500/20 text-emerald-400',
                                )}
                              >
                                {tweet.status}
                              </span>
                              <span className="text-white/40 text-[10px]">
                                {formatDate(tweet.timestamp)}
                              </span>
                            </div>
                          </div>
                          <div
                            className={cn(
                              'text-xl font-bold shrink-0',
                              getScoreColor(getScore(tweet, selectedFilter)),
                            )}
                          >
                            {getScore(tweet, selectedFilter)}
                          </div>
                        </div>

                        {/* Original Tweet Content */}
                        <p className="text-white/90 text-xs break-words whitespace-pre-wrap">
                          {tweet.originalText || tweet.text}
                        </p>

                        {/* Media Display */}
                        {tweet.photos && tweet.photos.length > 0 && (
                          <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                            {tweet.photos.map(
                              (photo: TweetMediaItem, idx: number) => {
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
                                  return null;
                                }

                                const isVideo =
                                  mediaUrl.includes('video.twimg.com') ||
                                  mediaUrl.includes('ext_tw_video');

                                if (isVideo) {
                                  return (
                                    <div
                                      key={mediaKey}
                                      className="w-full h-full"
                                    >
                                      <video
                                        controls={true}
                                        preload="none"
                                        poster={previewUrl}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        aria-label="Tweet video content"
                                        tabIndex={0}
                                        onError={(e) => {
                                          (
                                            e.currentTarget as HTMLVideoElement
                                          ).style.display = 'none';
                                        }}
                                      >
                                        <source
                                          src={mediaUrl}
                                          type="video/mp4"
                                        />
                                        <track
                                          kind="captions"
                                          src=""
                                          label="English captions"
                                          srcLang="en"
                                          default={true}
                                        />
                                        Your browser does not support the video
                                        tag.
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
                              },
                            )}
                          </div>
                        )}

                        {/* Hashtags and Mentions */}
                        {tweet.entities &&
                          (tweet.entities.hashtags?.length > 0 ||
                            tweet.entities.mentions?.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {tweet.entities.hashtags?.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-blue-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {tweet.entities.mentions?.map(
                                (mention: { username: string; id: string }) => (
                                  <span
                                    key={mention.id}
                                    className="text-[10px] text-blue-400"
                                  >
                                    @{mention.username}
                                  </span>
                                ),
                              )}
                            </div>
                          )}

                        {/* Engagement Metrics */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-4 text-white/60">
                            <div className="flex items-center gap-1">
                              <span>💬</span>
                              <span>
                                {(tweet.replies || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>🔄</span>
                              <span>
                                {(tweet.retweets || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>❤️</span>
                              <span>{(tweet.likes || 0).toLocaleString()}</span>
                            </div>
                            {tweet.views !== undefined && (
                              <div className="flex items-center gap-1">
                                <span>👁️</span>
                                <span>{tweet.views.toLocaleString()}</span>
                              </div>
                            )}
                            {tweet.bookmarkCount !== undefined && (
                              <div className="flex items-center gap-1">
                                <span>🔖</span>
                                <span>
                                  {tweet.bookmarkCount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <a
                            href={`https://twitter.com/${tweet.username}/status/${tweet.tweet_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-[10px] break-all"
                          >
                            View Tweet →
                          </a>
                        </div>

                        {/* Analysis Section */}
                        {(tweet.analysis || tweet.structuredContent) && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <details className="text-[10px]">
                              <summary className="text-white/60 cursor-pointer hover:text-white/80">
                                View Analysis
                              </summary>
                              <div className="mt-2 text-white/80 space-y-2">
                                {/* Tweet Analysis */}
                                {tweet.analysis && (
                                  <>
                                    {/* Original Analysis Text */}
                                    <p className="text-[10px] break-words whitespace-pre-wrap">
                                      {tweet.analysis.tweet_text}
                                    </p>

                                    {/* Content Summary */}
                                    <p className="text-[10px] break-words whitespace-pre-wrap mt-2">
                                      {tweet.analysis.content_summary}
                                    </p>

                                    {/* Topics */}
                                    {tweet.analysis.topics.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {tweet.analysis.topics.map((topic) => (
                                          <span
                                            key={topic}
                                            className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] break-words"
                                          >
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Quality Metrics */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                          Relevance:{' '}
                                          {Math.round(
                                            tweet.analysis.relevance * 100,
                                          )}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                          Clarity:{' '}
                                          {Math.round(
                                            tweet.analysis.clarity * 100,
                                          )}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                          Authenticity:{' '}
                                          {Math.round(
                                            tweet.analysis.authenticity * 100,
                                          )}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px]">
                                          Value:{' '}
                                          {Math.round(
                                            tweet.analysis.value_add * 100,
                                          )}
                                        </span>
                                      </div>

                                      {/* Ticker and Sentiment */}
                                      {tweet.analysis.ticker && (
                                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] break-words">
                                          {tweet.analysis.ticker}
                                        </span>
                                      )}
                                      {tweet.analysis.sentiment && (
                                        <span
                                          className={cn(
                                            'px-2 py-0.5 rounded-full text-[10px] break-words',
                                            tweet.analysis.sentiment ===
                                              'positive' &&
                                              'bg-green-500/20 text-green-400',
                                            tweet.analysis.sentiment ===
                                              'negative' &&
                                              'bg-red-500/20 text-red-400',
                                            tweet.analysis.sentiment ===
                                              'neutral' &&
                                              'bg-blue-500/20 text-blue-400',
                                          )}
                                        >
                                          {tweet.analysis.sentiment}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}

                                {/* Structured Content */}
                                {tweet.structuredContent && (
                                  <>
                                    <div className="mt-4">
                                      <h4 className="text-white/80 font-medium mb-2">
                                        Main Tweet
                                      </h4>
                                      <p className="text-[10px] break-words whitespace-pre-wrap">
                                        {tweet.structuredContent.mainTweet}
                                      </p>
                                    </div>

                                    {/* Replies */}
                                    {tweet.structuredContent.replies.length >
                                      0 && (
                                      <div className="mt-3">
                                        <h4 className="text-white/80 font-medium mb-2">
                                          Replies
                                        </h4>
                                        {tweet.structuredContent.replies.map(
                                          (reply) => (
                                            <div
                                              key={`${reply.username}-${reply.text.substring(0, 20)}`}
                                              className="mb-2"
                                            >
                                              <span className="text-blue-400">
                                                @{reply.username}:{' '}
                                              </span>
                                              <span className="text-white/80">
                                                {reply.text}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    {/* Quotes */}
                                    {tweet.structuredContent.quotes.length >
                                      0 && (
                                      <div className="mt-3">
                                        <h4 className="text-white/80 font-medium mb-2">
                                          Quotes
                                        </h4>
                                        {tweet.structuredContent.quotes.map(
                                          (quote) => (
                                            <div
                                              key={`${quote.username}-${quote.text.substring(0, 20)}`}
                                              className="mb-2"
                                            >
                                              <span className="text-blue-400">
                                                @{quote.username}:{' '}
                                              </span>
                                              <span className="text-white/80">
                                                {quote.text}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    {/* Retweets */}
                                    {tweet.structuredContent.retweets.length >
                                      0 && (
                                      <div className="mt-3">
                                        <h4 className="text-white/80 font-medium mb-2">
                                          Retweets
                                        </h4>
                                        {tweet.structuredContent.retweets.map(
                                          (retweet) => (
                                            <div
                                              key={`${retweet.username}-${retweet.text.substring(0, 20)}`}
                                              className="mb-2"
                                            >
                                              <span className="text-blue-400">
                                                @{retweet.username}:{' '}
                                              </span>
                                              <span className="text-white/80">
                                                {retweet.text}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
