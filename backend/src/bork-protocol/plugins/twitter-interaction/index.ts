import { twitterService } from '@/services/twitter-service';
import { twitterDiscoveryConfigService } from '@bork/plugins/twitter-discovery/services/twitter-discovery-config-service';
import { InformativeThreadsClient } from '@bork/plugins/twitter-interaction/clients/informative-threads-client';
import { InteractionsClient } from '@bork/plugins/twitter-interaction/clients/interactions-client';
import type { Plugin } from '@elizaos/core';

export const twitterInteractionPlugin: Plugin = {
  name: 'twitterInteraction',
  description:
    'Twitter interaction plugin to create threads and interact with other users',
  actions: [],
  clients: [new InformativeThreadsClient(), new InteractionsClient()],
  services: [twitterDiscoveryConfigService, twitterService],
};

export default twitterInteractionPlugin;
