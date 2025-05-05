import { z } from 'zod';

export const stakerSchema = z.object({
  staked: z.number(),
  unstaked: z.number(),
  total: z.number(),
});

export type StakerData = z.infer<typeof stakerSchema>;
