// Utility for merging class names (shadcn/ui requirement)
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | number | null | undefined | false)[]) {
  return twMerge(clsx(inputs));
}
