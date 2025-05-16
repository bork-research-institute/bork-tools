import { elizaLogger } from '@elizaos/core';
import type { RAGKnowledgeItem } from '@elizaos/core';
import { db } from './index';
import type {
  CountRow,
  KnowledgeRow,
  MatchCheckRow,
  StructureRow,
  TableCheckRow,
} from './schema';

// Helper function to execute queries with the pool
async function executeQuery<T extends Record<string, unknown>>(
  query: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = await db;
  const result = await pool.query(query, params);
  return result.rows;
}

export const knowledgeQueries = {
  /**
   * Debug function to inspect knowledge table contents
   */
  async debugKnowledgeTable(agentId: string): Promise<void> {
    try {
      // First check if the table exists
      const tableCheck = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'knowledge'
        );
      `;
      const tableExists = await executeQuery<TableCheckRow>(tableCheck);

      elizaLogger.debug('[KnowledgeQueries] Knowledge table check:', {
        exists: tableExists[0]?.exists === true,
      });

      if (!tableExists[0]?.exists) {
        elizaLogger.error('[KnowledgeQueries] Knowledge table does not exist!');
        return;
      }

      // Get total count
      const countQuery = `
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "agentId" = $1)::int as agent_count,
          COUNT(*) FILTER (WHERE "isShared" = true)::int as shared_count
        FROM knowledge;
      `;
      const countResult = await executeQuery<CountRow>(countQuery, [agentId]);

      elizaLogger.debug('[KnowledgeQueries] Knowledge table counts:', {
        total: Number(countResult[0]?.total || 0),
        agentCount: Number(countResult[0]?.agent_count || 0),
        sharedCount: Number(countResult[0]?.shared_count || 0),
      });

      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'knowledge';
      `;
      const structureResult = await executeQuery<StructureRow>(structureQuery);

      elizaLogger.debug('[KnowledgeQueries] Knowledge table structure:', {
        columns: structureResult,
      });

      // Get sample rows
      const query = `
        SELECT 
          id,
          "agentId",
          "isShared",
          "createdAt",
          content,
          content->>'text' as text_content,
          content#>>'{mainContent}' as main_content,
          content#>>'{metadata}' as metadata,
          pg_column_size(content) as content_size
        FROM knowledge 
        WHERE "agentId" = $1 OR "isShared" = true
        ORDER BY "createdAt" DESC
        LIMIT 5
      `;

      const result = await executeQuery<KnowledgeRow>(query, [agentId]);

      elizaLogger.debug('[KnowledgeQueries] Knowledge table sample:', {
        sampleSize: result.length,
        samples: result.map((row) => ({
          id: row.id,
          agentId: row.agentId,
          isShared: row.isShared,
          createdAt: row.createdAt,
          contentSize: row.content_size,
          hasContent: row.content !== null,
          contentPaths: row.content ? Object.keys(row.content) : [],
          textSample: row.text_content?.substring(0, 100),
          mainContentSample: row.main_content?.substring(0, 100),
          metadataSample: row.metadata?.substring(0, 100),
        })),
      });

      // Check content structure variations
      if (result.length > 0) {
        const contentStructures = result
          .filter((row) => row.content)
          .map((row) => ({
            hasText: typeof row.content.text === 'string',
            hasMainContent: typeof row.content.mainContent === 'string',
            textType: typeof row.content.text,
            mainContentType: typeof row.content.mainContent,
            topLevelKeys: Object.keys(row.content),
          }));

        elizaLogger.debug('[KnowledgeQueries] Content structure variations:', {
          structures: contentStructures,
        });
      }
    } catch (error) {
      elizaLogger.error('[KnowledgeQueries] Error debugging knowledge table:', {
        error: error instanceof Error ? error.message : String(error),
        agentId,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },

  /**
   * Search for knowledge items using keyword matching in the content
   */
  async searchKnowledgeByKeywords(params: {
    agentId: string;
    topic: string;
    limit?: number;
  }): Promise<RAGKnowledgeItem[]> {
    try {
      // First, let's check if there's any data in the knowledge table
      const checkQuery = `SELECT COUNT(*)::int as count FROM knowledge WHERE "agentId" = $1 OR "isShared" = true`;
      const checkResult = await executeQuery<{ count: number }>(checkQuery, [
        params.agentId,
      ]);

      elizaLogger.debug('[KnowledgeQueries] Knowledge table stats:', {
        totalCount: Number(checkResult[0]?.count || 0),
        agentId: params.agentId,
      });

      // If no data, return early
      if (!Number(checkResult[0]?.count || 0)) {
        elizaLogger.warn(
          '[KnowledgeQueries] No knowledge data found for agent:',
          params.agentId,
        );
        return [];
      }

      // Debug: Check for any rows that might match our search term directly
      const searchTerm = params.topic.toLowerCase();
      const directCheckQuery = `
        SELECT 
          id, 
          "agentId",
          "isShared",
          content::text as raw_content
        FROM knowledge 
        WHERE ("agentId" = $1 OR "isShared" = true)
        AND (
          LOWER(content::text) LIKE $2
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(content->'metadata'->'topics') as topic 
            WHERE LOWER(topic) LIKE $2
          )
        )
        LIMIT 5
      `;

      elizaLogger.debug('[KnowledgeQueries] Direct check for topic:', {
        topic: params.topic,
        pattern: `%${searchTerm}%`,
      });

      const directCheckResult = await executeQuery<KnowledgeRow>(
        directCheckQuery,
        [params.agentId, `%${searchTerm}%`],
      );

      elizaLogger.debug('[KnowledgeQueries] Direct check found:', {
        count: directCheckResult.length,
        firstItem: directCheckResult[0]
          ? {
              id: directCheckResult[0].id,
              contentPreview: directCheckResult[0].raw_content?.substring(
                0,
                100,
              ),
            }
          : null,
      });

      // Split topic into words and create search conditions
      const searchWords = params.topic.toLowerCase().split(/\s+/);

      // Create the base query - search in all possible content locations
      const query = `
        WITH ranked_results AS (
          SELECT 
            k.*,
            -- Exact match gets highest score (3 points per match)
            (CASE 
              WHEN LOWER(k.content::text) LIKE $1 THEN 3
              ELSE 0
            END +
            CASE 
              WHEN LOWER(k.content->>'text') LIKE $1 THEN 3
              ELSE 0
            END +
            CASE 
              WHEN LOWER(k.content#>>'{mainContent}') LIKE $1 THEN 3
              ELSE 0
            END +
            -- Topic and entity matches get high score (4 points per match)
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'topics') as topic 
                WHERE LOWER(topic) LIKE $1
              ) THEN 4
              ELSE 0
            END +
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'entities') as entity
                WHERE LOWER(entity) LIKE $1
              ) THEN 4
              ELSE 0
            END +
            -- Partial word matches get lower scores (1 point per match)
            ${searchWords
              .map(
                (_, idx) => `
              CASE 
                WHEN LOWER(k.content::text) LIKE $${idx + 2} THEN 1
                ELSE 0
              END +
              CASE 
                WHEN LOWER(k.content->>'text') LIKE $${idx + 2} THEN 1
                ELSE 0
              END +
              CASE 
                WHEN LOWER(k.content#>>'{mainContent}') LIKE $${idx + 2} THEN 1
                ELSE 0
              END +
              CASE 
                WHEN EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'topics') as topic 
                  WHERE LOWER(topic) LIKE $${idx + 2}
                ) THEN 2
                ELSE 0
              END +
              CASE 
                WHEN EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'entities') as entity
                  WHERE LOWER(entity) LIKE $${idx + 2}
                ) THEN 2
                ELSE 0
              END
            `,
              )
              .join(' + ')}) as match_score
          FROM knowledge k
          WHERE 
            (k."agentId" = $${searchWords.length + 2} OR k."isShared" = true)
            AND (
              LOWER(k.content::text) LIKE $1
              OR LOWER(k.content->>'text') LIKE $1
              OR LOWER(k.content#>>'{mainContent}') LIKE $1
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'topics') as topic 
                WHERE LOWER(topic) LIKE $1
              )
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'entities') as entity
                WHERE LOWER(entity) LIKE $1
              )
              ${searchWords
                .map(
                  (_, idx) => `
                OR LOWER(k.content::text) LIKE $${idx + 2}
                OR LOWER(k.content->>'text') LIKE $${idx + 2}
                OR LOWER(k.content#>>'{mainContent}') LIKE $${idx + 2}
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'topics') as topic 
                  WHERE LOWER(topic) LIKE $${idx + 2}
                )
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(k.content->'metadata'->'entities') as entity
                  WHERE LOWER(entity) LIKE $${idx + 2}
                )
              `,
                )
                .join('\n')}
            )
        )
        SELECT 
          k.*,
          k.match_score,
          k.content::text as raw_content,
          k.content->>'text' as text_content,
          k.content#>>'{mainContent}' as main_content
        FROM ranked_results k
        WHERE k.match_score > 0
        ORDER BY k.match_score DESC, k."createdAt" DESC NULLS LAST
        LIMIT $${searchWords.length + 3}
      `;

      // Prepare query parameters
      const exactMatchPattern = `%${params.topic.toLowerCase()}%`;
      const wordPatterns = searchWords.map((word) => `%${word}%`);
      const queryParams = [
        exactMatchPattern,
        ...wordPatterns,
        params.agentId,
        params.limit || 25,
      ];

      elizaLogger.debug('[KnowledgeQueries] Executing keyword search:', {
        topic: params.topic,
        searchWords,
        agentId: params.agentId,
        limit: params.limit,
        query: query.replace(/\s+/g, ' ').trim(),
        params: queryParams,
      });

      const result = await executeQuery<KnowledgeRow>(query, queryParams);

      // Log the first result's content for debugging
      if (result[0]) {
        elizaLogger.debug('[KnowledgeQueries] First result content:', {
          id: result[0].id,
          matchScore: result[0].match_score,
          rawContent: result[0].raw_content?.substring(0, 200),
          textContent: result[0].text_content?.substring(0, 200),
          mainContent: result[0].main_content?.substring(0, 200),
          content:
            typeof result[0].content === 'object'
              ? JSON.stringify(result[0].content).substring(0, 200)
              : 'not an object',
        });

        // Add explicit check for topics and entities
        try {
          const topics = result[0].content?.metadata?.topics;
          const entities = result[0].content?.metadata?.entities;

          elizaLogger.debug('[KnowledgeQueries] First result metadata:', {
            hasTopics: Array.isArray(topics),
            topicsCount: Array.isArray(topics) ? topics.length : 0,
            topics: Array.isArray(topics) ? topics : [],
            hasEntities: Array.isArray(entities),
            entitiesCount: Array.isArray(entities) ? entities.length : 0,
            entities: Array.isArray(entities) ? entities : [],
          });
        } catch (metadataError) {
          elizaLogger.error('[KnowledgeQueries] Error parsing metadata:', {
            error:
              metadataError instanceof Error
                ? metadataError.message
                : String(metadataError),
          });
        }
      } else {
        // If no results, let's do a debug query to see what's in the table
        const debugQuery = `
          SELECT 
            id, 
            "agentId",
            "isShared",
            content::text as raw_content,
            content->>'text' as text_content,
            content#>>'{mainContent}' as main_content
          FROM knowledge 
          WHERE "agentId" = $1 OR "isShared" = true 
          LIMIT 1
        `;
        const debugResult = await executeQuery<KnowledgeRow>(debugQuery, [
          params.agentId,
        ]);

        if (debugResult[0]) {
          elizaLogger.debug('[KnowledgeQueries] Sample knowledge item:', {
            id: debugResult[0].id,
            agentId: debugResult[0].agentId,
            isShared: debugResult[0].isShared,
            rawContent: debugResult[0].raw_content?.substring(0, 200),
            textContent: debugResult[0].text_content?.substring(0, 200),
            mainContent: debugResult[0].main_content?.substring(0, 200),
          });
        }
      }

      elizaLogger.debug('[KnowledgeQueries] Search results:', {
        topic: params.topic,
        resultCount: result.length,
        firstRow: result[0]
          ? {
              id: result[0].id,
              matchScore: result[0].match_score,
              createdAt: result[0].createdAt,
            }
          : null,
      });

      return result.map((row) => ({
        id: row.id as `${string}-${string}-${string}-${string}-${string}`,
        agentId:
          row.agentId as `${string}-${string}-${string}-${string}-${string}`,
        isShared: row.isShared,
        createdAt: row.createdAt.getTime(),
        content: {
          text: row.content.text || row.content.mainContent || '',
          metadata: {
            ...row.content.metadata,
            isMain: true,
            isShared: row.isShared,
            type: 'knowledge',
          },
        },
        similarity: row.match_score
          ? row.match_score / ((searchWords.length + 1) * 9)
          : 0,
      }));
    } catch (error) {
      elizaLogger.error('[KnowledgeQueries] Error in keyword search:', {
        error: error instanceof Error ? error.message : String(error),
        topic: params.topic,
        agentId: params.agentId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  },

  /**
   * Debug function to directly check content for a given topic or keyword
   */
  async checkContentForTopic(params: {
    agentId: string;
    topic: string;
  }): Promise<void> {
    try {
      elizaLogger.debug(
        `[KnowledgeQueries] Checking content for topic "${params.topic}"...`,
      );

      // Check what fields are available in the content structure
      const structureQuery = `
        SELECT 
          id,
          "agentId",
          "isShared",
          content,
          content->>'text' as text_field,
          content->'metadata'->'topics' as topics_field,
          content->'metadata'->'entities' as entities_field,
          content#>>'{metadata,originalText}' as original_text
        FROM knowledge 
        WHERE ("agentId" = $1 OR "isShared" = true)
        LIMIT 5
      `;

      const structureResults = await executeQuery<KnowledgeRow>(
        structureQuery,
        [params.agentId],
      );

      if (structureResults.length > 0) {
        elizaLogger.debug(
          `[KnowledgeQueries] Found ${structureResults.length} knowledge items to analyze`,
        );

        for (const [index, row] of structureResults.entries()) {
          const contentKeys =
            typeof row.content === 'object'
              ? Object.keys(row.content)
              : typeof row.content === 'string'
                ? ['content is string']
                : ['content is null/undefined'];

          const metadataKeys =
            typeof row.content?.metadata === 'object'
              ? Object.keys(row.content.metadata)
              : ['metadata not accessible'];

          elizaLogger.debug(`[KnowledgeQueries] Item ${index + 1} structure:`, {
            id: row.id,
            agentId: row.agentId,
            isShared: row.isShared,
            contentKeys,
            metadataKeys,
            hasTextField: row.text_content !== null,
            hasTopicsField: row.content?.metadata?.topics !== null,
            hasEntitiesField: row.content?.metadata?.entities !== null,
            hasOriginalText: row.content?.metadata?.originalText !== null,
            topicsType:
              row.content?.metadata?.topics !== null
                ? Array.isArray(row.content.metadata.topics)
                  ? 'array'
                  : typeof row.content.metadata.topics
                : 'null',
            entitiesType:
              row.content?.metadata?.entities !== null
                ? Array.isArray(row.content.metadata.entities)
                  ? 'array'
                  : typeof row.content.metadata.entities
                : 'null',
          });

          // Now check if this item matches our topic
          const searchQuery = `
            SELECT
              CASE WHEN LOWER(content->>'text') LIKE $2 THEN true ELSE false END as text_matches,
              CASE WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(content->'metadata'->'topics') as topic 
                WHERE LOWER(topic) LIKE $2
              ) THEN true ELSE false END as topics_match,
              CASE WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(content->'metadata'->'entities') as entity
                WHERE LOWER(entity) LIKE $2
              ) THEN true ELSE false END as entities_match
            FROM knowledge
            WHERE id = $1
          `;

          const matchResults = await executeQuery<MatchCheckRow>(searchQuery, [
            row.id,
            `%${params.topic.toLowerCase()}%`,
          ]);

          if (matchResults.length > 0) {
            elizaLogger.debug(
              `[KnowledgeQueries] Match check for topic "${params.topic}" on item ${row.id}:`,
              {
                textMatches: matchResults[0].text_matches,
                topicsMatch: matchResults[0].topics_match,
                entitiesMatch: matchResults[0].entities_match,
              },
            );
          }
        }
      } else {
        elizaLogger.warn(
          `[KnowledgeQueries] No knowledge items found for agent ${params.agentId}`,
        );
      }
    } catch (error) {
      elizaLogger.error(
        '[KnowledgeQueries] Error checking content structure:',
        {
          error: error instanceof Error ? error.message : String(error),
          topic: params.topic,
          agentId: params.agentId,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  },
};
