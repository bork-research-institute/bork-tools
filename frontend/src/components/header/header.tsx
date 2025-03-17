'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ChevronDown, Egg, Lock, Wallet } from 'lucide-react';
import { trimAddress } from '../../lib/utils/trim-address';
import '@solana/wallet-adapter-react-ui/styles.css';
import {} from '@/lib/config/metrics';
import { getChainStats } from '@/lib/services/defillama';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChainStats } from '../chain-stats';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type Chain = {
  name: 'Injective' | 'Solana';
  available: boolean;
  logo: string;
};

const chains: Chain[] = [
  {
    name: 'Injective',
    available: true,
    logo: '/assets/injective-logo.webp',
  },
  {
    name: 'Solana',
    available: false,
    logo: '/assets/solana-logo.png',
  },
];

export function Header() {
  const { setVisible } = useWalletModal();
  const { connected, disconnect, publicKey } = useWallet();
  const [selectedChain, setSelectedChain] = useState<Chain>(chains[0]);
  const [chainStats, setChainStats] = useState<{
    price: number;
    volume24h: number;
    volumeChange24h: number;
  } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (selectedChain.available) {
        const stats = await getChainStats(selectedChain.name);
        setChainStats(stats);
      }
    }
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [selectedChain]);

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
            <div className="flex items-center space-x-4">
              {chainStats && <ChainStats {...chainStats} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild={true}>
                  <Button variant="ghost" className="text-white">
                    <Image
                      src={selectedChain.logo}
                      alt={selectedChain.name}
                      width={20}
                      height={20}
                      className="mr-2"
                    />
                    {selectedChain.name}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-[#020617] border-emerald-400/20">
                  {chains.map((chain) => (
                    <DropdownMenuItem
                      key={chain.name}
                      disabled={!chain.available}
                      className="text-white hover:bg-emerald-400/10 cursor-pointer"
                      onClick={() => chain.available && setSelectedChain(chain)}
                    >
                      <span className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Image
                            src={chain.logo}
                            alt={chain.name}
                            width={20}
                            height={20}
                            className="mr-2"
                          />
                          {chain.name}
                        </div>
                        {!chain.available && (
                          <Lock className="h-4 w-4 text-gray-500" />
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
