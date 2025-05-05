import { supabaseClient } from '../config/client-supabase';

export type Sentiment =
  | 'controversial'
  | 'positive'
  | 'neutral'
  | 'inspirational'
  | 'negative';

export interface TopicWeight {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: string;
  seed_weight: number;
  created_at: string;
  engagement_metrics: {
    replies?: number;
    likes?: number;
    retweets?: number;
    quotes?: number;
    impressions?: number;
    [key: string]: number | undefined;
  };
  sentiment: Sentiment;
  tweet_id: string;
}

export interface TopicWeightFilters {
  timeframe?: {
    start: Date;
    end: Date;
  };
  sentiment?: Sentiment[];
}

export interface TopicWeightWithChange extends TopicWeight {
  percentage_change: number;
  engagement_score: number;
}

const calculateEngagementScore = (
  metrics: TopicWeight['engagement_metrics'],
): number => {
  if (!metrics) {
    return 0;
  }

  return (
    (metrics.likes || 0) * 1 +
    (metrics.retweets || 0) * 2 +
    (metrics.replies || 0) * 3
  );
};

export const mindshareService = {
  async getTopicWeights(
    filters?: TopicWeightFilters,
  ): Promise<TopicWeightWithChange[]> {
    console.log('Fetching topic weights with filters:', filters);

    let query = supabaseClient
      .from('topic_weights')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply timeframe filter if provided
    if (filters?.timeframe) {
      console.log('Applying timeframe filter:', {
        start: filters.timeframe.start.toISOString(),
        end: filters.timeframe.end.toISOString(),
      });
      query = query
        .gte('created_at', filters.timeframe.start.toISOString())
        .lte('created_at', filters.timeframe.end.toISOString());
    }

    // Apply sentiment filter if provided
    if (filters?.sentiment && filters.sentiment.length > 0) {
      console.log('Applying sentiment filter:', filters.sentiment);
      query = query.in('sentiment', filters.sentiment);
    }

    console.log('Executing Supabase query...');
    const { data: rawData, error } = await query;

    if (error) {
      console.error('Error fetching topic weights:', error);
      throw new Error(`Failed to fetch topic weights: ${error.message}`);
    }

    if (!rawData) {
      console.log('No data returned from query');
      return [];
    }

    console.log(`Retrieved ${rawData.length} raw topic weights`);

    // Group by topic and time period
    const topicGroups = rawData.reduce<Record<string, TopicWeight[]>>(
      (acc, entry) => {
        if (!acc[entry.topic]) {
          acc[entry.topic] = [];
        }
        acc[entry.topic].push(entry);
        return acc;
      },
      {},
    );

    console.log(
      `Grouped into ${Object.keys(topicGroups).length} unique topics`,
    );

    // Calculate engagement scores and mindshare percentages
    const processedData = Object.entries(topicGroups).map(([_, entries]) => {
      // Sort by created_at in descending order (most recent first)
      const sortedEntries = entries.sort(
        (a: TopicWeight, b: TopicWeight) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      const mostRecent = sortedEntries[0];
      const previousEntries = sortedEntries.slice(1);

      // Calculate engagement scores
      const mostRecentScore = calculateEngagementScore(
        mostRecent.engagement_metrics,
      );
      const previousScores = previousEntries.map((entry) =>
        calculateEngagementScore(entry.engagement_metrics),
      );

      // Calculate total engagement scores for both periods
      const totalCurrentEngagement = Object.values(topicGroups).reduce(
        (sum, topicEntries) => {
          const latest = topicEntries[0];
          return sum + calculateEngagementScore(latest.engagement_metrics);
        },
        0,
      );

      const totalPreviousEngagement = Object.values(topicGroups).reduce(
        (sum, topicEntries) => {
          const previous = topicEntries.slice(1);
          return (
            sum +
            (previous.length > 0
              ? previous.reduce(
                  (s, entry) =>
                    s + calculateEngagementScore(entry.engagement_metrics),
                  0,
                ) / previous.length
              : 0)
          );
        },
        0,
      );

      // Calculate mindshare percentages
      const currentMindshare = (mostRecentScore / totalCurrentEngagement) * 100;
      const averagePreviousMindshare =
        previousEntries.length > 0
          ? (previousScores.reduce((sum, score) => sum + score, 0) /
              previousScores.length /
              totalPreviousEngagement) *
            100
          : currentMindshare;

      // Calculate percentage change in mindshare
      const percentageChange =
        previousEntries.length > 0
          ? ((currentMindshare - averagePreviousMindshare) /
              averagePreviousMindshare) *
            100
          : 0;

      const result = {
        ...mostRecent,
        engagement_score: mostRecentScore,
        percentage_change: percentageChange,
      };

      return result;
    });

    console.log('Processed data summary:', {
      totalItems: processedData.length,
      sampleScores: processedData.slice(0, 3).map((d) => ({
        topic: d.topic,
        score: d.engagement_score,
        change: d.percentage_change,
      })),
    });

    // Sort by engagement score in descending order
    return processedData.sort(
      (a, b) => b.engagement_score - a.engagement_score,
    );
  },

  // Helper function to get the default timeframe (last 7 days)
  getDefaultTimeframe(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  },
};
