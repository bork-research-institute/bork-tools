import { heliusRequestSchema } from '@api/balance/helius/helius-request';
import { addressValidator } from '@api/validators/solana-address';
import { z } from 'zod';

export const heliusGetBalanceRequestSchema = heliusRequestSchema.extend({
  method: z.string().default('getBalance'),
  params: z.array(addressValidator).length(1),
});

export type HeliusGetBalanceRequest = z.infer<
  typeof heliusGetBalanceRequestSchema
>;
