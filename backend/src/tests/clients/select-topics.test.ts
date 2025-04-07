import { describe, expect, it } from 'bun:test';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { TEST_FLAGS } from '../config/test-config';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { testSelectTopics } from '../utils/topic-selection-test-utils';

// Only run the test suite if enabled in config
if (TEST_FLAGS.TOPIC_SELECTION) {
  describe('Topic Selection', () => {
    const mockRuntime = {
      // Add minimal mock implementation of IAgentRuntime
    } as IAgentRuntime;

    it('should select topics with and without preferences', async () => {
      const results = await testSelectTopics(mockRuntime);

      // Basic assertions
      expect(results.basicSelection).toBeDefined();
      expect(results.preferredSelection).toBeDefined();
      expect(results.mockTopicWeights.length).toBeGreaterThan(0);
      expect(results.mockRelationships.relatedTopics.length).toBeGreaterThan(0);

      // Verify basic selection is from available topics
      expect(mockTopicWeights.map((tw) => tw.topic)).toContain(
        results.basicSelection.topic,
      );
      const selectedBasicTopic = mockTopicWeights.find(
        (tw) => tw.topic === results.basicSelection.topic,
      );
      expect(selectedBasicTopic).toBeDefined();

      // Verify preferred selection follows weight adjustment rules
      const selectedPreferredTopic = mockTopicWeights.find(
        (tw) => tw.topic === results.preferredSelection.topic,
      );
      expect(selectedPreferredTopic).toBeDefined();

      // Verify the selected topic has high engagement metrics
      if (selectedPreferredTopic) {
        const metrics = selectedPreferredTopic.engagement_metrics;
        expect(metrics.virality).toBeGreaterThanOrEqual(0.5);
        expect(metrics.thoughtLeadership).toBeGreaterThanOrEqual(0.4);
        expect(metrics.communityBuilding).toBeGreaterThanOrEqual(0.5);
      }

      // Verify the selected topic has good relationship scores
      const relationship = results.mockRelationships.relatedTopics.find(
        (rt) => rt.topic === results.preferredSelection.topic,
      );
      if (relationship) {
        expect(relationship.relevanceScore).toBeGreaterThanOrEqual(0.4);
        expect(['direct', 'strong', 'moderate']).toContain(
          relationship.relationshipType,
        );
      }
    });
  });
} else {
  describe('Topic Selection', () => {
    it('skipped - disabled in config', () => {
      elizaLogger.info(
        '[Test] Skipping Topic Selection tests - disabled in config',
      );
    });
  });
}
