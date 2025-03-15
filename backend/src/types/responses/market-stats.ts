import type { SpotMarket } from '@injectivelabs/sdk-ts';

export interface MarketStats extends SpotMarket {
  volume?: string;
  price?: string;
  lastPrice?: string;
}
