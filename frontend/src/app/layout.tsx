import './globals.css';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { SolanaProvider } from '@/components/providers/solana-provider';
import { SurveyBanner } from '@/components/survey-banner';
import { getClientEnv } from '@/lib/config/client-env';
import { METADATA } from '@/lib/constants/metadata';
import { PanelProvider } from '@/lib/contexts/PanelContext';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

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
        <SessionProvider>
          {/* <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="options-theme"
          > */}
          <QueryClientProvider>
            <SolanaProvider>
              <PanelProvider>
                <SurveyBanner />
                {children}
                <Toaster />
              </PanelProvider>
            </SolanaProvider>
          </QueryClientProvider>
          {/* </ThemeProvider> */}
        </SessionProvider>
      </body>
    </html>
  );
}
