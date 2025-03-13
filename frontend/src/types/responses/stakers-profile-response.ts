import type { TokenAccount } from '../token-account';
import type { GFMStakingProfileResponse } from './gfm-staking-profile';

export interface StakerProfile extends TokenAccount {
  stakingProfile: GFMStakingProfileResponse | null;
}

export interface StakersProfileResponse {
  result: {
    items: StakerProfile[];
    total: number;
    hasMore: boolean;
    cursor: string;
  };
}
