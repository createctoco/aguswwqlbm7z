Exit code: 0
Wall time: 1.7 seconds
Output:
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const locale = String(process.env.OUOOO_LOCALE || 'en')
  .trim()
  .toLowerCase();
const inputFile = resolve(
  process.env.OUOOO_D1_CATALOG_INPUT ||
    (locale === 'en' ? 'src/data/site-catalog.json' : `src/data/i18n/${locale}/site-catalog.json`)
);
const outputFile = resolve(process.env.OUOOO_D1_IMPORT_OUTPUT || `.d1/import-${locale}.sql`);
const quote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;

const catalog = JSON.parse(await readFile(inputFile, 'utf8'));
if (!Array.isArray(catalog.products)) throw new Error(`Invalid catalog: ${inputFile}`);

const changedIds = new Set((catalog.sync?.changedProductIds || []).map(String));
const isIncremental = catalog.sync?.mode === 'incremental' && changedIds.size > 0;
const products = isIncremental
  ? catalog.products.filter((product) => changedIds.has(String(product.productId)))
  : catalog.products;
const statements = ['PRAGMA foreign_keys = ON;'];

for (const product of products) {
  const productId = String(product.productId);
  statements.push(
    `INSERT INTO products (product_id, locale, slug, source_hash, updated_at, content_json) VALUES (${quote(productId)}, ${quote(locale)}, ${quote(product.slug)}, ${quote(product.localization?.sourceHash || '')}, ${quote(catalog.generatedAt || new Date().toISOString())}, ${quote(JSON.stringify(product))}) ON CONFLICT(product_id, locale) DO UPDATE SET slug=excluded.slug, source_hash=excluded.source_hash, updated_at=excluded.updated_at, content_json=excluded.content_json;`,
    `DELETE FROM product_categories WHERE product_id=${quote(productId)} AND locale=${quote(locale)};`
  );
  for (const category of product.categories || []) {
    statements.push(
      `INSERT INTO product_categories (product_id, locale, category_slug, category_name) VALUES (${quote(productId)}, ${quote(locale)}, ${quote(category.slug)}, ${quote(category.name)});`
    );
  }
}

for (const productId of catalog.sync?.deletedProductIds || []) {
  statements.push(`DELETE FROM products WHERE product_id=${quote(productId)} AND locale=${quote(locale)};`);
}

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${statements.join('\n')}\n`, 'utf8');
process.stdout.write(
  `D1 import prepared for ${locale}: ${products.length} upserts, ${(catalog.sync?.deletedProductIds || []).length} deletes.\n`
);

