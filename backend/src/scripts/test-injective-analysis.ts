import { ProposalStatus } from '@injectivelabs/core-proto-ts/cjs/cosmos/gov/v1/gov';
import { Network, getNetworkInfo } from '@injectivelabs/networks';
import {
  BondStatus,
  ChainGrpcBankApi,
  ChainGrpcGovApi,
  ChainGrpcStakingApi,
  ChainGrpcWasmApi,
  IndexerGrpcExplorerApi,
  IndexerGrpcOracleApi,
  IndexerGrpcSpotApi,
  type Proposal,
  type SpotMarket,
  type TallyResult,
} from '@injectivelabs/sdk-ts';
import { BigNumberInBase } from '@injectivelabs/utils';
import type {
  GovernanceMetrics,
  NetworkMetrics,
  PriceMetrics,
  StakingMetrics,
  TransactionMetrics,
  ValidatorMetrics,
} from '../types/responses/network-metrics';

class InjectiveAnalyzer {
  private readonly wasmApi: ChainGrpcWasmApi;
  private readonly bankApi: ChainGrpcBankApi;
  private readonly stakingApi: ChainGrpcStakingApi;
  private readonly govApi: ChainGrpcGovApi;
  private readonly oracleApi: IndexerGrpcOracleApi;
  private readonly explorerApi: IndexerGrpcExplorerApi;
  private readonly spotApi: IndexerGrpcSpotApi;

  constructor() {
    // Try using Testnet instead of MainnetK8s
    const network = getNetworkInfo(Network.Testnet);
    this.wasmApi = new ChainGrpcWasmApi(network.grpc);
    this.bankApi = new ChainGrpcBankApi(network.grpc);
    this.stakingApi = new ChainGrpcStakingApi(network.grpc);
    this.govApi = new ChainGrpcGovApi(network.grpc);
    this.oracleApi = new IndexerGrpcOracleApi(network.indexer);
    this.explorerApi = new IndexerGrpcExplorerApi(network.indexer);
    this.spotApi = new IndexerGrpcSpotApi(network.indexer);
  }

  async getTransactionMetrics(): Promise<TransactionMetrics> {
    try {
      // Get transactions from the last 24 hours
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - 24 * 60 * 60;

      const txs = await this.explorerApi.fetchTxs({
        before: endTime,
        after: startTime,
      });

      // Calculate unique addresses from transactions
      const addresses = new Set<string>();
      let totalGas = BigInt(0);

      const transactions = txs.data || [];
      for (const tx of transactions) {
        // Since the exact type is not available, we'll use a type assertion
        const txData = tx as unknown as {
          sender: string;
          fee?: { amount?: Array<{ amount: string }> };
        };
        if (txData.sender) {
          addresses.add(txData.sender);
        }
        if (txData.fee?.amount?.[0]?.amount) {
          totalGas += BigInt(txData.fee.amount[0].amount);
        }
      }

      const avgGas = transactions.length
        ? (Number(totalGas) / transactions.length / 1e18).toFixed(6)
        : '0';

      return {
        daily: transactions.length,
        activeAddresses: addresses.size,
        avgGasFee: avgGas,
      };
    } catch (error) {
      console.error('Failed to fetch transaction metrics:', error);
      return {
        daily: 0,
        activeAddresses: 0,
        avgGasFee: '0',
      };
    }
  }

  async getStakingMetrics(): Promise<StakingMetrics> {
    try {
      const [pool, validators] = await Promise.all([
        this.stakingApi.fetchPool(),
        this.stakingApi.fetchValidators(),
      ]);

      const totalStaked = new BigNumberInBase(pool.bondedTokens).toString();
      const activeValidators = validators.validators.filter(
        (v) => v.status === BondStatus.Bonded,
      ).length;

      return {
        totalStaked,
        stakingRate:
          (Number(pool.bondedTokens) / Number(pool.notBondedTokens)) * 100,
        activeValidators,
        totalValidators: validators.validators.length,
      };
    } catch (error) {
      console.error('Failed to fetch staking metrics:', error);
      return {
        totalStaked: '0',
        stakingRate: 0,
        activeValidators: 0,
        totalValidators: 0,
      };
    }
  }

