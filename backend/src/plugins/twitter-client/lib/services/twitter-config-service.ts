import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { twitterConfigQueries } from '../../../bork-extensions/src/db/queries';
import type { TwitterConfig } from '../../../bork-extensions/src/twitter-extensions/types/config';

// TODO Only works for 1 account right now
export class TwitterConfigService {
  private readonly twitterUsername: string;

  constructor(runtime: IAgentRuntime) {
    const username = runtime.getSetting('TWITTER_USERNAME');
    if (!username) {
      throw new Error('TWITTER_USERNAME is not set');
    }
    this.twitterUsername = username;
  }
  // Should use cache here
  public async getConfig(): Promise<TwitterConfig> {
    try {
      const config = await twitterConfigQueries.getConfig(this.twitterUsername);
      return config;
    } catch (error) {
      elizaLogger.error(
        `[TwitterConfigService] Error fetching config for ${this.twitterUsername}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  public async updateConfig(config: Partial<TwitterConfig>): Promise<void> {
    try {
      const updatedConfig = await twitterConfigQueries.updateConfig(
        this.twitterUsername,
        config,
      );
      return updatedConfig;
    } catch (error) {
      elizaLogger.error(
        `[TwitterConfigService] Error updating config for ${this.twitterUsername}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
