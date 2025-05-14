import type { DexScreenerPair } from '@/types/dexscreener';

const BATCH_SIZE = 30; // DexScreener's limit
const RATE_LIMIT = 300; // requests per minute
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

class DexScreenerService {
  private lastRequestTime = 0;
  private requestCount = 0;
  private minuteStart = Date.now();

  private async waitForRateLimit() {
    const now = Date.now();
    if (now - this.minuteStart >= 60000) {
      // Reset counter if a minute has passed
      this.requestCount = 0;
      this.minuteStart = now;
    }

    if (this.requestCount >= RATE_LIMIT) {
      // Wait until the next minute
      const waitTime = 60000 - (now - this.minuteStart);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.minuteStart = Date.now();
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 200) {
      // 200ms minimum delay
      await new Promise((resolve) =>
        setTimeout(resolve, 200 - timeSinceLastRequest),
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private async fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
    try {
      await this.waitForRateLimit();
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * 2 ** retryCount;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, retryCount + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * 2 ** retryCount;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  private async fetchBatch(
    chainId: string,
    addresses: string[],
  ): Promise<DexScreenerPair[]> {
    // Ensure addresses are properly formatted (remove any whitespace and convert to lowercase)
    const formattedAddresses = addresses.map((addr) =>
      addr.trim().toLowerCase(),
    );

    // Construct the URL with proper encoding using the correct endpoint
    const url = `https://api.dexscreener.com/tokens/v1/${chainId}/${formattedAddresses.join(',')}`;

    try {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      // The API returns an array directly, not wrapped in a pairs property
      if (!Array.isArray(data)) {
        console.warn('Unexpected DexScreener response format:', data);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching DexScreener batch:', {
        chainId,
        addresses: formattedAddresses,
        error,
      });
      return [];
    }
  }

  async getTokenData(
    chainId: string,
    addresses: string[],
    onBatchComplete?: (batchData: Map<string, DexScreenerPair>) => void,
  ): Promise<Map<string, DexScreenerPair>> {
    const result = new Map<string, DexScreenerPair>();

    // Process addresses in batches from top to bottom
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const pairs = await this.fetchBatch(chainId, batch);

      // Store the pair with the highest liquidity for each token
      // Process in the same order as the input addresses
      const batchResult = new Map<string, DexScreenerPair>();
      for (const address of batch) {
        const lowerAddress = address.toLowerCase();
        const pair = pairs.find(
          (p) => p.baseToken.address.toLowerCase() === lowerAddress,
        );
        if (pair) {
          const existingPair = result.get(lowerAddress);
          if (
            !existingPair ||
            pair.liquidity.usd > existingPair.liquidity.usd
          ) {
            result.set(lowerAddress, pair);
            batchResult.set(lowerAddress, pair);
          }
        }
      }

      // Notify about the completed batch
      if (onBatchComplete) {
        onBatchComplete(batchResult);
      }
    }

    return result;
  }
}

export const dexscreenerService = new DexScreenerService();
