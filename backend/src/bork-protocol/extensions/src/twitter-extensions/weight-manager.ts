import { elizaLogger } from '@elizaos/core';
import { db } from '../db';

interface ContentType {
  type: string;
  baseWeight: number;
}

const CONTENT_TYPES: ContentType[] = [
  { type: 'STREAM', baseWeight: 40 },
  { type: 'HISTORICAL', baseWeight: 20 },
  { type: 'FUTURE', baseWeight: 20 },
  { type: 'RANDOM', baseWeight: 20 },
];

const COOLDOWN_PERIOD = 5; // Number of recent tweets to consider
const WEIGHT_DECAY = 0.5; // How much to reduce weight for recent usage

export const getNextTweetType = async (): Promise<string> => {
  // random limit between 6 - 8
  const limit = Math.floor(Math.random() * 3) + 6;
  const { rows } = await db.query(
    'SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1',
    [limit],
  );
  const tweetTypes = rows.map((tweet) => tweet.media_type);
  if (!tweetTypes.includes('image/jpeg')) {
    return 'image/jpeg';
  }
  return 'text';
};

export class WeightManager {
  private async getRecentTweets(): Promise<string[]> {
    try {
      const { rows } = await db.query(
        'SELECT value FROM cache WHERE key = $1 LIMIT 1',
        ['recent_tweet_types'],
      );
      return rows.length > 0 ? JSON.parse(rows[0].value) : [];
    } catch (error) {
      elizaLogger.error('Error fetching recent tweets:', error);
      return [];
    }
  }

  private async updateRecentTweets(types: string[]): Promise<void> {
    try {
      await db.query(
        'INSERT INTO cache (key, agent_id, value) VALUES ($1, $2, $3) ON CONFLICT (key, agent_id) DO UPDATE SET value = $3',
        ['recent_tweet_types', 'system', JSON.stringify(types)],
      );
    } catch (error) {
      elizaLogger.error('Error updating recent tweets:', error);
    }
  }

  private adjustWeights(recentTypes: string[]): Map<string, number> {
    const weights = new Map(
      CONTENT_TYPES.map((ct) => [ct.type, ct.baseWeight]),
    );

    // Adjust weights based on recent usage
    for (const type of recentTypes.slice(-COOLDOWN_PERIOD)) {
      const currentWeight = weights.get(type);
      if (currentWeight) {
        weights.set(type, currentWeight * WEIGHT_DECAY);
      }
    }

    // Normalize weights
    const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    const entries = Array.from(weights.entries());
    for (const [type, weight] of entries) {
      weights.set(type, (weight / totalWeight) * 100);
    }

    return weights;
  }

  public async selectContentType(): Promise<string> {
    const recentTypes = await this.getRecentTweets();
    const adjustedWeights = this.adjustWeights(recentTypes);
    const weightEntries = Array.from(adjustedWeights.entries());

    // Select content type based on weights
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const [type, weight] of weightEntries) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        // Update recent types
        recentTypes.push(type);
        if (recentTypes.length > COOLDOWN_PERIOD) {
          recentTypes.shift();
        }
        await this.updateRecentTweets(recentTypes);
        return type;
      }
    }

    return CONTENT_TYPES[0].type; // Fallback to first type
  }

  public async getNextTweetType(): Promise<string> {
    // random limit between 4-8
    const limit = Math.floor(Math.random() * 5) + 4;
    const { rows } = await db.query(
      'SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    const tweetTypes = rows.map((tweet) => tweet.media_type);
    if (!tweetTypes.includes('image/jpeg')) {
      return 'image/jpeg';
    }
    return 'text';
  }
}
