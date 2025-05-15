import { Service, type ServiceType, elizaLogger } from '@elizaos/core';
import { ServiceTypeExtension } from '../types/service-type-extension';
import {
  type TransactionDetails,
  heliusTransactionService,
} from './helius-transaction-service';

interface BundleAnalysis {
  bundleId: string;
  transactions: TransactionDetails[];
  netTokenMovements: {
    [tokenAddress: string]: {
      amount: number;
      direction: 'in' | 'out';
    };
  };
}

interface BundleResponse {
  jsonrpc: string;
  result: {
    context: {
      slot: number;
    };
    value: Array<{
      bundle_id: string;
      transactions: string[];
      slot: number;
      confirmation_status: string;
      err: {
        Ok: null | unknown;
      };
    }>;
  };
  id: number;
}

export class BundleAnalysisService extends Service {
  private readonly JITO_BUNDLE_API =
    'https://bundles.jito.wtf/api/v1/bundles/transaction';
  private readonly JITO_BLOCK_ENGINE_API =
    'https://mainnet.block-engine.jito.wtf/api/v1/getBundleStatuses';

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.BUNDLE_ANALYSIS as unknown as ServiceType;
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  private async fetchBundleIdForTransaction(
    signature: string,
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.JITO_BUNDLE_API}/${signature}`);
      if (!response.ok) {
        elizaLogger.debug(
          '[BundleAnalysisService] No bundle found for transaction',
          { signature },
        );
        return null;
      }
      const data = await response.json();
      if (!data[0]?.bundle_id) {
        elizaLogger.debug(
          '[BundleAnalysisService] No bundle_id in response for transaction',
          { signature },
        );
        return null;
      }
      return data[0].bundle_id;
    } catch (error) {
      elizaLogger.error('[BundleAnalysisService] Error fetching bundle ID:', {
        signature,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async fetchBundleDetails(
    bundleId: string,
  ): Promise<BundleAnalysis | null> {
    try {
      const response = await fetch(this.JITO_BLOCK_ENGINE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch bundle details: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as BundleResponse;
      const bundleData = data.result?.value?.[0];

      if (!bundleData) {
        return null;
      }

      // Fetch detailed transaction information for each transaction in the bundle
      const transactionDetails =
        await heliusTransactionService.getTransactionsDetails(
          bundleData.transactions,
        );

      // Calculate net token movements
      const netTokenMovements: BundleAnalysis['netTokenMovements'] = {};
      for (const tx of transactionDetails) {
        for (const transfer of tx.tokenTransfers) {
          if (!netTokenMovements[transfer.mint]) {
            netTokenMovements[transfer.mint] = {
              amount: 0,
              direction: 'in',
            };
          }
          netTokenMovements[transfer.mint].amount += transfer.tokenAmount;
        }
      }

      return {
        bundleId: bundleData.bundle_id,
        transactions: transactionDetails,
        netTokenMovements,
      };
    } catch (error) {
      elizaLogger.error(
        '[BundleAnalysisService] Error fetching bundle details:',
        {
          bundleId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  public async analyzeTokenBundles(
    transactionSignatures: string[],
  ): Promise<BundleAnalysis[]> {
    const bundleAnalyses: BundleAnalysis[] = [];
    const processedBundleIds = new Set<string>();

    // Process first 15 transactions
    const transactionsToProcess = transactionSignatures.slice(0, 15);

    for (const signature of transactionsToProcess) {
      try {
        const bundleId = await this.fetchBundleIdForTransaction(signature);

        if (bundleId && !processedBundleIds.has(bundleId)) {
          processedBundleIds.add(bundleId);
          const bundleDetails = await this.fetchBundleDetails(bundleId);

          if (bundleDetails) {
            bundleAnalyses.push(bundleDetails);
          }
        }
      } catch (error) {
        elizaLogger.error('[BundleAnalysisService] Error analyzing bundle:', {
          signature,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return bundleAnalyses;
  }
}

export const bundleAnalysisService = new BundleAnalysisService();
