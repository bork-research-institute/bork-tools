import { z } from 'zod';

export const heliusRequestSchema = z.object({
  jsonrpc: z.string().default('2.0'),
  id: z.number().default(1),
  method: z.string(),
  params: z.array(z.any()),
});

export type HeliusRequest = z.infer<typeof heliusRequestSchema>;
