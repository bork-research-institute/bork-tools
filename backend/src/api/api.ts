import {
  type Character,
  type Content,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  getEmbeddingZeroVector,
  stringToUuid,
} from '@elizaos/core';
import { Elysia } from 'elysia';
import { messageHandlerTemplate } from '../templates/base-templates';
import type { MessageRequest } from '../types/requests/message-request';

export class ApiClient {
  public app: Elysia;
  private agents: Map<string, IAgentRuntime>;
  public server: ReturnType<Elysia['listen']> | null = null;
  public startAgent: ((character: Character) => Promise<IAgentRuntime>) | null =
    null;
  public loadCharacterTryPath: ((path: string) => Promise<Character>) | null =
    null;
  public jsonToCharacter: ((json: unknown) => Character) | null = null;
  private isInitialized = false;

  constructor() {
    this.app = new Elysia()
      .onRequest(({ set }) => {
        // Add CORS headers to all responses
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] =
          'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] =
          'Content-Type, Authorization';
      })
      .options('*', () => new Response(null, { status: 204 }));
    this.agents = new Map();
    this.setupRoutes();

    // Set up lifecycle hooks
    this.app.onStart(({ server }) => {
      elizaLogger.info(`[ApiClient] Running at ${server?.url}:${server?.port}`);
      if (!this.isInitialized) {
        this.isInitialized = true;
      }
    });

    this.app.onStop(async () => {
      elizaLogger.info('[ApiClient] Stopping...');
      try {
        // Close all agent connections
        this.agents.clear();
        this.isInitialized = false;
        elizaLogger.info('[ApiClient] Stopped successfully');
      } catch (error) {
        elizaLogger.error('[ApiClient] Error during shutdown:', error);
        throw error;
      }
    });
  }

  private setupRoutes() {
    // Legacy route for backward compatibility
    this.app.post('/:agentId/message', async ({ params, body }) => {
      try {
        elizaLogger.info(
          `[ApiClient] Legacy message endpoint called for agent ${params.agentId}`,
        );
        const requestBody = body as MessageRequest;
        requestBody.agentId = params.agentId; // Ensure agentId is set from URL param

        const agent = this.agents.get(params.agentId);
        if (!agent) {
          elizaLogger.error(
            `[ApiClient] Agent not found for ID/name: ${params.agentId}`,
          );
          return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        return this.handleMessage(agent, requestBody);
      } catch (error) {
        elizaLogger.error(
          '[ApiClient] Error processing legacy message:',
          error,
        );
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    });
  }

  private async handleMessage(agent: IAgentRuntime, request: MessageRequest) {
    try {
      elizaLogger.info('[ApiClient] Starting message handling');
      const { agentId } = request;
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
      // if empty text, directly return
      if (!text) {
        return Response.json([]);
      }

      const messageId = stringToUuid(Date.now().toString());
      const content: Content = {
        text,
        attachments: [],
        source: 'direct',
        inReplyTo: undefined,
        metadata: {
          walletAddress: request.walletAddress,
        },
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

      let state: State | undefined;
      try {
        state = await agent.composeState(userMessage, {
          agentName: agent.character.name,
        });
      } catch (error) {
        elizaLogger.error('[ApiClient] Error composing state:', error);
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
      });

      const response = await generateMessageResponse({
        runtime: agent,
        context,
        modelClass: ModelClass.LARGE,
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
        embedding: getEmbeddingZeroVector(),
        createdAt: Date.now(),
      };
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

      // Check if we should suppress the initial message
      // const action = agent.actions.find((a) => a.name === response.action);
      // TODO Handle this
      // const shouldSuppressInitialMessage = action?.suppressInitialMessage;

      // Include the response content even if no actions were processed
      const responseContent = message ? [message] : [response];
      return Response.json(responseContent);
    } catch (error) {
      elizaLogger.error('[ApiClient] Error in handleMessage:', error);
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        { status: 500 },
      );
    }
  }

  // agent/src/index.ts:startAgent calls this
  public registerAgent(runtime: IAgentRuntime) {
    // register any plugin endpoints?
    // but once and only once
    this.agents.set(runtime.agentId, runtime);
  }

  public unregisterAgent(runtime: IAgentRuntime) {
    this.agents.delete(runtime.agentId);
  }

  public start(port: number) {
    elizaLogger.info(`[ApiClient] Starting server on port ${port}`);
    this.server = this.app.listen(port, () => {
      elizaLogger.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`,
      );
    });
  }

  public async stop() {
    elizaLogger.info('[ApiClient] Stop method called');
    if (this.server) {
      elizaLogger.info('[ApiClient] Closing server...');
      // @ts-ignore - Elysia's server type doesn't include close method, but it exists at runtime
      this.server.close(() => {
        elizaLogger.info('[ApiClient] Server closed successfully');
      });
    } else {
      elizaLogger.info('[ApiClient] No server to stop');
    }
  }
}
