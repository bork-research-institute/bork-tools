import { createClient } from '@supabase/supabase-js';
import { getClientEnv } from './client-env';

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
  getClientEnv();

// Public client for frontend operations (has read-only access)
export const supabaseClient = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
