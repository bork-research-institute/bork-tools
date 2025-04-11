import { accountTopicQueries, tweetQueries } from '@/db/queries';
import { mapTopicWeightsByRelationship } from '@/mappers/topic-weights';
import { mapTopicWeightRowToTopicWeight } from '@/mappers/topic-weights';
import type { TargetAccount, WeightedAccount } from '@/types/account';
import type { TwitterConfig } from '@/types/config';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { getEnv } from '../../../config/env';
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
 * @param topicWeightRows - Optional topic weight rows to use instead of fetching them internally
 * @returns Array of selected target accounts
 */
export async function selectTargetAccounts(
  runtime: IAgentRuntime,
  config: TwitterConfig,
  preferredTopic?: string,
): Promise<TargetAccount[]> {
  try {
    const env = getEnv();

    // Get topic weights once at the start
    const topicWeightRows = await getAggregatedTopicWeights(
      env.SEARCH_TIMEFRAME_HOURS,
    );

    if (topicWeightRows.length === 0) {
      elizaLogger.warn('[TwitterAccounts] No topic weights provided');
      return [];
    }

    // Get target accounts first
    const targetAccounts = await tweetQueries.getTargetAccounts();
    if (targetAccounts.length === 0) {
      elizaLogger.warn('[TwitterAccounts] No target accounts found');
      return [];
    }

    let accountsWithTopics: TargetAccount[] = [];

    // Only process topic relationships if we have a preferred topic
    if (preferredTopic) {
      // Convert rows to TopicWeight format for processing
      const topicWeights = topicWeightRows.map(mapTopicWeightRowToTopicWeight);
      let relevantTopics = topicWeights;

      try {
        const analysis = await analyzeTopicRelationships(
          runtime,
          topicWeights.map((tw) => tw.topic),
          preferredTopic,
        );

        // Use mapper to adjust weights based on relationships
        relevantTopics = mapTopicWeightsByRelationship(topicWeights, analysis);

        if (relevantTopics.length === 0) {
          elizaLogger.warn(
            '[TwitterAccounts] No topics found related to preferred topic',
            { preferredTopic },
          );
          return [];
        }

        // Get accounts associated with relevant topics and build a map of account weights
        const topicBasedAccounts = new Map<string, number>(); // username -> weight
        const accountTopicMentions = new Map<string, number>(); // username -> total mentions across topics

        // Fetch accounts only for relevant topics
        const relevantTopicNames = relevantTopics.map((topic) => topic.topic);
        const accountPromises = relevantTopicNames.map(async (topic) => {
          const accounts = await accountTopicQueries.getTopicAccounts(topic);
          return { topic, accounts };
        });

        const accountResults = await Promise.all(accountPromises);

        // Process accounts and their weights
        for (const { topic, accounts } of accountResults) {
          const topicWeight =
            relevantTopics.find((t) => t.topic === topic)?.weight || 0;

          for (const account of accounts) {
            const currentWeight = topicBasedAccounts.get(account.username) || 0;
            const currentMentions =
              accountTopicMentions.get(account.username) || 0;

            topicBasedAccounts.set(
              account.username,
              currentWeight + (topicWeight * account.mentionCount) / 10,
            );
            accountTopicMentions.set(
              account.username,
              currentMentions + account.mentionCount,
            );
          }
        }

        // Filter target accounts to only those with topic relationships
        accountsWithTopics = targetAccounts.filter((account) =>
          accountTopicMentions.has(account.username),
        );
      } catch (error) {
        elizaLogger.warn(
          '[TwitterAccounts] Error in topic relationship analysis, using all target accounts:',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        accountsWithTopics = targetAccounts;
      }
    } else {
      // If no preferred topic, use all target accounts
      accountsWithTopics = targetAccounts;
    }

    if (accountsWithTopics.length === 0) {
      elizaLogger.warn('[TwitterAccounts] No accounts available for selection');
      return [];
    }

    // Get yaps data for accounts
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
        const yapsWeight = 1 + (accountYaps?.yapsL24h || 0);
        return {
          account,
          weight: yapsWeight,
        };
      },
    );

    const influenceWeighted: WeightedAccount[] = accountsWithTopics.map(
      (account) => {
        const influenceWeight = 1 + account.influenceScore / 100;
        return {
          account,
          weight: influenceWeight,
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
        `from ${accountsWithTopics.length} accounts. ` +
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
