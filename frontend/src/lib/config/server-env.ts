import { z } from 'zod';
import 'dotenv/config';

const serverEnvSchema = z.object({
  HELIUS_API_KEY: z.string().uuid(),
  RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export function getServerEnv() {
  const envParse = serverEnvSchema.safeParse(process.env);
  
  if (!envParse.success) {
    console.error(
      '❌ Invalid server environment variables:',
      envParse.error.flatten().fieldErrors,
    );
    throw new Error('Invalid server environment variables');
  }
  return envParse.data;
}
