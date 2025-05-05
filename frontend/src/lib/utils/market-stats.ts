import type { TokenWithEngagement } from '@/types/token-monitor/token';
import type { TweetWithAnalysis } from '@/types/tweets-analysis';

// Calculate time decay factor (0-1) based on tweet age with distinct thresholds
const calculateTimeDecay = (timestamp: number | undefined): number => {
  if (!timestamp) {
    return 0;
  }

  const now = Date.now() / 1000; // Convert to seconds
  const age = now - timestamp;

  const HOUR = 3600;
  const thresholds = {
    hour1: HOUR,
    hour4: HOUR * 4,
    hour24: HOUR * 24,
    hour48: HOUR * 48,
    hour72: HOUR * 72,
    hour168: HOUR * 168, // 1 week
  };

  // No decay for first hour
  if (age <= thresholds.hour1) {
    return 1;
  }
  // Decay to 0.9 between 1h and 4h
  if (age <= thresholds.hour4) {
    return (
      0.9 +
      (0.1 * (thresholds.hour4 - age)) / (thresholds.hour4 - thresholds.hour1)
    );
  }
  // Decay to 0.7 between 4h and 24h
  if (age <= thresholds.hour24) {
    return (
      0.7 +
      (0.2 * (thresholds.hour24 - age)) / (thresholds.hour24 - thresholds.hour4)
    );
  }
  // Decay to 0.4 between 24h and 48h
  if (age <= thresholds.hour48) {
    return (
      0.4 +
      (0.3 * (thresholds.hour48 - age)) /
        (thresholds.hour48 - thresholds.hour24)
    );
  }
  // Decay to 0.2 between 48h and 72h
  if (age <= thresholds.hour72) {
    return (
      0.2 +
      (0.2 * (thresholds.hour72 - age)) /
        (thresholds.hour72 - thresholds.hour48)
    );
  }
  // Decay to 0.1 between 72h and 1 week
  if (age <= thresholds.hour168) {
    return (
      0.1 +
      (0.1 * (thresholds.hour168 - age)) /
        (thresholds.hour168 - thresholds.hour72)
    );
  }
  // After 1 week, decay exponentially with a much steeper curve
  return Math.max(
    0.01, // Lower minimum
    0.1 * Math.exp(-(age - thresholds.hour168) / (HOUR * 24)), // Much faster decay
  );
};

