import type { TokenLaunch } from '../../types/token-launch';
import { supabaseClient } from '../config/client-supabase';

export class TokenLaunchService {
  private static instance: TokenLaunchService;

  private constructor() {}

  public static getInstance(): TokenLaunchService {
    if (!TokenLaunchService.instance) {
      TokenLaunchService.instance = new TokenLaunchService();
    }
    return TokenLaunchService.instance;
  }

  async getAllTokenLaunches(): Promise<TokenLaunch[]> {
    try {
      const { data, error } = await supabaseClient
        .from('token_launches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((launch) => ({
        id: launch.id,
        createdAt: new Date(launch.created_at),
        userId: launch.user_id,
        tokenName: launch.token_name,
        tokenSymbol: launch.token_symbol,
        tokenDescription: launch.token_description,
        tokenImage: launch.token_image,
        mintAddress: launch.mint_address,
        transactionId: launch.transaction_id,
        campaignUrl: launch.campaign_url,
        status: launch.status,
        error: launch.error,
        metadata: launch.metadata,
      }));
    } catch (error) {
      console.error('Error fetching token launches:', error);
      throw error;
    }
  }

  async getUserTokenLaunches(userId: string): Promise<TokenLaunch[]> {
    try {
      const { data, error } = await supabaseClient
        .from('token_launches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((launch) => ({
        id: launch.id,
        createdAt: new Date(launch.created_at),
        userId: launch.user_id,
        tokenName: launch.token_name,
        tokenSymbol: launch.token_symbol,
        tokenDescription: launch.token_description,
        tokenImage: launch.token_image,
        mintAddress: launch.mint_address,
        transactionId: launch.transaction_id,
        campaignUrl: launch.campaign_url,
        status: launch.status,
        error: launch.error,
        metadata: launch.metadata,
      }));
    } catch (error) {
      console.error('Error fetching user token launches:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenLaunchService = TokenLaunchService.getInstance();
