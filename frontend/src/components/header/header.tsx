import { ChainStats } from '@/components/chain-stats';
import { ConnectButton } from '@/components/header/connect-button';
import { Egg } from 'lucide-react';
import Link from 'next/link';

export function Header() {
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
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
