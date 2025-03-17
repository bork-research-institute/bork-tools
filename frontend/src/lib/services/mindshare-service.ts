import { supabaseClient } from '../config/client-supabase';

export interface TopicWeight {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: string;
  seed_weight: number;
}

export const mindshareService = {
  async getTopicWeights(): Promise<TopicWeight[]> {
    const { data, error } = await supabaseClient
      .from('topic_weights')
      .select('*')
      .order('weight', { ascending: false })
      .limit(25);

    if (error) {
      console.error('Error fetching topic weights:', error);
      throw error;
    }

    return data || [];
  },
};
