import type { APIRoute } from 'astro';

import { BUILD_SITE_URL } from '~/i18n/config';
import { products } from '~/data/products';

// Prerender the feed to a static file at build time (one file per locale
// build). Keeping it static avoids bundling the full product catalog into
// the Worker, which would exceed Cloudflare's Worker size limit.
export const prerender = true;

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const imageType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/webp';
};

// RSS 2.0 feed of the product catalog. Pinterest (and other feed readers)
// read the media:content / enclosure image URLs to auto-publish pins.
export const GET: APIRoute = async () => {
  const siteUrl = BUILD_SITE_URL;
  const items = products
    .map((product) => {
      const url = `${siteUrl}/products/${product.slug}`;
      const type = imageType(product.imageUrl);
      const price = product.pricing?.price
        ? ` Price: ${product.pricing.currency || 'USD'} ${product.pricing.price}${product.pricing.onSale ? ' (on sale)' : ''}.`
        : '';
      const description = `${product.summary || product.description || ''}${price}`;
      const category = product.categories?.[0]?.name || '';
      return `    <item>
      <title>${escapeXml(product.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(description)}</description>
      <media:content url="${escapeXml(product.imageUrl)}" medium="image" type="${type}" />
      <media:thumbnail url="${escapeXml(product.imageUrl)}" />
      <enclosure url="${escapeXml(product.imageUrl)}" type="${type}" length="0" />
      ${category ? `<category>${escapeXml(category)}</category>` : ''}
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>OUOOO — Wholesale Rosaries &amp; Custom Religious Gifts</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Curated rosaries, devotional jewelry, and custom religious gifts for global wholesale buyers.</description>
    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>OUOOO</generator>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
