import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { TwitterAccountDiscoveryService } from '../lib/services/twitter-account-discovery-service';
import { TwitterConfigService } from '../lib/services/twitter-config-service';
import type { TwitterService } from '../lib/services/twitter-service';

export class TwitterAccountDiscoveryClient {
  private readonly configService: TwitterConfigService;
  private readonly discoveryService: TwitterAccountDiscoveryService;
  private discoveryInterval: Timer | null = null;
  private evaluationInterval: Timer | null = null;

  // Configuration
  private readonly DISCOVERY_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
  private readonly EVALUATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ACCOUNTS_PER_DISCOVERY = 5; // Number of accounts to process in each discovery cycle

  constructor(runtime: IAgentRuntime, twitterService: TwitterService) {
    this.configService = new TwitterConfigService(runtime);
    this.discoveryService = new TwitterAccountDiscoveryService(
      twitterService,
      this.configService,
    );
  }

  public async start(): Promise<void> {
    elizaLogger.info(
      '[TwitterAccountDiscoveryClient] Starting account discovery client',
    );

    // Initial discovery and evaluation
    await this.runDiscoveryCycle();
    await this.runEvaluationCycle();

    // Set up periodic discovery
    this.discoveryInterval = setInterval(
      () => this.runDiscoveryCycle(),
      this.DISCOVERY_INTERVAL,
    );

    // Set up periodic evaluation
    this.evaluationInterval = setInterval(
      () => this.runEvaluationCycle(),
      this.EVALUATION_INTERVAL,
    );

    elizaLogger.info(
      '[TwitterAccountDiscoveryClient] Account discovery client started',
    );
  }

  public async stop(): Promise<void> {
    elizaLogger.info(
      '[TwitterAccountDiscoveryClient] Stopping account discovery client',
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
      '[TwitterAccountDiscoveryClient] Account discovery client stopped',
    );
  }

  private async runDiscoveryCycle(): Promise<void> {
    try {
      elizaLogger.info(
        '[TwitterAccountDiscoveryClient] Starting discovery cycle',
      );

      const config = await this.configService.getConfig();
      const currentAccounts = config.targetAccounts;

      // Randomly select accounts to process
      const accountsToProcess = this.selectRandomAccounts(
        currentAccounts,
        this.ACCOUNTS_PER_DISCOVERY,
      );

      for (const account of accountsToProcess) {
        const discoveredAccounts =
          await this.discoveryService.discoverAccountsFromTimeline(account);

        // Evaluate each discovered account
        for (const discoveredAccount of discoveredAccounts) {
          await this.discoveryService.evaluateAccount(discoveredAccount);
        }
      }

      // Update target accounts based on evaluations
      await this.discoveryService.updateTargetAccounts();

      elizaLogger.info(
        '[TwitterAccountDiscoveryClient] Completed discovery cycle',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryClient] Error in discovery cycle:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async runEvaluationCycle(): Promise<void> {
    try {
      elizaLogger.info(
        '[TwitterAccountDiscoveryClient] Starting evaluation cycle',
      );

      const config = await this.configService.getConfig();

      // Evaluate all current target accounts
      for (const account of config.targetAccounts) {
        await this.discoveryService.evaluateAccount(account);
      }

      // Update target accounts based on new evaluations
      await this.discoveryService.updateTargetAccounts();

      elizaLogger.info(
        '[TwitterAccountDiscoveryClient] Completed evaluation cycle',
      );
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryClient] Error in evaluation cycle:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private selectRandomAccounts(accounts: string[], count: number): string[] {
    const shuffled = [...accounts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  public getDiscoveryService(): TwitterAccountDiscoveryService {
    return this.discoveryService;
  }
}
