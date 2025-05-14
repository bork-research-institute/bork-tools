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
  static get serviceType(): ServiceType {
    return ServiceTypeExtension.TRANSACTION as unknown as ServiceType;
  }

  async initialize(): Promise<void> {
    // No initialization needed, using connection service
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

      // Fetch transaction details for each signature
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });

            const status: 'success' | 'error' = tx?.meta?.err
              ? 'error'
              : 'success';
            const error = tx?.meta?.err
              ? JSON.stringify(tx.meta.err)
              : undefined;

            return {
              signature: sig.signature,
              slot: sig.slot,
              timestamp: new Date(
                sig.blockTime ? sig.blockTime * 1000 : Date.now(),
              ),
              status,
              error,
            } as TransactionInfo;
          } catch (error) {
            elizaLogger.error(
              '[TransactionService] Error fetching transaction:',
              {
                signature: sig.signature,
                error: error instanceof Error ? error.message : String(error),
              },
            );
            return null;
          }
        }),
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
