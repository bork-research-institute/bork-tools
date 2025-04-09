'use client';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Button } from '@/components/ui/button';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

export function ConnectWalletButton() {
  const { setVisible } = useWalletModal();

  return (
    <Button
      className="flex w-48 items-center justify-center space-x-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white transition-all duration-200 hover:bg-emerald-400/20"
      type="button"
      onClick={() => {
        setVisible(true);
      }}
    >
      <Wallet className="h-5 w-5" />
      <span>{'connect wallet'}</span>
    </Button>
  );
}
