import { get } from '@dotenvx/dotenvx';
import { z } from 'zod';

const serverEnvSchema = z.object({
  HELIUS_RPC_URL: z.string().url(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let serverEnv: ServerEnv;

export function getServerEnv(): ServerEnv {
  if (!serverEnv) {
    const env = {
      HELIUS_RPC_URL: get('HELIUS_RPC_URL'),
      NODE_ENV: get('NODE_ENV') || 'development',
    };

    const parsed = serverEnvSchema.safeParse(env);

    if (!parsed.success) {
      console.error(
        '❌ Invalid environment variables:',
        parsed.error.flatten().fieldErrors,
      );
      throw new Error('Invalid environment variables');
    }

    serverEnv = parsed.data;
  }

  return serverEnv;
}
