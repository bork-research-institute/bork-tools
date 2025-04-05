import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../../extensions/src/db/queries';
import type {
  TargetAccount,
  WeightedAccount,
} from '../../../lib/types/account';
import type { TwitterConfig } from '../../../lib/types/config';
import { selectAccountsWithWeights } from './selection-utils';
import { updateYapsData } from './yaps-processing';

export async function selectTargetAccounts(
  config: TwitterConfig,
): Promise<TargetAccount[]> {
  try {
    // Check if target accounts exist
    const targetAccounts = await tweetQueries.getTargetAccounts();
    if (!targetAccounts.length) {
      elizaLogger.warn('[TwitterAccounts] No target accounts found');
      return [];
    }

    // Get yaps data for all accounts
    const userIds = targetAccounts.map((account) => account.userId);
    const yapsData = await tweetQueries.getYapsForAccounts(userIds);

    // Calculate total accounts to process
    const totalAccountsToProcess = Math.min(
      config.search.tweetLimits.accountsToProcess,
      targetAccounts.length,
    );

    // Split selection between yaps-based and influence-based
    const yapsBasedCount = Math.ceil(totalAccountsToProcess / 2);
    const influenceBasedCount = totalAccountsToProcess - yapsBasedCount;

    // Create weighted arrays for both selection methods
    const yapsWeighted: WeightedAccount[] = targetAccounts.map((account) => {
      const accountYaps = yapsData.find(
        (yaps) => yaps.userId === account.userId,
      );
      const weight = 1 + (accountYaps?.yapsL24h || 0);
      return { account, weight };
    });

    const influenceWeighted: WeightedAccount[] = targetAccounts.map(
      (account) => {
        // Normalize influence score to 0-1 range and add small base weight
        const weight = 1 + account.influenceScore / 100;
        return { account, weight };
      },
    );

    // Select accounts using both methods
    const yapsSelected = selectAccountsWithWeights(
      yapsWeighted,
      yapsBasedCount,
    );
    const influenceSelected = selectAccountsWithWeights(
      // Filter out accounts already selected by yaps
      influenceWeighted.filter(
        (weighted) =>
          !yapsSelected.some(
            (selected) => selected.userId === weighted.account.userId,
          ),
      ),
      influenceBasedCount,
    );

    // Combine selections
    const accountsToProcess = [...yapsSelected, ...influenceSelected];

    elizaLogger.info(
      `[TwitterAccounts] Selected ${accountsToProcess.length} accounts ` +
        `(${yapsSelected.length} by yaps, ${influenceSelected.length} by influence) ` +
        `from ${targetAccounts.length} total accounts with config ${config.search.tweetLimits.accountsToProcess}: ` +
        `${accountsToProcess.map((a) => a.username).join(', ')}`,
    );

    // Update Yaps data for selected accounts
    await updateYapsData(accountsToProcess);

    return accountsToProcess;
  } catch (error) {
    elizaLogger.error(
      '[TwitterAccounts] Error selecting target accounts:',
      error instanceof Error ? error.stack || error.message : String(error),
    );
    throw error;
  }
}
