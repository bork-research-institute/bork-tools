import { errorResponseSchema } from '@api/error-response';
import { messageRequestSchema } from '@api/message/message-request';
import { messageResponseSchema } from '@api/message/message-response';
import type { MessageService } from '@api/message/message-service';
import { elizaLogger } from '@elizaos/core';
import { type Elysia, t } from 'elysia';
<<<<<<<< HEAD:backend/src/api/message/message-controller.ts
========
import { errorResponseSchema } from '../types/error-response';
import { messageRequestSchema } from '../types/message-request';
import { messageResponseSchema } from '../types/message-response';
import type { MessageService } from './message-service';
>>>>>>>> 0b44d3f (wip moved stuff to a plugin):backend/src/api/message-controller.ts

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
