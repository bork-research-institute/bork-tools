'use client';

import { checkTokenBalance } from '@/lib/utils/check-token-balance';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';

export function useUserTokenBalance() {
  const { publicKey } = useWallet();
  return useQuery({
    queryKey: ['userTokenBalance', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) {
        throw new Error('Wallet address is required');
      }
      return checkTokenBalance(publicKey.toString());
    },
    enabled: !!publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });
}
