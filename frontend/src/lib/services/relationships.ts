import { supabaseClient } from '@/lib/config/client-supabase';

export interface UserRelationship {
  source_username: string;
  target_username: string;
  mention_count: number;
  relationship_strength: number;
  is_mutual: boolean;
  last_mention_at: string;
}

export const relationshipsService = {
  async getTopUserRelationships(limit = 100): Promise<UserRelationship[]> {
    try {
      // Get users with most mentions (either as source or target)
      const { data, error } = await supabaseClient
        .from('user_mentions_relationship')
        .select('*')
        .order('mention_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user relationships:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTopUserRelationships:', error);
      return [];
    }
  },

  async getMutualRelationships(): Promise<UserRelationship[]> {
    try {
      const { data, error } = await supabaseClient
        .from('user_mentions_relationship')
        .select('*')
        .eq('is_mutual', true)
        .order('relationship_strength', { ascending: false });

      if (error) {
        console.error('Error fetching mutual relationships:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMutualRelationships:', error);
      return [];
    }
  },
};
