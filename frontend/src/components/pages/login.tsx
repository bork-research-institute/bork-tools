'use client';

import { ConnectButton } from '@/components/header/connect-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md border border-emerald-400/20 bg-emerald-400/5 p-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Welcome to Eggsight
          </h1>
          <p className="text-md text-zinc-300">
            Eggsight is currently in alpha and requires 100M $bork to have
            access.
          </p>
        </div>

        <div className="mb-8 flex flex-col space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ConnectButton />

            <p className="text-sm text-zinc-400">
              Connect your wallet and sign in to check eligibility
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-2 text-sm text-zinc-500">or</span>
            </div>
          </div>

          <Button
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white transition-all duration-200 hover:bg-emerald-400/20"
            onClick={() =>
              window.open(
                'https://raydium.io/swap/?inputMint=sol&outputMint=yzRagkRLnzG3ksiCRpknHNVc1nep6MMS7rKJv8YHGFM',
                '_blank',
              )
            }
          >
            <Coins className="h-5 w-5" />
            <span>Buy $BORK</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
