import './globals.css';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { SolanaProvider } from '@/components/providers/solana-provider';
import { WalletSessionSyncProvider } from '@/components/providers/wallet-session-sync-provider';
import { SurveyBanner } from '@/components/survey-banner';
import { getClientEnv } from '@/lib/config/client-env';
import { METADATA as SHARED_METADATA } from '@bork-tools/shared';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: SHARED_METADATA.name,
  description: SHARED_METADATA.description,
  keywords: SHARED_METADATA.keywords,
  applicationName: SHARED_METADATA.applicationName,
  icons: {
    icon: [
      { url: SHARED_METADATA.icons.favicon },
      {
        url: SHARED_METADATA.icons.favicon16,
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: SHARED_METADATA.icons.favicon32,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: SHARED_METADATA.icons.android192,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: SHARED_METADATA.icons.android512,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: SHARED_METADATA.icons.appleTouchIcon,
    shortcut: SHARED_METADATA.icons.favicon,
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-title': SHARED_METADATA.name,
  },
  openGraph: {
    title: SHARED_METADATA.openGraph.title,
    description: SHARED_METADATA.openGraph.description,
    url: SHARED_METADATA.openGraph.url,
    type: 'website' as const,
    images: [SHARED_METADATA.openGraph.image],
  },
  twitter: {
    card: 'summary_large_image' as const,
    site: SHARED_METADATA.twitter.site,
    title: SHARED_METADATA.twitter.title,
    description: SHARED_METADATA.twitter.description,
    images: [SHARED_METADATA.twitter.image],
  },
};

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
              <WalletSessionSyncProvider>
                <SurveyBanner />
                {children}
                <Toaster />
              </WalletSessionSyncProvider>
            </SolanaProvider>
          </QueryClientProvider>
          {/* </ThemeProvider> */}
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
