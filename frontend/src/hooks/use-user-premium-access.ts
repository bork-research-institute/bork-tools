import { useUserTokenBalance } from '@/hooks/use-user-token-balance';
import { isWhitelisted } from '@/lib/utils/whitelist';
import { useWallet } from '@solana/wallet-adapter-react';

export function useUserPremiumAccess() {
  const { publicKey } = useWallet();
  const { data: hasEnoughTokens, isLoading, isError } = useUserTokenBalance();
  return {
    isLoading,
    isError,
    isPremium: hasEnoughTokens || isWhitelisted(publicKey?.toString() ?? ''),
  };
}
