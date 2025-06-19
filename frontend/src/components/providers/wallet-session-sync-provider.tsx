'use client';
import { useWalletSessionSync } from '@/hooks/use-wallet-session-sync';
import type { PropsWithChildren } from 'react';

export function WalletSessionSyncProvider({ children }: PropsWithChildren) {
  useWalletSessionSync();
  return children;
}
