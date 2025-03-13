import { supabaseClient } from '../../config/client-supabase';

export interface StakerData {
  owner: string;
  amount: number;
  balance: string;
  interaction_date: Date;
  sender_wallet: string;
  sender_owner: string;
}

export interface StakersResponse {
  stakers: StakerData[];
  lastUpdated: Date | null;
}

export async function getStakersFromDB(): Promise<StakersResponse> {
  // Get all stakers with their latest interaction and balance
  const { data, error } = await supabaseClient
    .from('gfm_transfers')
    .select(
      'owner, amount, balance, interaction_date, sender_wallet, sender_owner, created_at',
    )
    .order('interaction_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch stakers: ${error.message}`);
  }

  // Transform dates from strings to Date objects
  const stakers = (data || []).map(
    (staker: {
      owner: string;
      amount: number;
      balance: string;
      interaction_date: string;
      sender_wallet: string;
      sender_owner: string;
      created_at: string;
    }) => ({
      ...staker,
      interaction_date: new Date(staker.interaction_date),
    }),
  );

  // Get the most recent created_at date
  const lastUpdated =
    data && data.length > 0
      ? new Date(Math.max(...data.map((d) => new Date(d.created_at).getTime())))
      : null;

  return { stakers, lastUpdated };
}
