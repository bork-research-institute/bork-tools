import type { TokenAccountsResponse } from '../../../types/responses/helius-token-accounts-response';
import { getServerEnv } from '../../config/server-env';
import { BORK_MINT_ADDRESS } from '../../constants/bork-mint-address';
import { HELIUS_RPC_URL } from '../../constants/helius-rpc';
import { ITEMS_PER_PAGE } from '../../constants/items-per-page';
interface FetchTokenHoldersParams {
  pageParam?: {
    cursor?: string;
    before?: string;
    after?: string;
  };
}

export async function fetchTokenHolders({
  pageParam,
}: FetchTokenHoldersParams = {}): Promise<TokenAccountsResponse> {
  const env = getServerEnv();
  const response = await fetch(
    `${HELIUS_RPC_URL}/?api-key=${env.HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-holders',
        method: 'getTokenAccounts',
        params: {
          mint: BORK_MINT_ADDRESS,
          limit: ITEMS_PER_PAGE,
          ...pageParam,
          options: {
            showZeroBalance: false,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch token holders');
  }

  return response.json();
}
