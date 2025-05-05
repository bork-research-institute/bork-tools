import { ChainStats } from '@/components/chain-stats';
import { ConnectButton } from '@/components/header/connect-button';
import { Egg } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-emerald-400/20 border-b bg-[#020617]/80 font-display text-center">
      <div className="mx-auto max-w-7xl px-4 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center justify-center space-x-1.5 text-xl text-white hover:opacity-80 transition-opacity"
            >
              <Egg className="h-5 w-5" />
              <h1 className="font-bogota">eggsight</h1>
              <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-xs">
                ALPHA
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <ChainStats />
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
