import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../bork-extensions/src/db/queries';
import type { TargetAccount } from '../../lib/types/account';
import type { TwitterConfig } from '../../lib/types/config';
import { updateYapsData } from './yaps-processing';

interface WeightedAccount {
  account: TargetAccount;
  weight: number;
}

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

    // Get yaps data for all accounts to calculate weights
    const userIds = targetAccounts.map((account) => account.userId);
    const yapsData = await tweetQueries.getYapsForAccounts(userIds);

    // Create weighted selection array with base weight of 1, adding yaps_l24h score
    const weightedAccounts: WeightedAccount[] = targetAccounts.map(
      (account) => {
        const accountYaps = yapsData.find(
          (yaps) => yaps.userId === account.userId,
        );
        const weight = 1 + (accountYaps?.yapsL24h || 0);
        return { account, weight };
      },
    );

    // Calculate total weight
    const totalWeight = weightedAccounts.reduce(
      (sum, { weight }) => sum + weight,
      0,
    );

    // Select accounts using weighted random selection
    const accountsToProcess: TargetAccount[] = [];
    const availableAccounts = [...weightedAccounts];
    const numAccountsToProcess = Math.min(
      config.search.tweetLimits.accountsToProcess,
      availableAccounts.length,
    );

    for (let i = 0; i < numAccountsToProcess; i++) {
      let randomWeight = Math.random() * totalWeight;
      let selectedIndex = 0;

      // Find the account that corresponds to the random weight
      for (let j = 0; j < availableAccounts.length; j++) {
        randomWeight -= availableAccounts[j].weight;
        if (randomWeight <= 0) {
          selectedIndex = j;
          break;
        }
      }

      // Add selected account and remove it from available pool
      accountsToProcess.push(availableAccounts[selectedIndex].account);
      availableAccounts.splice(selectedIndex, 1);
    }

    elizaLogger.info(
      `[TwitterAccounts] Selected ${accountsToProcess.length} accounts (weighted random selection from ${targetAccounts.length} total accounts): ${accountsToProcess.map((a) => a.username).join(', ')}`,
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
