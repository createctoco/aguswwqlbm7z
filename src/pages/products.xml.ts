import type { APIRoute } from 'astro';

import { BUILD_SITE_URL } from '~/i18n/config';
import { products } from '~/data/products';

// Prerender a Google Shopping / Merchant Center product feed to a static
// file at build time (one per locale build). Static generation keeps the
// full product catalog out of the Worker bundle.
export const prerender = true;

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const plainText = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatPrice = (value: string, currency: string) => `${Number(value).toFixed(2)} ${currency}`;

export const GET: APIRoute = async () => {
  const siteUrl = BUILD_SITE_URL;
  const entries = products
    .filter((product) => product.pricing?.price)
    .map((product) => {
      const price = Number(product.pricing!.price);
      const regularPrice = product.pricing!.regularPrice ? Number(product.pricing!.regularPrice) : price;
      const displayPrice = Math.max(price, regularPrice);
      const salePrice = product.pricing!.onSale && price < regularPrice ? price : null;
      const url = `${siteUrl}/products/${product.slug}`;
      const description = plainText(product.summary || product.description || product.title);
      const category = product.categories?.[0]?.name || '';
      return `  <entry>
    <g:id>${escapeXml(product.sku || product.productId)}</g:id>
    <g:title>${escapeXml(product.title)}</g:title>
    <g:description>${escapeXml(description)}</g:description>
    <g:link>${escapeXml(url)}</g:link>
    <g:image_link>${escapeXml(product.imageUrl)}</g:image_link>
    <g:availability>in stock</g:availability>
    <g:price>${escapeXml(formatPrice(String(displayPrice), product.pricing!.currency || 'USD'))}</g:price>
    ${salePrice !== null ? `<g:sale_price>${escapeXml(formatPrice(String(salePrice), product.pricing!.currency || 'USD'))}</g:sale_price>` : ''}
    <g:brand>OUOOO</g:brand>
    <g:condition>new</g:condition>
    ${category ? `<g:product_type>${escapeXml(category)}</g:product_type>` : ''}
    <g:identifier_exists>false</g:identifier_exists>
  </entry>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>OUOOO — Wholesale Rosaries &amp; Custom Religious Gifts</title>
  <link rel="alternate" type="text/html" href="${escapeXml(siteUrl)}/" />
  <updated>${new Date().toISOString()}</updated>
${entries}
</feed>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
