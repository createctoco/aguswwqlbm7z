import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputFile = resolve(process.env.OUOOO_ENRICHED_OUTPUT || 'src/data/enriched-catalog.json');
const outputFile = resolve(process.env.OUOOO_SITE_CATALOG_OUTPUT || 'src/data/site-catalog.json');
const accents = ['#8b6b4a', '#6f7c72', '#9a6b63', '#7a6d92', '#8a7b55', '#6d7887'];
const unsuitableClaim =
  /\b(bless(?:ed|ing)?|consecrat(?:e|ed|ion)|miracul(?:ous|ously)|spiritual protection|church approv(?:al|ed))\b/i;
const replaceSourceBrand = (value = '') => {
  const text = String(value);
  return /^https?:\/\//i.test(text) ? text : text.replace(/\bmecrt(?:\.com)?\b/gi, 'OUOOO');
};
function sanitizeSourceBrand(value) {
  if (typeof value === 'string') return replaceSourceBrand(value);
  if (Array.isArray(value)) return value.map(sanitizeSourceBrand);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeSourceBrand(item)]));
  }
  return value;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

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

function sourceContentHash(product) {
  const content = {
    title: product.ai.title,
    productType: product.ai.product_type,
    summary: product.ai.short_description,
    description: product.ai.description,
    catholicContext: product.ai.catholic_context,
    catholicRelevance: product.ai.catholic_relevance,
    categories: product.categories,
    features: product.ai.key_features,
    specifications: product.ai.specifications,
    applications: product.ai.applications,
    faq: product.ai.faq,
  };
  return createHash('sha256').update(stableSerialize(content)).digest('hex');
}

function imageList(product) {
  return (product.images || [])
    .map((image) => ({ url: image.url || image.source_url || '', alt: image.alt || product.ai.title }))
    .filter(({ url }) => Boolean(url));
}

function variantImageList(product) {
  const seen = new Set();
  return (product.variations || []).flatMap((variation) => {
    const url = variation.image?.url || variation.image?.source_url || '';
    if (!url || seen.has(url)) return [];
    seen.add(url);
    const label =
      Object.values(variation.attributes || {})
        .filter(Boolean)
        .join(' / ') ||
      variation.sku ||
      'Variant';
    return [{ url, alt: `${product.ai.title} - ${label}`, label, sku: variation.sku || '' }];
  });
}

function buyerFaq(items) {
  return (items || []).filter(({ question = '', answer = '' }) => !unsuitableClaim.test(`${question} ${answer}`));
}

function cleanEditorialText(value) {
  return String(value || '')
    .split(/\n+/)
    .map((paragraph) =>
      paragraph
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !unsuitableClaim.test(sentence))
        .join(' ')
    )
    .filter(Boolean)
    .join('\n\n');
}

function structuredData(product, faq, pricing) {
  const data = structuredClone(product.structured_data || {});
  if (data.product) {
    data.product.name = product.ai.title;
    data.product.description = product.ai.meta_description || product.ai.short_description;
    if (pricing) {
      const offer = {
        '@type': 'Offer',
        price: pricing.price,
        priceCurrency: pricing.currency,
        availability: 'https://schema.org/InStock',
      };
      if (pricing.priceRange) {
        offer.priceSpecification = {
          '@type': 'PriceSpecification',
          minPrice: pricing.priceRange.min,
          maxPrice: pricing.priceRange.max,
          priceCurrency: pricing.currency,
        };
      }
      data.product.offers = offer;
    }
  }
  if (faq.length) {
    data.faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    };
  } else {
    delete data.faq;
  }
  return data;
}

function categoryList(product) {
  const seen = new Set();
  const categories = (product.categories || []).flatMap((category) => {
    const name = String(category?.name || '').trim();
    if (!name) return [];
    const slug = slugify(category.slug || name);
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);
    return [{ id: String(category.id || slug), name, slug }];
  });
  return categories.length
    ? categories
    : [{ id: 'uncategorized', name: 'Other Catholic Gifts', slug: 'other-catholic-gifts' }];
}

