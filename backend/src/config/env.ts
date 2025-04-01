import { get } from '@dotenvx/dotenvx';
import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  TWITTER_USERNAME: z.string().min(1),
  TWITTER_PASSWORD: z.string().min(1),
  TWITTER_EMAIL: z.string().email(),
  TWITTER_DRY_RUN: z.string().min(1),
  TWITTER_TARGET_USERS: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  TWITTER_POLL_INTERVAL: z.number().min(1),
  INJECTIVE_ENABLED: z.boolean(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Access runtime config
  const envParse = envSchema.safeParse({
    POSTGRES_URL: get('POSTGRES_URL'),
    TWITTER_USERNAME: get('TWITTER_USERNAME'),
    TWITTER_PASSWORD: get('TWITTER_PASSWORD'),
    TWITTER_EMAIL: get('TWITTER_EMAIL'),
    TWITTER_DRY_RUN: get('TWITTER_DRY_RUN'),
    TWITTER_TARGET_USERS: get('TWITTER_TARGET_USERS'),
    OPENAI_API_KEY: get('OPENAI_API_KEY'),
  });

  if (!envParse.success) {
    console.error(
      '❌ Invalid environment variables:',
      envParse.error.flatten().fieldErrors,
    );
    throw new Error('Invalid environment variables');
  }
  return envParse.data;
}
