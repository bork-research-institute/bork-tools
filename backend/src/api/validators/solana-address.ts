import { z } from 'zod';

// Address validator: simple regex for Solana addresses (base58, 32-44 chars)
export const addressValidator = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

export type AddressValidator = z.infer<typeof addressValidator>;
