import type { Character } from '@elizaos/core';
import { character as twitterDiscoveryAgent } from '../characters/twitter-discovery-agent';

// Default to bork-analyzer character for now
// This can be expanded later to support multiple characters and selection logic
export const character: Character = twitterDiscoveryAgent;
