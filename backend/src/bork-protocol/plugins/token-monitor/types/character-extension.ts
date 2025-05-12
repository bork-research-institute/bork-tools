import type { TwitterDiscoveryConfig } from '@/bork-protocol/plugins/twitter-discovery/types/twitter-discovery-config';
import type { Character } from '@elizaos/core';

// TODO Should split those
export interface TokenMonitorCharacter extends Character {
  twitterDiscovery: TwitterDiscoveryConfig;
}
