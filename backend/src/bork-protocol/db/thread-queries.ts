import { elizaLogger } from '@elizaos/core';
import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import type { PostedThread, ThreadPerformanceMetrics } from './thread-schema';

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
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export const threadQueries = {
  async savePostedThread(
    thread: Omit<PostedThread, 'id' | 'createdAt' | 'updatedAt'>,
    client?: PoolClient,
  ): Promise<PostedThread> {
    const query = `
      INSERT INTO posted_threads (
        id,
        agent_id,
        primary_topic,
        related_topics,
        thread_idea,
        unique_angle,
        engagement,
        performance_score,
        tweet_ids,
        used_knowledge,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const id = uuidv4();
    const values = [
      id,
      thread.agentId,
      thread.primaryTopic,
      thread.relatedTopics,
      thread.threadIdea,
      thread.uniqueAngle,
      JSON.stringify(thread.engagement),
      thread.performanceScore,
      thread.tweetIds,
      JSON.stringify(thread.usedKnowledge || []),
    ];

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query, values);
        return result.rows[0];
      });
    } catch (error) {
      elizaLogger.error('Error saving posted thread:', error);
      throw error;
    }
  },

  /**
   * Gets recently used knowledge from posted threads
   */
  async getRecentlyUsedKnowledge(
    timeframeHours = 168, // 1 week default
    client?: PoolClient,
  ): Promise<
    Array<{ content: string; source: { url: string; authorUsername: string } }>
  > {
    const query = `
      WITH flattened_knowledge AS (
        SELECT 
          jsonb_array_elements(used_knowledge) as knowledge_item
        FROM posted_threads
        WHERE created_at >= NOW() - INTERVAL '${timeframeHours} hours'
          AND used_knowledge IS NOT NULL
          AND jsonb_array_length(used_knowledge) > 0
      )
      SELECT DISTINCT
        knowledge_item->>'content' as content,
        knowledge_item->'source'->>'url' as url,
        knowledge_item->'source'->>'authorUsername' as author_username
      FROM flattened_knowledge
      WHERE knowledge_item->>'content' IS NOT NULL
        AND knowledge_item->'source'->>'url' IS NOT NULL
        AND knowledge_item->'source'->>'authorUsername' IS NOT NULL
      ORDER BY content
    `;

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query);
        return result.rows.map((row) => ({
          content: row.content,
          source: {
            url: row.url,
            authorUsername: row.author_username,
          },
        }));
      });
    } catch (error) {
      elizaLogger.error('Error getting recently used knowledge:', error);
      throw error;
    }
  },

  /**
   * Gets topic performance metrics from posted threads
   */
  async getTopicPerformance(
    topics: string[],
    client?: PoolClient,
  ): Promise<
    Array<{
      topic: string;
      totalThreads: number;
      avgEngagement: PostedThread['engagement'];
      performanceScore: number;
    }>
  > {
    const query = `
      WITH topic_metrics AS (
        SELECT 
          primary_topic as topic,
          COUNT(*) as total_threads,
          jsonb_build_object(
            'likes', AVG((engagement->>'likes')::numeric),
            'retweets', AVG((engagement->>'retweets')::numeric),
            'replies', AVG((engagement->>'replies')::numeric),
            'views', AVG((engagement->>'views')::numeric)
          ) as avg_engagement,
          AVG(performance_score) as avg_performance_score
        FROM posted_threads
        WHERE primary_topic = ANY($1)
        GROUP BY primary_topic
      )
      SELECT * FROM topic_metrics
      ORDER BY avg_performance_score DESC
    `;

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query, [topics]);
        return result.rows.map((row) => ({
          topic: row.topic,
          totalThreads: row.total_threads,
          avgEngagement: row.avg_engagement,
          performanceScore: row.avg_performance_score,
        }));
      });
    } catch (error) {
      elizaLogger.error('Error getting topic performance:', error);
      throw error;
    }
  },

  /**
   * Gets recent threads by topic
   */
  async getPostedThreadsByTopic(
    topic: string,
    limit = 10,
    client?: PoolClient,
  ): Promise<PostedThread[]> {
    const query = `
      SELECT *
      FROM posted_threads
      WHERE primary_topic = $1 
        OR $1 = ANY(related_topics)
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query, [topic, limit]);
        return result.rows;
      });
    } catch (error) {
      elizaLogger.error('Error getting posted threads by topic:', error);
      throw error;
    }
  },

  /**
   * Updates performance metrics for all threads by fetching the latest tweet data
   */
  async updateAllThreadPerformanceMetrics(client?: PoolClient): Promise<void> {
    const query = `
      WITH thread_metrics AS (
        -- Get the latest metrics for each thread by fetching actual tweet data
        SELECT 
          pt.id as thread_id,
          COALESCE(
            jsonb_build_object(
              'likes', SUM(COALESCE((t.likes), 0)),
              'retweets', SUM(COALESCE((t.retweets), 0)),
              'replies', SUM(COALESCE((t.replies), 0)),
              'views', SUM(COALESCE((t.views), 0))
            ),
            pt.engagement
          ) as current_engagement,
          -- Calculate performance score based on engagement
          (
            COALESCE(SUM(t.likes), 0) * 0.4 + 
            COALESCE(SUM(t.retweets), 0) * 0.3 + 
            COALESCE(SUM(t.replies), 0) * 0.3
          ) as calculated_score
        FROM 
          posted_threads pt
        LEFT JOIN 
          tweets t ON t.tweet_id = ANY(pt.tweet_ids)
        WHERE
          t.status = 'sent'
        GROUP BY 
          pt.id, pt.engagement
      )
      -- Update posted_threads with new metrics
      UPDATE posted_threads pt
      SET 
        engagement = tm.current_engagement,
        performance_score = CASE 
          WHEN tm.calculated_score > 0 THEN tm.calculated_score 
          ELSE pt.performance_score 
        END,
        updated_at = NOW()
      FROM 
        thread_metrics tm
      WHERE 
        pt.id = tm.thread_id
    `;

    try {
      await withClient(client || null, async (c) => {
        await c.query(query);
        elizaLogger.info('[ThreadQueries] Updated thread performance metrics');
      });
    } catch (error) {
      elizaLogger.error('Error updating thread performance metrics:', error);
      throw error;
    }
  },

  async updateThreadPerformanceMetrics(
    threadId: string,
    metrics: ThreadPerformanceMetrics,
    client?: PoolClient,
  ): Promise<void> {
    const query = `
      UPDATE posted_threads
      SET 
        engagement = $2::jsonb,
        performance_score = $3,
        updated_at = NOW()
      WHERE id = $1
    `;

    try {
      await withClient(client || null, async (c) => {
        await c.query(query, [
          threadId,
          JSON.stringify({
            likes: metrics.likes,
            retweets: metrics.retweets,
            replies: metrics.replies,
            views: metrics.views,
          }),
          metrics.performanceScore,
        ]);
      });
    } catch (error) {
      elizaLogger.error('Error updating thread performance metrics:', error);
      throw error;
    }
  },

  /**
   * Gets a thread by ID
   */
  async getThreadById(
    threadId: string,
    client?: PoolClient,
  ): Promise<PostedThread | null> {
    const query = `
      SELECT * FROM posted_threads WHERE id = $1
    `;

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query, [threadId]);
        return result.rows[0] || null;
      });
    } catch (error) {
      elizaLogger.error('Error getting thread by ID:', error);
      throw error;
    }
  },

  /**
   * Gets all threads for a given agent
   */
  async getThreadsByAgent(
    agentId: string,
    client?: PoolClient,
  ): Promise<PostedThread[]> {
    const query = `
      SELECT 
        id,
        agent_id,
        primary_topic,
        related_topics,
        thread_idea,
        unique_angle,
        engagement,
        performance_score,
        tweet_ids,
        used_knowledge,
        created_at,
        updated_at
      FROM posted_threads 
      WHERE agent_id = $1 
      ORDER BY created_at DESC
    `;

    try {
      return withClient(client || null, async (c) => {
        const result = await c.query(query, [agentId]);
        return result.rows.map((row) => ({
          id: row.id,
          agentId: row.agent_id,
          primaryTopic: row.primary_topic,
          relatedTopics: row.related_topics || [],
          threadIdea: row.thread_idea,
          uniqueAngle: row.unique_angle,
          engagement: row.engagement,
          performanceScore: row.performance_score,
          tweetIds: Array.isArray(row.tweet_ids) ? row.tweet_ids : [],
          usedKnowledge: row.used_knowledge || [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      });
    } catch (error) {
      elizaLogger.error('Error getting threads by agent:', error);
      throw error;
    }
  },
};
