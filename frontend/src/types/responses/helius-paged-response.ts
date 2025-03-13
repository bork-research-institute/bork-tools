import type { HeliusResponse } from './helius-response';

export type HeliusPagedResponse<T, K extends string> = HeliusResponse<
  {
    total: number;
    limit: number;
    cursor: string;
  } & {
    [key in K]: T[];
  }
>;
