import { METADATA } from '@bork-tools/shared';
import { Helmet } from 'react-helmet-async';

export function Meta() {
  return (
    <Helmet>
      <title>{METADATA.name}</title>
      <meta name="description" content={METADATA.description} />
      <meta name="keywords" content={METADATA.keywords.join(',')} />
      <meta name="application-name" content={METADATA.applicationName} />
      {/* Icons */}
      <link rel="icon" type="image/x-icon" href="/assets/eggsight.ico" />
      <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
      <link
        rel="icon"
        type="image/png"
        sizes="192x192"
        href="/assets/android-chrome-192x192.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="512x512"
        href="/assets/android-chrome-512x512.png"
      />
      {/* Open Graph */}
      <meta property="og:title" content={METADATA.openGraph.title} />
      <meta
        property="og:description"
        content={METADATA.openGraph.description}
      />
      <meta property="og:type" content={METADATA.openGraph.type} />
      <meta property="og:url" content={METADATA.openGraph.url} />
      <meta
        property="og:image"
        content={METADATA.openGraph.image.replace(
          'https://eggsight.xyz',
          '/assets',
        )}
      />
      {/* Twitter Card */}
      <meta name="twitter:card" content={METADATA.twitter.card} />
      <meta name="twitter:site" content={METADATA.twitter.site} />
      <meta name="twitter:title" content={METADATA.twitter.title} />
      <meta name="twitter:description" content={METADATA.twitter.description} />
      <meta
        name="twitter:image"
        content={METADATA.twitter.image.replace(
          'https://eggsight.xyz',
          '/assets',
        )}
      />
    </Helmet>
  );
}
