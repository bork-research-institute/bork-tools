import { elizaLogger, stringToUuid } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type {
  TwitterConfig,
  TwitterConfigRow,
} from '../twitter-extensions/types/config';
import { db } from './index';
import type {
  AgentPrompt,
  AgentSetting,
  ConsciousnessStream,
  Log,
  StreamSetting,
  TopicWeightRow,
  Tweet,
} from './schema';

export interface TargetAccount {
  username: string;
  userId: string;
  displayName: string;
  description: string;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  mediaCount: number;
  statusesCount: number;
  likesCount: number;
  listedCount: number;
  tweetsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  isBlueVerified: boolean;
  joinedAt: Date | null;
  location: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  canDm: boolean;
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
  source: string;
}

export interface YapsData {
  id: number;
  userId: string;
  username: string;
  yapsAll: number;
  yapsL24h: number;
  yapsL48h: number;
  yapsL7d: number;
  yapsL30d: number;
  yapsL3m: number;
  yapsL6m: number;
  yapsL12m: number;
  lastUpdated: Date;
  createdAt: Date;
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

    await db.query(query, [
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

    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  },

  async getYapsForAccounts(userIds: string[]): Promise<YapsData[]> {
    const query = `
      SELECT *
      FROM yaps
      WHERE user_id = ANY($1)
    `;

    const result = await db.query(query, [userIds]);
    return result.rows;
  },
};

export const tweetQueries = {
  getPendingTweets: async (): Promise<Tweet[]> => {
    try {
      const { rows } = await db.query(
        'SELECT * FROM tweets WHERE status = $1 ORDER BY created_at DESC',
        ['pending'],
      );
      return rows;
    } catch (error) {
      elizaLogger.error('Error fetching pending tweets:', error);
      throw error;
    }
  },

  getSentTweets: async (agentId: string, limit: number): Promise<Tweet[]> => {
    const { rows } = await db.query(
      'SELECT * FROM tweets WHERE agent_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3',
      [agentId, 'sent', limit],
    );
    return rows;
  },

  getTweets: async (limit: number, offset: number): Promise<Tweet[]> => {
    const { rows } = await db.query(
      'SELECT * FROM tweets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );
    return rows;
  },

  updateTweetStatus: async (
    tweetId: string,
    status: string,
    error?: string,
  ) => {
    try {
      await db.query(
        'UPDATE tweets SET status = $1, error = $2 WHERE id = $3',
        [status, error, tweetId],
      );
    } catch (error) {
      elizaLogger.error('Error updating tweet status:', error);
      throw error;
    }
  },

  async saveTweetObject({
    id,
    tweet_id,
    content,
    text,
    status,
    createdAt,
    agentId,
    mediaType,
    mediaUrl,
    bookmarkCount,
    conversationId,
    hashtags,
    html,
    inReplyToStatusId,
    isQuoted,
    isPin,
    isReply,
    isRetweet,
    isSelfThread,
    isThreadMerged,
    hasReplies,
    threadSize,
    replyCount,
    likes,
    name,
    mentions,
    permanentUrl,
    photos,
    quotedStatusId,
    replies,
    retweets,
    retweetedStatusId,
    timestamp,
    urls,
    userId,
    username,
    views,
    sensitiveContent,
    homeTimeline,
  }) {
    const query = `
      INSERT INTO tweets (
        id, tweet_id, content, text, status, created_at, agent_id,
        media_type, media_url, bookmark_count, conversation_id,
        hashtags, html, in_reply_to_status_id, is_quoted, is_pin,
        is_reply, is_retweet, is_self_thread, is_thread_merged,
        has_replies, thread_size, reply_count, likes, name, mentions,
        permanent_url, photos, quoted_status_id, replies, retweets,
        retweeted_status_id, timestamp, urls, user_id, username,
        views, sensitive_content, home_timeline
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
        $12::text[], $13, $14, $15, $16, $17, $18, $19, $20, $21, 
        $22, $23, $24, $25, $26::jsonb, $27, $28::jsonb, $29, $30, 
        $31, $32, $33, $34::text[], $35, $36, $37, $38, $39::jsonb
      )
      ON CONFLICT (tweet_id) DO UPDATE
      SET
        content = EXCLUDED.content,
        text = EXCLUDED.text,
        status = EXCLUDED.status,
        is_thread_merged = EXCLUDED.is_thread_merged,
        has_replies = EXCLUDED.has_replies,
        thread_size = EXCLUDED.thread_size,
        reply_count = EXCLUDED.reply_count
      RETURNING *;
    `;

    const values = [
      id,
      tweet_id,
      content,
      text,
      status,
      createdAt,
      agentId,
      mediaType,
      mediaUrl,
      bookmarkCount,
      conversationId,
      Array.isArray(hashtags) ? hashtags : [], // Ensure array for PostgreSQL
      html,
      inReplyToStatusId,
      isQuoted,
      isPin,
      isReply,
      isRetweet,
      isSelfThread,
      isThreadMerged,
      hasReplies,
      threadSize,
      replyCount,
      likes,
      name,
      JSON.stringify(Array.isArray(mentions) ? mentions : []), // Convert to JSON string
      permanentUrl,
      JSON.stringify(Array.isArray(photos) ? photos : []), // Convert to JSON string
      quotedStatusId,
      replies,
      retweets,
      retweetedStatusId,
      timestamp,
      Array.isArray(urls) ? urls : [], // Ensure array for PostgreSQL
      userId,
      username,
      views,
      sensitiveContent,
      JSON.stringify(homeTimeline), // Convert to JSON string
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      elizaLogger.error('Error saving tweet:', error);
      throw error;
    }
  },

  saveTweet: async (
    content: string,
    agentId: string,
    scheduledFor?: Date,
    homeTimeline?: Tweet[],
    newTweetContent?: string,
  ) => {
    const tweet: Tweet = {
      id: uuidv4(),
      tweet_id: uuidv4(), // Generate a temporary tweet_id for internal tweets
      content,
      text: content,
      agentId,
      scheduledFor,
      status: 'pending',
      homeTimeline: homeTimeline ? { tweets: homeTimeline } : undefined,
      newTweetContent,
      createdAt: new Date(),
      sentAt: null,
      error: null,
      prompt: null,
      mediaType: 'text',
      mediaUrl: null,
      hashtags: [],
      isQuoted: false,
      isPin: false,
      isReply: false,
      isRetweet: false,
      isSelfThread: false,
      likes: 0,
      mentions: [],
      permanentUrl: '',
      photos: [],
      replies: 0,
      retweets: 0,
      timestamp: Math.floor(Date.now() / 1000),
      urls: [],
      userId: agentId,
      username: '',
      sensitiveContent: false,
    };
    try {
      const result = await db.query(
        `INSERT INTO tweets (
          id, tweet_id, content, text, status, created_at, scheduled_for, sent_at, 
          error, agent_id, prompt, bookmark_count, conversation_id, hashtags, html,
          in_reply_to_status_id, is_quoted, is_pin, is_reply, is_retweet, is_self_thread,
          likes, name, mentions, permanent_url, photos, quoted_status_id, replies,
          retweets, retweeted_status_id, timestamp, urls, user_id, username, views,
          sensitive_content, media_type, media_url, home_timeline, new_tweet_content
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
        ) RETURNING *`,
        [
          tweet.id,
          tweet.tweet_id,
          tweet.content,
          tweet.text,
          tweet.status,
          tweet.createdAt,
          tweet.scheduledFor,
          tweet.sentAt,
          tweet.error,
          tweet.agentId,
          tweet.prompt,
          tweet.bookmarkCount,
          tweet.conversationId,
          tweet.hashtags,
          tweet.html,
          tweet.inReplyToStatusId,
          tweet.isQuoted,
          tweet.isPin,
          tweet.isReply,
          tweet.isRetweet,
          tweet.isSelfThread,
          tweet.likes,
          tweet.name,
          JSON.stringify(tweet.mentions),
          tweet.permanentUrl,
          JSON.stringify(tweet.photos),
          tweet.quotedStatusId,
          tweet.replies,
          tweet.retweets,
          tweet.retweetedStatusId,
          tweet.timestamp,
          tweet.urls,
          tweet.userId,
          tweet.username,
          tweet.views,
          tweet.sensitiveContent,
          tweet.mediaType,
          tweet.mediaUrl,
          tweet.homeTimeline ? JSON.stringify(tweet.homeTimeline) : null,
          tweet.newTweetContent,
        ],
      );
      return result.rows[0];
    } catch (error) {
      elizaLogger.error('Error saving tweet:', error);
      throw error;
    }
  },

  getApprovedTweets: async () => {
    try {
      const { rows } = await db.query(
        'SELECT * FROM tweets WHERE status = $1 AND (scheduled_for IS NULL OR scheduled_for <= NOW()) ORDER BY created_at DESC',
        ['approved'],
      );
      return rows;
    } catch (error) {
      elizaLogger.error('Error fetching approved tweets:', error);
      throw error;
    }
  },

  markTweetAsSent: async (tweetId: string) => {
    try {
      await db.query(
        'UPDATE tweets SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', tweetId],
      );
    } catch (error) {
      elizaLogger.error('Error marking tweet as sent:', error);
      throw error;
    }
  },

  markTweetAsError: async (tweetId: string, error: string) => {
    try {
      await db.query(
        'UPDATE tweets SET status = $1, error = $2 WHERE id = $3',
        ['error', error, tweetId],
      );
    } catch (error) {
      elizaLogger.error('Error marking tweet as error:', error);
      throw error;
    }
  },

  getSentTweetById: async (tweetId: string) => {
    try {
      const { rows } = await db.query(
        'SELECT * FROM tweets WHERE id = $1 AND status = $2',
        [tweetId, 'sent'],
      );
      return rows;
    } catch (error) {
      elizaLogger.error('Error fetching sent tweet:', error);
      throw error;
    }
  },

  updateTweetsAsSending: async (tweetIds: string[]) => {
    await db.query('UPDATE tweets SET status = $1 WHERE id = ANY($2)', [
      'sending',
      tweetIds,
    ]);
  },

  insertTweetAnalysis: async (
    tweetId: string,
    type: string,
    sentiment: string,
    confidence: number,
    metrics: Record<string, unknown>,
    entities: string[],
    topics: string[],
    impactScore: number,
    createdAt: Date,
    authorId: string,
    tweetText: string,
    publicMetrics: Record<string, unknown>,
    tweetEntities: Record<string, unknown>,
    spamAnalysis: {
      spamScore: number;
      reasons: string[];
      isSpam: boolean;
      confidenceMetrics: {
        linguisticRisk: number;
        topicMismatch: number;
        engagementAnomaly: number;
        promotionalIntent: number;
      };
    },
    contentMetrics: {
      relevance: number;
      quality: number;
      engagement: number;
      authenticity: number;
      valueAdd: number;
    },
  ) => {
    try {
      await db.query(
        `INSERT INTO tweet_analysis (
          tweet_id, type, sentiment, confidence, metrics, 
          entities, topics, impact_score, created_at, 
          author_id, tweet_text, public_metrics, raw_entities,
          spam_score, spam_reasons, is_spam,
          linguistic_risk, topic_mismatch, engagement_anomaly, promotional_intent,
          content_relevance, content_quality, content_engagement,
          content_authenticity, content_value_add
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
        ON CONFLICT (tweet_id) DO UPDATE SET
          metrics = EXCLUDED.metrics,
          impact_score = EXCLUDED.impact_score,
          spam_score = EXCLUDED.spam_score,
          spam_reasons = EXCLUDED.spam_reasons,
          is_spam = EXCLUDED.is_spam,
          linguistic_risk = EXCLUDED.linguistic_risk,
          topic_mismatch = EXCLUDED.topic_mismatch,
          engagement_anomaly = EXCLUDED.engagement_anomaly,
          promotional_intent = EXCLUDED.promotional_intent,
          content_relevance = EXCLUDED.content_relevance,
          content_quality = EXCLUDED.content_quality,
          content_engagement = EXCLUDED.content_engagement,
          content_authenticity = EXCLUDED.content_authenticity,
          content_value_add = EXCLUDED.content_value_add`,
        [
          tweetId,
          type,
          sentiment,
          confidence,
          JSON.stringify(metrics),
          entities,
          topics,
          impactScore,
          createdAt,
          authorId,
          tweetText,
          JSON.stringify(publicMetrics),
          JSON.stringify(tweetEntities),
          spamAnalysis.spamScore,
          spamAnalysis.reasons,
          spamAnalysis.isSpam,
          spamAnalysis.confidenceMetrics.linguisticRisk,
          spamAnalysis.confidenceMetrics.topicMismatch,
          spamAnalysis.confidenceMetrics.engagementAnomaly,
          spamAnalysis.confidenceMetrics.promotionalIntent,
          contentMetrics.relevance,
          contentMetrics.quality,
          contentMetrics.engagement,
          contentMetrics.authenticity,
          contentMetrics.valueAdd,
        ],
      );
    } catch (error) {
      elizaLogger.error('Error inserting tweet analysis:', error);
      throw error;
    }
  },

  insertMarketMetrics: async (metrics: Record<string, unknown>) => {
    try {
      await db.query(
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
      const { rows } = await db.query(
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
      await db.query(
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
    const result = await db.query(
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
    await db.query(
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
    const result = await db.query(query);
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

    await db.query(query, [
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

  findTweetByTweetId: async (tweet_id: string): Promise<Tweet | null> => {
    try {
      const result = await db.query<Tweet>(
        'SELECT * FROM tweets WHERE tweet_id = $1 LIMIT 1',
        [tweet_id],
      );
      return result.rows[0] || null;
    } catch (error) {
      elizaLogger.error(
        `[Tweet Queries] Error finding tweet by tweet ID: ${error}`,
      );
      throw error;
    }
  },

  ...yapsQueries,
};

export const agentSettingQueries = {
  getAgentSetting: async (
    agentId: string,
    key: string,
  ): Promise<string | undefined> => {
    try {
      const { rows } = await db.query(
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
      await db.query(
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
      const { rows } = await db.query(
        'INSERT INTO agent_prompts (id, prompt, agent_id, version, enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [
          prompt.id,
          prompt.prompt,
          prompt.agentId,
          prompt.version,
          prompt.enabled ? 'true' : 'false',
        ],
      );
      return rows[0];
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
      const { rows } = await db.query(
        'SELECT * FROM agent_prompts WHERE agent_id = $1 AND version = $2 AND enabled = true LIMIT 1',
        [agentId, version],
      );
      return rows[0] || null;
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

      const { rows } = await db.query(
        `UPDATE agent_prompts SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values as string[],
      );
      return rows[0];
    } catch (error) {
      elizaLogger.error('Error updating prompt:', error);
      throw error;
    }
  },
};

export const streamQueries = {
  getStreamSettings: async (agentId: string): Promise<StreamSetting> => {
    try {
      const { rows } = await db.query(
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

      return rows[0];
    } catch (error) {
      elizaLogger.error('Error fetching stream settings:', error);
      throw error;
    }
  },

  saveStreamSettings: async (settings: StreamSetting): Promise<void> => {
    try {
      await db.query(
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
      const { rows } = await db.query(
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
      await db.query(
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
    await db.query(
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
    await db.query(
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
      await db.query(
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
      const reverseResult = await db.query(
        `SELECT id FROM user_mentions_relationship 
         WHERE source_username = $1 AND target_username = $2`,
        [targetUsername, sourceUsername],
      );

      if (reverseResult.rows.length > 0) {
        // Update both relationships to be mutual
        await db.query(
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
      const result = await db.query(
        `SELECT target_username as username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE source_username = $1 AND is_mutual = true
         ORDER BY relationship_strength DESC`,
        [username],
      );
      return result.rows;
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
      const result = await db.query(
        `SELECT source_username, target_username, relationship_strength as strength
         FROM user_mentions_relationship
         WHERE relationship_strength >= $1
         ORDER BY relationship_strength DESC`,
        [minStrength],
      );
      return result.rows;
    } catch (error) {
      elizaLogger.error('Error getting strong relationships:', error);
      throw error;
    }
  },

  decayRelationships: async (): Promise<void> => {
    try {
      // Decay relationships that haven't been updated in 30 days
      await db.query(
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
      const result = await db.query(
        'SELECT * FROM twitter_configs WHERE username = $1',
        [username],
      );

      if (result.rows.length === 0) {
        // Try to get default config
        const defaultResult = await db.query(
          'SELECT * FROM twitter_configs WHERE username = $1',
          ['default'],
        );
        if (defaultResult.rows.length === 0) {
          return null;
        }
        const row = defaultResult.rows[0];
        return twitterConfigQueries.mapRowToConfig(row);
      }

      const row = result.rows[0];
      return twitterConfigQueries.mapRowToConfig(row);
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

      await db.query(query, values);
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
          excludeReplies: row.exclude_replies,
          excludeRetweets: row.exclude_retweets,
          filterLevel: row.filter_level,
        },
      },
    };
  },
};
