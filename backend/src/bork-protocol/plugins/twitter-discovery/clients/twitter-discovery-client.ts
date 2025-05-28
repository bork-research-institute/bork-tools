import { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { TwitterConfig } from '@/bork-protocol/types/config';
import { TwitterAccountDiscoveryService } from '@bork/plugins/twitter-discovery/services/twitter-account-discovery-service';
import type { TwitterDiscoveryConfig } from '@bork/plugins/twitter-discovery/types/twitter-discovery-config';
import {
  type Client,
  type ClientInstance,
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';

export class TwitterDiscoveryClient implements Client, ClientInstance {
  name = 'TwitterDiscoveryClient';
  private discoveryInterval: Timer | null = null;
  private evaluationInterval: Timer | null = null;

  public async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    elizaLogger.info(
      '[TwitterDiscoveryClient] Starting account discovery client',
    );

    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TwitterDiscoveryClient] Twitter config service not found',
      );
      return;
    }

    const config = await configService.getConfig();
    const characterConfig = configService.getCharacterConfig();

    const discoveryService = runtime.services.get(
      TwitterAccountDiscoveryService.serviceType,
    ) as TwitterAccountDiscoveryService;
    if (!discoveryService) {
      elizaLogger.error(
        '[TwitterDiscoveryClient] Twitter account discovery service not found',
      );
      return;
    }

    // Set up periodic discovery
    this.discoveryInterval = setInterval(
      () => this.runDiscoveryCycle(discoveryService, config, characterConfig),
      characterConfig.discoveryInterval,
    );

    // Set up periodic evaluation
    this.evaluationInterval = setInterval(
      () => this.runEvaluationCycle(discoveryService, config),
      characterConfig.evaluationInterval,
    );

    if (characterConfig.shouldPrefetch) {
      elizaLogger.info('[TwitterDiscoveryClient] Prefetching...');
      await this.runDiscoveryCycle(discoveryService, config, characterConfig);
      await this.runEvaluationCycle(discoveryService, config);
      elizaLogger.info('[TwitterDiscoveryClient] Prefetching complete');
    }

    elizaLogger.info(
      '[TwitterDiscoveryClient] Account discovery client started',
    );
    return this;
  }

  public async stop(): Promise<void> {
    elizaLogger.info(
      '[TwitterDiscoveryClient] Stopping account discovery client',
    );

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    elizaLogger.info(
      '[TwitterDiscoveryClient] Account discovery client stopped',
    );
  }

  private async runDiscoveryCycle(
    discoveryService: TwitterAccountDiscoveryService,
    config: TwitterConfig,
    characterConfig: TwitterDiscoveryConfig,
  ): Promise<void> {
    try {
      elizaLogger.info('[TwitterDiscoveryClient] Starting discovery cycle');

      const currentAccounts = config.targetAccounts;

      // Randomly select accounts to process
      const accountsToProcess = this.selectRandomAccounts(
        currentAccounts,
        characterConfig.accountsPerDiscovery,
      );

      for (const account of accountsToProcess) {
        const discoveredAccounts =
          await discoveryService.discoverAccountsFromTimeline(account);

        // Evaluate each discovered account
        for (const discoveredAccount of discoveredAccounts) {
          await discoveryService.evaluateAccount(discoveredAccount);
        }
      }

      // Update target accounts based on evaluations
      await discoveryService.updateTargetAccounts();

      elizaLogger.info('[TwitterDiscoveryClient] Completed discovery cycle');
    } catch (error) {
      elizaLogger.error(
        '[TwitterDiscoveryClient] Error in discovery cycle:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async runEvaluationCycle(
    discoveryService: TwitterAccountDiscoveryService,
    config: TwitterConfig,
  ): Promise<void> {
    try {
      elizaLogger.info('[TwitterDiscoveryClient] Starting evaluation cycle');

      // Evaluate all current target accounts
      for (const account of config.targetAccounts) {
        await discoveryService.evaluateAccount(account);
      }

      // Update target accounts based on new evaluations
      await discoveryService.updateTargetAccounts();

      elizaLogger.info('[TwitterDiscoveryClient] Completed evaluation cycle');
    } catch (error) {
      elizaLogger.error(
        '[TwitterDiscoveryClient] Error in evaluation cycle:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private selectRandomAccounts(accounts: string[], count: number): string[] {
    const shuffled = [...accounts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
