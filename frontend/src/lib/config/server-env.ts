import { z } from 'zod';

const serverEnvSchema = z.object({
  HELIUS_API_KEY: z.string().uuid(),
  RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const envParse = serverEnvSchema.safeParse({
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    RPC_URL: process.env.RPC_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!envParse.success) {
    console.error(
      '❌ Invalid server environment variables:',
      envParse.error.flatten().fieldErrors,
    );
    throw new Error('Invalid server environment variables');
  }
  return envParse.data;
}
