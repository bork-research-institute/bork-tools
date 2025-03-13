'use client';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

export function SolanaProvider({ children }: PropsWithChildren) {
  const network = WalletAdapterNetwork.Mainnet; // Change to 'Devnet' or 'Testnet' if needed
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // ✅ Use real wallet adapters instead of UnsafeBurnerWalletAdapter
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  ); // Removed unnecessary network dependency

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