  async getGovernanceMetrics(): Promise<GovernanceMetrics> {
    try {
      // Fetch governance module parameters
      const moduleParams = await this.govApi.fetchModuleParams();
      console.log('Governance module params:', moduleParams);

      // Fetch proposals with correct status mapping
      const proposals = await this.govApi.fetchProposals({
        status: ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD,
      });

      if (!proposals || !proposals.proposals) {
        console.warn('Failed to fetch proposals, using fallback values');
        return {
          activeProposals: 0,
          totalProposals: 0,
          votingParticipation: 0,
          votingPeriod: String(moduleParams?.votingParams?.votingPeriod || '0'),
          maxDepositPeriod: String(
            moduleParams?.depositParams?.maxDepositPeriod || '0',
          ),
          proposalsDetails: [],
        };
      }

      // Get detailed information for each active proposal
      type ProposalResponse = {
        details: Proposal;
        tally: TallyResult;
      };

      const activeProposalsDetails = await Promise.allSettled(
        proposals.proposals.map(async (proposal) => {
          try {
            const [proposalResponse, tallyResponse] = await Promise.all([
              this.govApi.fetchProposal(proposal.proposalId),
              this.govApi.fetchProposalTally(proposal.proposalId),
            ]);
            return {
              details: proposalResponse,
              tally: tallyResponse,
            } as ProposalResponse;
          } catch (e) {
            console.warn(
              `Error fetching details for proposal ${proposal.proposalId}:`,
              e,
            );
            return null;
          }
        }),
      );

      const validProposalsDetails = activeProposalsDetails
        .filter(
          (result): result is PromiseFulfilledResult<ProposalResponse | null> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value)
        .filter((value): value is ProposalResponse => value !== null);

      // Calculate voting participation
      const votingParticipation = await this.calculateVotingParticipation(
        proposals.proposals,
      );

      return {
        activeProposals: proposals.proposals.length,
        totalProposals: proposals.proposals.length,
        votingParticipation,
        votingPeriod: String(moduleParams?.votingParams?.votingPeriod || '0'),
        maxDepositPeriod: String(
          moduleParams?.depositParams?.maxDepositPeriod || '0',
        ),
        proposalsDetails: validProposalsDetails.map(({ details, tally }) => ({
          id: String(details.proposalId),
          title: details.content.title || '',
          status: String(details.status),
          totalDeposit: (details.totalDeposits || []).map(
            (coin) => `${coin.amount} ${coin.denom}`,
          ),
          votingStartTime: String(details.votingStartTime || ''),
          votingEndTime: String(details.votingEndTime || ''),
          tally: {
            yes: tally.yesCount || '0',
            no: tally.noCount || '0',
            abstain: tally.abstainCount || '0',
            noWithVeto: tally.noWithVetoCount || '0',
          },
        })),
      };
    } catch (error) {
      console.error('Failed to fetch governance metrics:', error);
      return {
        activeProposals: 0,
        totalProposals: 0,
        votingParticipation: 0,
        votingPeriod: '0',
        maxDepositPeriod: '0',
        proposalsDetails: [],
      };
    }
  }

  async getValidatorMetrics(): Promise<ValidatorMetrics> {
    try {
      const validators = await this.stakingApi.fetchValidators();

      const topValidators = validators.validators
        .filter((v) => v.status === BondStatus.Bonded)
        .slice(0, 10)
        .map((v) => ({
          address: v.operatorAddress,
          votingPower: v.tokens,
          commission: v.commission.commissionRates.rate,
          uptime: 100, // Would need historical data
        }));

      // Calculate decentralization using Gini coefficient
      const votingPowers = validators.validators
        .filter((v) => v.status === BondStatus.Bonded)
        .map((v) => Number(v.tokens));
      const decentralizationScore = this.calculateGiniCoefficient(votingPowers);

      return {
        topValidators,
        slashingEvents: 0,
        decentralizationScore,
      };
    } catch (error) {
      console.error('Failed to fetch validator metrics:', error);
      return {
        topValidators: [],
        slashingEvents: 0,
        decentralizationScore: 0,
      };
    }
  }

