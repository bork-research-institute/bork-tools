import type { TargetAccount, WeightedAccount } from '@/lib/types/account';

/**
 * Performs weighted random selection of accounts from a pool
 * @param accounts Array of weighted accounts to select from
 * @param count Number of accounts to select
 * @returns Array of selected target accounts
 */
export function selectAccountsWithWeights(
  accounts: WeightedAccount[],
  count: number,
): TargetAccount[] {
  const selected: TargetAccount[] = [];
  const available = [...accounts];
  const totalWeight = accounts.reduce((sum, { weight }) => sum + weight, 0);

  for (let i = 0; i < count && available.length > 0; i++) {
    let randomWeight = Math.random() * totalWeight;
    let selectedIndex = 0;

    // Find the account that corresponds to the random weight
    for (let j = 0; j < available.length; j++) {
      randomWeight -= available[j].weight;
      if (randomWeight <= 0) {
        selectedIndex = j;
        break;
      }
    }

    // Add selected account and remove it from available pool
    selected.push(available[selectedIndex].account);
    available.splice(selectedIndex, 1);
  }

  return selected;
}
