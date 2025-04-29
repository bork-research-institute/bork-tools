'use client';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Button } from '@/components/ui/button';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

interface Props {
  disabled?: boolean;
}

export function ConnectWalletButton({ disabled }: Props) {
  const { setVisible } = useWalletModal();

  return (
    <Button
      className="flex w-48 items-center justify-center space-x-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1.5 text-xs text-white transition-all duration-200 hover:bg-emerald-400/20"
      type="button"
      onClick={() => {
        setVisible(true);
      }}
      disabled={disabled}
    >
      <Wallet className="h-3.5 w-3.5" />
      <span>connect wallet</span>
    </Button>
  );
}
