import { useWallet } from '@solana/wallet-adapter-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function useWalletSessionSync() {
  const { publicKey } = useWallet();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    if (!publicKey || !session?.user?.id) {
      return;
    }

    const walletAddress = publicKey.toBase58 ? publicKey.toBase58() : publicKey;
    if (session.user.id !== walletAddress) {
      signOut();
    }
  }, [publicKey, session, status]);
}
