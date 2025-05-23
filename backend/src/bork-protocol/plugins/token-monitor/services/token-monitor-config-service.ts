import { ServiceTypeExtension } from '@/bork-protocol/plugins/token-monitor/types/service-type-extension';
import { type IAgentRuntime, Service, type ServiceType } from '@elizaos/core';

export class TokenMonitorConfigService extends Service {
  // TODO: Should be in character config
  private readonly TOKEN_POLL_INTERVAL = 1000 * 60 * 30; // 30 minutes between DexScreener calls
  private readonly RATE_LIMIT_DELAY = 5000; // 5 seconds between DexScreener calls
  private readonly JUPITER_CALL_DELAY = 150; // 150ms between Jupiter calls

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.CONFIG as unknown as ServiceType;
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {}

  getTokenPollInterval(): number {
    return this.TOKEN_POLL_INTERVAL;
  }

  getRateLimitDelay(): number {
    return this.RATE_LIMIT_DELAY;
  }

  getJupiterCallDelay(): number {
    return this.JUPITER_CALL_DELAY;
  }
}

export const tokenMonitorConfigService = new TokenMonitorConfigService();
