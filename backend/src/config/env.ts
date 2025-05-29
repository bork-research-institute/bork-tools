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
  POSTGRES_URL_IPV4: z
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
  OPENAI_API_KEY: z.string().min(1),
  HELIUS_API_KEY: z.string().min(1),
  PINATA_JWT: z.string().min(1),
  PINATA_GATEWAY_URL: z.string().url(),
  SOLANA_PRIVATE_KEY: z.string().min(1),
  SOLANA_PUBLIC_KEY: z.string().min(1),
  TEE_MODE: z.enum(['OFF', 'SOFTWARE', 'HARDWARE']).default('OFF'),
  WALLET_SECRET_SALT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Access runtime config
  const envParse = envSchema.safeParse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_URL_IPV4: process.env.POSTGRES_URL_IPV4,
    POSTGRES_ROLE: process.env.POSTGRES_ROLE,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
    TWITTER_EMAIL: process.env.TWITTER_EMAIL,
    TWITTER_DRY_RUN: process.env.TWITTER_DRY_RUN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    PINATA_JWT: process.env.PINATA_JWT,
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL,
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    SOLANA_PUBLIC_KEY: process.env.SOLANA_PUBLIC_KEY,
    TEE_MODE: process.env.TEE_MODE,
    WALLET_SECRET_SALT: process.env.WALLET_SECRET_SALT,
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
