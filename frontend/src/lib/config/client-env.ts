import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_COLLECTION_WALLET_SOLANA_TOKEN_ACCOUNT: z.string().min(1),
  NEXT_PUBLIC_BACKEND_URL: z.string().url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(): ClientEnv {
  // Access runtime config
  const envParse = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_COLLECTION_WALLET_SOLANA_TOKEN_ACCOUNT:
      process.env.NEXT_PUBLIC_COLLECTION_WALLET_SOLANA_TOKEN_ACCOUNT,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  });

  if (!envParse.success) {
    console.error(
      '❌ Invalid client environment variables:',
      envParse.error.flatten().fieldErrors,
    );
    throw new Error('Invalid client environment variables');
  }
  return envParse.data;
}
