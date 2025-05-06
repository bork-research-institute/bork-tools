import type { TwitterDiscoveryConfig } from '@/bork-protocol/plugins/twitter-discovery/types/twitter-discovery-config';
import type { Character } from '@elizaos/core';

export interface TwitterDiscoveryCharacter extends Character {
  twitterDiscovery: TwitterDiscoveryConfig;
}
