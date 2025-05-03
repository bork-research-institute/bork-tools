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
  // After 72h, decay exponentially but never below 0.1
  return Math.max(
    0.1,
    0.2 * Math.exp(-(age - thresholds.hour72) / thresholds.hour24),
  );
};

// Calculate social engagement score based on aggregated decayed metrics
const calculateSocialScore = (tweets: TweetWithAnalysis[]): number => {
  // Filter out spam tweets
  const validTweets = tweets.filter((tweet) => tweet.status !== 'spam');

  // If no valid tweets after filtering, return 0
  if (validTweets.length === 0) {
    return 0;
  }

  // Calculate decayed metrics for each valid tweet
  const decayedMetrics = validTweets.map((tweet) => {
    const timeDecay = calculateTimeDecay(tweet.timestamp);
    return {
      likes: (tweet.likes || 0) * timeDecay,
      replies: (tweet.replies || 0) * timeDecay,
      retweets: (tweet.retweets || 0) * timeDecay,
      views: (tweet.views || 0) * timeDecay,
      quality: tweet.analysis
        ? {
            relevance: tweet.analysis.relevance,
            clarity: tweet.analysis.clarity,
            authenticity: tweet.analysis.authenticity,
            value_add: tweet.analysis.value_add,
          }
        : null,
    };
  });

  // Aggregate all decayed metrics
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

  // Score views (max 15 points, less weight as it's passive)
  const viewScore = Math.min(15, Math.log10(totalMetrics.views + 1) ** 1.5 * 8);
  score += viewScore;

  // Score active engagement (max 20 points each)
  const likeScore = Math.min(
    20,
    Math.log10(totalMetrics.likes + 1) ** 1.8 * 12,
  );
  const replyScore = Math.min(
    20,
    Math.log10(totalMetrics.replies + 1) ** 1.8 * 14,
  );
  const retweetScore = Math.min(
    20,
    Math.log10(totalMetrics.retweets + 1) ** 1.8 * 14,
  );

  // Bonus multiplier for balanced engagement (reduced from 1.2 to 1.1)
  const hasAllEngagement =
    totalMetrics.likes > 0 &&
    totalMetrics.replies > 0 &&
    totalMetrics.retweets > 0;
  const engagementMultiplier = hasAllEngagement ? 1.1 : 1;

  score += (likeScore + replyScore + retweetScore) * engagementMultiplier;

  // Add quality score if available (max 25 points)
  const qualityScores = decayedMetrics
    .map((m) => m.quality)
    .filter((q): q is NonNullable<typeof q> => q !== null);

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

    const qualityScore =
      (avgQuality.relevance ** 1.5 +
        avgQuality.clarity ** 1.5 +
        avgQuality.authenticity ** 1.5 +
        avgQuality.value_add ** 1.5) *
      7;

    score += Math.min(25, qualityScore);
  }

  // Bonus for having multiple tweets with engagement (reduced multipliers)
  const tweetsWithEngagement = decayedMetrics.filter(
    (m) => m.likes > 0 || m.replies > 0 || m.retweets > 0,
  ).length;

  const volumeMultiplier =
    tweetsWithEngagement > 3 ? 1.15 : tweetsWithEngagement > 1 ? 1.1 : 1;

  return Math.min(100, score * volumeMultiplier);
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
