import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const locale = String(process.env.OUOOO_LOCALE || '')
  .trim()
  .toLowerCase();
const localeDefinition = localeData.locales[locale];
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const inputFile = resolve(process.env.OUOOO_SOURCE_CATALOG || 'src/data/site-catalog.json');
const outputFile = resolve(process.env.OUOOO_TRANSLATED_OUTPUT || `src/data/i18n/${locale}/site-catalog.json`);
const maxAttempts = 5;

if (!locale || locale === localeData.defaultLocale || !localeDefinition) {
  throw new Error('OUOOO_LOCALE must be one configured non-English locale.');
}
if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required.');

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
const plainText = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function contentHash(value) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function sourceContent(product) {
  return {
    title: product.title,
    eyebrow: product.eyebrow,
    summary: product.summary,
    description: product.description,
    catholicContext: product.catholicContext,
    categories: product.categories.map(({ id, name, slug }) => ({ id, name, slug })),
    imageAlt: product.imageAlt,
    gallery: product.gallery.map(({ alt }) => ({ alt })),
    variantImages: product.variantImages.map(({ alt, label }) => ({ alt, label })),
    features: product.features,
    specifications: product.specifications,
    applications: product.applications,
    faq: product.faq,
  };
}

async function deepSeekJson(system, user, maxTokens = 2600) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable) throw new Error(`DeepSeek rejected translation with HTTP ${response.status}.`);
        throw new Error(`Temporary DeepSeek translation error HTTP ${response.status}.`);
      }
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('DeepSeek returned empty translation content.');
      return { value: JSON.parse(raw), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(Math.min(20_000, 1500 * 2 ** (attempt - 1)) + Math.random() * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('DeepSeek translation failed after retries.');
}

async function translateCategoryGlossary(products, previousCatalog) {
  const categories = Array.from(
    products.reduce((map, product) => {
      for (const category of product.categories || []) map.set(category.slug, category.name);
      return map;
    }, new Map())
  ).map(([slug, name]) => ({ slug, name }));
  const glossarySourceHash = contentHash(categories);
  if (
    previousCatalog?.categoryGlossary &&
    (!previousCatalog.categoryGlossarySourceHash || previousCatalog.categoryGlossarySourceHash === glossarySourceHash)
  ) {
    return { glossary: previousCatalog.categoryGlossary, sourceHash: glossarySourceHash, reused: true };
  }
  const system = `Translate an OUOOO B2B Catholic-gift catalog category glossary into ${localeDefinition.label}. Return only JSON: {"categories":{"slug":"translated display name"}}. Preserve every slug exactly. Use concise, natural wholesale catalog terminology. Translate Catholic terms accurately. Never add claims or source branding.`;
  const { value } = await deepSeekJson(system, JSON.stringify({ locale, categories }), 1000);
  if (!value?.categories || typeof value.categories !== 'object')
    throw new Error('Invalid translated category glossary.');
  for (const { slug } of categories) {
    if (typeof value.categories[slug] !== 'string' || !value.categories[slug].trim()) {
      throw new Error(`Missing translated category ${slug}.`);
    }
  }
  return { glossary: sanitizeSourceBrand(value.categories), sourceHash: glossarySourceHash, reused: false };
}

function validateTranslation(content, product, categoryGlossary) {
  if (!content || typeof content !== 'object') throw new Error('Invalid translated product JSON.');
  for (const key of ['title', 'eyebrow', 'summary', 'description', 'catholicContext', 'imageAlt']) {
    if (typeof content[key] !== 'string') throw new Error(`Translated field ${key} is invalid.`);
  }
  if (!content.title.trim() || content.title.length > 120) throw new Error('Translated title is empty or too long.');
  for (const key of ['features', 'specifications', 'applications', 'faq', 'gallery', 'variantImages']) {
    if (!Array.isArray(content[key])) throw new Error(`Translated field ${key} must be an array.`);
  }
  if (content.features.length !== product.features.length) throw new Error('Translated feature count changed.');
  if (content.specifications.length !== product.specifications.length)
    throw new Error('Translated specification count changed.');
  if (content.applications.length !== product.applications.length)
    throw new Error('Translated application count changed.');
  if (content.faq.length !== product.faq.length) throw new Error('Translated FAQ count changed.');
  if (content.gallery.length !== product.gallery.length) throw new Error('Translated gallery count changed.');
  if (content.variantImages.length !== product.variantImages.length)
    throw new Error('Translated variant count changed.');
  const categories = product.categories.map((category) => ({ ...category, name: categoryGlossary[category.slug] }));
  return sanitizeSourceBrand({ ...content, categories });
}

function localizedStructuredData(product, content) {
  const data = structuredClone(product.structuredData || {});
  if (data.product) {
    data.product.name = content.title;
    data.product.description = content.summary;
    if (content.categories.length) data.product.category = content.categories.map(({ name }) => name).join(', ');
    data.product.additionalProperty = content.specifications.map(({ name, value }) => ({
      '@type': 'PropertyValue',
      name,
      value,
    }));
  }
  if (content.faq.length) {
    data.faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq.map(({ question, answer }) => ({
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

async function translateProduct(product, categoryGlossary, previousProduct) {
  const sourceHash = product.localization?.sourceHash || contentHash(sourceContent(product));
  const previousState = previousProduct?.localization?.translations?.[locale];
  if (previousProduct && previousState?.status === 'ready' && previousState.sourceHash === sourceHash) {
    const productSchema = previousProduct.structuredData?.product;
    const sourceOffers = product.structuredData?.product?.offers;
    const structuredData = productSchema
      ? {
          ...previousProduct.structuredData,
          product: sourceOffers ? { ...productSchema, offers: sourceOffers } : { ...productSchema, offers: undefined },
        }
      : previousProduct.structuredData;
    return {
      product: {
        ...previousProduct,
        pricing: product.pricing,
        structuredData,
      },
      reused: true,
      skipped: false,
    };
  }

  const facts = sourceContent(product);
  const system = `You are translating structured OUOOO B2B Catholic-gift product copy from English into ${localeDefinition.label} (${locale}). Return only valid JSON. Translate naturally for professional wholesale buyers, SEO, answer engines, and Catholic readers. Preserve factual meaning exactly. Never add or remove materials, dimensions, uses, MOQ, prices, certifications, customization, blessings, spiritual effects, Church approval, or performance claims. Preserve the number and order of every array. Do not translate identifiers, SKUs, URLs, or slugs. Use the supplied category glossary exactly. Keep OUOOO uppercase. Never mention MECRT, Alibaba, a source website, copying, or AI. Use first-person plural when the English source refers to OUOOO. For Arabic use natural RTL Arabic; for Chinese use the requested script. Return exactly: {"title":"","eyebrow":"","summary":"","description":"","catholicContext":"","imageAlt":"","gallery":[{"alt":""}],"variantImages":[{"alt":"","label":""}],"features":[""],"specifications":[{"name":"","value":""}],"applications":[""],"faq":[{"question":"","answer":""}]}.`;

  try {
    const { value, attempts } = await deepSeekJson(
      system,
      JSON.stringify({ locale, categoryGlossary, productId: product.productId, content: facts })
    );
    const translated = validateTranslation(value, product, categoryGlossary);
    const localized = {
      ...product,
      locale,
      title: plainText(translated.title),
      eyebrow: plainText(translated.eyebrow),
      summary: plainText(translated.summary),
      description: translated.description.trim(),
      catholicContext: translated.catholicContext.trim(),
      categories: translated.categories,
      imageAlt: plainText(translated.imageAlt),
      gallery: product.gallery.map((image, index) => ({ ...image, alt: plainText(translated.gallery[index].alt) })),
      variantImages: product.variantImages.map((image, index) => ({
        ...image,
        alt: plainText(translated.variantImages[index].alt),
        label: plainText(translated.variantImages[index].label),
      })),
      features: translated.features.map(plainText),
      specifications: translated.specifications.map(({ name, value: translatedValue }) => ({
        name: plainText(name),
        value: plainText(translatedValue),
      })),
      applications: translated.applications.map(plainText),
      faq: translated.faq.map(({ question, answer }) => ({ question: plainText(question), answer: plainText(answer) })),
      localization: {
        ...product.localization,
        translations: {
          ...product.localization.translations,
          [locale]: {
            status: 'ready',
            sourceHash,
            contentHash: contentHash(translated),
            attempts,
            updatedAt: new Date().toISOString(),
            model,
          },
        },
      },
    };
    localized.structuredData = localizedStructuredData(product, localized);
    return { product: sanitizeSourceBrand(localized), reused: false, skipped: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 180) : 'Translation failed.';
    process.stderr.write(
      `Translation skipped ${locale}/${product.productId} after ${maxAttempts} attempts: ${reason}\n`
    );
    return { product: null, reused: false, skipped: true };
  }
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const sourceCatalog = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!Array.isArray(sourceCatalog.products) || sourceCatalog.products.length < 1)
    throw new Error('English catalog is empty.');
  const previousCatalog = await readFile(outputFile, 'utf8')
    .then(JSON.parse)
    .catch(() => ({ products: [] }));
  const previousById = new Map((previousCatalog.products || []).map((product) => [String(product.productId), product]));
  const categoryGlossaryResult = await translateCategoryGlossary(sourceCatalog.products, previousCatalog);
  const categoryGlossary = categoryGlossaryResult.glossary;
  const productsById = new Map((previousCatalog.products || []).map((product) => [String(product.productId), product]));
  let reused = 0;
  let skipped = 0;
  const skippedProductIds = [];
  for (const [index, sourceProduct] of sourceCatalog.products.entries()) {
    process.stdout.write(`Translating ${locale} ${index + 1}/${sourceCatalog.products.length}...\n`);
    const result = await translateProduct(
      sourceProduct,
      categoryGlossary,
      previousById.get(String(sourceProduct.productId))
    );
    if (result.product) productsById.set(String(result.product.productId), result.product);
    if (result.reused) reused += 1;
    if (result.skipped) {
      skipped += 1;
      skippedProductIds.push(String(sourceProduct.productId));
    }
  }
  const products = [...productsById.values()];
  const result = {
    schemaVersion: sourceCatalog.schemaVersion,
    locale,
    sourceLocale: localeData.defaultLocale,
    sourceCatalogHash: contentHash(
      sourceCatalog.products.map(({ productId, localization }) => ({ productId, sourceHash: localization.sourceHash }))
    ),
    generatedAt: new Date().toISOString(),
    sync: sourceCatalog.sync,
    categoryGlossary,
    categoryGlossarySourceHash: categoryGlossaryResult.sourceHash,
    translationSummary: {
      ready: sourceCatalog.products.length - skipped,
      skipped,
      skippedProductIds,
      reused,
      generated: sourceCatalog.products.length - skipped - reused,
      glossaryReused: categoryGlossaryResult.reused,
    },
    products,
  };
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(temporaryFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Translated ${locale}: ${products.length} ready, ${skipped} skipped, ${reused} reused.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
