import type { TokenMetrics } from '@/types/token-monitor/token';
import {
  TOKEN_PROGRAM_ID,
  TokenInvalidAccountOwnerError,
  getMint,
} from '@solana/spl-token';
import { type Connection, PublicKey } from '@solana/web3.js';
import { connectionService } from './connection-service';
import { RaydiumService } from './raydium-service';

export interface TokenAuthority {
  isMintable: boolean;
  isFreezable: boolean;
}

export class TokenEnrichmentService {
  private static instance: TokenEnrichmentService;
  private connection: Connection;
  private raydiumService: RaydiumService;

  private constructor() {
    this.connection = connectionService.getConnection();
    this.raydiumService = RaydiumService.getInstance();
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
      const [mintInfo, accounts, liquidityMetrics] = await Promise.all([
        getMint(this.connection, new PublicKey(tokenAddress)),
        this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: tokenAddress } },
          ],
        }),
        this.raydiumService.getLiquidityMetrics(tokenAddress),
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
        };
      }
      console.error(`Error fetching token metrics for ${tokenAddress}:`, error);
      throw error;
    }
  }
}

export const tokenEnrichmentService = TokenEnrichmentService.getInstance();