  async getPriceMetrics(): Promise<PriceMetrics> {
    try {
      // First fetch the oracle list to get available oracles
      const oracleList = await this.oracleApi.fetchOracleList();
      console.log(
        'Available oracles:',
        oracleList.map((o) => o.symbol),
      );

      // Try different oracle types in order of preference
      const oracleTypes = ['pyth', 'band', 'provider'];
      let price = null;

      for (const oracleType of oracleTypes) {
        try {
          const priceResponse = await this.oracleApi.fetchOraclePriceNoThrow({
            baseSymbol: 'INJ',
            quoteSymbol: 'USDT',
            oracleType,
          });

          if (priceResponse?.price) {
            price = priceResponse.price;
            break;
          }
        } catch (e) {
          console.warn(`Failed to fetch price from ${oracleType} oracle:`, e);
        }
      }

      // If no oracle price, try getting from a spot market
      if (!price) {
        const marketId =
          '0xa508cb32923323679f29a032c70342c147c17d0145625922b0ef22e955c844c0'; // INJ/USDT
        const marketPrice = await this.spotApi.fetchMarket(marketId);
        const market = marketPrice as SpotMarket;
        if (market?.minPriceTickSize) {
          price = market.minPriceTickSize;
        }
      }

      if (!price) {
        console.warn(
          'Failed to fetch INJ price from all sources, using fallback value',
        );
        return {
          injPrice: '0',
          oracleTimestamp: Date.now(),
        };
      }

      return {
        injPrice: price,
        oracleTimestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to fetch price metrics:', error);
      return {
        injPrice: '0',
        oracleTimestamp: Date.now(),
      };
    }
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const mean = sortedValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        numerator += Math.abs(sortedValues[i] - sortedValues[j]);
      }
    }

    return numerator / (2 * n * n * mean);
  }

  private async calculateVotingParticipation(
    activeProposals: Proposal[],
  ): Promise<number> {
    try {
      // Get total bonded tokens (total possible voting power)
      const pool = await this.stakingApi.fetchPool();
      const totalBonded = new BigNumberInBase(pool.bondedTokens);

      if (totalBonded.lte(0)) {
        console.warn(
          'No bonded tokens found, skipping voting participation calculation',
        );
        return 0;
      }

      // Calculate average participation across all active proposals
      const participationRates = await Promise.allSettled(
        activeProposals.map(async (proposal) => {
          try {
            const votes = await this.govApi.fetchProposalVotes({
              proposalId: proposal.proposalId,
            });

            if (!votes || !votes.votes || votes.votes.length === 0) {
              console.warn(
                `No votes found for proposal ${proposal.proposalId}`,
              );
              return 0;
            }

            const totalVotes = votes.votes.reduce((total, vote) => {
              try {
                return total.plus(new BigNumberInBase(vote.options[0].weight));
              } catch (e) {
                console.warn(`Error processing vote weight: ${e}`);
                return total;
              }
            }, new BigNumberInBase(0));

            return totalVotes.div(totalBonded).times(100).toNumber();
          } catch (e) {
            console.warn(
              `Error fetching votes for proposal ${proposal.proposalId}: ${e}`,
            );
            return 0;
          }
        }),
      );

      // Filter out rejected promises and calculate average
      const validRates = participationRates
        .filter(
          (result): result is PromiseFulfilledResult<number> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value);

      if (validRates.length === 0) {
        console.warn('No valid participation rates found');
        return 0;
      }

      return (
        validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length
      );
    } catch (error) {
      console.error('Failed to calculate voting participation:', error);
      return 0;
    }
  }

  async getAllMetrics(): Promise<NetworkMetrics> {
    try {
      const results = await Promise.allSettled([
        this.getTransactionMetrics(),
        this.getStakingMetrics(),
        this.getGovernanceMetrics(),
        this.getValidatorMetrics(),
        this.getPriceMetrics(),
      ]);

      const [transactions, staking, governance, validators, prices] =
        results.map((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          console.error('Failed to fetch metric:', result.reason);
          // Return appropriate fallback values based on the metric type
          return {};
        });

      return {
        transactions: transactions as TransactionMetrics,
        staking: staking as StakingMetrics,
        governance: governance as GovernanceMetrics,
        validators: validators as ValidatorMetrics,
        prices: prices as PriceMetrics,
      };
    } catch (error) {
      console.error('Failed to fetch all metrics:', error);
      return {
        transactions: { daily: 0, activeAddresses: 0, avgGasFee: '0' },
        staking: {
          totalStaked: '0',
          stakingRate: 0,
          activeValidators: 0,
          totalValidators: 0,
        },
        governance: {
          activeProposals: 0,
          totalProposals: 0,
          votingParticipation: 0,
          votingPeriod: '0',
          maxDepositPeriod: '0',
          proposalsDetails: [],
        },
        validators: {
          topValidators: [],
          slashingEvents: 0,
          decentralizationScore: 0,
        },
        prices: { injPrice: '0', oracleTimestamp: Date.now() },
      };
    }
  }
}