// Calculate social engagement score based on aggregated decayed metrics
const calculateSocialScore = (tweets: TweetWithAnalysis[]): number => {
  // Filter out spam tweets (those without analysis)
  const validTweets = tweets.filter((tweet) => tweet.status !== 'spam');
  if (validTweets.length === 0) {
    return 0;
  }

  // First, apply time decay to all metrics based on tweet age:
  // - 0-1h: 100% (no decay)
  // - 1-4h: 90-100% (linear decay)
  // - 4-24h: 70-90% (linear decay)
  // - 24-48h: 40-70% (linear decay)
  // - 48-72h: 20-40% (linear decay)
  // - 72h-1week: 10-20% (linear decay)
  // - >1week: exponential decay starting at 10%, minimum 1%
  const decayedMetrics = validTweets.map((tweet) => {
    const timeDecay = calculateTimeDecay(tweet.timestamp);
    return {
      likes: (tweet.likes || 0) * timeDecay,
      replies: (tweet.replies || 0) * timeDecay,
      retweets: (tweet.retweets || 0) * timeDecay,
      views: (tweet.views || 0) * timeDecay,
      quality: tweet.analysis
        ? {
            relevance: tweet.analysis.relevance * timeDecay,
            clarity: tweet.analysis.clarity * timeDecay,
            authenticity: tweet.analysis.authenticity * timeDecay,
            value_add: tweet.analysis.value_add * timeDecay,
          }
        : null,
      timeDecay,
    };
  });

  // Sum up all decayed metrics across all tweets
  const totalMetrics = decayedMetrics.reduce(
    (acc, metrics) => ({
      likes: acc.likes + metrics.likes,
      replies: acc.replies + metrics.replies,
      retweets: acc.retweets + metrics.retweets,
      views: acc.views + metrics.views,
    }),
    { likes: 0, replies: 0, retweets: 0, views: 0 },
  );

  let score = 0;

  // 1. Views Score (max 10 points)
  // Two-phase scoring:
  // Phase 1 (0-50k views): Logarithmic growth
  // Phase 2 (50k+ views): Linear growth
  const VIEW_THRESHOLD = 50000;
  const viewScore = (() => {
    const baseScore = Math.log10(totalMetrics.views + 1) * 2;
    if (totalMetrics.views <= VIEW_THRESHOLD) {
      return Math.min(10, baseScore);
    }
    const extraViews = totalMetrics.views - VIEW_THRESHOLD;
    const extraScore = (extraViews / 100000) * 2; // Linear growth after threshold
    return Math.min(10, baseScore + extraScore);
  })();
  score += viewScore;

  // 2. Active Engagement Scores (max 25 points each)
  // Two-phase scoring for each metric:
  // Phase 1 (0-1000): Logarithmic growth
  // Phase 2 (1000+): Linear growth
  const ENGAGEMENT_THRESHOLD = 1000;
  const calculateEngagementScore = (value: number, multiplier: number) => {
    const baseScore = Math.log10(value + 1) * multiplier;
    if (value <= ENGAGEMENT_THRESHOLD) {
      return Math.min(25, baseScore);
    }
    const extraEngagement = value - ENGAGEMENT_THRESHOLD;
    const extraScore = (extraEngagement / 2000) * 5; // Linear growth after threshold
    return Math.min(25, baseScore + extraScore);
  };

  const likeScore = calculateEngagementScore(totalMetrics.likes, 6);
  const replyScore = calculateEngagementScore(totalMetrics.replies, 7);
  const retweetScore = calculateEngagementScore(totalMetrics.retweets, 7);

  // 3. Tweet Count Impact (0-15 points)
  // Rewards having multiple recent tweets
  const tweetCountScore = Math.min(15, Math.log10(validTweets.length + 1) * 10);
  score += tweetCountScore;

  // 4. Balanced Engagement Bonus (15% boost)
  // Increased from 10% to 15% to reward well-rounded engagement
  const hasAllEngagement =
    totalMetrics.likes > 0 &&
    totalMetrics.replies > 0 &&
    totalMetrics.retweets > 0;
  const engagementMultiplier = hasAllEngagement ? 1.15 : 1;

  score += (likeScore + replyScore + retweetScore) * engagementMultiplier;

  // 5. Quality Score (max 25 points)
  const qualityScores = decayedMetrics
    .map((m) => m.quality)
    .filter((q): q is NonNullable<typeof q> => q !== null);

  let qualityScore = 0;
  if (qualityScores.length > 0) {
    const avgQuality = {
      relevance:
        qualityScores.reduce((acc, q) => acc + q.relevance, 0) /
        qualityScores.length,
      clarity:
        qualityScores.reduce((acc, q) => acc + q.clarity, 0) /
        qualityScores.length,
      authenticity:
        qualityScores.reduce((acc, q) => acc + q.authenticity, 0) /
        qualityScores.length,
      value_add:
        qualityScores.reduce((acc, q) => acc + q.value_add, 0) /
        qualityScores.length,
    };

    // Linear combination of quality metrics
    qualityScore = Math.min(
      25,
      (avgQuality.relevance * 6 +
        avgQuality.clarity * 6 +
        avgQuality.authenticity * 6 +
        avgQuality.value_add * 7) *
        // Scale based on number of quality tweets
        Math.min(1.5, Math.log10(qualityScores.length + 1)),
    );

    score += qualityScore;
  }

  // Final score breakdown (maximum 100 points):
  // - Views: 0-10 points (more linear after 50k)
  // - Likes: 0-25 points (more linear after 1k)
  // - Replies: 0-25 points (more linear after 1k)
  // - Retweets: 0-25 points (more linear after 1k)
  // - Tweet Count: 0-15 points
  // - Quality: 0-25 points (scaled by tweet count)
  // - Balanced engagement: +15% to engagement scores
  return Math.min(100, score);
};

export const calculateTokenScore = (
  snapshot: TokenWithEngagement,
  tweets?: TweetWithAnalysis[],
): number => {
  // Early return if no market cap
  if (!snapshot.data?.marketCap) {
    return 0;
  }

  let score = 0;
  let marketMetricsPenalty = 1;

  // Market metrics (20% of total score, split between volume and holders)
  if (snapshot.data?.liquidityMetrics?.volumeMetrics?.volume24h) {
    // Volume metrics (10% of total score)
    const volumeScore =
      Math.log10(snapshot.data.liquidityMetrics.volumeMetrics.volume24h + 1) **
        1.3 *
      2.5;
    score += Math.min(10, volumeScore);
  } else {
    // Heavy penalty for no 24h volume
    marketMetricsPenalty *= 0.6;
  }

  if (snapshot.data?.holderCount) {
    // Holder metrics (10% of total score)
    const holderScore = Math.log10(snapshot.data.holderCount + 1) ** 1.3 * 2.5;
    score += Math.min(10, holderScore);
  } else {
    // Moderate penalty for no holder count
    marketMetricsPenalty *= 0.8;
  }

  // Social engagement (70% of total score)
  if (tweets && tweets.length > 0) {
    const socialScore = calculateSocialScore(tweets);
    score += socialScore * 0.7;
  }

  // Token properties (10% of total score)
  let propertyScore = 0;
  if (snapshot.data?.isMintable === false) {
    propertyScore += 3;
  }
  if (snapshot.data?.isFreezable === false) {
    propertyScore += 3;
  }
  if (snapshot.data?.links && Object.keys(snapshot.data.links).length > 0) {
    propertyScore += 4;
  }

  // Apply property score with a multiplier
  score += propertyScore * 1.5;

  // Apply market metrics penalty
  score *= marketMetricsPenalty;

  // Normalize score to 0-100 and ensure minimum score of 5 if any data exists
  const finalScore = Math.round(Math.min(score, 100));
  return Math.max(finalScore, 5);
};

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toString();
};
