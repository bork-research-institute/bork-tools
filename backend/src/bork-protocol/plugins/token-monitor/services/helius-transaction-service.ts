import { Service, type ServiceType, elizaLogger } from '@elizaos/core';
import { getEnv } from '../../../../config/env';
import { ServiceTypeExtension } from '../types/service-type-extension';

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
}

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface TokenBalanceChange {
  userAccount: string;
  tokenAccount: string;
  mint: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
}

export interface AccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: TokenBalanceChange[];
}

export interface TransactionDetails {
  signature: string;
  slot: number;
  timestamp: number;
  confirmationStatus: string;
  error: unknown;
  description: string;
  type: string;
  fee: number;
  feePayer: string;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  accountData: AccountData[];
}

interface HeliusTransactionResponse {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  accountData: AccountData[];
  transactionError?: {
    error: string;
  };
}

export class HeliusTransactionService extends Service {
  private readonly HELIUS_API = 'https://api.helius.xyz/v0/transactions';
  private readonly apiKey: string;
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 32000; // 32 seconds

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.HELIUS_TRANSACTION as unknown as ServiceType;
  }

  constructor() {
    super();
    const env = getEnv();
    this.apiKey = env.HELIUS_API_KEY;
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    signature: string,
    retryCount = 0,
  ): Promise<HeliusTransactionResponse | null> {
    try {
      const response = await fetch(
        `${this.HELIUS_API}?api-key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactions: [signature],
          }),
        },
      );

      if (response.status === 429 && retryCount < this.MAX_RETRIES) {
        const delay = Math.min(
          this.INITIAL_RETRY_DELAY * 2 ** retryCount,
          this.MAX_RETRY_DELAY,
        );
        elizaLogger.warn(
          '[HeliusTransactionService] Rate limited, retrying with exponential backoff',
          {
            signature,
            retryCount,
            delay,
          },
        );
        await this.sleep(delay);
        return this.fetchWithRetry(signature, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch transaction details: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as HeliusTransactionResponse[];
      return data[0] || null;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = Math.min(
          this.INITIAL_RETRY_DELAY * 2 ** retryCount,
          this.MAX_RETRY_DELAY,
        );
        elizaLogger.warn(
          '[HeliusTransactionService] Error occurred, retrying with exponential backoff',
          {
            signature,
            retryCount,
            delay,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        await this.sleep(delay);
        return this.fetchWithRetry(signature, retryCount + 1);
      }
      throw error;
    }
  }

  public async getTransactionDetails(
    signature: string,
  ): Promise<TransactionDetails | null> {
    try {
      const tx = await this.fetchWithRetry(signature);
      if (!tx) {
        return null;
      }

      return {
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.timestamp,
        confirmationStatus: 'finalized', // Assuming if we get a response, it's finalized
        error: tx.transactionError?.error || null,
        description: tx.description,
        type: tx.type,
        fee: tx.fee,
        feePayer: tx.feePayer,
        nativeTransfers: tx.nativeTransfers || [],
        tokenTransfers: tx.tokenTransfers || [],
        accountData: tx.accountData || [],
      };
    } catch (error) {
      elizaLogger.error(
        '[HeliusTransactionService] Error fetching transaction details:',
        {
          signature,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  public async getTransactionsDetails(
    signatures: string[],
  ): Promise<TransactionDetails[]> {
    const details = await Promise.all(
      signatures.map((sig) => this.getTransactionDetails(sig)),
    );
    return details.filter(
      (detail): detail is TransactionDetails => detail !== null,
    );
  }
}

export const heliusTransactionService = new HeliusTransactionService();
