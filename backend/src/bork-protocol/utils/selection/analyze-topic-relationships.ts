import { topicRelationshipTemplate } from '@/templates/topic-relationship';
import {
  type TopicRelationshipAnalysis,
  topicRelationshipSchema,
} from '@/types/response/topic-relationship';
import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analyzes a list of topics to find relationships with a preferred topic
 * Uses a small model to determine semantic relationships and relevance scores
 */
export async function analyzeTopicRelationships(
  runtime: IAgentRuntime,
  availableTopics: string[],
  preferredTopic: string,
): Promise<TopicRelationshipAnalysis> {
  try {
    const template = topicRelationshipTemplate({
      preferredTopic,
      availableTopics,
    });

    const state = await runtime.composeState(
      {
        content: {
          text: `Analyzing relationship between ${preferredTopic} and ${availableTopics.length} topics`,
          preferredTopic,
          availableTopics,
        },
        agentId: runtime.agentId,
        userId: uuidv4(),
        roomId: uuidv4(),
      } as Memory,
      {
        currentAnalysis: {
          preferredTopic,
          topicCount: availableTopics.length,
        },
      },
    );

    const context = composeContext({
      state,
      template: template.context,
    });

    const { object } = await generateObject({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
      schema: topicRelationshipSchema,
    });

    const analysis = object as TopicRelationshipAnalysis;

    elizaLogger.info('[Topic Analysis] Related topics:', {
      relatedTopics: analysis.relatedTopics,
    });

    return analysis;
  } catch (error) {
    elizaLogger.error('[Topic Analysis] Error analyzing topic relationships:', {
      error: error instanceof Error ? error.message : String(error),
      preferredTopic,
    });
    throw error;
  }
}
