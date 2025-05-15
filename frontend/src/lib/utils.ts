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

export function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Direct match
  if (s1.includes(s2) || s2.includes(s1)) {
    return true;
  }

  // Levenshtein distance for fuzzy matching
  const matrix = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(0));

  for (let i = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  // Allow for some tolerance in the distance (adjust this value as needed)
  const maxDistance = Math.min(s1.length, s2.length) * 0.3;
  return matrix[s1.length][s2.length] <= maxDistance;
}
