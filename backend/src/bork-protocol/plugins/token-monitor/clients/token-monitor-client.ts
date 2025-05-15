import { TokenMonitorConfigService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-config-service';
import { TokenMonitorService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-service';
import { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { Client, ClientInstance, IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

export class TokenMonitorClient implements Client, ClientInstance {
  name = 'TokenMonitorClient';
  private monitoringTimeout: ReturnType<typeof setInterval> | null = null;
  private interestingTokenMonitoringTimeout: ReturnType<
    typeof setInterval
  > | null = null;

  async start(runtime: IAgentRuntime): Promise<ClientInstance> {
    const tokenMonitorService = runtime.services.get(
      TokenMonitorService.serviceType,
    ) as TokenMonitorService;
    if (!tokenMonitorService) {
      elizaLogger.error('[TokenMonitorClient] Token monitor service not found');
      return;
    }
    const configService = runtime.services.get(
      TokenMonitorConfigService.serviceType,
    ) as TokenMonitorConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TokenMonitorClient] Token monitor config service not found',
      );
      return;
    }
    const twitterConfigService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!twitterConfigService) {
      elizaLogger.error(
        '[TokenMonitorClient] Token monitor config service not found',
      );
      return;
    }
    this.monitorTokens(
      tokenMonitorService,
      twitterConfigService.getCharacterConfig().twitterPollInterval,
      configService.getTokenPollInterval(),
    );
    return this;
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TokenMonitorClient] Stopping token monitor client');
    if (this.monitoringTimeout) {
      clearTimeout(this.monitoringTimeout);
      clearTimeout(this.interestingTokenMonitoringTimeout);
      this.monitoringTimeout = null;
      this.interestingTokenMonitoringTimeout = null;
    }
  }

  private async monitorTokens(
    tokenMonitorService: TokenMonitorService,
    twitterPollInterval: number,
    tokenPollInterval: number,
  ): Promise<void> {
    this.monitoringTimeout = setInterval(async () => {
      await tokenMonitorService.monitorTokens();
    }, twitterPollInterval);
    this.interestingTokenMonitoringTimeout = setInterval(async () => {
      await tokenMonitorService.checkForInterestingTokens();
    }, tokenPollInterval);
  }
}
