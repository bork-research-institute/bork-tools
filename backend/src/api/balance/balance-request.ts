import { t } from 'elysia';

export const balanceRequestSchema = t.Object({
  address: t.String(),
  tokenMint: t.Optional(t.String()),
});

export type BalanceRequest = typeof balanceRequestSchema.static;
