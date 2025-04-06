import { tweetQueries } from '@/extensions/src/db/queries.js';
import { elizaLogger } from '@elizaos/core';
import type { SpamUser } from '../types/twitter.js';

/**
 * Gets the spam data for a user
 * @param userId The ID of the user to get spam data for
 * @returns The user's spam data or null if not found
 */
export async function getUserSpamData(
  userId: string,
): Promise<SpamUser | null> {
  try {
    return await tweetQueries.getSpamUser(userId);
  } catch (error) {
    elizaLogger.error('[Spam Processing] Error getting spam data:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}

/**
 * Updates the spam data for a user based on their tweet analysis
 * @param userId The ID of the user to update
 * @param spamScore The spam score from the analysis
 * @param reasons The reasons for the spam score
 * @param context The logging context
 */
export async function updateUserSpamData(
  userId: string,
  spamScore: number,
  reasons: string[],
  context: string,
): Promise<void> {
  try {
    await tweetQueries.updateSpamUser(userId, spamScore, reasons);

    elizaLogger.info(`${context} Updated spam data for user ${userId}`, {
      spamScore,
      reasons,
    });
  } catch (error) {
    elizaLogger.error(`${context} Error updating spam data:`, {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
