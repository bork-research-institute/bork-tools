import { elizaLogger, stringToUuid } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type {
  AgentPrompt,
  AgentSetting,
  ConsciousnessStream,
  Log,
  StreamSetting,
  Tweet,
} from './schema';

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

  saveTweetObject: async (tweet: Tweet) => {
    try {
      const result = await db.query(
        'INSERT INTO tweets (id, content, status, created_at, scheduled_for, sent_at, error, agent_id, prompt, home_timeline, new_tweet_content, media_type, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id',
        [
          tweet.id,
          tweet.content,
          tweet.status,
          tweet.createdAt,
          tweet.scheduledFor,
          tweet.sentAt,
          tweet.error,
          tweet.agentId,
          tweet.prompt,
          tweet.homeTimeline,
          tweet.newTweetContent,
          tweet.mediaType,
          tweet.mediaUrl,
        ],
      );
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
      content,
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
    };
    try {
      const result = await db.query(
        'INSERT INTO tweets (id, content, agent_id, scheduled_for, status, home_timeline, new_tweet_content, created_at, sent_at, error, prompt, media_type, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
        [
          tweet.id,
          tweet.content,
          tweet.agentId,
          tweet.scheduledFor,
          tweet.status,
          tweet.homeTimeline,
          tweet.newTweetContent,
          tweet.createdAt,
          tweet.sentAt,
          tweet.error,
          tweet.prompt,
          tweet.mediaType,
          tweet.mediaUrl,
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
