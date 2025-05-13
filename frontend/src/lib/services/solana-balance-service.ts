import { getClientEnv } from '../config/client-env';

interface BalanceResponse {
  solBalance: number;
  tokenBalance: number | null;
}

export async function getBalances(
  address: string,
  tokenMint?: string,
): Promise<BalanceResponse> {
  try {
    const params = new URLSearchParams({ address });
    if (tokenMint) {
      params.append('tokenMint', tokenMint);
    }

    const response = await fetch(
      `${getClientEnv().NEXT_PUBLIC_BACKEND_URL}/balance?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch balances');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw error;
  }
}
