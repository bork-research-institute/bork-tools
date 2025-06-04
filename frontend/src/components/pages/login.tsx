'use client';

import { ConnectButton } from '@/components/header/connect-button';
import { Card } from '@/components/ui/card';
import { type AuthError, ERROR_MESSAGES } from '@/types/auth';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<AuthError | null>(null);

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
            Eggsight is currently in open alpha. Please connect your wallet to
            continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        <div className="mb-8 flex flex-col space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ConnectButton
              onError={(error) => setError(error)}
              disabled={error !== null}
            />

            <p className="text-sm text-zinc-400">
              Connect your wallet and sign in to continue.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
