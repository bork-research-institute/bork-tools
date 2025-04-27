import type { SwapInfo, SwapResponse } from '@/types/token-monitor/raydium';
import type {
  LiquidityMetrics,
  VolumeMetrics,
} from '@/types/token-monitor/token';
import { type ApiV3PoolInfoItem, Raydium } from '@raydium-io/raydium-sdk-v2';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { Connection } from '@solana/web3.js';
import axios from 'axios';
import { isEmpty, isNil } from 'ramda';
import { connectionService } from './connection-service';

export class RaydiumService {
  private static instance: RaydiumService;
  private connection: Connection;
  private raydium?: Raydium;
  private poolCache: Map<
    string,
    { info: ApiV3PoolInfoItem; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly TRANSACTION_API_BASE =
    'https://transaction-v1.raydium.io/compute';
  private readonly DEFAULT_AMOUNT = 1_000_000; // 1 SOL in lamports
  private readonly DEFAULT_SLIPPAGE = 10; // 0.1%

  private constructor() {
    this.connection = connectionService.getConnection();
    this.initializeRaydium();
  }

  private async initializeRaydium() {
    if (!this.raydium) {
      this.raydium = await Raydium.load({
        connection: this.connection,
        disableLoadToken: true, // We don't need token info for our use case
      });
    }
    return this.raydium;
  }

  public static getInstance(): RaydiumService {
    if (!RaydiumService.instance) {
      RaydiumService.instance = new RaydiumService();
    }
    return RaydiumService.instance;
  }

  async getLiquidityMetrics(
    tokenAddress: string,
  ): Promise<LiquidityMetrics | undefined> {
    try {
      const poolInfo = await this.getPoolInfo(tokenAddress);
      if (!poolInfo) {
        return undefined;
      }

      return {
        burnedLpPercentage: poolInfo.burnPercent,
        totalLiquidity: poolInfo.tvl,
        lpHolderCount: 0,
        lpProgramId: poolInfo.id,
        openTime: poolInfo.openTime,
        volumeMetrics: this.getVolumeMetrics(poolInfo),
      };
    } catch (error) {
      console.error(
        `Error getting liquidity metrics for ${tokenAddress}:`,
        error,
      );
      return undefined;
    }
  }

  public getHighestTvlPool(
    pools: ApiV3PoolInfoItem[],
  ): ApiV3PoolInfoItem | null {
    if (isNil(pools) || isEmpty(pools)) {
      return null;
    }
    return pools.reduce(
      (max, curr) => (curr.tvl > max.tvl ? curr : max),
      pools[0],
    );
  }

  private async getPoolInfo(
    tokenAddress: string,
  ): Promise<ApiV3PoolInfoItem | null> {
    try {
      let data: ApiV3PoolInfoItem[];
      // Try first with SOL as mint1
      const result = await this.raydium?.api.fetchPoolByMints({
        mint1: this.SOL_MINT,
        mint2: tokenAddress,
      });

      // If no data found, try reverse order
      if (isNil(result?.data) || isEmpty(result?.data)) {
        const reverseResult = await this.raydium?.api.fetchPoolByMints({
          mint1: tokenAddress,
          mint2: this.SOL_MINT,
        });
        data = reverseResult?.data;
      } else {
        data = result?.data;
      }

      // If still no data, try getting pool info via swap
      if (isNil(data) || isEmpty(data)) {
        const swapInfo = await this.getSwap(tokenAddress);
        if (swapInfo?.poolId) {
          data = await this.fetchPoolById(swapInfo.poolId);
        }
      }

      if (isNil(data) || isEmpty(data)) {
        return null;
      }

      // Use the new method to find highest TVL pool
      const pool = this.getHighestTvlPool(data);

      // Cache the result before returning
      if (pool) {
        this.poolCache.set(tokenAddress, {
          info: pool,
          timestamp: new Date().getTime(),
        });
      }

      return pool;
    } catch (error) {
      console.error(`Error fetching pool info for ${tokenAddress}:`, error);
      return null;
    }
  }

  private async getLpHolderCount(lpMint: string): Promise<number> {
    try {
      const accounts = await this.connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 }, // Size of token account data
            { memcmp: { offset: 0, bytes: lpMint } }, // Filter by mint address
          ],
        },
      );

      // Filter out accounts with 0 balance
      const nonZeroAccounts = accounts.filter((account) => {
        const balance = Number(account.account.data.slice(64, 72));
        return balance > 0;
      });

      return nonZeroAccounts.length;
    } catch (error) {
      console.error(`Error getting LP holder count for ${lpMint}:`, error);
      return 0;
    }
  }

  public async getSwap(
    tokenAddress: string,
    amount: number = this.DEFAULT_AMOUNT,
    isSelling = false,
  ): Promise<SwapInfo | null> {
    try {
      const response = await axios.get<SwapResponse>(
        `${this.TRANSACTION_API_BASE}/swap-base-in`,
        {
          params: {
            inputMint: isSelling ? tokenAddress : this.SOL_MINT,
            outputMint: isSelling ? this.SOL_MINT : tokenAddress,
            amount: amount,
            slippageBps: this.DEFAULT_SLIPPAGE,
            txVersion: 'V0',
          },
        },
      );

      if (!response.data?.success || !response.data?.data) {
        return null;
      }

      const { data } = response.data;
      const routePlan = data.routePlan[0]; // Get first route

      return {
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inAmount: Number(data.inputAmount),
        outAmount: Number(data.outputAmount),
        feeRate: routePlan.feeRate,
        priceImpact: data.priceImpactPct,
        poolId: routePlan.poolId,
      };
    } catch (error) {
      console.error(`Error fetching swap info for ${tokenAddress}:`, error);
      return null;
    }
  }

  public async fetchPoolById(
    poolId: string,
  ): Promise<ApiV3PoolInfoItem[] | null> {
    try {
      const poolResult = await this.raydium?.api.fetchPoolById({ ids: poolId });
      if (!isNil(poolResult) && !isNil(poolResult[0])) {
        return poolResult;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching pool info for ${poolId}:`, error);
      return null;
    }
  }

  public getVolumeMetrics(
    poolInfo: ApiV3PoolInfoItem,
  ): VolumeMetrics | undefined {
    if (!poolInfo.day) {
      console.log('No volume data available', poolInfo);
      return undefined;
    }

    const volume24h = poolInfo.day.volume;
    let volumeChange = 0;

    // Get previous volume data if available
    const previousData = this.poolCache.get(poolInfo.id);
    if (previousData?.info.day) {
      const previousVolume = previousData.info.day.volume;
      // Calculate real-time volume change
      volumeChange = ((volume24h - previousVolume) / previousVolume) * 100;
    }

    return {
      volume24h,
      volumeChange,
      isVolumeIncreasing: volumeChange > 0,
    };
  }
}
