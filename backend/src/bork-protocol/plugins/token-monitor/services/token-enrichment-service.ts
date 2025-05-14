import { connectionService } from '@/bork-protocol/plugins/token-monitor/services/connection-service';
import { DexScreenerService } from '@/bork-protocol/plugins/token-monitor/services/dexscreener-service';
import { RaydiumService } from '@/bork-protocol/plugins/token-monitor/services/raydium-service';
import type { TokenMetrics } from '@/bork-protocol/plugins/token-monitor/types/token';

import {
  TOKEN_PROGRAM_ID,
  TokenInvalidAccountOwnerError,
  getMint,
} from '@solana/spl-token';
import { type Connection, PublicKey } from '@solana/web3.js';

export interface TokenAuthority {
  isMintable: boolean;
  isFreezable: boolean;
}

export class TokenEnrichmentService {
  private static instance: TokenEnrichmentService;
  private connection: Connection;
  private raydiumService: RaydiumService;
  private dexScreenerService: DexScreenerService;

  private constructor() {
    this.connection = connectionService.getConnection();
    this.raydiumService = RaydiumService.getInstance();
    this.dexScreenerService = DexScreenerService.getInstance();
  }

  public static getInstance(): TokenEnrichmentService {
    if (!TokenEnrichmentService.instance) {
      TokenEnrichmentService.instance = new TokenEnrichmentService();
    }
    return TokenEnrichmentService.instance;
  }

  private checkTokenAuthority(mintInfo: {
    mintAuthority: PublicKey | null;
    freezeAuthority: PublicKey | null;
  }): TokenAuthority {
    return {
      isMintable: mintInfo.mintAuthority !== null,
      isFreezable: mintInfo.freezeAuthority !== null,
    };
  }

  async getTokenMetrics(tokenAddress: string): Promise<TokenMetrics> {
    try {
      const [mintInfo, accounts, liquidityMetrics, tokenInfo] =
        await Promise.all([
          getMint(this.connection, new PublicKey(tokenAddress)),
          this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
            filters: [
              { dataSize: 165 },
              { memcmp: { offset: 0, bytes: tokenAddress } },
            ],
          }),
          this.raydiumService.getLiquidityMetrics(tokenAddress),
          this.dexScreenerService.getTokenInfo(tokenAddress),
        ]);

      const authority = this.checkTokenAuthority(mintInfo);

      return {
        holderCount: accounts.length,
        mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
        freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
        isMintable: authority.isMintable,
        isFreezable: authority.isFreezable,
        supply: Number(mintInfo.supply) / 10 ** mintInfo.decimals,
        decimals: mintInfo.decimals,
        liquidityMetrics,
        name: tokenInfo?.name,
        ticker: tokenInfo?.symbol,
      };
    } catch (error) {
      if (error instanceof TokenInvalidAccountOwnerError) {
        return {
          holderCount: 0,
          mintAuthority: null,
          freezeAuthority: null,
          isMintable: false,
          isFreezable: false,
          supply: 0,
          decimals: 0,
          isInvalidToken: true,
          liquidityMetrics: undefined,
          name: undefined,
          ticker: undefined,
        };
      }
      console.error(`Error fetching token metrics for ${tokenAddress}:`, error);
      throw error;
    }
  }
}

export const tokenEnrichmentService = TokenEnrichmentService.getInstance();
