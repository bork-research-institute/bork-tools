import { heliusResponseSchema } from '@api/balance/helius/helius-response';
import { addressValidator } from '@api/validators/solana-address';
import { z } from 'zod';

export const heliusGetTokenAccountsByOwnerResponseSchema =
  heliusResponseSchema.extend({
    result: z.object({
      context: z.object({
        apiVersion: z.string(),
        slot: z.number(),
      }),
      value: z.array(
        z.object({
          pubkey: addressValidator,
          account: z.object({
            lamports: z.number(),
            owner: addressValidator,
            data: z.object({
              program: z.string(),
              parsed: z.object({
                info: z.object({
                  isNative: z.boolean(),
                  mint: addressValidator,
                  owner: addressValidator,
                  state: z.string(),
                  tokenAmount: z.object({
                    amount: z.string(),
                    decimals: z.number(),
                    uiAmount: z.number(),
                    uiAmountString: z.string(),
                  }),
                }),
              }),
              space: z.number(),
            }),
            executable: z.boolean(),
            rentEpoch: z.number(),
            space: z.number(),
          }),
        }),
      ),
    }),
  });

export type HeliusGetTokenAccountsByOwnerResponse = z.infer<
  typeof heliusGetTokenAccountsByOwnerResponseSchema
>;
