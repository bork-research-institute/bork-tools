import searchToken from '@/bork-protocol/plugins/token-monitor/actions/search-token';
import { TokenMonitorClient } from '@/bork-protocol/plugins/token-monitor/clients/token-monitor-client';
import { tokenMonitorConfigService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-config-service';
import { tokenMonitorService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-service';
import { twitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import { analysisQueueService } from '@/services/analysis-queue.service';
import { twitterService } from '@/services/twitter-service';
import type { Plugin } from '@elizaos/core';

const tokenMonitorPlugin: Plugin = {
  name: 'plugin-token-monitor',
  description: 'Monitors token prices and trends.',
  clients: [new TokenMonitorClient()],
  services: [
    twitterDiscoveryConfigService,
    twitterService,
    analysisQueueService,
    tokenMonitorService,
    tokenMonitorConfigService,
  ],
  actions: [searchToken],
};

export default tokenMonitorPlugin;
