import { twitterService } from '@/services/twitter-service';
import launchToken from '@bork/plugins/gfm-plugin/action';
import searchToken from '@bork/plugins/token-monitor/actions/search-token';
import GenericReplyAction from '@bork/plugins/twitter-interaction/action/generic-reply-action';
import { InformativeThreadsClient } from '@bork/plugins/twitter-interaction/clients/informative-threads-client';
import { InteractionsClient } from '@bork/plugins/twitter-interaction/clients/interactions-client';
import createAndPostThread from '@bork/plugins/x-thread-plugin/action';
import type { Plugin } from '@elizaos/core';

export const twitterInteractionPlugin: Plugin = {
  name: 'twitterInteraction',
  description:
    'Twitter interaction plugin to create threads and interact with other users',
  actions: [GenericReplyAction, searchToken, createAndPostThread, launchToken],
  clients: [new InformativeThreadsClient(), new InteractionsClient()],
  services: [twitterService],
};

export default twitterInteractionPlugin;
