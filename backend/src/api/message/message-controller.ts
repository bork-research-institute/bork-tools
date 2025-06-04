import { error403ResponseSchema } from '@/api/validators/403-error';
import { errorResponseSchema } from '@/api/validators/error-response';
import { tokenValidationMiddleware } from '@/middleware/token-validation-middleware';
import { messageRequestSchema } from '@api/message/message-request';
import type { MessageRequest } from '@api/message/message-request';
import { messageResponseSchema } from '@api/message/message-response';
import type { MessageService } from '@api/message/message-service';
import { elizaLogger } from '@elizaos/core';
import { type Elysia, t } from 'elysia';

export class MessageController {
  private readonly messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  public setupRoutes(app: Elysia): void {
    app.post(
      '/message',
      async ({ body }: { body: MessageRequest }) => {
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
        beforeHandle: tokenValidationMiddleware,
        body: messageRequestSchema,
        response: {
          200: t.Array(messageResponseSchema),
          403: error403ResponseSchema,
          500: errorResponseSchema,
        },
      },
    );
  }
}
