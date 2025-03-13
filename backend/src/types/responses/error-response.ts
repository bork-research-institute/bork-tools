import { t } from 'elysia';

export const errorResponseSchema = t.Object({
  error: t.String(),
});

export type ErrorResponse = typeof errorResponseSchema.static;
