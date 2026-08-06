import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const catalogPath = resolve(process.env.OUOOO_SITE_CATALOG_OUTPUT || 'src/data/site-catalog.json');
const temporaryPath = `${catalogPath}.tmp-${process.pid}`;

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function contentHash(product) {
  const content = {
    title: product.title,
    eyebrow: product.eyebrow,
    summary: product.summary,
    description: product.description,
    catholicContext: product.catholicContext,
    catholicRelevance: product.catholicRelevance,
    categories: product.categories,
    features: product.features,
    specifications: product.specifications,
    applications: product.applications,
    faq: product.faq,
  };
  return createHash('sha256').update(stableSerialize(content)).digest('hex');
}

try {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error('Site catalog is empty.');
  const updatedAt = catalog.generatedAt || new Date().toISOString();
  const products = catalog.products.map((product) => {
    const productId = String(product.productId || product.sourceId);
    const sourceHash = contentHash(product);
    return {
      ...product,
      productId,
      sourceId: String(product.sourceId || productId),
      locale: 'en',
      localization: {
        sourceLocale: 'en',
        sourceHash,
        translations: {
          ...(product.localization?.translations || {}),
          en: {
            status: 'source',
            sourceHash,
            contentHash: sourceHash,
            attempts: 0,
            updatedAt,
            model: product.localization?.translations?.en?.model || 'existing-english-catalog',
          },
        },
      },
    };
  });
  const output = { ...catalog, schemaVersion: 2, locale: 'en', products };
  await writeFile(temporaryPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, catalogPath);
  process.stdout.write(`Localization metadata stamped: ${products.length} English products.\n`);
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}
