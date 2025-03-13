export interface GFMStakingProfileResponse {
  staked: number;
  stakingTimestamp: Date;
  claimed: {
    tokenA: number;
    tokenB: number;
  };
  available: {
    tokenA: number;
    tokenB: number;
  };
}
