'use client';
import { ConnectWalletButton } from '@/components/header/connect-wallet-button';
import { SignInButton } from '@/components/header/sign-in-button';
import { Button } from '@/components/ui/button';
import { trimAddress } from '@/lib/utils/trim-address';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

export function ConnectButton() {
  const { data: session } = useSession();
  const { connected, disconnect, publicKey } = useWallet();

  if (!connected) {
    return <ConnectWalletButton />;
  }

  if (!session) {
    return <SignInButton />;
  }

  return (
    <Button
      className="flex w-48 items-center justify-center space-x-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white transition-all duration-200 hover:bg-emerald-400/20"
      type="button"
      onClick={() => {
        if (connected) {
          disconnect();
          signOut();
        }
      }}
    >
      <Wallet className="h-5 w-5" />
      <span>{connected && publicKey && trimAddress(publicKey.toString())}</span>
    </Button>
  );
}
