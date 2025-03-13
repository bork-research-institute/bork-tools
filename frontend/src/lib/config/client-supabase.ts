import { createClient } from '@supabase/supabase-js';
import { getClientEnv } from './client-env';

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getClientEnv();

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Public client for frontend operations (has read-only access)
export const supabaseClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Database types
export interface GfmTransfer {
  id?: number;
  signature: string;
  token_account: string;
  owner: string;
  balance: string;
  sender_wallet: string;
  interaction_date: Date;
  amount: number;
  created_at?: Date;
}
