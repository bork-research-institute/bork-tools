import { getServerEnv } from '../../config/server-env';

export const getTokenAccountsByMint = async (mint: string) => {
  // Convert mint string to PublicKey
  const rpcUrl = getServerEnv().RPC_URL;

  // Get all token accounts for the mint using Helius RPC
  console.log('Fetching all token accounts for the mint...');
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-token-accounts',
      method: 'getTokenAccounts',
      params: {
        mint: mint,
        options: {
          showZeroBalance: false,
        },
      },
    }),
  });

  const data = await response.json();
  const tokenAccounts = data.result.token_accounts;
  console.log('Fetched accounts:', tokenAccounts.length);

  // Calculate total balance
  let totalBalance = BigInt(0);
  for (const account of tokenAccounts) {
    try {
      totalBalance += BigInt(account.amount);
    } catch (error) {
      console.error(`Error processing account ${account.address}:`, error);
    }
  }

  console.log('Total balance:', totalBalance.toString());

  return tokenAccounts;
};
