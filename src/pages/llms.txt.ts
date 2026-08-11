import type { APIRoute } from 'astro';

import { BUILD_LOCALE, BUILD_SITE_URL, LOCALES } from '~/i18n/config';
import { listProductsBrief } from '~/server/catalog';

export const prerender = false;

const oneLine = (value: string, maximum = 220) => {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maximum ? text.slice(0, maximum).replace(/\s+\S*$/, '') + '...' : text;
};

export const GET: APIRoute = async () => {
  const language = LOCALES[BUILD_LOCALE].label;
  const products = await listProductsBrief(BUILD_LOCALE);
  const lines: string[] = [];
  lines.push('# OUOOO');
  lines.push('');
  lines.push(
    '> A curated B2B sourcing catalog for wholesale rosaries, devotional jewelry, and custom religious gifts.'
  );
  lines.push('');
  lines.push(`OUOOO (${BUILD_SITE_URL}) is a wholesale product catalog and inquiry site available in ${language}. `);
  lines.push(
    'It lists verified products with materials, variants, pricing, and devotional context for international buyers.'
  );
  lines.push('');
  lines.push('## Key sections');
  lines.push('- [Products](/products): the full wholesale product catalog, most recently updated first');
  lines.push('- [Collections](/collections): browse products by category');
  lines.push('- [Sourcing guides](/guides): bead materials and sizing guidance');
  lines.push('- [About](/about): about OUOOO');
  lines.push('- [Contact](/contact): send a wholesale inquiry');
  lines.push('');
  lines.push(`## Product catalog (${products.length} products)`);
  for (const product of products) {
    lines.push(`- [${product.title}](${BUILD_SITE_URL}/products/${product.slug}): ${oneLine(product.summary)}`);
  }
  lines.push('');
  const body = lines.join('\n');
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
