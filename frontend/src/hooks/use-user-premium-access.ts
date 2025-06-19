import { useUserTokenBalance } from '@/hooks/use-user-token-balance';
import { isWhitelisted } from '@/lib/utils/whitelist';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSession } from 'next-auth/react';

export function useUserPremiumAccess() {
  const { status } = useSession();
  const { publicKey } = useWallet();
  const { data: hasEnoughTokens, isLoading, isError } = useUserTokenBalance();
  return {
    isLoading: status === 'loading' || isLoading,
    isError,
    isPremium:
      status === 'authenticated' &&
      (hasEnoughTokens || isWhitelisted(publicKey?.toString() ?? '')),
  };
}
