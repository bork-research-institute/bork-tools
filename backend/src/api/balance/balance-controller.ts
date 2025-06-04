import { errorResponseSchema } from '@/api/validators/error-response';
import {
  type BalanceRequest,
  balanceRequestSchema,
} from '@api/balance/balance-request';
import { balanceResponseSchema } from '@api/balance/balance-response';
import type { BalanceService } from '@api/balance/balance-service';
import { elizaLogger } from '@elizaos/core';
import type { Elysia } from 'elysia';

export class BalanceController {
  private readonly balanceService: BalanceService;

  constructor(balanceService: BalanceService) {
    this.balanceService = balanceService;
  }

  public setupRoutes(app: Elysia): void {
    app.get(
      '/balance',
      async ({ query }: { query: BalanceRequest }) => {
        try {
          const { address, tokenMint = '' } = query;
          elizaLogger.info(
            `[BalanceController] Balance endpoint called for address ${address}`,
          );
          const balanceRequest = { address, tokenMint };
          return await this.balanceService.handleGetBalance(balanceRequest);
        } catch (error) {
          elizaLogger.error(
            '[BalanceController] Error processing balance:',
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
        query: balanceRequestSchema,
        response: {
          200: balanceResponseSchema,
          500: errorResponseSchema,
        },
      },
    );
  }
}