function extractPricing(product) {
  const numericPrice = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return undefined;
    const number = Number(text);
    return Number.isFinite(number) && number > 0 ? number : undefined;
  };

  const parentPrice = numericPrice(product.price ?? product._price);
  const regularPrice = numericPrice(product.regular_price ?? product._regular_price);
  const salePrice = numericPrice(product.sale_price ?? product._sale_price);
  const variationPrices = (product.variations || [])
    .map((variation) => numericPrice(variation.price ?? variation.sale_price ?? variation.regular_price))
    .filter((price) => price !== undefined);

  if (parentPrice === undefined && variationPrices.length === 0) return undefined;

  const minimumVariationPrice = variationPrices.length ? Math.min(...variationPrices) : undefined;
  const maximumVariationPrice = variationPrices.length ? Math.max(...variationPrices) : undefined;
  const effectivePrice = parentPrice ?? minimumVariationPrice;
  const currency = String(product.currency || product.currency_code || 'USD')
    .trim()
    .toUpperCase();
  const onSale =
    salePrice !== undefined &&
    regularPrice !== undefined &&
    salePrice < regularPrice;

  const priceRange =
    minimumVariationPrice !== undefined &&
    maximumVariationPrice !== undefined &&
    minimumVariationPrice !== maximumVariationPrice
      ? {
          min: minimumVariationPrice.toFixed(2),
          max: maximumVariationPrice.toFixed(2),
        }
      : undefined;

  return {
    price: effectivePrice.toFixed(2),
    regularPrice: regularPrice?.toFixed(2),
    currency,
    onSale,
    priceRange,
  };
}

function mapProduct(product, index, existingSlugs) {
  const gallery = imageList(product);
  const variantImages = variantImageList(product);
  const faq = buyerFaq(product.ai.faq);
  const suffix = String(product.source_id).slice(-6).toLowerCase();
  const productId = String(product.source_id);
  const sourceHash = sourceContentHash(product);
  const updatedAt = product.ai.generated_at || new Date().toISOString();
  const pricing = extractPricing(product);
  return sanitizeSourceBrand({
    productId,
    sourceId: productId,
    locale: 'en',
    slug: existingSlugs.get(productId) || `${slugify(product.ai.title)}-${suffix}`,
    title: product.ai.title,
    eyebrow: product.ai.product_type,
    summary: product.ai.short_description,
    description: cleanEditorialText(product.ai.description),
    catholicContext: product.ai.catholic_context,
    catholicRelevance: product.ai.catholic_relevance,
    categories: categoryList(product),
    sku: product.sku || `OUO-${suffix.toUpperCase()}`,
    imageUrl: gallery[0]?.url || '',
    imageAlt: gallery[0]?.alt || product.ai.title,
    gallery,
    variantImages,
    accent: accents[index % accents.length],
    features: product.ai.key_features || [],
    specifications: (product.ai.specifications || []).map(({ name, value }) => ({ name, value })),
    applications: product.ai.applications || [],
    faq,
    pricing,
    structuredData: structuredData(product, faq, pricing),
    localization: {
      sourceLocale: 'en',
      sourceHash,
      translations: {
        en: {
          status: 'source',
          sourceHash,
          contentHash: sourceHash,
          attempts: 0,
          updatedAt,
          model: product.ai.model || 'source',
        },
      },
    },
  });
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const catalog = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error('Enriched catalog is empty.');
  const existingCatalog = await readFile(outputFile, 'utf8')
    .then(JSON.parse)
    .catch(() => ({ products: [] }));
  const existingSlugs = new Map(
    (existingCatalog.products || []).map((product) => [String(product.productId || product.sourceId), product.slug])
  );
  const products = catalog.products.map((product, index) => mapProduct(product, index, existingSlugs));
  await writeFile(
    temporaryFile,
    `${JSON.stringify(sanitizeSourceBrand({ schemaVersion: 2, locale: 'en', generatedAt: new Date().toISOString(), selection: catalog.selection, enrichmentSummary: catalog.enrichment_summary, products }), null, 2)}\n`,
    'utf8'
  );
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Site catalog prepared: ${products.length} products.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
