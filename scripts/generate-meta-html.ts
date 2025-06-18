import fs from 'node:fs';
import path from 'node:path';
import { METADATA } from '../shared/src/constants/metadata';

const metaTags = (meta: typeof METADATA) =>
  `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.name}</title>
  <meta name="description" content="${meta.description}" />
  <meta name="keywords" content="${meta.keywords.join(',')}" />
  <meta name="application-name" content="${meta.applicationName}" />
  <meta name="apple-mobile-web-app-title" content="${meta.name}" />
  <link rel="icon" type="image/x-icon" href="${meta.icons.favicon}" />
  <link rel="icon" type="image/png" sizes="16x16" href="${meta.icons.favicon16}" />
  <link rel="icon" type="image/png" sizes="32x32" href="${meta.icons.favicon32}" />
  <link rel="apple-touch-icon" href="${meta.icons.appleTouchIcon}" />
  <link rel="icon" type="image/png" sizes="192x192" href="${meta.icons.android192}" />
  <link rel="icon" type="image/png" sizes="512x512" href="${meta.icons.android512}" />
  <link rel="manifest" href="/manifest.json" />
  <meta property="og:title" content="${meta.openGraph.title}" />
  <meta property="og:description" content="${meta.openGraph.description}" />
  <meta property="og:type" content="${meta.openGraph.type}" />
  <meta property="og:url" content="${meta.openGraph.url}" />
  <meta property="og:image" content="${meta.openGraph.image.replace('https://eggsight.xyz', '')}" />
  <meta name="twitter:card" content="${meta.twitter.card}" />
  <meta name="twitter:site" content="${meta.twitter.site}" />
  <meta name="twitter:title" content="${meta.twitter.title}" />
  <meta name="twitter:description" content="${meta.twitter.description}" />
  <meta name="twitter:image" content="${meta.twitter.image.replace('https://eggsight.xyz', '')}" />
`.trim();

const indexPath = path.resolve(__dirname, '../landing-page/index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const headOpen = html.indexOf('<head>') + 6;
const headClose = html.indexOf('</head>');
const before = html.slice(0, headOpen);
const after = html.slice(headClose);
const newHtml = `${before}\n${metaTags(METADATA)}\n${after}`;
fs.writeFileSync(indexPath, newHtml, 'utf8');

console.log('Meta tags injected into landing-page/index.html');
