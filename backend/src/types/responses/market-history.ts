import { z } from 'zod';

export const MarketHistoryItemSchema = z.object({
  timestamp: z.number(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string(),
});

export const MarketHistoryResponseSchema = z.object({
  marketId: z.string(),
  history: z.array(MarketHistoryItemSchema),
});

export type MarketHistoryItem = z.infer<typeof MarketHistoryItemSchema>;
export type MarketHistoryResponse = z.infer<typeof MarketHistoryResponseSchema>;

export const TimeResolution = {
  Hour: '60',
  Day: '1440', // 24 * 60 minutes
  Week: '10080', // 7 * 24 * 60 minutes
} as const;

export type TimeResolution =
  (typeof TimeResolution)[keyof typeof TimeResolution];
