import {
  CacheManager,
  type Character,
  DbCacheAdapter,
  type IDatabaseCacheAdapter,
} from '@elizaos/core';

export function initializeDbCache(
  character: Character,
  db: IDatabaseCacheAdapter,
) {
  if (!character.id) {
    throw new Error('Character ID is required');
  }
  const cache = new CacheManager(new DbCacheAdapter(db, character.id));
  return cache;
}
