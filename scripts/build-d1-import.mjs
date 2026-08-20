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

// Always import the full catalog (minus translation-skipped products) so D1
// can never drift from the committed catalog: every product and its category
// rows are upserted on every deploy. Deploy race conditions or partial batches
// therefore cannot leave products/categories missing.
const skippedIds = new Set((catalog.translationSummary?.skippedProductIds || []).map(String));
const products = catalog.products.filter((product) => !skippedIds.has(String(product.productId)));
const productsById = new Map();
const productIdsBySlug = new Map();
let duplicateProductIds = 0;
for (const product of products) {
  const productId = String(product.productId || '').trim();
  const sourceId = String(product.sourceId || productId).trim();
  const slug = String(product.slug || '').trim();
  if (!productId) throw new Error(`Catalog product is missing productId: ${inputFile}`);
  if (sourceId !== productId) {
    throw new Error(`Catalog identity mismatch: productId ${productId} does not match sourceId ${sourceId}.`);
  }
  if (!slug) throw new Error(`Catalog product ${productId} is missing a slug.`);
  if (productsById.has(productId)) duplicateProductIds += 1;
  productsById.set(productId, product);
  const slugOwner = productIdsBySlug.get(slug);
  if (slugOwner && slugOwner !== productId) {
    throw new Error(`Catalog slug collision for ${locale}: ${slug} belongs to both ${slugOwner} and ${productId}.`);
  }
  productIdsBySlug.set(slug, productId);
}
const uniqueProducts = [...productsById.values()];
const batchSize = Math.max(1, Math.min(100, Number(process.env.OUOOO_D1_BATCH_SIZE || 25)));
const header = ['PRAGMA foreign_keys = ON;'];

// One statement block per product so we can emit both a single full file (used
// by reconcile-d1) and smaller batch files (used by the deploy). Large single
// requests to D1 have occasionally triggered Cloudflare's D1 storage error
// (code 7500); small batches keep each request well under the size that has
// been implicated in those incidents.
const productBlocks = uniqueProducts.map((product) => {
  const productId = String(product.productId);
  const block = [
    `INSERT INTO products (product_id, locale, slug, source_hash, updated_at, content_json) VALUES (${quote(productId)}, ${quote(locale)}, ${quote(product.slug)}, ${quote(product.localization?.sourceHash || '')}, ${quote(product.localization?.translations?.en?.updatedAt || catalog.generatedAt || new Date().toISOString())}, ${quote(JSON.stringify(product))}) ON CONFLICT(product_id, locale) DO UPDATE SET slug=excluded.slug, source_hash=excluded.source_hash, updated_at=excluded.updated_at, content_json=excluded.content_json;`,
    `DELETE FROM product_categories WHERE product_id=${quote(productId)} AND locale=${quote(locale)};`,
  ];
  const categoriesBySlug = new Map(
    (product.categories || []).filter((category) => category?.slug).map((category) => [String(category.slug), category])
  );
  for (const category of categoriesBySlug.values()) {
    block.push(
      `INSERT INTO product_categories (product_id, locale, category_slug, category_name) VALUES (${quote(productId)}, ${quote(locale)}, ${quote(category.slug)}, ${quote(category.name)});`
    );
  }
  return block;
});

const deletedProductIds = [...new Set((catalog.sync?.deletedProductIds || []).map(String))];
const deleteStatements = deletedProductIds.flatMap((productId) => [
  `DELETE FROM product_categories WHERE product_id=${quote(productId)} AND locale=${quote(locale)};`,
  `DELETE FROM products WHERE product_id=${quote(productId)} AND locale=${quote(locale)};`,
]);

await mkdir(dirname(outputFile), { recursive: true });

// Full single-file import (kept for reconcile-d1 which executes the whole file).
await writeFile(outputFile, `${[...header, ...productBlocks.flat(), ...deleteStatements].join('\n')}\n`, 'utf8');

// Small batch files (used by the deploy to keep each D1 request small).
let batchCount = 0;
for (let index = 0; index < productBlocks.length; index += batchSize) {
  batchCount += 1;
  const chunk = productBlocks.slice(index, index + batchSize);
  const batchStatements = [...header, ...chunk.flat(), ...(batchCount === 1 ? deleteStatements : [])];
  const batchBase = outputFile.endsWith('.sql') ? outputFile.slice(0, -4) : outputFile;
  const batchFile = `${batchBase}-${String(batchCount).padStart(3, '0')}.sql`;
  await writeFile(batchFile, `${batchStatements.join('\n')}\n`, 'utf8');
}

process.stdout.write(
  `D1 import prepared for ${locale}: ${uniqueProducts.length} unique upserts in ${batchCount} batches of ${batchSize}, ${deletedProductIds.length} deletes, ${duplicateProductIds} duplicate input rows collapsed.\n`
);
