import type { BalanceRequest } from '@api/balance/balance-request';
import {
  type HeliusGetBalanceRequest,
  heliusGetBalanceRequestSchema,
} from '@api/balance/helius/helius-get-balance-request';
import type { HeliusGetBalanceResponse } from '@api/balance/helius/helius-get-balance-response';
import {
  type HeliusGetTokenAccountsByOwnerRequest,
  heliusGetTokenAccountsByOwnerRequestSchema,
} from '@api/balance/helius/helius-get-token-accounts-by-owner-request';
import type { HeliusGetTokenAccountsByOwnerResponse } from '@api/balance/helius/helius-get-token-accounts-by-owner-response';
import { elizaLogger } from '@elizaos/core';
import axios, { type AxiosResponse } from 'axios';
import { getEnv } from 'src/config/env';

export class BalanceService {
  private readonly heliusRPCUrl: string;

  constructor() {
    this.heliusRPCUrl = `https://mainnet.helius-rpc.com/?api-key=${getEnv().HELIUS_API_KEY}`;
  }

  // TODO: We should allow fetching all tokens
  public async handleGetBalance(request: BalanceRequest): Promise<Response> {
    try {
      elizaLogger.info('[BalanceService] Starting balance handling');
      const { address, tokenMint } = request;

      // Build and validate SOL balance request
      const solResponse = await axios.post<
        HeliusGetBalanceRequest,
        AxiosResponse<HeliusGetBalanceResponse>
      >(
        this.heliusRPCUrl,
        heliusGetBalanceRequestSchema.parse({
          method: 'getBalance',
          params: [address],
        }),
      );
      const solData = solResponse.data;
      const solBalance = solData.result?.value ?? 0;

      // Fetch token balance if mint is provided
      let tokenBalance = null;
      if (tokenMint) {
        // Build and validate token accounts request
        const tokenResponse = await axios.post<
          HeliusGetTokenAccountsByOwnerRequest,
          AxiosResponse<HeliusGetTokenAccountsByOwnerResponse>
        >(
          this.heliusRPCUrl,
          heliusGetTokenAccountsByOwnerRequestSchema.parse({
            method: 'getTokenAccountsByOwner',
            params: [address, { mint: tokenMint }, { encoding: 'jsonParsed' }],
          }),
        );
        const tokenData = tokenResponse.data;
        const account = tokenData.result?.value?.find(
          (acc) => acc.account.data.parsed.info.mint === tokenMint,
        );
        tokenBalance = account
          ? account.account.data.parsed.info.tokenAmount.uiAmount
          : 0;
      }

      return Response.json({
        solBalance,
        tokenBalance,
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      return Response.json(
        { error: 'Failed to fetch balances' },
        { status: 500 },
      );
    }
  }
}
