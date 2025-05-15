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

export interface TransactionDetails {
  signature: string;
  slot: number;
  confirmationStatus: string;
  error: unknown;
  tokenTransfers: TokenTransfer[];
  description: string;
  type: string;
}

interface HeliusTransactionResponse {
  description: string;
  type: string;
  signature: string;
  slot: number;
  tokenTransfers: TokenTransfer[];
  transactionError?: {
    error: string;
  };
}

export class HeliusTransactionService extends Service {
  private readonly HELIUS_API = 'https://api.helius.xyz/v0/transactions';
  private readonly apiKey: string;

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

  public async getTransactionDetails(
    signature: string,
  ): Promise<TransactionDetails | null> {
    try {
      const response = await fetch(this.HELIUS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          transactions: [signature],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch transaction details: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as HeliusTransactionResponse[];
      if (!data || data.length === 0) {
        return null;
      }

      const tx = data[0];
      return {
        signature: tx.signature,
        slot: tx.slot,
        confirmationStatus: 'finalized', // Assuming if we get a response, it's finalized
        error: tx.transactionError?.error || null,
        tokenTransfers: tx.tokenTransfers || [],
        description: tx.description,
        type: tx.type,
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
