import { getServerEnv } from '@/lib/config/server-env';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const tokenMint = searchParams.get('tokenMint');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const { HELIUS_RPC_URL } = getServerEnv();

    // Fetch SOL balance
    const solResponse = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });

    if (!solResponse.ok) {
      throw new Error('Failed to fetch SOL balance');
    }

    const solData = await solResponse.json();
    const solBalance = solData.result?.value ?? 0;

    // Fetch token balance if mint is provided
    let tokenBalance = null;
    if (tokenMint) {
      const tokenResponse = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [address, { mint: tokenMint }, { encoding: 'jsonParsed' }],
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to fetch token balance');
      }

      const tokenData = await tokenResponse.json();
      const account = tokenData.result?.value?.[0];
      tokenBalance = account
        ? account.account.data.parsed.info.tokenAmount.uiAmount
        : 0;
    }

    return NextResponse.json({
      solBalance,
      tokenBalance,
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 },
    );
  }
}
