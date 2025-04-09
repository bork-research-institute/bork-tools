import { address } from '@solana/kit';
import { z } from 'zod';

export const signInSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().min(1, 'Signature is required'),
  address: z
    .string()
    .min(1, 'Address is required')
    .transform((val) => address(val)),
});

export type SignInSchema = z.infer<typeof signInSchema>;
