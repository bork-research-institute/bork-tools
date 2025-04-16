import { expect } from 'bun:test';
import type { tweetQueries } from '@/db/queries';
import type { TargetAccount } from '@/types/account';
import { selectTargetAccounts } from '@/utils/selection/select-account';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { testTwitterConfig } from '../config/test-config';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockTopicRelationships } from '../mock-data/topic-relationships';

const PREFERRED_TOPIC = 'cryptocurrency';

export interface AccountSelectionTestResult {
  basicSelection: TargetAccount[];
  preferredSelection: TargetAccount[];
  mockTopicWeights: typeof mockTopicWeights;
  mockTopicRelationships: typeof mockTopicRelationships;
  targetAccounts: Awaited<ReturnType<typeof tweetQueries.getTargetAccounts>>;
  yapsData: Awaited<ReturnType<typeof tweetQueries.getYapsForAccounts>>;
  topicAccounts: {
    topic: string;
    accounts: TargetAccount[];
  };
}

export async function testSelectAccounts(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting account selection test');

  try {
    // Test 1: Basic account selection without preferred topic
    const basicResult = await selectTargetAccounts(runtime, testTwitterConfig);
    elizaLogger.info('[Test] Basic account selection result:', {
      selectedAccounts: basicResult.map((account) => account.username),
    });

    // Verify basic selection results
    expect(basicResult).toBeDefined();
    expect(basicResult.length).toBeGreaterThan(0);
    expect(basicResult.length).toBeLessThanOrEqual(
      testTwitterConfig.search.tweetLimits.accountsToProcess,
    );

    // Verify each selected account has required properties
    for (const account of basicResult) {
      expect(account.userId).toBeDefined();
      expect(account.username).toBeDefined();
      expect(account.influenceScore).toBeDefined();
    }

    // Test 2: Account selection with preferred topic
    const preferredResult = await selectTargetAccounts(
      runtime,
      testTwitterConfig,
      PREFERRED_TOPIC,
    );
    elizaLogger.info('[Test] Preferred topic selection result:', {
      PREFERRED_TOPIC,
      selectedAccounts: preferredResult.map((account) => account.username),
    });

    // Verify preferred selection results
    expect(preferredResult).toBeDefined();
    expect(preferredResult.length).toBeGreaterThan(0);
    expect(preferredResult.length).toBeLessThanOrEqual(
      testTwitterConfig.search.tweetLimits.accountsToProcess,
    );

    // Verify each selected account has required properties
    for (const account of preferredResult) {
      expect(account.userId).toBeDefined();
      expect(account.username).toBeDefined();
      expect(account.influenceScore).toBeDefined();
    }

    // Verify that preferred selection has different results from basic selection
    expect(preferredResult).not.toEqual(basicResult);

    // Log detailed analysis of the results
    elizaLogger.info('[Test] Account selection analysis:', {
      basic: {
        accountCount: basicResult.length,
        usernames: basicResult.map((account) => account.username),
      },
      preferred: {
        accountCount: preferredResult.length,
        usernames: preferredResult.map((account) => account.username),
      },
    });

    return {
      basicSelection: basicResult,
      preferredSelection: preferredResult,
      mockTopicWeights,
      mockTopicRelationships,
      targetAccounts: [], // Will be populated from DB
      yapsData: [], // Will be populated from DB
      topicAccounts: {
        topic: PREFERRED_TOPIC,
        accounts: preferredResult,
      },
    };
  } catch (error) {
    elizaLogger.error('[Test] Error in account selection test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
