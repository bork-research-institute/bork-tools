'use client';

import { checkTokenBalance } from '@/lib/utils/check-token-balance';
import { isWhitelisted } from '@/lib/utils/whitelist';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '@solana/web3.js';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { connected, publicKey, connecting } = useWallet();
  const { data: session, status } = useSession();
  const router = useRouter();

  const signOutUser = useCallback(
    async (reason: string) => {
      console.log(`Signing out user: ${reason}`);
      toast.error(reason);

      // Sign out and redirect
      await signOut({ redirect: false });
      router.push('/login');
    },
    [router],
  );

  const performAuthCheck = useCallback(
    async (publicKey: PublicKey | null) => {
      try {
        // Check if wallet is still connected
        if (!publicKey) {
          await signOutUser(
            'Wallet disconnected. Please reconnect and sign in again.',
          );
          return;
        }

        if (isWhitelisted(publicKey.toString())) {
          return;
        }

        // Check token balance
        const hasEnoughTokens = await checkTokenBalance(publicKey.toString());
        if (!hasEnoughTokens) {
          await signOutUser(
            'Insufficient $BORK tokens. You need at least 100M $BORK to access Eggsight.',
          );
          return;
        }
      } catch (error) {
        console.error('Error during auth check:', error);
        await signOutUser(
          'Authentication verification failed. Please sign in again.',
        );
      }
    },
    [signOutUser],
  );

  // Effect to handle wallet connection changes
  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }

    if (!session) {
      signOutUser('Session expired. Please sign in again.');
    }

    if (connecting) {
      return;
    }

    // If user is authenticated, start periodic checks
    if (session && connected) {
      // Perform check
      performAuthCheck(publicKey);
    } else {
      signOutUser('Wallet disconnected. Please reconnect and sign in again.');
    }
  }, [
    session,
    status,
    performAuthCheck,
    connected,
    publicKey,
    signOutUser,
    connecting,
  ]);

  return <>{children}</>;
}
