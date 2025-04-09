'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Egg, Wallet } from 'lucide-react';
import { trimAddress } from '../../lib/utils/trim-address';
import '@solana/wallet-adapter-react-ui/styles.css';
import {} from '@/lib/config/metrics';
import Link from 'next/link';
import {} from 'react';
import { ChainStats } from '../chain-stats';
import { Button } from '../ui/button';
import {} from '../ui/dropdown-menu';

export function Header() {
  const { setVisible } = useWalletModal();
  const { connected, disconnect, publicKey } = useWallet();

  return (
    <header className="border-emerald-400/20 border-b bg-[#020617]/80 font-display text-center">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 text-2xl text-white hover:opacity-80 transition-opacity"
            >
              <Egg className="h-6 w-6" />
              <h1 className="font-bogota">eggsight</h1>
              <span className="ml-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-sm">
                ALPHA
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <ChainStats />
            <Button
              className="flex w-48 items-center justify-center space-x-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white transition-all duration-200 hover:bg-emerald-400/20"
              type="button"
              onClick={() => {
                if (connected) {
                  disconnect();
                } else {
                  setVisible(true);
                }
              }}
            >
              <Wallet className="h-5 w-5" />
              <span>
                {connected && publicKey
                  ? trimAddress(publicKey.toString())
                  : 'connect wallet'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
