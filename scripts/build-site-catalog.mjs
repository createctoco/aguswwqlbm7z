import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputFile = resolve(process.env.OUOOO_ENRICHED_OUTPUT || 'src/data/enriched-catalog.json');
const outputFile = resolve(process.env.OUOOO_SITE_CATALOG_OUTPUT || 'src/data/site-catalog.json');
const accents = ['#8b6b4a', '#6f7c72', '#9a6b63', '#7a6d92', '#8a7b55', '#6d7887'];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function imageList(product) {
  return (product.images || [])
    .map((image) => ({ url: image.url || image.source_url || '', alt: image.alt || product.ai.title }))
    .filter(({ url }) => Boolean(url));
}

function mapProduct(product, index) {
  const gallery = imageList(product);
  const suffix = String(product.source_id).slice(-6).toLowerCase();
  return {
    sourceId: String(product.source_id),
    slug: `${slugify(product.ai.title)}-${suffix}`,
    title: product.ai.title,
    eyebrow: product.ai.product_type,
    summary: product.ai.short_description,
    description: product.ai.description,
    catholicContext: product.ai.catholic_context,
    catholicRelevance: product.ai.catholic_relevance,
    sku: product.sku || `OUO-${suffix.toUpperCase()}`,
    imageUrl: gallery[0]?.url || '',
    imageAlt: gallery[0]?.alt || product.ai.title,
    gallery,
    accent: accents[index % accents.length],
    features: product.ai.key_features || [],
    specifications: (product.ai.specifications || []).map(({ name, value }) => ({ name, value })),
    applications: product.ai.applications || [],
    faq: product.ai.faq || [],
    structuredData: product.structured_data,
  };
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const catalog = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error('Enriched catalog is empty.');
  const products = catalog.products.map(mapProduct);
  await writeFile(temporaryFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), products }, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Site catalog prepared: ${products.length} products.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
