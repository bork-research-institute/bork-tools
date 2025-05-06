import { twitterService } from '@/services/twitter-service';
import { TwitterAccountsClient } from '@bork/plugins/twitter-discovery/clients/twitter-accounts-client';
import { TwitterDiscoveryClient } from '@bork/plugins/twitter-discovery/clients/twitter-discovery-client';
import { TwitterSearchClient } from '@bork/plugins/twitter-discovery/clients/twitter-search-client';
import { analysisQueueService } from '@bork/plugins/twitter-discovery/services/analysis-queue.service';
import { twitterAccountDiscoveryService } from '@bork/plugins/twitter-discovery/services/twitter-account-discovery-service';
import { twitterDiscoveryConfigService } from '@bork/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { Plugin } from '@elizaos/core';

const twitterDiscoveryPlugin: Plugin = {
  name: 'plugin-twitter-discovery',
  description: 'Discovers Twitter accounts and content based on agent config.',
  clients: [
    new TwitterAccountsClient(),
    new TwitterDiscoveryClient(),
    new TwitterSearchClient(),
  ],
  services: [
    twitterDiscoveryConfigService,
    twitterService,
    analysisQueueService,
    twitterAccountDiscoveryService,
  ],
};

export default twitterDiscoveryPlugin;
