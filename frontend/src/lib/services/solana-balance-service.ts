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

    const response = await fetch(`/api/balances?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch balances');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching balances:', error);
    throw error;
  }
}
