import type { MessageRequest } from '@api/message/message-request';
import { messageHandlerTemplate } from '@eliza/base-templates';
import {
  type Content,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  stringToUuid,
} from '@elizaos/core';

export class MessageService {
  private readonly agents: Map<string, IAgentRuntime>;

  constructor(agents: Map<string, IAgentRuntime>) {
    this.agents = agents;
  }

  public async handleMessage(request: MessageRequest): Promise<Response> {
    try {
      elizaLogger.info('[MessageService] Starting message handling');
      const { agentId } = request;

      const agent = this.agents.get(agentId);
      if (!agent) {
        elizaLogger.error(
          `[MessageService] Agent not found for ID/name: ${agentId}`,
        );
        return Response.json({ error: 'Agent not found' }, { status: 404 });
      }

      const roomId = stringToUuid(request.roomId ?? `default-room-${agentId}`);
      const userId =
        request.userId as `${string}-${string}-${string}-${string}-${string}`;

      await agent.ensureConnection(
        userId,
        roomId,
        request.userName,
        request.name,
        'direct',
      );

      const text = request.text;
      if (!text) {
        return Response.json([]);
      }

      const messageId = stringToUuid(Date.now().toString());
      const content: Content = {
        text,
        attachments: [],
        source: 'direct',
        inReplyTo: undefined,
      };
      const userMessage = {
        content,
        userId,
        roomId,
        agentId: agent.agentId,
      };
      const memory: Memory = {
        id: stringToUuid(`${messageId}-${userId}`),
        ...userMessage,
        agentId: agent.agentId,
        userId,
        roomId,
        content,
      };
      await agent.messageManager.addEmbeddingToMemory(memory);
      await agent.messageManager.createMemory(memory);

      // Fetch relevant knowledge using the message embedding
      let knowledgeContent = '';
      if (memory.embedding) {
        try {
          const relevantKnowledge = await agent.databaseAdapter.searchKnowledge(
            {
              agentId: agent.agentId,
              embedding:
                memory.embedding instanceof Float32Array
                  ? memory.embedding
                  : new Float32Array(memory.embedding),
              match_threshold: 0.7,
              match_count: 5,
              searchText: text,
            },
          );

          if (relevantKnowledge.length > 0) {
            knowledgeContent = relevantKnowledge
              .map((k) => {
                const metadata = k.content.metadata || {};
                return `- ${k.content.text}
Type: ${metadata.type || 'unknown'}
Confidence: ${metadata.confidence || 'unknown'}
Similarity: ${(k.similarity || 0).toFixed(2)}
Topics: ${Array.isArray(metadata.topics) ? metadata.topics.join(', ') : 'none'}
Impact Score: ${metadata.impactScore || 'unknown'}`;
              })
              .join('\n\n');
          }
        } catch (error) {
          elizaLogger.error(
            '[MessageService] Error fetching knowledge:',
            error,
          );
        }
      }

      let state: State | undefined;
      try {
        state = await agent.composeState(userMessage, {
          agentName: agent.character.name,
        });

        // Add knowledge to state after composition
        if (state && knowledgeContent) {
          state.knowledge = knowledgeContent;
          elizaLogger.debug('[MessageService] Added knowledge to state:', {
            knowledgeLength: knowledgeContent.length,
            stateHasKnowledge: 'knowledge' in state,
          });
        }
      } catch (error) {
        elizaLogger.error('[MessageService] Error composing state:', error);
        return Response.json(
          { error: 'Failed to compose state' },
          { status: 500 },
        );
      }

      if (!state) {
        return Response.json(
          { error: 'Failed to compose state' },
          { status: 500 },
        );
      }

      const context = composeContext({
        state,
        template: messageHandlerTemplate,
        templatingEngine: 'handlebars',
      });

      const response = await generateMessageResponse({
        runtime: agent,
        context,
        modelClass: ModelClass.SMALL,
      });

      if (!response) {
        return Response.json(
          { error: 'No response generated' },
          { status: 500 },
        );
      }

      // save response to memory
      const responseMessage: Memory = {
        id: stringToUuid(`${messageId}-${agent.agentId}`),
        ...userMessage,
        userId: agent.agentId,
        content: response,
        createdAt: Date.now(),
      };

      // Generate embedding for the response
      await agent.messageManager.addEmbeddingToMemory(responseMessage);
      await agent.messageManager.createMemory(responseMessage);

      state = await agent.updateRecentMessageState(state);

      let message = null as Content | null;
      await agent.processActions(
        memory,
        [responseMessage],
        state,
        async (newMessages) => {
          message = newMessages;
          return [memory];
        },
      );

      await agent.evaluate(memory, state);

      const responseContent = message ? [message] : [response];
      return Response.json(responseContent);
    } catch (error) {
      elizaLogger.error('[MessageService] Error in handleMessage:', error);
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        { status: 500 },
      );
    }
  }
}
