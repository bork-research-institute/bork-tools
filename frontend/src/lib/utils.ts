import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeUnit = {
  value: number;
  unit: string;
};

export function getTimeAgo(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Define time units in descending order
  const timeUnits: TimeUnit[] = [
    { value: 31536000, unit: 'Y' }, // Year (365 days)
    { value: 2592000, unit: 'M' }, // Month (30 days)
    { value: 604800, unit: 'w' }, // Week
    { value: 86400, unit: 'd' }, // Day
    { value: 3600, unit: 'h' }, // Hour
    { value: 60, unit: 'min' }, // Minute
    { value: 1, unit: 's' }, // Second
  ];

  // Find the largest unit that fits
  for (const { value, unit } of timeUnits) {
    const count = Math.floor(diffInSeconds / value);
    if (count >= 1) {
      return `${count}${unit}`;
    }
  }

  return 'now';
}
