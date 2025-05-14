import { heliusResponseSchema } from '@api/balance/helius/helius-response';
import { z } from 'zod';

export const heliusGetBalanceResponseSchema = heliusResponseSchema.extend({
  result: z.object({
    context: z.object({
      slot: z.number(), // The slot of the returned information
    }),
    value: z.number(), // The account balance in lamports
  }),
});

export type HeliusGetBalanceResponse = z.infer<
  typeof heliusGetBalanceResponseSchema
>;
