import type {} from '@elizaos/core';
import { t } from 'elysia';

export const messageResponseSchema = t.Object({
  text: t.String(),
  action: t.Optional(t.String()),
  source: t.Optional(t.String()),
  url: t.Optional(t.String()),
  inReplyTo: t.Optional(t.String()),
  attachments: t.Optional(t.Array(t.File())),
  metadata: t.Optional(t.Record(t.String(), t.Any())),
});

export type MessageResponse = typeof messageResponseSchema.static;
