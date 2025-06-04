import { MIN_BORK_REQUIRED, STAKERS_API_BASE_URL } from '../constants/tokens';
import type { TokenBalanceResult } from '../types/token';
import { stakerSchema } from '../validators/staker-schema';

/**
 * Checks if a wallet address has the required minimum BORK token balance
 * @param walletAddress - The wallet address to check
 * @returns Promise<boolean> - True if wallet has required balance
 * @throws Error if API call fails or validation errors occur
 */
export async function checkTokenBalance(
  walletAddress: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${STAKERS_API_BASE_URL}/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const stakerData = stakerSchema.parse(data);
    return stakerData.total >= MIN_BORK_REQUIRED;
  } catch (error) {
    console.error('Error checking token balance:', error);
    throw error;
  }
}

/**
 * Enhanced version that returns detailed balance information
 * @param walletAddress - The wallet address to check
 * @returns Promise<TokenBalanceResult> - Detailed balance result
 */
export async function getTokenBalanceDetails(
  walletAddress: string,
): Promise<TokenBalanceResult> {
  try {
    const response = await fetch(`${STAKERS_API_BASE_URL}/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const stakerData = stakerSchema.parse(data);

    return {
      hasRequiredBalance: stakerData.total >= MIN_BORK_REQUIRED,
      actualBalance: stakerData.total,
      requiredBalance: MIN_BORK_REQUIRED,
    };
  } catch (error) {
    console.error('Error getting token balance details:', error);
    throw error;
  }
}
