import { connectionService } from '@/bork-protocol/plugins/token-monitor/services/connection-service';
import { Service, type ServiceType, elizaLogger } from '@elizaos/core';
import { PublicKey } from '@solana/web3.js';
import { ServiceTypeExtension } from '../types/service-type-extension';

interface TransactionInfo {
  signature: string;
  slot: number;
  timestamp: Date;
  status: 'success' | 'error';
  error?: string;
}

export class TransactionService extends Service {
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 32000; // 32 seconds

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.TRANSACTION as unknown as ServiceType;
  }

  async initialize(): Promise<void> {
    // No initialization needed, using connection service
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchTransactionWithRetry(
    signature: string,
    retryCount = 0,
  ): Promise<TransactionInfo | null> {
    try {
      const connection = connectionService.getConnection();
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      const status: 'success' | 'error' = tx?.meta?.err ? 'error' : 'success';
      const error = tx?.meta?.err ? JSON.stringify(tx.meta.err) : undefined;

      return {
        signature,
        slot: tx?.slot || 0,
        timestamp: new Date(tx?.blockTime ? tx.blockTime * 1000 : Date.now()),
        status,
        error,
      };
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = Math.min(
          this.INITIAL_RETRY_DELAY * 2 ** retryCount,
          this.MAX_RETRY_DELAY,
        );
        elizaLogger.warn(
          '[TransactionService] Error fetching transaction, retrying with exponential backoff',
          {
            signature,
            retryCount,
            delay,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        await this.sleep(delay);
        return this.fetchTransactionWithRetry(signature, retryCount + 1);
      }
      elizaLogger.error('[TransactionService] Error fetching transaction:', {
        signature,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  public async getRecentTransactions(
    tokenAddress: string,
    limit = 15,
  ): Promise<TransactionInfo[]> {
    try {
      const connection = connectionService.getConnection();

      // Get recent signatures for the token
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(tokenAddress),
        { limit },
      );

      // Fetch transaction details for each signature with retry logic
      const transactions = await Promise.all(
        signatures.map((sig) => this.fetchTransactionWithRetry(sig.signature)),
      );

      // Filter out failed fetches and sort by timestamp
      return transactions
        .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      elizaLogger.error(
        '[TransactionService] Error fetching recent transactions:',
        {
          tokenAddress,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }
}

export const transactionService = new TransactionService();
