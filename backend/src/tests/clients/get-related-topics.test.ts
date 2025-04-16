import { db } from '@/db';
import { topicRelationshipTemplate } from '@/templates/topic-relationship';
import {
  type TopicRelationshipAnalysis,
  topicRelationshipSchema,
} from '@/types/response/topic-relationship';
import { selectTopic } from '@/utils/selection/select-topic';
import { getAggregatedTopicWeights } from '@/utils/topic-weights/topics';
import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Test constants
const TEST_TIMEFRAME_HOURS = 168; // 1 week
const PREFERRED_TOPIC = 'crypto';

export async function testGetRelatedTopics(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting topic selection test');

  // 1. Get aggregated topic weights
  const topicWeights = await getAggregatedTopicWeights(TEST_TIMEFRAME_HOURS);
  elizaLogger.info('[Test] Aggregated topic weights:', {
    timeframe: TEST_TIMEFRAME_HOURS,
    topics: topicWeights.map((tw) => ({
      topic: tw.topic,
      weight: tw.weight,
    })),
  });

  // 2. Analyze topic relationships with detailed logging
  const availableTopics = topicWeights.map((tw) => tw.topic);
  elizaLogger.info('[Test] Starting topic relationship analysis:', {
    availableTopics,
    preferredTopic: PREFERRED_TOPIC,
  });

  try {
    // 2.1 Create template
    const template = topicRelationshipTemplate({
      preferredTopic: PREFERRED_TOPIC,
      availableTopics,
    });
    elizaLogger.info('[Test] Created topic relationship template');

    // 2.2 Compose state
    const state = await runtime.composeState(
      {
        content: {
          text: `Analyzing relationship between ${PREFERRED_TOPIC} and ${availableTopics.length} topics`,
          preferredTopic: PREFERRED_TOPIC,
          availableTopics,
        },
        agentId: runtime.agentId,
        userId: uuidv4(),
        roomId: uuidv4(),
      } as Memory,
      {
        currentAnalysis: {
          preferredTopic: PREFERRED_TOPIC,
          topicCount: availableTopics.length,
        },
      },
    );
    elizaLogger.info('[Test] Composed state for analysis');

    // 2.3 Create context
    const context = composeContext({
      state,
      template: template.context,
    });
    elizaLogger.info('[Test] Created context for analysis');

    // 2.4 Generate analysis using small model
    elizaLogger.info('[Test] Starting generateObject call with small model');
    const startTime = Date.now();
    const { object } = await generateObject({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
      schema: topicRelationshipSchema,
    });
    const endTime = Date.now();
    elizaLogger.info('[Test] Completed generateObject call', {
      duration: endTime - startTime,
    });

    const analysis = object as TopicRelationshipAnalysis;
    elizaLogger.info('[Test] Topic relationship analysis results:', {
      preferredTopic: PREFERRED_TOPIC,
      relatedTopics: analysis.relatedTopics.map((rt) => ({
        topic: rt.topic,
        relevanceScore: rt.relevanceScore,
        relationshipType: rt.relationshipType,
      })),
      confidence: analysis.analysisMetadata.confidence,
    });

    // 3. Select a topic using the full selection logic
    elizaLogger.info('[Test] Starting topic selection');
    const selectedTopics = await selectTopic(
      runtime,
      TEST_TIMEFRAME_HOURS,
      PREFERRED_TOPIC,
    );

    if (selectedTopics.length === 0) {
      throw new Error('No topics were selected');
    }

    const selectedTopic = selectedTopics[0]; // Get the first selected topic
    elizaLogger.info('[Test] Selected topic:', {
      topic: selectedTopic.topic,
      weight: selectedTopic.weight,
    });

    return {
      topicWeights,
      analysis,
      selectedTopic,
    };
  } catch (error) {
    elizaLogger.error('[Test] Error in topic selection test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      phase: 'topic relationship analysis',
    });
    throw error;
  }
}

export async function testTopicWeight() {
  elizaLogger.info('[Test] Starting topic weight test');

  try {
    // First, check raw weights from the table
    const rawResult = await db.query(
      'SELECT topic, weight, created_at FROM topic_weights',
    );
    elizaLogger.info('[Test] Raw topic weights from table:', {
      count: rawResult.rows.length,
      rows: rawResult.rows,
    });

    // Try a simpler aggregation query first
    const simpleQuery = `
      SELECT 
        topic,
        AVG(weight) as weight,
        COUNT(*) as mention_count,
        MAX(created_at) as latest_update
      FROM topic_weights
      WHERE created_at >= NOW() - INTERVAL '${TEST_TIMEFRAME_HOURS} hours'
      GROUP BY topic
      ORDER BY weight DESC
    `;

    elizaLogger.info('[Test] Running simple aggregation query:', {
      query: simpleQuery,
    });
    const simpleResult = await db.query(simpleQuery);
    elizaLogger.info('[Test] Simple aggregation results:', {
      count: simpleResult.rows.length,
      rows: simpleResult.rows,
    });

    // Now try the full aggregated weights
    const topicWeights = await getAggregatedTopicWeights(TEST_TIMEFRAME_HOURS);

    elizaLogger.info('[Test] Full aggregated topic weights:', {
      timeframe: TEST_TIMEFRAME_HOURS,
      count: topicWeights.length,
      topics: topicWeights,
    });

    return {
      rawWeights: rawResult.rows,
      simpleWeights: simpleResult.rows,
      aggregatedWeights: topicWeights,
    };
  } catch (error) {
    elizaLogger.error('[Test] Error fetching topic weights:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
