'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ChevronDown, PocketKnife, Wallet } from 'lucide-react';
import { trimAddress } from '../../lib/utils/trim-address';
import '@solana/wallet-adapter-react-ui/styles.css';
import Link from 'next/link';
import { METADATA } from '../../lib/constants/metadata';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type NavigationItem = {
  name: string;
  href?: string;
  items?: NavigationItem[];
};

type Navigation = {
  [key: string]: NavigationItem[];
};

const navigation: Navigation = {
  published: [
    { name: 'Bork Staking Leaderboard', href: '/leaderboard' },
    { name: 'X Analysis', href: '/x-analysis' },
  ],
  researching: [
    {
      name: 'GFM Tools',
      items: [
        { name: 'Bonding Curve Launch', href: '/gfm/bonding-curve' },
        { name: 'Chef Launch', href: '/gfm/chef' },
        { name: 'GFM Volume Bot', href: '/gfm/volume-bot' },
        { name: 'GFM Micro Trading', href: '/gfm/micro-trading' },
        { name: 'GFM Bundled Buy', href: '/gfm/bundled-buy' },
        { name: 'GFM Bundled Sell', href: '/gfm/bundled-sell' },
        {
          name: 'GFM New Address Buy ^makers',
          href: '/gfm/new-address-buy-makers',
        },
        {
          name: 'GFM New Address Buy ^holders',
          href: '/gfm/new-address-buy-holders',
        },
        { name: 'GFM Anti-MEV Volume Bot', href: '/gfm/anti-mev-volume-bot' },
        { name: 'GFM Sell and Bundled Buy', href: '/gfm/sell-bundled-buy' },
      ],
    },
  ],
};

export function Header() {
  const { setVisible } = useWalletModal();
  const { connected, disconnect, publicKey } = useWallet();

  return (
    <header className="border-emerald-400/20 border-b bg-[#020617]/80">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 font-bold text-2xl text-white hover:opacity-80 transition-opacity"
            >
              <PocketKnife className="h-6 w-6" />
              <h1>{METADATA.title?.toString()}</h1>
              <span className="ml-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-sm">
                ALPHA
              </span>
            </Link>
            <nav className="flex items-center space-x-4">
              {Object.entries(navigation).map(([section, items]) => (
                <div key={section} className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild={true}>
                      <Button variant="ghost" className="text-white capitalize">
                        {section}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-[#020617] border-emerald-400/20">
                      {items.map((item) =>
                        item.items ? (
                          <DropdownMenu key={item.name}>
                            <DropdownMenuTrigger asChild={true}>
                              <DropdownMenuItem className="text-white hover:bg-emerald-400/10">
                                {item.name}
                                <ChevronDown className="ml-auto h-4 w-4" />
                              </DropdownMenuItem>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-[#020617] border-emerald-400/20">
                              {item.items.map((subItem) => (
                                <DropdownMenuItem
                                  key={subItem.name}
                                  asChild={true}
                                >
                                  <Link
                                    href={subItem.href || '#'}
                                    className="text-white hover:bg-emerald-400/10"
                                  >
                                    {subItem.name}
                                  </Link>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <DropdownMenuItem key={item.name} asChild={true}>
                            <Link
                              href={item.href || '#'}
                              className="text-white hover:bg-emerald-400/10"
                            >
                              {item.name}
                            </Link>
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
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
