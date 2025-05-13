import { z } from 'zod';

export const heliusResponseSchema = z.object({
  jsonrpc: z.string().default('2.0'),
  id: z.number().default(1),
  result: z.any(),
});
