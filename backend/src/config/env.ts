import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_URL: z
    .string()
    .url()
    .transform((url) => {
      if (!url.includes('role=')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}role=postgres`;
      }
      return url;
    }),
  POSTGRES_ROLE: z.string().default('backend_service'),
  TWITTER_USERNAME: z.string().min(1),
  TWITTER_PASSWORD: z.string().min(1),
  TWITTER_EMAIL: z.string().email(),
  TWITTER_DRY_RUN: z.string().min(1),
  TWITTER_TARGET_USERS: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  TWITTER_POLL_INTERVAL: z.string().transform((val) => Number.parseInt(val)),
  SEARCH_TIMEFRAME_HOURS: z
    .string()
    .transform((val) => Number.parseInt(val))
    .default('24'),
  SEARCH_PREFERRED_TOPIC: z.string().min(1).default('crypto'),
  INJECTIVE_ENABLED: z.string().transform((val) => val === 'true'),
  HELIUS_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Access runtime config
  const envParse = envSchema.safeParse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_ROLE: process.env.POSTGRES_ROLE,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
    TWITTER_EMAIL: process.env.TWITTER_EMAIL,
    TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN,
    TWITTER_TARGET_USERS: process.env.TWITTER_TARGET_USERS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWITTER_POLL_INTERVAL: process.env.TWITTER_POLL_INTERVAL,
    SEARCH_TIMEFRAME_HOURS: process.env.SEARCH_TIMEFRAME_HOURS,
    SEARCH_PREFERRED_TOPIC: process.env.SEARCH_PREFERRED_TOPIC,
    INJECTIVE_ENABLED: process.env.INJECTIVE_ENABLED,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
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
