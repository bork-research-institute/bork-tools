import './globals.css';
import { METADATA } from '@/lib/constants/metadata';
import { PanelProvider } from '@/lib/contexts/PanelContext';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '../components/providers/query-client-provider';
import { SolanaProvider } from '../components/providers/solana-provider';
import { getClientEnv } from '../lib/config/client-env';

// This will throw if env vars are missing
getClientEnv();

const bolota = localFont({
  src: '../../public/fonts/Bolota Bold.ttf',
  variable: '--font-bolota',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = METADATA;

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning={true}
        className={`${bolota.variable} ${inter.variable} font-sans tracking-wide`}
      >
        <QueryClientProvider>
          <SolanaProvider>
            <PanelProvider>{children}</PanelProvider>
          </SolanaProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
