'use client';
import { ConnectWalletButton } from '@/components/header/connect-wallet-button';
import { SignInButton } from '@/components/header/sign-in-button';
import { Button } from '@/components/ui/button';
import { trimAddress } from '@/lib/utils/trim-address';
import type { AuthError } from '@/types/auth';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

interface Props {
  disabled?: boolean;
  onError?: (error: AuthError) => void;
}

export function ConnectButton({ onError, disabled }: Props) {
  const { data: session } = useSession();
  const { connected, disconnect, publicKey } = useWallet();

  if (!connected) {
    return <ConnectWalletButton disabled={disabled} />;
  }

  if (!session) {
    return <SignInButton onError={onError} disabled={disabled} />;
  }

  return (
    <div className="flex items-center space-x-2" data-tutorial="wallet-connect">
      <Button
        className="flex w-48 items-center justify-center space-x-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1.5 text-xs text-white transition-all duration-200 hover:bg-emerald-400/20"
        type="button"
        onClick={() => {
          if (connected) {
            disconnect();
            signOut();
          }
        }}
        disabled={disabled}
      >
        <Wallet className="h-3.5 w-3.5" />
        <span>
          {connected && publicKey && trimAddress(publicKey.toString())}
        </span>
      </Button>
    </div>
  );
}
