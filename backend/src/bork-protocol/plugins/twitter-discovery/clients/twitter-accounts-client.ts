import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { TwitterConfigService } from '../services/twitter-config-service';

// TODO: Move or update utility imports if only used by this client
export class TwitterAccountsClient {
  private twitterConfigService: TwitterConfigService;
  private readonly runtime: IAgentRuntime;
  private monitoringTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(runtime: IAgentRuntime) {
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Starting accounts client');
    // TODO: Move or update initializeTopicWeights if only used here
    await this.initializeTargetAccounts();
    await this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TwitterAccounts] Stopping accounts client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      this.monitoringTimeout = null;
    }
  }

  private async onReady() {
    await this.monitorTargetAccountsLoop();
  }

  private async monitorTargetAccountsLoop() {
    try {
      await this.monitorTargetAccounts();
    } catch (error) {
      elizaLogger.error('[TwitterAccounts] Error in monitoring loop:', error);
    }
    this.monitoringTimeout = setTimeout(
      () => this.monitorTargetAccountsLoop(),
      Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
    );
  }

  private async monitorTargetAccounts() {
    elizaLogger.info('[TwitterAccounts] Starting target account monitoring');
    try {
      const config = await this.twitterConfigService.getConfig();
      // TODO: Move or update selectTargetAccounts, selectTweetsFromAccounts if only used here
      // const accountsToProcess = [];
      // if (!accountsToProcess.length) {
      //   return;
      // }
      // const selectionResults = [];
      // const allTweets = selectionResults.flatMap((result) => result.tweets);
      // if (allTweets.length === 0) {
      //   elizaLogger.warn('[TwitterAccounts] No tweets found from any target accounts');
      //   return;
      // }
      // await this.tweetQueueService.addTweets(allTweets, 'account', 2);
      // elizaLogger.info('[TwitterAccounts] Successfully queued tweets from target accounts');
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccounts] Error monitoring target accounts:',
        error instanceof Error ? error.stack || error.message : String(error),
      );
    } finally {
      elizaLogger.info(
        '[TwitterAccounts] Target account monitoring cycle completed',
      );
    }
  }

  private async initializeTargetAccounts(): Promise<void> {
    const config = await this.twitterConfigService.getConfig();
    // TODO: Move or update initializeTargetAccounts if only used here
  }
}
