import { heliusRequestSchema } from '@api/balance/helius/helius-request';
import { addressValidator } from '@api/validators/solana-address';
import { z } from 'zod';

const programIdOrMint = z
  .object({
    programId: addressValidator,
  })
  .or(z.object({ mint: addressValidator }));

export const heliusGetTokenAccountsByOwnerRequestSchema =
  heliusRequestSchema.extend({
    method: z.string().default('getTokenAccountsByOwner'),
    params: z
      .array(
        addressValidator
          .or(programIdOrMint)
          .or(z.object({ encoding: z.string() })),
      )
      .min(1)
      .max(3),
  });

export type HeliusGetTokenAccountsByOwnerRequest = z.infer<
  typeof heliusGetTokenAccountsByOwnerRequestSchema
>;
