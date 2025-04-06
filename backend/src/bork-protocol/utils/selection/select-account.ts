import { accountTopicQueries, tweetQueries } from '@/extensions/src/db/queries';
import type { TargetAccount, WeightedAccount } from '@/types/account';
import type { TwitterConfig } from '@/types/config';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { updateYapsData } from '../account-metrics/yaps';
import { getAggregatedTopicWeights } from '../topic-weights/topics';
import { analyzeTopicRelationships } from './analyze-topic-relationships';

/**
 * Performs weighted random selection of accounts from a pool
 * @param accounts Array of weighted accounts to select from
 * @param count Number of accounts to select
 * @returns Array of selected target accounts
 */
function selectAccountsWithWeights(
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

/**
 * Selects target accounts based on topics, yaps data, and influence scores
 * @param runtime - Agent runtime for AI operations
 * @param config - Twitter configuration
 * @param timeframeHours - Number of hours to look back for topic weights
 * @param preferredTopic - Optional topic to bias selection towards related topics
 * @returns Array of selected target accounts
 */
export async function selectTargetAccounts(
  runtime: IAgentRuntime,
  config: TwitterConfig,
  timeframeHours = 24,
  preferredTopic?: string,
): Promise<TargetAccount[]> {
  try {
    // Check if target accounts exist
    const targetAccounts = await tweetQueries.getTargetAccounts();
    if (!targetAccounts.length) {
      elizaLogger.warn('[TwitterAccounts] No target accounts found');
      return [];
    }

    // Get topic weights and analyze relationships
    const topicWeights = await getAggregatedTopicWeights(timeframeHours);
    let relevantTopics = topicWeights;

    if (preferredTopic && topicWeights.length > 0) {
      try {
        const analysis = await analyzeTopicRelationships(
          runtime,
          topicWeights.map((tw) => tw.topic),
          preferredTopic,
        );

        // Filter and adjust topic weights based on relationships
        relevantTopics = topicWeights
          .map((tw) => {
            const relationship = analysis.relatedTopics.find(
              (r) => r.topic === tw.topic,
            );

            if (
              !relationship ||
              relationship.relevanceScore < 0.4 ||
              relationship.relationshipType === 'none'
            ) {
              return { ...tw, weight: 0 };
            }

            return {
              ...tw,
              weight:
                tw.weight * 0.3 +
                relationship.relevanceScore * 0.5 +
                analysis.analysisMetadata.confidence * 0.2,
            };
          })
          .filter((tw) => tw.weight > 0);
      } catch (error) {
        elizaLogger.warn(
          '[TwitterAccounts] Error in topic relationship analysis, using original weights:',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    // Get accounts associated with relevant topics and build a map of account weights
    const topicBasedAccounts = new Map<string, number>(); // username -> weight
    const accountTopicMentions = new Map<string, number>(); // username -> total mentions across topics

    for (const topic of relevantTopics) {
      const accounts = await accountTopicQueries.getTopicAccounts(topic.topic);
      for (const account of accounts) {
        const currentWeight = topicBasedAccounts.get(account.username) || 0;
        const currentMentions = accountTopicMentions.get(account.username) || 0;

        topicBasedAccounts.set(
          account.username,
          currentWeight + (topic.weight * account.mentionCount) / 10,
        );
        accountTopicMentions.set(
          account.username,
          currentMentions + account.mentionCount,
        );
      }
    }

    // Filter target accounts to only those with topic relationships
    const accountsWithTopics = targetAccounts.filter((account) =>
      accountTopicMentions.has(account.username),
    );

    if (accountsWithTopics.length === 0) {
      elizaLogger.warn(
        '[TwitterAccounts] No accounts found with relevant topic relationships',
      );
      return [];
    }

    // Get yaps data for filtered accounts
    const userIds = accountsWithTopics.map((account) => account.userId);
    const yapsData = await tweetQueries.getYapsForAccounts(userIds);

    // Calculate total accounts to process
    const totalAccountsToProcess = Math.min(
      config.search.tweetLimits.accountsToProcess,
      accountsWithTopics.length,
    );

    // Split selection between yaps-based and influence-based
    const yapsBasedCount = Math.ceil(totalAccountsToProcess * 0.5); // 50%
    const influenceBasedCount = totalAccountsToProcess - yapsBasedCount; // 50%

    // Create weighted arrays for selection methods
    const yapsWeighted: WeightedAccount[] = accountsWithTopics.map(
      (account) => {
        const accountYaps = yapsData.find(
          (yaps) => yaps.userId === account.userId,
        );
        const topicWeight = topicBasedAccounts.get(account.username) || 0;
        const yapsWeight = 1 + (accountYaps?.yapsL24h || 0);
        // Combine yaps weight with topic weight
        return {
          account,
          weight: yapsWeight * (0.7 + topicWeight * 0.3), // Scale yaps weight by topic relevance
        };
      },
    );

    const influenceWeighted: WeightedAccount[] = accountsWithTopics.map(
      (account) => {
        const topicWeight = topicBasedAccounts.get(account.username) || 0;
        const influenceWeight = 1 + account.influenceScore / 100;
        // Combine influence weight with topic weight
        return {
          account,
          weight: influenceWeight * (0.7 + topicWeight * 0.3), // Scale influence weight by topic relevance
        };
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
        `from ${accountsWithTopics.length} topic-relevant accounts out of ${targetAccounts.length} total accounts. ` +
        `Config limit: ${config.search.tweetLimits.accountsToProcess}. ` +
        `Selected: ${accountsToProcess.map((a) => a.username).join(', ')}`,
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
