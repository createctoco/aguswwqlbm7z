import type { APIRoute } from 'astro';

import { BUILD_LOCALE, BUILD_SITE_URL } from '~/i18n/config';
import { listSitemapSlugs } from '~/server/catalog';

export const prerender = false;

// Prerendered marketing and guide pages shared by every locale build.
const staticPaths = [
  '/',
  '/products',
  '/collections',
  '/about',
  '/contact',
  '/customization',
  '/guides',
  '/guides/choosing-rosary-materials',
  '/guides/8mm-vs-10mm-beads',
  '/faq',
  '/our-story',
  '/payment',
  '/privacy',
  '/returns',
  '/sourcing-agent',
  '/stock-wholesale',
  '/terms',
];

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const urlEntry = (path: string) => {
  const clean = path === '/' ? '/' : path.replace(/\/+$/, '');
  return `  <url><loc>${escapeXml(BUILD_SITE_URL + clean)}</loc></url>`;
};

export const GET: APIRoute = async () => {
  const { products, collections } = await listSitemapSlugs(BUILD_LOCALE);
  const entries = [
    ...staticPaths.map(urlEntry),
    ...products.map((slug) => urlEntry(`/products/${slug}`)),
    ...collections.map((slug) => urlEntry(`/collections/${slug}`)),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
