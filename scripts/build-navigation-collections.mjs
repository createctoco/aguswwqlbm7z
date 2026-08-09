import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const outputFile = resolve('src/data/navigation-collections.json');
const existing = await readFile(outputFile, 'utf8')
  .then(JSON.parse)
  .catch(() => ({}));

for (const locale of Object.keys(localeData.locales)) {
  const catalogFile = resolve(
    locale === localeData.defaultLocale ? 'src/data/site-catalog.json' : `src/data/i18n/${locale}/site-catalog.json`
  );
  const catalog = await readFile(catalogFile, 'utf8')
    .then(JSON.parse)
    .catch(() => ({ products: [] }));
  const categories = new Map((existing[locale] || []).map(({ slug, name }) => [slug, { slug, name }]));
  for (const product of catalog.products || []) {
    for (const category of product.categories || []) {
      if (category?.slug && category?.name) categories.set(category.slug, { slug: category.slug, name: category.name });
    }
  }
  existing[locale] = [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
}

await writeFile(outputFile, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
process.stdout.write('Navigation collection index updated.\n');
