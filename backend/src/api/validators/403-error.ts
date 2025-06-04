import { t } from 'elysia';

export const error403ResponseSchema = t.Object({
  error: t.String(),
  message: t.String(),
  code: t.String(),
});

export type Error403Response = typeof error403ResponseSchema.static;
