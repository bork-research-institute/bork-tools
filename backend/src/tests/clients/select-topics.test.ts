import { expect } from 'bun:test';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { vi } from 'vitest';
import * as topicRelationshipsModule from '../../bork-protocol/utils/generate-ai-object/generate-related-topics';
import { selectTopic } from '../../bork-protocol/utils/selection/select-topic';
import * as topicWeightsModule from '../../bork-protocol/utils/topic-weights/topics';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockTopicRelationships } from '../mock-data/topic-relationships';

const TEST_TIMEFRAME_HOURS = 24;

export async function testSelectTopics(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting topic selection test');

  try {
    // Mock the dependencies
    const getAggregatedWeightsSpy = vi
      .spyOn(topicWeightsModule, 'getAggregatedTopicWeights')
      .mockResolvedValue(mockTopicWeights);

    const analyzeTopicRelationshipsSpy = vi
      .spyOn(topicRelationshipsModule, 'analyzeTopicRelationships')
      .mockResolvedValue(mockTopicRelationships);

    // Test 1: Basic topic selection without preferred topic
    const basicResult = await selectTopic(runtime);
    elizaLogger.info('[Test] Basic topic selection result:', {
      selectedTopic: basicResult.topic,
      weight: basicResult.weight,
      originalWeight: mockTopicWeights.find(
        (tw) => tw.topic === basicResult.topic,
      )?.weight,
      engagementMetrics: mockTopicWeights.find(
        (tw) => tw.topic === basicResult.topic,
      )?.engagement_metrics,
    });

    // Test 2: Topic selection with preferred topic
    const preferredTopic = 'cryptocurrency';
    const preferredResult = await selectTopic(
      runtime,
      TEST_TIMEFRAME_HOURS,
      preferredTopic,
    );
    elizaLogger.info('[Test] Preferred topic selection result:', {
      preferredTopic,
      selectedTopic: preferredResult.topic,
      weight: preferredResult.weight,
      originalWeight: mockTopicWeights.find(
        (tw) => tw.topic === preferredResult.topic,
      )?.weight,
      engagementMetrics: mockTopicWeights.find(
        (tw) => tw.topic === preferredResult.topic,
      )?.engagement_metrics,
      relationships: mockTopicRelationships.relatedTopics.filter(
        (rt) => rt.topic === preferredResult.topic,
      ),
    });

    // Verify the mocks were called correctly
    expect(getAggregatedWeightsSpy).toHaveBeenCalledWith(TEST_TIMEFRAME_HOURS);
    expect(analyzeTopicRelationshipsSpy).toHaveBeenCalledWith(
      runtime,
      mockTopicWeights.map((tw) => tw.topic),
      preferredTopic,
    );

    // Log detailed weight analysis
    const selectedTopic = preferredResult.topic;
    const originalWeight =
      mockTopicWeights.find((tw) => tw.topic === selectedTopic)?.weight || 0;
    const relationship = mockTopicRelationships.relatedTopics.find(
      (rt) => rt.topic === selectedTopic,
    );

    if (relationship) {
      const baseWeight = originalWeight * 0.3;
      const relationshipWeight = relationship.relevanceScore * 0.5;
      const confidenceWeight =
        mockTopicRelationships.analysisMetadata.confidence * 0.2;
      const expectedAdjustedWeight =
        baseWeight + relationshipWeight + confidenceWeight;

      elizaLogger.info('[Test] Weight Adjustment Calculation:', {
        topic: selectedTopic,
        originalWeight,
        calculation: {
          baseWeight: `${originalWeight} * 0.3 = ${baseWeight.toFixed(3)}`,
          relationshipWeight: `${relationship.relevanceScore} * 0.5 = ${relationshipWeight.toFixed(3)}`,
          confidenceWeight: `${mockTopicRelationships.analysisMetadata.confidence} * 0.2 = ${confidenceWeight.toFixed(3)}`,
          total: `${baseWeight.toFixed(3)} + ${relationshipWeight.toFixed(3)} + ${confidenceWeight.toFixed(3)} = ${expectedAdjustedWeight.toFixed(3)}`,
        },
        actualWeight: preferredResult.weight,
      });

      expect(preferredResult.weight).toBeCloseTo(expectedAdjustedWeight, 2);
    }

    return {
      basicSelection: basicResult,
      preferredSelection: preferredResult,
      mockTopicWeights,
      mockRelationships: mockTopicRelationships,
    };
  } catch (error) {
    elizaLogger.error('[Test] Error in topic selection test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
