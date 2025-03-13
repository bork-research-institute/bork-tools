import type { IAgentRuntime } from '@elizaos/core';
import { z } from 'zod';

const DEFAULT_MAX_TWEET_LENGTH = 280;

const twitterUsernameSchema = z
  .string()
  .min(1)
  .max(15)
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*[A-Za-z0-9]$|^[A-Za-z]$/,
    'Invalid Twitter username format',
  );

function parseTargetUsers(targetUsersStr?: string | null): string[] {
  if (!targetUsersStr?.trim()) {
    return [];
  }

  return targetUsersStr
    .split(',')
    .map((user) => user.trim())
    .filter(Boolean); // Remove empty usernames
  /*
      .filter(user => {
          // Twitter username validation (basic example)
          return user && /^[A-Za-z0-9_]{1,15}$/.test(user);
      });
      */
}

export const twitterEnvSchema = z.object({
  TWITTER_DRY_RUN: z.string().transform((val) => val.toLowerCase() === 'true'),
  TWITTER_USERNAME: z.string().min(1, 'Twitter username is required'),
  TWITTER_PASSWORD: z.string().min(1, 'Twitter password is required'),
  TWITTER_EMAIL: z.string().email('Valid Twitter email is required'),
  TWITTER_TARGET_USERS: z.array(twitterUsernameSchema).default([]),
  MAX_TWEET_LENGTH: z
    .string()
    .pipe(z.coerce.number().min(0).int())
    .default(DEFAULT_MAX_TWEET_LENGTH.toString()),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

export async function validateTwitterConfig(
  runtime: IAgentRuntime,
): Promise<TwitterConfig> {
  try {
    const config = {
      TWITTER_DRY_RUN:
        runtime.getSetting('TWITTER_DRY_RUN') ||
        process.env.TWITTER_DRY_RUN ||
        'false',
      TWITTER_USERNAME:
        runtime.getSetting('TWITTER_USERNAME') || process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD:
        runtime.getSetting('TWITTER_PASSWORD') || process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL:
        runtime.getSetting('TWITTER_EMAIL') || process.env.TWITTER_EMAIL,
      TWITTER_TARGET_USERS: parseTargetUsers(
        runtime.getSetting('TWITTER_TARGET_USERS') ||
          process.env.TWITTER_TARGET_USERS,
      ),
      MAX_TWEET_LENGTH:
        runtime.getSetting('MAX_TWEET_LENGTH') ||
        process.env.MAX_TWEET_LENGTH ||
        DEFAULT_MAX_TWEET_LENGTH.toString(),
    };

    return twitterEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(
        `Twitter configuration validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}
