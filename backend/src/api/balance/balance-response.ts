import { t } from 'elysia';

export const balanceResponseSchema = t.Object({
  solBalance: t.Number(),
  tokenBalance: t.Number(),
});

export type BalanceResponse = typeof balanceResponseSchema.static;
