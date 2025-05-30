import type { TopicWeightRow } from '@/types/topic';
import type { DatabaseTweet } from '@/types/twitter';
import type {
  TwitterConfig,
  TwitterConfigRow,
} from '@bork/plugins/twitter-discovery/types/twitter-config';
import type { TargetAccount } from '@bork/types/account';
import { type UUID, elizaLogger, stringToUuid } from '@elizaos/core';
import type { PoolClient, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type {
  AccountTopic,
  AgentPrompt,
  AgentSetting,
  ConsciousnessStream,
  DatabaseAgentPrompt,
  DatabaseMentionRelationship,
  DatabaseStreamSetting,
  DatabaseStrongRelationship,
  DatabaseTargetAccount,
  DatabaseTopicWeightTrend,
  Log,
  SpamUser,
  StreamSetting,
  YapsData,
} from './schema';

/**
 * Execute a function within a transaction and automatically release the client
 */
async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = await db;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a function with a client that may or may not be part of an existing transaction
 */
async function withClient<T>(
  clientOrNull: PoolClient | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (clientOrNull) {
    // Use the provided client (likely part of an ongoing transaction)
    return fn(clientOrNull);
  }

  // Get a new client and release it when done
  const pool = await db;
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// Helper function to execute queries directly on the pool
async function executeQuery<T = unknown>(
  query: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const pool = await db;
  return pool.query(query, params);
}

export const yapsQueries = {
  async upsertYapsData(
    data: Omit<YapsData, 'id' | 'createdAt'>,
  ): Promise<void> {
    const query = `
      INSERT INTO yaps (
        user_id,
        username,
        yaps_all,
        yaps_l24h,
        yaps_l48h,
        yaps_l7d,
        yaps_l30d,
        yaps_l3m,
        yaps_l6m,
        yaps_l12m,
        last_updated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        yaps_all = EXCLUDED.yaps_all,
        yaps_l24h = EXCLUDED.yaps_l24h,
        yaps_l48h = EXCLUDED.yaps_l48h,
        yaps_l7d = EXCLUDED.yaps_l7d,
        yaps_l30d = EXCLUDED.yaps_l30d,
        yaps_l3m = EXCLUDED.yaps_l3m,
        yaps_l6m = EXCLUDED.yaps_l6m,
        yaps_l12m = EXCLUDED.yaps_l12m,
        last_updated = EXCLUDED.last_updated
    `;

    await executeQuery(query, [
      data.userId,
      data.username,
      data.yapsAll,
      data.yapsL24h,
      data.yapsL48h,
      data.yapsL7d,
      data.yapsL30d,
      data.yapsL3m,
      data.yapsL6m,
      data.yapsL12m,
      data.lastUpdated,
    ]);
  },

  async getYapsData(userId: string): Promise<YapsData | null> {
    const query = `
      SELECT *
      FROM yaps
      WHERE user_id = $1
    `;

    const result = await executeQuery<YapsData>(query, [userId]);
    return result.rows[0] || null;
  },

  async getYapsForAccounts(userIds: string[]): Promise<YapsData[]> {
    const query = `
      SELECT *
      FROM yaps
      WHERE user_id = ANY($1)
    `;

    const result = await executeQuery<YapsData>(query, [userIds]);
    return result.rows;
  },
};

export const tweetQueries = {
  getPendingTweets: async (client?: PoolClient): Promise<DatabaseTweet[]> => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          'SELECT * FROM tweets WHERE status = $1 ORDER BY created_at DESC',
          ['pending'],
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error('Error fetching pending tweets:', error);
      throw error;
    }
  },

  getSentTweets: async (
    agentId: string,
    limit: number,
    client?: PoolClient,
  ): Promise<DatabaseTweet[]> => {
    return withClient(client || null, async (c) => {
      const { rows } = await c.query(
        'SELECT * FROM tweets WHERE agent_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3',
        [agentId, 'sent', limit],
      );
      return rows;
    });
  },

  getTweets: async (
    limit: number,
    offset: number,
    client?: PoolClient,
  ): Promise<DatabaseTweet[]> => {
    return withClient(client || null, async (c) => {
      const { rows } = await c.query(
        'SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );
      return rows;
    });
  },

  updateTweetStatus: async (
    tweet_id: string,
    status: string,
    error?: string,
    client?: PoolClient,
  ) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          'UPDATE tweets SET status = $1, error = $2 WHERE tweet_id = $3',
          [status, error, tweet_id],
        );
      });
    } catch (error) {
      elizaLogger.error('Error updating tweet status:', error);
      throw error;
    }
  },

  saveTweetObject: async (
    tweet: DatabaseTweet,
    client?: PoolClient,
  ): Promise<void> => {
    const query = `
      INSERT INTO tweets (
        id, tweet_id, agent_id, text, user_id, username, name, timestamp, time_parsed,
        likes, retweets, replies, views, bookmark_count,
        conversation_id, permanent_url, html,
        in_reply_to_status, in_reply_to_status_id,
        quoted_status, quoted_status_id,
        retweeted_status, retweeted_status_id,
        thread,
        is_quoted, is_pin, is_reply, is_retweet, is_self_thread, sensitive_content,
        is_thread_merged, thread_size, original_text,
        media_type, media_url,
        hashtags, mentions, photos, urls, videos,
        place, poll,
        home_timeline,
        status, created_at, scheduled_for, sent_at,
        error, prompt, new_tweet_content
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21,
        $22, $23,
        $24,
        $25, $26, $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35,
        $36, $37, $38, $39, $40,
        $41, $42,
        $43,
        $44, $45, $46, $47,
        $48, $49, $50
      )
      ON CONFLICT (tweet_id) DO UPDATE SET
        text = EXCLUDED.text,
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        timestamp = EXCLUDED.timestamp,
        time_parsed = EXCLUDED.time_parsed,
        likes = EXCLUDED.likes,
        retweets = EXCLUDED.retweets,
        replies = EXCLUDED.replies,
        views = EXCLUDED.views,
        bookmark_count = EXCLUDED.bookmark_count,
        conversation_id = EXCLUDED.conversation_id,
        permanent_url = EXCLUDED.permanent_url,
        html = EXCLUDED.html,
        in_reply_to_status = EXCLUDED.in_reply_to_status,
        in_reply_to_status_id = EXCLUDED.in_reply_to_status_id,
        quoted_status = EXCLUDED.quoted_status,
        quoted_status_id = EXCLUDED.quoted_status_id,
        retweeted_status = EXCLUDED.retweeted_status,
        retweeted_status_id = EXCLUDED.retweeted_status_id,
        thread = EXCLUDED.thread,
        is_quoted = EXCLUDED.is_quoted,
        is_pin = EXCLUDED.is_pin,
        is_reply = EXCLUDED.is_reply,
        is_retweet = EXCLUDED.is_retweet,
        is_self_thread = EXCLUDED.is_self_thread,
        sensitive_content = EXCLUDED.sensitive_content,
        is_thread_merged = EXCLUDED.is_thread_merged,
        thread_size = EXCLUDED.thread_size,
        original_text = EXCLUDED.original_text,
        media_type = EXCLUDED.media_type,
        media_url = EXCLUDED.media_url,
        hashtags = EXCLUDED.hashtags,
        mentions = EXCLUDED.mentions,
        photos = EXCLUDED.photos,
        urls = EXCLUDED.urls,
        videos = EXCLUDED.videos,
        place = EXCLUDED.place,
        poll = EXCLUDED.poll,
        home_timeline = EXCLUDED.home_timeline,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        scheduled_for = EXCLUDED.scheduled_for,
        sent_at = EXCLUDED.sent_at,
        error = EXCLUDED.error,
        prompt = EXCLUDED.prompt,
        new_tweet_content = EXCLUDED.new_tweet_content
    `;

    const values = [
      tweet.id || uuidv4(),
      tweet.tweet_id,
      tweet.agentId,
      tweet.text,
      tweet.userId,
      tweet.username,
      tweet.name,
      tweet.timestamp,
      tweet.timeParsed,
      tweet.likes || 0,
      tweet.retweets || 0,
      tweet.replies || 0,
      tweet.views,
      tweet.bookmarkCount,
      tweet.conversationId,
      tweet.permanentUrl,
      tweet.html,
      tweet.inReplyToStatus ? JSON.stringify(tweet.inReplyToStatus) : null,
      tweet.inReplyToStatusId,
      tweet.quotedStatus ? JSON.stringify(tweet.quotedStatus) : null,
      tweet.quotedStatusId,
      tweet.retweetedStatus ? JSON.stringify(tweet.retweetedStatus) : null,
      tweet.retweetedStatusId,
      JSON.stringify(tweet.thread || []),
      tweet.isQuoted || false,
      tweet.isPin || false,
      tweet.isReply || false,
      tweet.isRetweet || false,
      tweet.isSelfThread || false,
      tweet.sensitiveContent || false,
      tweet.isThreadMerged || false,
      tweet.threadSize || 0,
      tweet.originalText,
      tweet.mediaType,
      tweet.mediaUrl,
      tweet.hashtags || [],
      JSON.stringify(tweet.mentions || []),
      JSON.stringify(tweet.photos || []),
      tweet.urls || [],
      JSON.stringify(tweet.videos || []),
      tweet.place ? JSON.stringify(tweet.place) : null,
      tweet.poll ? JSON.stringify(tweet.poll) : null,
      JSON.stringify(tweet.homeTimeline || { publicMetrics: {}, entities: {} }),
      tweet.status || 'pending',
      tweet.createdAt || new Date(),
      tweet.scheduledFor,
      tweet.sentAt,
      tweet.error,
      tweet.prompt,
      tweet.newTweetContent,
    ];

    try {
      return withClient(client || null, async (c) => {
        await c.query(query, values);
      });
    } catch (error) {
      elizaLogger.error('Error saving tweet:', {
        error: error instanceof Error ? error.message : String(error),
        tweetId: tweet.tweet_id,
        userId: tweet.userId,
      });
      throw error;
    }
  },

  saveTweet: async (
    text: string,
    agentId: string,
    scheduledFor?: Date,
    newTweetContent?: string,
    client?: PoolClient,
  ): Promise<DatabaseTweet> => {
    // Create a new tweet with both AgentTweet fields and our additional fields
    const id = uuidv4(); // Generate UUID for our primary key
    const twitterId = uuidv4(); // Generate an ID that will be used for Twitter
    const tweet: DatabaseTweet = {
      // Our primary key
      id,
      // AgentTweet fields
      tweet_id: twitterId,
      text,
      hashtags: [],
      mentions: [],
      photos: [],
      urls: [],
      likes: 0,
      replies: 0,
      retweets: 0,
      isQuoted: false,
      isPin: false,
      isReply: false,
      isRetweet: false,
      isSelfThread: false,
      sensitiveContent: false,
      timestamp: Math.floor(Date.now() / 1000),
      thread: [], // Required by AgentTweet
      videos: [], // Required by AgentTweet
      userId: agentId, // Use agentId as userId for now
      username: '', // Will be updated later
      name: '', // Will be updated later
      conversationId: twitterId, // Same as tweet_id for new tweets
      permanentUrl: `https://twitter.com/unknown/status/${twitterId}`, // Will be updated later

      // Our additional fields
      status: 'pending',
      createdAt: new Date(),
      agentId,
      mediaType: 'text',
      scheduledFor,
      newTweetContent,
      isThreadMerged: false,
      threadSize: 0,
      originalText: text,
      homeTimeline: {
        publicMetrics: {
          likes: 0,
          retweets: 0,
          replies: 0,
        },
        entities: {
          hashtags: [],
          mentions: [],
          urls: [],
        },
      },
    };

    try {
      await tweetQueries.saveTweetObject(tweet, client);
      return tweet;
    } catch (error) {
      elizaLogger.error('Error saving tweet:', error);
      throw error;
    }
  },

  getApprovedTweets: async (client?: PoolClient) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          'SELECT * FROM tweets WHERE status = $1 AND (scheduled_for IS NULL OR scheduled_for <= NOW()) ORDER BY created_at DESC',
          ['approved'],
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error('Error fetching approved tweets:', error);
      throw error;
    }
  },

  markTweetAsSent: async (id: string, client?: PoolClient) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          'UPDATE tweets SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', id],
        );
      });
    } catch (error) {
      elizaLogger.error('Error marking tweet as sent:', error);
      throw error;
    }
  },

  markTweetAsError: async (id: string, error: string, client?: PoolClient) => {
    try {
      return withClient(client || null, async (c) => {
        await c.query(
          'UPDATE tweets SET status = $1, error = $2 WHERE id = $3',
          ['error', error, id],
        );
      });
    } catch (error) {
      elizaLogger.error('Error marking tweet as error:', error);
      throw error;
    }
  },

  getSentTweetById: async (id: string, client?: PoolClient) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          'SELECT * FROM tweets WHERE id = $1 AND status = $2',
          [id, 'sent'],
        );
        return rows;
      });
    } catch (error) {
      elizaLogger.error('Error fetching sent tweet:', error);
      throw error;
    }
  },

  updateTweetsAsSending: async (ids: string[], client?: PoolClient) => {
    return withClient(client || null, async (c) => {
      await c.query('UPDATE tweets SET status = $1 WHERE id = ANY($2)', [
        'sending',
        ids,
      ]);
    });
  },

  insertTweetAnalysis: async (
    id: UUID,
    tweet_id: string,
    type: string,
    format: string,
    sentiment: string,
    confidence: number,
    content_summary: string,
    topics: string[],
    entities: string[],
    relevance: number,
    originality: number,
    clarity: number,
    authenticity: number,
    value_add: number,
    likes: number,
    replies: number,
    retweets: number,
    created_at: Date,
    author_username: string,
    marketing_summary: string,
    is_spam: boolean,
    spam_score: number,
    client?: PoolClient,
  ) => {
    try {
      return withClient(client || null, async (c) => {
        const { rows } = await c.query(
          `INSERT INTO tweet_analysis (
            id,
            tweet_id,
            type,
            format,
            sentiment,
            confidence,
            content_summary,
            topics,
            entities,
            relevance,
            originality,
            clarity,
            authenticity,
            value_add,
            likes,
            replies,
            retweets,
            created_at,
            author_username,
            marketing_summary,
            is_spam,
            spam_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING *`,
          [
            id,
            tweet_id,
            type,
            format,
            sentiment,
            confidence,
            content_summary,
            topics,
            entities,
            relevance,
            originality,
            clarity,
            authenticity,
            value_add,
            likes,
            replies,
            retweets,
            created_at,
            author_username,
            marketing_summary,
            is_spam,
            spam_score,
          ],
        );
        return rows[0];
      });
    } catch (error) {
      elizaLogger.error('Error inserting tweet analysis:', error);
      throw error;
    }
  },

  insertMarketMetrics: async (metrics: Record<string, unknown>) => {
    try {
      await executeQuery(
        'INSERT INTO market_metrics (metrics, timestamp) VALUES ($1, NOW())',
        [JSON.stringify(metrics)],
      );
    } catch (error) {
      elizaLogger.error('Error inserting market metrics:', error);
      throw error;
    }
  },

  getSpamUser: async (userId: string) => {
    try {
      const { rows } = await executeQuery<SpamUser>(
        'SELECT * FROM spam_users WHERE user_id = $1',
        [userId],
      );
      return rows[0] || null;
    } catch (error) {
      elizaLogger.error('Error fetching spam user:', error);
      throw error;
    }
  },

  updateSpamUser: async (
    userId: string,
    spamScore: number,
    violations: string[],
  ) => {
    try {
      const now = new Date();
      await executeQuery(
        `INSERT INTO spam_users (
          user_id, spam_score, last_tweet_date, tweet_count, violations, updated_at
        ) VALUES ($1, $2, $3, 1, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          spam_score = $2,
          last_tweet_date = $3,
          tweet_count = spam_users.tweet_count + 1,
          violations = spam_users.violations || $4,
          updated_at = $5`,
        [userId, spamScore, now, JSON.stringify(violations), now],
      );
    } catch (error) {
      elizaLogger.error('Error updating spam user:', error);
      throw error;
    }
  },

  getTopicWeights: async (): Promise<TopicWeightRow[]> => {
    const result = await executeQuery<TopicWeightRow>(
      'SELECT * FROM topic_weights ORDER BY weight DESC',
    );
    return result.rows;
  },

  updateTopicWeight: async (
    topic: string,
    weight: number,
    impactScore: number,
    seedWeight: number,
  ): Promise<void> => {
    await executeQuery(
      `INSERT INTO topic_weights (topic, weight, impact_score, last_updated, seed_weight)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
       ON CONFLICT (topic) 
       DO UPDATE SET 
         weight = $2,
         impact_score = $3,
         last_updated = CURRENT_TIMESTAMP`,
      [topic, weight, impactScore, seedWeight],
    );
  },

  initializeTopicWeights: async (topics: string[]): Promise<void> => {
    const seedWeights = topics.map((topic) => ({
      topic,
      weight: 0.5,
      impactScore: 0.5,
      seedWeight: 0.5,
    }));

    await Promise.all(
      seedWeights.map(({ topic, weight, impactScore, seedWeight }) =>
        tweetQueries.updateTopicWeight(topic, weight, impactScore, seedWeight),
      ),
    );
  },

  async getTargetAccounts(): Promise<TargetAccount[]> {
    const query = `
      SELECT * FROM target_accounts 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await executeQuery<DatabaseTargetAccount>(query);
    return result.rows.map((row) => ({
      username: row.username,
      userId: row.user_id,
      displayName: row.display_name,
      description: row.description,
      followersCount: row.followers_count,
      followingCount: row.following_count,
      friendsCount: row.friends_count,
      mediaCount: row.media_count,
      statusesCount: row.statuses_count,
      likesCount: row.likes_count,
      listedCount: row.listed_count,
      tweetsCount: row.tweets_count,
      isPrivate: row.is_private,
      isVerified: row.is_verified,
      isBlueVerified: row.is_blue_verified,
      joinedAt: row.joined_at,
      location: row.location || '',
      avatarUrl: row.avatar_url,
      bannerUrl: row.banner_url,
      websiteUrl: row.website_url,
      canDm: row.can_dm,
      createdAt: row.created_at,
      lastUpdated: row.last_updated,
      isActive: row.is_active,
      source: row.source,
      avgLikes50: row.avg_likes_50 || 0,
      avgRetweets50: row.avg_retweets_50 || 0,
      avgReplies50: row.avg_replies_50 || 0,
      avgViews50: row.avg_views_50 || 0,
      engagementRate50: row.engagement_rate_50 || 0,
      influenceScore: row.influence_score || 0,
      last50TweetsUpdatedAt: row.last_50_tweets_updated_at || null,
    }));
  },

  async insertTargetAccount(account: TargetAccount): Promise<void> {
    const query = `
      INSERT INTO target_accounts (
        username,
        user_id,
        display_name,
        description,
        followers_count,
        following_count,
        friends_count,
        media_count,
        statuses_count,
        likes_count,
        listed_count,
        tweets_count,
        is_private,
        is_verified,
        is_blue_verified,
        joined_at,
        location,
        avatar_url,
        banner_url,
        website_url,
        can_dm,
        created_at,
        last_updated,
        is_active,
        source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (username) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        friends_count = EXCLUDED.friends_count,
        media_count = EXCLUDED.media_count,
        statuses_count = EXCLUDED.statuses_count,
        likes_count = EXCLUDED.likes_count,
        listed_count = EXCLUDED.listed_count,
        tweets_count = EXCLUDED.tweets_count,
        is_private = EXCLUDED.is_private,
        is_verified = EXCLUDED.is_verified,
        is_blue_verified = EXCLUDED.is_blue_verified,
        joined_at = EXCLUDED.joined_at,
        location = EXCLUDED.location,
        avatar_url = EXCLUDED.avatar_url,
        banner_url = EXCLUDED.banner_url,
        website_url = EXCLUDED.website_url,
        can_dm = EXCLUDED.can_dm,
        created_at = EXCLUDED.created_at,
        last_updated = EXCLUDED.last_updated,
        is_active = EXCLUDED.is_active,
        source = EXCLUDED.source
    `;

    await executeQuery(query, [
      account.username,
      account.userId,
      account.displayName,
      account.description,
      account.followersCount,
      account.followingCount,
      account.friendsCount,
      account.mediaCount,
      account.statusesCount,
      account.likesCount,
      account.listedCount,
      account.tweetsCount,
      account.isPrivate,
      account.isVerified,
      account.isBlueVerified,
      account.joinedAt,
      account.location,
      account.avatarUrl,
      account.bannerUrl,
      account.websiteUrl,
      account.canDm,
      account.createdAt,
      account.lastUpdated,
      account.isActive,
      account.source,
    ]);
  },

  findTweetByTweetId: async (
    tweet_id: string,
    client?: PoolClient,
  ): Promise<DatabaseTweet | null> => {
    try {
      return withClient(client || null, async (c) => {
        const result = await c.query<DatabaseTweet>(
          'SELECT * FROM tweets WHERE tweet_id = $1 LIMIT 1',
          [tweet_id],
        );
        return result.rows[0] || null;
      });
    } catch (error) {
      elizaLogger.error(
        `[Tweet Queries] Error finding tweet by tweet ID: ${error}`,
      );
      throw error;
    }
  },

  findTweetById: async (
    id: string,
    client?: PoolClient,
  ): Promise<DatabaseTweet | null> => {
    try {
      return withClient(client || null, async (c) => {
        const result = await c.query<DatabaseTweet>(
          'SELECT * FROM tweets WHERE id = $1 LIMIT 1',
          [id],
        );
        return result.rows[0] || null;
      });
    } catch (error) {
      elizaLogger.error(`[Tweet Queries] Error finding tweet by ID: ${error}`);
      throw error;
    }
  },

  updateTargetAccountMetrics: async (
    username: string,
    metrics: {
      avgLikes50: number;
      avgRetweets50: number;
      avgReplies50: number;
      avgViews50: number;
      last50TweetsUpdatedAt: Date;
      influenceScore: number;
    },
  ): Promise<void> => {
    const query = `
      UPDATE target_accounts
      SET 
        avg_likes_50 = $1,
        avg_retweets_50 = $2,
        avg_replies_50 = $3,
        avg_views_50 = $4,
        last_50_tweets_updated_at = $5,
        influence_score = $6
      WHERE username = $7
    `;

    try {
      await executeQuery(query, [
        metrics.avgLikes50,
        metrics.avgRetweets50,
        metrics.avgReplies50,
        metrics.avgViews50,
        metrics.last50TweetsUpdatedAt,
        metrics.influenceScore,
        username,
      ]);
    } catch (error) {
      elizaLogger.error('Error updating target account metrics:', {
        error: error instanceof Error ? error.message : String(error),
        username,
      });
      throw error;
    }
  },

  processTweetsInTransaction: async <T>(
    operations: (client: PoolClient) => Promise<T>,
  ): Promise<T> => {
    return withTransaction(operations);
  },

  ...yapsQueries,

  /**
   * Get tweets by username
   */
  async getTweetsByUsername(
    username: string,
    limit = 50,
  ): Promise<DatabaseTweet[]> {
    const query = `
      SELECT *
      FROM tweets
      WHERE username = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    try {
      elizaLogger.debug(`[DB] Getting tweets for username ${username}`);
      const result = await executeQuery<DatabaseTweet>(query, [
        username,
        limit,
      ]);
      return result.rows;
    } catch (error) {
      elizaLogger.error(`[DB] Error getting tweets for username ${username}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  },

  /**
   * Creates a new topic weight entry
   */
  async createTopicWeight(topicWeight: TopicWeightRow): Promise<void> {
    const query = `
      INSERT INTO topic_weights (
        id,
        topic,
        weight,
        impact_score,
        created_at,
        engagement_metrics,
        sentiment,
        confidence,
        tweet_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await executeQuery(query, [
      topicWeight.id,
      topicWeight.topic,
      topicWeight.weight,
      topicWeight.impact_score,
      topicWeight.created_at || new Date(),
      JSON.stringify(topicWeight.engagement_metrics),
      topicWeight.sentiment,
      topicWeight.confidence,
      topicWeight.tweet_id,
    ]);
  },

  /**
   * Gets recent topic weights within a specified timeframe
   */
  async getRecentTopicWeights(timeframeHours = 24): Promise<TopicWeightRow[]> {
    const query = `
      WITH recent_weights AS (
        SELECT 
          topic,
          AVG(weight) as weight,
          AVG(impact_score) as impact_score,
          MAX(created_at) as created_at,
          (array_agg(id ORDER BY created_at DESC))[1] as id,
          (array_agg(tweet_id ORDER BY created_at DESC))[1] as tweet_id,
          (array_agg(sentiment ORDER BY created_at DESC))[1] as sentiment,
          AVG(confidence) as confidence,
          (array_agg(engagement_metrics ORDER BY created_at DESC))[1] as engagement_metrics
        FROM topic_weights
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
        GROUP BY topic
        ORDER BY weight DESC
      )
      SELECT *
      FROM recent_weights
    `;

    const result = await executeQuery<TopicWeightRow>(query);
    return result.rows.map((row) => ({
      ...row,
      engagement_metrics:
        typeof row.engagement_metrics === 'string'
          ? JSON.parse(row.engagement_metrics)
          : row.engagement_metrics,
    }));
  },

  /**
   * Gets topic weight trends over time
   */
  async getTopicTrends(
    timeframeHours = 168,
    interval = '1 hour',
  ): Promise<
    Array<{
      topic: string;
      timestamp: Date;
      avgWeight: number;
      totalEngagement: number;
      mentionCount: number;
    }>
  > {
    const query = `
      WITH time_buckets AS (
        SELECT
          topic,
          time_bucket('${interval}', created_at) as bucket,
          AVG(weight) as avg_weight,
          SUM(
            (engagement_metrics->>'likes')::numeric +
            (engagement_metrics->>'retweets')::numeric +
            (engagement_metrics->>'replies')::numeric
          ) as total_engagement,
          COUNT(*) as mention_count
        FROM topic_weights
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
        GROUP BY topic, bucket
        ORDER BY bucket DESC
      )
      SELECT
        topic,
        bucket as timestamp,
        avg_weight,
        total_engagement,
        mention_count
      FROM time_buckets
      ORDER BY bucket DESC, avg_weight DESC
    `;

    const result = await executeQuery<DatabaseTopicWeightTrend>(query);
    return result.rows.map((row) => ({
      topic: row.topic,
      timestamp: row.timestamp,
      avgWeight: row.avg_weight,
      totalEngagement: row.total_engagement,
      mentionCount: row.mention_count,
    }));
  },

  /**
   * Gets the top trending topics based on recent engagement and weight
   */
  async getTopTrendingTopics(
    timeframeHours = 24,
    limit = 10,
  ): Promise<
    Array<{
      topic: string;
      avgWeight: number;
      totalEngagement: number;
      mentionCount: number;
      momentum: number;
    }>
  > {
    const query = `
      WITH recent_metrics AS (
        SELECT
          topic,
          AVG(weight) as avg_weight,
          SUM(
            (engagement_metrics->>'likes')::numeric +
            (engagement_metrics->>'retweets')::numeric +
            (engagement_metrics->>'replies')::numeric
          ) as total_engagement,
          COUNT(*) as mention_count,
          COALESCE(
            REGR_SLOPE(
              weight,
              EXTRACT(EPOCH FROM created_at)
            ),
            0
          ) as momentum
        FROM topic_weights
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
        GROUP BY topic
      )
      SELECT *
      FROM recent_metrics
      ORDER BY (avg_weight * 0.4 + total_engagement * 0.3 + mention_count * 0.1 + momentum * 0.2) DESC
      LIMIT $1
    `;

    const result = await executeQuery<DatabaseTopicWeightTrend>(query, [limit]);
    return result.rows.map((row) => ({
      topic: row.topic,
      avgWeight: row.avg_weight,
      totalEngagement: row.total_engagement,
      mentionCount: row.mention_count,
      momentum: row.momentum || 0,
    }));
  },
};

export const agentSettingQueries = {
  getAgentSetting: async (
    agentId: string,
    key: string,
  ): Promise<string | undefined> => {
    try {
      const { rows } = await executeQuery<{ setting_value: string }>(
        'SELECT setting_value FROM agent_settings WHERE agent_id = $1 AND setting_key = $2 LIMIT 1',
        [agentId, key],
      );
      return rows[0]?.setting_value;
    } catch (error) {
      elizaLogger.error('Error fetching agent setting:', error);
      throw error;
    }
  },

  updateAgentSetting: async (id: string, key: string, value: string) => {
    try {
      const setting: AgentSetting = {
        id: uuidv4(),
        agentId: id,
        settingKey: key,
        settingValue: value,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await executeQuery(
        'INSERT INTO agent_settings (id, agent_id, setting_key, setting_value, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET setting_value = $4, updated_at = $6',
        [
          setting.id,
          setting.agentId,
          setting.settingKey,
          setting.settingValue,
          setting.createdAt,
          setting.updatedAt,
        ],
      );
    } catch (error) {
      elizaLogger.error('Error updating agent setting:', error);
      throw error;
    }
  },
};

export const promptQueries = {
  savePrompt: async (settings: AgentPrompt): Promise<AgentPrompt> => {
    try {
      const prompt: AgentPrompt = {
        id: uuidv4(),
        prompt: settings.prompt,
        agentId: settings.agentId,
        version: settings.version,
        enabled: settings.enabled,
      };
      const { rows } = await executeQuery<DatabaseAgentPrompt>(
        'INSERT INTO agent_prompts (id, prompt, agent_id, version, enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [
          prompt.id,
          prompt.prompt,
          prompt.agentId,
          prompt.version,
          prompt.enabled ? 'true' : 'false',
        ],
      );
      return {
        id: rows[0].id,
        prompt: rows[0].prompt,
        agentId: rows[0].agent_id,
        version: rows[0].version,
        enabled: rows[0].enabled,
      };
    } catch (error) {
      elizaLogger.error('Error saving prompt:', error);
      throw error;
    }
  },

  getPrompt: async (
    agentId: string,
    version: string,
  ): Promise<AgentPrompt | null> => {
    try {
      const { rows } = await executeQuery<DatabaseAgentPrompt>(
        'SELECT * FROM agent_prompts WHERE agent_id = $1 AND version = $2 AND enabled = true LIMIT 1',
        [agentId, version],
      );
      if (!rows[0]) {
        return null;
      }
      return {
        id: rows[0].id,
        prompt: rows[0].prompt,
        agentId: rows[0].agent_id,
        version: rows[0].version,
        enabled: rows[0].enabled,
      };
    } catch (error) {
      elizaLogger.error('Error getting prompt:', error);
      throw error;
    }
  },

  updatePrompt: async (
    id: string,
    settings: Partial<AgentPrompt>,
  ): Promise<AgentPrompt> => {
    try {
      const setClauses = [];
      const values: (string | boolean)[] = [id];
      let paramCount = 1;

      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          if (key === 'enabled') {
            setClauses.push(`${key} = $${++paramCount}`);
            values.push(value ? 'true' : 'false');
          } else {
            setClauses.push(`${key} = $${++paramCount}`);
            values.push(value as string);
          }
        }
      }

      const { rows } = await executeQuery<DatabaseAgentPrompt>(
        `UPDATE agent_prompts SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values as string[],
      );
      if (!rows[0]) {
        throw new Error('No prompt found to update');
      }
      return {
        id: rows[0].id,
        prompt: rows[0].prompt,
        agentId: rows[0].agent_id,
        version: rows[0].version,
        enabled: rows[0].enabled,
      };
    } catch (error) {
      elizaLogger.error('Error updating prompt:', error);
      throw error;
    }
  },
};

export const streamQueries = {
  getStreamSettings: async (agentId: string): Promise<StreamSetting> => {
    try {
      const { rows } = await executeQuery<DatabaseStreamSetting>(
        'SELECT * FROM stream_settings WHERE agent_id = $1',
        [agentId],
      );

      if (rows.length === 0) {
        const defaultSettings: StreamSetting = {
          id: uuidv4(),
          agentId,
          enabled: true,
          interval: 15,
          lastRun: new Date(),
        };
        await streamQueries.saveStreamSettings(defaultSettings);
        return defaultSettings;
      }

      return {
        id: rows[0].id,
        agentId: rows[0].agent_id,
        enabled: rows[0].enabled,
        interval: rows[0].interval,
        lastRun: rows[0].last_run,
      };
    } catch (error) {
      elizaLogger.error('Error fetching stream settings:', error);
      throw error;
    }
  },

  saveStreamSettings: async (settings: StreamSetting): Promise<void> => {
    try {
      await executeQuery(
        'INSERT INTO stream_settings (id, agent_id, enabled, interval, last_run) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET enabled = $3, interval = $4, last_run = $5',
        [
          settings.id,
          settings.agentId,
          settings.enabled,
          settings.interval,
          settings.lastRun,
        ],
      );
    } catch (error) {
      elizaLogger.error('Error saving stream settings:', error);
      throw error;
    }
  },

  getRecentStreams: async (agentId: string, limit = 100) => {
    try {
      const { rows } = await executeQuery(
        'SELECT * FROM consciousness_streams WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [agentId, limit],
      );
      return rows;
    } catch (error) {
      elizaLogger.error('Error fetching recent streams:', error);
      throw error;
    }
  },

  saveStream: async (
    entry: ConsciousnessStream,
    agentId?: string,
  ): Promise<void> => {
    const stream: ConsciousnessStream = {
      id: uuidv4(),
      agentId: agentId ?? 'davinci',
      topic: entry.topic,
      title: entry.title,
      content: entry.content,
      status: entry.status,
      timestamp: new Date(),
    };
    try {
      await executeQuery(
        'INSERT INTO consciousness_streams (id, agent_id, topic, title, content, status, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          stream.id,
          stream.agentId,
          stream.topic,
          stream.title,
          stream.content,
          stream.status,
          stream.timestamp,
        ],
      );
    } catch (error) {
      elizaLogger.error('Error saving stream entry:', error);
      throw error;
    }
  },
};

export const logQueries = {
  saveLog: async (newLog: Log) => {
    await executeQuery(
      'INSERT INTO logs (id, user_id, body, type, room_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        newLog.id,
        newLog.userId,
        newLog.body,
        newLog.type,
        newLog.roomId,
        newLog.createdAt,
      ],
    );
  },

  createPromptLog: async (
    logBody: Record<string, unknown>,
    agentId: string,
    promptType: string,
  ) => {
    const log: Log = {
      id: stringToUuid(`prompt_log_${promptType}_${new Date().getTime()}`),
      userId: agentId,
      body: logBody,
      type: 'prompt',
      createdAt: new Date(),
      roomId: `prompt_log_${promptType}`,
    };
    await executeQuery(
      'INSERT INTO logs (id, user_id, body, type, room_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [log.id, log.userId, log.body, log.type, log.roomId, log.createdAt],
    );
  },
};

export const userMentionQueries = {
  upsertMentionRelationship: async (
    sourceUsername: string,
    targetUsername: string,
    tweetId: string,
    timestamp: Date,
  ): Promise<void> => {
    try {
      // First try to update existing relationship
      await executeQuery(
        `INSERT INTO user_mentions_relationship 
         (source_username, target_username, first_mention_at, last_mention_at, tweet_ids)
         VALUES ($1, $2, $3, $3, ARRAY[$4])
         ON CONFLICT (source_username, target_username) 
         DO UPDATE SET
           mention_count = user_mentions_relationship.mention_count + 1,
           last_mention_at = $3,
           tweet_ids = array_append(user_mentions_relationship.tweet_ids, $4),
           relationship_strength = LEAST(1.0, user_mentions_relationship.relationship_strength + 0.1)`,
        [sourceUsername, targetUsername, timestamp, tweetId],
      );

      // Check if there's a reverse relationship and update mutual flag
      const reverseResult = await executeQuery(
        `SELECT id FROM user_mentions_relationship 
         WHERE source_username = $1 AND target_username = $2`,
        [targetUsername, sourceUsername],
      );

      if (reverseResult.rows.length > 0) {
        // Update both relationships to be mutual
        await executeQuery(
          `UPDATE user_mentions_relationship 
           SET is_mutual = true 
           WHERE (source_username = $1 AND target_username = $2)
           OR (source_username = $2 AND target_username = $1)`,
          [sourceUsername, targetUsername],
        );
      }
    } catch (error) {
      elizaLogger.error('Error upserting mention relationship:', error);
      throw error;
    }
  },

  getMutualMentions: async (
    username: string,
  ): Promise<Array<{ username: string; strength: number }>> => {
    try {
      const result = await executeQuery<DatabaseMentionRelationship>(
        `SELECT target_username as username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE source_username = $1 AND is_mutual = true
         ORDER BY relationship_strength DESC`,
        [username],
      );
      return result.rows.map((row) => ({
        username: row.username,
        strength: row.strength,
      }));
    } catch (error) {
      elizaLogger.error('Error getting mutual mentions:', error);
      throw error;
    }
  },

  getStrongRelationships: async (
    minStrength = 0.5,
  ): Promise<
    Array<{ sourceUsername: string; targetUsername: string; strength: number }>
  > => {
    try {
      const result = await executeQuery<DatabaseStrongRelationship>(
        `SELECT source_username, target_username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE relationship_strength >= $1
         ORDER BY relationship_strength DESC`,
        [minStrength],
      );
      return result.rows.map((row) => ({
        sourceUsername: row.source_username,
        targetUsername: row.target_username,
        strength: row.strength,
      }));
    } catch (error) {
      elizaLogger.error('Error getting strong relationships:', error);
      throw error;
    }
  },

  decayRelationships: async (): Promise<void> => {
    try {
      // Decay relationships that haven't been updated in 30 days
      await executeQuery(
        `UPDATE user_mentions_relationship
         SET relationship_strength = GREATEST(0.1, relationship_strength * 0.9)
         WHERE last_mention_at < NOW() - INTERVAL '30 days'`,
      );
    } catch (error) {
      elizaLogger.error('Error decaying relationships:', error);
      throw error;
    }
  },
};

export const twitterConfigQueries = {
  async getConfig(username: string): Promise<TwitterConfig | null> {
    try {
      const result = await executeQuery<TwitterConfigRow>(
        'SELECT * FROM twitter_configs WHERE username = $1',
        [username],
      );

      if (result.rows.length === 0) {
        // Try to get default config
        const defaultResult = await executeQuery<TwitterConfigRow>(
          'SELECT * FROM twitter_configs WHERE username = $1',
          ['default'],
        );
        if (defaultResult.rows.length === 0) {
          return null;
        }
        return twitterConfigQueries.mapRowToConfig(defaultResult.rows[0]);
      }

      return twitterConfigQueries.mapRowToConfig(result.rows[0]);
    } catch (error) {
      elizaLogger.error(
        '[TwitterConfigQueries] Error fetching config:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  },

  async updateConfig(
    username: string,
    config: Partial<TwitterConfig>,
  ): Promise<void> {
    try {
      const setClauses: string[] = [];
      const values: (string | number | boolean | string[])[] = [username];
      let paramCount = 1;

      if (config.targetAccounts) {
        setClauses.push(`target_accounts = $${++paramCount}`);
        values.push(config.targetAccounts);
      }

      if (config.search) {
        if (config.search.maxRetries !== undefined) {
          setClauses.push(`max_retries = $${++paramCount}`);
          values.push(config.search.maxRetries);
        }
        if (config.search.retryDelay !== undefined) {
          setClauses.push(`retry_delay = $${++paramCount}`);
          values.push(config.search.retryDelay);
        }
        if (config.search.searchInterval) {
          if (config.search.searchInterval.min !== undefined) {
            setClauses.push(`search_interval_min = $${++paramCount}`);
            values.push(config.search.searchInterval.min);
          }
          if (config.search.searchInterval.max !== undefined) {
            setClauses.push(`search_interval_max = $${++paramCount}`);
            values.push(config.search.searchInterval.max);
          }
        }
        if (config.search.tweetLimits) {
          if (config.search.tweetLimits.targetAccounts !== undefined) {
            setClauses.push(`tweet_limit_target_accounts = $${++paramCount}`);
            values.push(config.search.tweetLimits.targetAccounts);
          }
          if (config.search.tweetLimits.qualityTweetsPerAccount !== undefined) {
            setClauses.push(
              `tweet_limit_quality_per_account = $${++paramCount}`,
            );
            values.push(config.search.tweetLimits.qualityTweetsPerAccount);
          }
          if (config.search.tweetLimits.accountsToProcess !== undefined) {
            setClauses.push(
              `tweet_limit_accounts_to_process = $${++paramCount}`,
            );
            values.push(config.search.tweetLimits.accountsToProcess);
          }
          if (config.search.tweetLimits.searchResults !== undefined) {
            setClauses.push(`tweet_limit_search_results = $${++paramCount}`);
            values.push(config.search.tweetLimits.searchResults);
          }
        }
        if (config.search.engagementThresholds) {
          if (config.search.engagementThresholds.minLikes !== undefined) {
            setClauses.push(`min_likes = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minLikes);
          }
          if (config.search.engagementThresholds.minRetweets !== undefined) {
            setClauses.push(`min_retweets = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minRetweets);
          }
          if (config.search.engagementThresholds.minReplies !== undefined) {
            setClauses.push(`min_replies = $${++paramCount}`);
            values.push(config.search.engagementThresholds.minReplies);
          }
        }
        if (config.search.parameters) {
          if (config.search.parameters.excludeReplies !== undefined) {
            setClauses.push(`exclude_replies = $${++paramCount}`);
            values.push(config.search.parameters.excludeReplies);
          }
          if (config.search.parameters.excludeRetweets !== undefined) {
            setClauses.push(`exclude_retweets = $${++paramCount}`);
            values.push(config.search.parameters.excludeRetweets);
          }
          if (config.search.parameters.filterLevel !== undefined) {
            setClauses.push(`filter_level = $${++paramCount}`);
            values.push(config.search.parameters.filterLevel);
          }
        }
      }

      if (setClauses.length === 0) {
        return;
      }

      const query = `
        INSERT INTO twitter_configs (username, ${setClauses
          .map((_, i) => Object.keys(config)[i])
          .join(', ')})
        VALUES ($1, ${setClauses.map((_, i) => `$${i + 2}`).join(', ')})
        ON CONFLICT (username) 
        DO UPDATE SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      `;

      await executeQuery(query, values);
    } catch (error) {
      elizaLogger.error(
        '[TwitterConfigQueries] Error updating config:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  },

  mapRowToConfig(row: TwitterConfigRow): TwitterConfig {
    return {
      targetAccounts: row.target_accounts,
      search: {
        maxRetries: row.max_retries,
        retryDelay: row.retry_delay,
        searchInterval: {
          min: row.search_interval_min,
          max: row.search_interval_max,
        },
        tweetLimits: {
          targetAccounts: row.tweet_limit_target_accounts,
          qualityTweetsPerAccount: row.tweet_limit_quality_per_account,
          accountsToProcess: row.tweet_limit_accounts_to_process,
          searchResults: row.tweet_limit_search_results,
        },
        engagementThresholds: {
          minLikes: row.min_likes,
          minRetweets: row.min_retweets,
          minReplies: row.min_replies,
        },
        parameters: {
          excludeReplies: Boolean(row.exclude_replies),
          excludeRetweets: Boolean(row.exclude_retweets),
          filterLevel: row.filter_level,
        },
      },
    };
  },
};

export const accountTopicQueries = {
  /**
   * Upserts a relationship between an account and a topic, incrementing the mention count
   */
  async upsertAccountTopic(
    username: string,
    topic: string,
    client?: PoolClient,
  ): Promise<void> {
    const query = `
      INSERT INTO account_topics (
        username,
        topic,
        mention_count,
        first_seen_at,
        last_seen_at
      ) VALUES ($1, $2, 1, NOW(), NOW())
      ON CONFLICT (username, topic) 
      DO UPDATE SET
        mention_count = account_topics.mention_count + 1,
        last_seen_at = NOW()
    `;

    try {
      return withClient(client || null, async (c) => {
        await c.query(query, [username, topic]);
      });
    } catch (error) {
      elizaLogger.error('Error upserting account topic:', {
        error: error instanceof Error ? error.message : String(error),
        username,
        topic,
      });
      throw error;
    }
  },

  /**
   * Gets all topics associated with an account
   */
  async getAccountTopics(username: string): Promise<AccountTopic[]> {
    const query = `
      SELECT 
        topic,
        mention_count as "mentionCount",
        first_seen_at as "firstSeenAt",
        last_seen_at as "lastSeenAt"
      FROM account_topics
      WHERE username = $1
      ORDER BY mention_count DESC
    `;

    try {
      const result = await executeQuery<AccountTopic>(query, [username]);
      return result.rows;
    } catch (error) {
      elizaLogger.error('Error getting account topics:', {
        error: error instanceof Error ? error.message : String(error),
        username,
      });
      return [];
    }
  },

  /**
   * Gets all accounts associated with a topic
   */
  async getTopicAccounts(topic: string): Promise<AccountTopic[]> {
    const query = `
      SELECT 
        username,
        topic,
        mention_count as "mentionCount",
        first_seen_at as "firstSeenAt",
        last_seen_at as "lastSeenAt"
      FROM account_topics
      WHERE LOWER(topic) = LOWER($1)
      ORDER BY mention_count DESC
    `;

    try {
      elizaLogger.debug(
        '[AccountTopicQueries] Executing topic accounts query:',
        {
          topic,
          normalizedTopic: topic.toLowerCase(),
          query: query.replace(/\s+/g, ' ').trim(),
          params: [topic],
        },
      );

      const result = await executeQuery<AccountTopic>(query, [topic]);

      elizaLogger.debug('[AccountTopicQueries] Query result:', {
        topic,
        normalizedTopic: topic.toLowerCase(),
        rowCount: result.rowCount,
        accounts: result.rows.map((r) => ({
          username: r.username,
          topic: r.topic,
          mentionCount: r.mentionCount,
        })),
      });

      return result.rows;
    } catch (error) {
      elizaLogger.error('Error getting topic accounts:', {
        error: error instanceof Error ? error.message : String(error),
        topic,
        query: query.replace(/\s+/g, ' ').trim(),
      });
      return [];
    }
  },
};
