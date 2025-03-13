import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from './server-env';

const { SUPABASE_URL, SUPABASE_KEY } = getServerEnv();

if (!SUPABASE_URL || !SUPABASE_KEY ) {
  throw new Error('Missing Supabase environment variables');
}

// Service role client for backend operations (has full access)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

// Database types
export interface GfmTransfer {
  id?: number;
  signature: string;
  token_account: string;
  owner: string;
  balance: string;
  sender_wallet: string;
  sender_owner: string;
  interaction_date: Date;
  amount: number;
  created_at?: Date;
}