function logNetworkMetrics(metrics: NetworkMetrics) {
  console.log('\n=== Injective Network Analysis ===\n');

  console.log('Transaction Activity:');
  console.log(`  Daily Transactions: ${metrics.transactions.daily}`);
  console.log(`  Active Addresses: ${metrics.transactions.activeAddresses}`);
  console.log(`  Average Gas Fee: ${metrics.transactions.avgGasFee} INJ`);

  console.log('\nStaking Metrics:');
  console.log(`  Total Staked: ${metrics.staking.totalStaked} INJ`);
  console.log(`  Staking Rate: ${metrics.staking.stakingRate.toFixed(2)}%`);
  console.log(`  Active Validators: ${metrics.staking.activeValidators}`);
  console.log(`  Total Validators: ${metrics.staking.totalValidators}`);

  console.log('\nGovernance Activity:');
  console.log(`  Active Proposals: ${metrics.governance.activeProposals}`);
  console.log(`  Total Proposals: ${metrics.governance.totalProposals}`);
  console.log(`  Voting Period: ${metrics.governance.votingPeriod} seconds`);
  console.log(
    `  Max Deposit Period: ${metrics.governance.maxDepositPeriod} seconds`,
  );
  console.log(
    `  Voting Participation: ${metrics.governance.votingParticipation.toFixed(2)}%`,
  );

  if (metrics.governance.proposalsDetails.length > 0) {
    console.log('\n  Active Proposals Details:');
    for (const proposal of metrics.governance.proposalsDetails) {
      console.log(`    Proposal #${proposal.id}: ${proposal.title}`);
      console.log(`      Status: ${proposal.status}`);
      console.log(`      Total Deposit: ${proposal.totalDeposit}`);
      console.log(
        `      Voting Period: ${proposal.votingStartTime} to ${proposal.votingEndTime}`,
      );
      console.log('      Current Tally:');
      console.log(`        Yes: ${proposal.tally.yes}`);
      console.log(`        No: ${proposal.tally.no}`);
      console.log(`        Abstain: ${proposal.tally.abstain}`);
      console.log(`        No With Veto: ${proposal.tally.noWithVeto}`);
    }
  }

  console.log('\nValidator Metrics:');
  console.log('  Top 10 Validators:');
  metrics.validators.topValidators.forEach((validator, index) => {
    console.log(`    ${index + 1}. ${validator.address}`);
    console.log(`       Voting Power: ${validator.votingPower} INJ`);
    console.log(`       Commission: ${Number(validator.commission) * 100}%`);
    console.log(`       Uptime: ${validator.uptime}%`);
  });
  console.log(`  Slashing Events: ${metrics.validators.slashingEvents}`);
  console.log(
    `  Decentralization Score: ${(
      (1 - metrics.validators.decentralizationScore) * 100
    ).toFixed(2)}%`,
  );

  console.log('\nPrice Information:');
  console.log(`  INJ Price: $${metrics.prices.injPrice}`);
  console.log(
    `  Last Updated: ${new Date(metrics.prices.oracleTimestamp).toISOString()}`,
  );
}

async function main() {
  try {
    const analyzer = new InjectiveAnalyzer();
    const metrics = await analyzer.getAllMetrics();
    logNetworkMetrics(metrics);
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main();
