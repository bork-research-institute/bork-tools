import { supabaseClient } from '@/lib/config/client-supabase';

export interface YapsData {
  id: number;
  user_id: string;
  username: string;
  yaps_all: number;
  yaps_l24h: number;
  yaps_l48h: number;
  yaps_l7d: number;
  yaps_l30d: number;
  yaps_l3m: number;
  yaps_l6m: number;
  yaps_l12m: number;
  last_updated: Date;
  created_at: Date;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  yaps: number;
}

export type TimeFrame = 'all' | '24h' | '7d' | '30d' | '3m' | '6m' | '12m';

const timeFrameToColumn: Record<TimeFrame, string> = {
  all: 'yaps_all',
  '24h': 'yaps_l24h',
  '7d': 'yaps_l7d',
  '30d': 'yaps_l30d',
  '3m': 'yaps_l3m',
  '6m': 'yaps_l6m',
  '12m': 'yaps_l12m',
};

export const yapsService = {
  async getYapsData(userId: string): Promise<YapsData | null> {
    const { data, error } = await supabaseClient
      .from('yaps')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching yaps data:', error);
      return null;
    }

    return data;
  },

  async getYapsForAccounts(userIds: string[]): Promise<YapsData[]> {
    const { data, error } = await supabaseClient
      .from('yaps')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching yaps for accounts:', error);
      return [];
    }

    return data || [];
  },

  async upsertYapsData(
    data: Omit<YapsData, 'id' | 'created_at'>,
  ): Promise<void> {
    const { error } = await supabaseClient.from('yaps').upsert(
      {
        user_id: data.user_id,
        username: data.username,
        yaps_all: data.yaps_all,
        yaps_l24h: data.yaps_l24h,
        yaps_l48h: data.yaps_l48h,
        yaps_l7d: data.yaps_l7d,
        yaps_l30d: data.yaps_l30d,
        yaps_l3m: data.yaps_l3m,
        yaps_l6m: data.yaps_l6m,
        yaps_l12m: data.yaps_l12m,
        last_updated: data.last_updated,
      },
      {
        onConflict: 'user_id',
      },
    );

    if (error) {
      console.error('Error upserting yaps data:', error);
      throw error;
    }
  },

  async getLeaderboard(
    limit = 100,
    timeFrame: TimeFrame = 'all',
    searchQuery?: string,
  ): Promise<LeaderboardEntry[]> {
    let query = supabaseClient
      .from('yaps')
      .select(
        'username, yaps_all, yaps_l24h, yaps_l7d, yaps_l30d, yaps_l3m, yaps_l6m, yaps_l12m',
      );

    // Apply search filter if provided
    if (searchQuery) {
      query = query.ilike('username', `%${searchQuery}%`);
    }

    const { data, error } = await query
      .order(timeFrameToColumn[timeFrame], { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return (data || []).map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      yaps: entry[timeFrameToColumn[timeFrame] as keyof typeof entry] as number,
    }));
  },
};
