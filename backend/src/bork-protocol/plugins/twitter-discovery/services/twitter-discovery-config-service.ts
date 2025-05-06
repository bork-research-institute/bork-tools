import { twitterConfigQueries } from '@bork/db/queries';
import type { TwitterDiscoveryCharacter } from '@bork/plugins/twitter-discovery/types/character-extension';
import { ServiceTypeExtension } from '@bork/plugins/twitter-discovery/types/service-type-extension';
import type { TwitterConfig } from '@bork/plugins/twitter-discovery/types/twitter-config';
import type { TwitterDiscoveryConfig } from '@bork/plugins/twitter-discovery/types/twitter-discovery-config';
import {
  type IAgentRuntime,
  Service,
  type ServiceType,
  elizaLogger,
} from '@elizaos/core';

// TODO Only works for 1 account right now
export class TwitterDiscoveryConfigService extends Service {
  private username: string;
  private email: string | null;
  private password: string;
  private characterConfig: TwitterDiscoveryConfig;

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.CONFIG as unknown as ServiceType;
  }
  async initialize(runtime: IAgentRuntime): Promise<void> {
    const password = runtime.getSetting('TWITTER_PASSWORD');
    if (!password) {
      throw new Error('TWITTER_PASSWORD is not set');
    }
    this.password = password;
    const username = runtime.character.settings.secrets.twitterUsername;
    if (!username) {
      throw new Error('TWITTER_USERNAME is not set');
    }
    this.username = username;
    this.email = runtime.getSetting('TWITTER_EMAIL');
    const character: TwitterDiscoveryCharacter =
      runtime.character as TwitterDiscoveryCharacter;
    this.characterConfig = character.twitterDiscovery;
  }

  public getUsername(): string {
    return this.username;
  }

  public getEmail(): string | null {
    return this.email;
  }

  public getPassword(): string {
    return this.password;
  }

  public getCharacterConfig(): TwitterDiscoveryConfig {
    return this.characterConfig;
  }

  // Should use cache here
  public async getConfig(): Promise<TwitterConfig> {
    try {
      const config = await twitterConfigQueries.getConfig(this.username);
      return config;
    } catch (error) {
      elizaLogger.error(
        `[TwitterDiscoveryConfigService] Error fetching config for ${this.username}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  public async updateConfig(config: Partial<TwitterConfig>): Promise<void> {
    try {
      const updatedConfig = await twitterConfigQueries.updateConfig(
        this.username,
        config,
      );
      return updatedConfig;
    } catch (error) {
      elizaLogger.error(
        `[TwitterDiscoveryConfigService] Error updating config for ${this.username}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

export const twitterDiscoveryConfigService =
  new TwitterDiscoveryConfigService();
