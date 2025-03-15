/**
 * Interface representing transaction activity metrics
 */
export interface TransactionMetrics {
  daily: number;
  activeAddresses: number;
  avgGasFee: string;
}

/**
 * Interface representing staking metrics
 */
export interface StakingMetrics {
  totalStaked: string;
  stakingRate: number;
  activeValidators: number;
  totalValidators: number;
}

/**
 * Interface representing governance metrics
 */
export interface ProposalTally {
  yes: string;
  no: string;
  abstain: string;
  noWithVeto: string;
}

export interface ProposalDetails {
  id: string;
  title: string;
  status: number;
  totalDeposit: string[];
  votingStartTime: string;
  votingEndTime: string;
  tally: ProposalTally;
}

export interface GovernanceMetrics {
  activeProposals: number;
  totalProposals: number;
  votingParticipation: number;
  votingPeriod: string;
  maxDepositPeriod: string;
  proposalsDetails: Array<{
    id: string;
    title: string;
    status: string;
    totalDeposit: string[];
    votingStartTime: string;
    votingEndTime: string;
    tally: {
      yes: string;
      no: string;
      abstain: string;
      noWithVeto: string;
    };
  }>;
}

/**
 * Interface representing validator metrics
 */
export interface ValidatorMetrics {
  topValidators: Array<{
    address: string;
    votingPower: string;
    commission: string;
    uptime: number;
  }>;
  slashingEvents: number;
  decentralizationScore: number;
}

/**
 * Interface representing price metrics
 */
export interface PriceMetrics {
  injPrice: string;
  oracleTimestamp: number;
}

/**
 * Interface representing all network metrics
 */
export interface NetworkMetrics {
  transactions: TransactionMetrics;
  staking: StakingMetrics;
  governance: GovernanceMetrics;
  validators: ValidatorMetrics;
  prices: PriceMetrics;
}
