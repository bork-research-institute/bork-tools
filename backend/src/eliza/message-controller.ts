import { elizaLogger } from '@elizaos/core';
import { type Elysia, t } from 'elysia';
import { errorResponseSchema } from './error-response';
import { messageRequestSchema } from './message-request';
import { messageResponseSchema } from './message-response';
import type { MessageService } from './message-service';

export class MessageController {
  private readonly messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  public setupRoutes(app: Elysia): void {
    app.post(
      '/message',
      async ({ body }) => {
        try {
          elizaLogger.info(
            `[MessageController] Message endpoint called for agent ${body.agentId}`,
          );
          return await this.messageService.handleMessage(body);
        } catch (error) {
          elizaLogger.error(
            '[MessageController] Error processing message:',
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
            { status: 500 },
          );
        }
      },
      {
        body: messageRequestSchema,
        response: {
          200: t.Array(messageResponseSchema),
          500: errorResponseSchema,
        },
      },
    );
  }
}
