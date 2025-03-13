import './globals.css';
import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '../components/providers/query-client-provider';
import { SolanaProvider } from '../components/providers/solana-provider';
import { getClientEnv } from '../lib/config/client-env';
// This will throw if env vars are missing
getClientEnv();

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <QueryClientProvider>
          <SolanaProvider>{children}</SolanaProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
