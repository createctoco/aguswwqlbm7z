import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiKey = process.env.DEEPSEEK_API_KEY || '';
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const inputFile = resolve(process.env.MECRT_CATALOG_OUTPUT || 'src/data/catalog-index.json');
const outputFile = resolve(process.env.OUOOO_ENRICHED_OUTPUT || 'src/data/enriched-catalog.json');
const maxAttempts = 4;

if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required.');

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
const plainText = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const editorialProfiles = [
  ['buyer-first', 'Open with the buyer decision this product helps with, then move into concrete specifications.'],
  ['materials-first', 'Open with the verified material or visible construction, then explain practical sourcing considerations.'],
  ['design-first', 'Open with the product’s distinctive visual details, then move from appearance to verified specifications.'],
  ['use-context', 'Open with a grounded use or merchandising context supported by the facts, without inventing occasions or audiences.'],
  ['specification-first', 'Open with the clearest verified specification and use compact, procurement-friendly language.'],
  ['comparison-ready', 'Write so a buyer can compare this item with alternatives, emphasizing only factual differentiators.'],
];
const forbiddenPhrases = /\b(elevate|perfect blend|look no further|game[- ]changer|in today'?s|whether you(?:'re| are)|meticulously crafted|testament to|unlock|seamlessly|stand out from the crowd)\b/i;

function balancedEditorialProfile(product, counts) {
  const digest = createHash('sha256').update(String(product.source_id || product.wp_id)).digest();
  const minimum = Math.min(...counts);
  for (let offset = 0; offset < editorialProfiles.length; offset += 1) {
    const index = (digest[0] + offset) % editorialProfiles.length;
    if (counts[index] === minimum) {
      counts[index] += 1;
      return editorialProfiles[index];
    }
  }
  return editorialProfiles[0];
}

function shingles(value) {
  const words = plainText(value).toLowerCase().match(/[a-z0-9]+/g) || [];
  const result = new Set();
  for (let index = 0; index <= words.length - 4; index += 1) result.add(words.slice(index, index + 4).join(' '));
  return result;
}

function similarity(left, right) {
  const a = shingles(left);
  const b = shingles(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function productFacts(product) {
  return {
    source_id: product.source_id,
    sku: product.sku,
    original_title: product.title,
    original_short_description: plainText(product.short_description_html),
    original_description: plainText(product.description_html),
    categories: (product.categories || []).map(({ name }) => name),
    attributes: (product.attributes || []).map(({ name, values }) => ({ name, values })),
    weight: product.weight,
    pricing: product.pricing,
  };
}

function sourceFallback(product, profile, error) {
  const facts = productFacts(product);
  const sourceDescription = facts.original_description || facts.original_short_description || facts.original_title;
  const specifications = facts.attributes
    .filter(({ name, values }) => name && Array.isArray(values) && values.length)
    .map(({ name, values }) => ({ name, value: values.join(', ') }));
  return {
    product_type: facts.categories[0] || 'Product',
    primary_topic: facts.original_title,
    title: facts.original_title,
    meta_description: sourceDescription.slice(0, 180),
    short_description: facts.original_short_description || sourceDescription,
    description: sourceDescription,
    key_features: specifications.slice(0, 8).map(({ name, value }) => `${name}: ${value}`),
    specifications,
    applications: [],
    faq: [],
    source_id: product.source_id,
    editorial_profile: profile[0],
    enrichment_status: 'source_fallback',
    fallback_reason: error instanceof Error ? error.message.slice(0, 180) : 'AI enrichment unavailable.',
    generated_at: new Date().toISOString(),
    model,
  };
}

function structuredData(product, content) {
  const images = (product.images || []).map((image) => image.source_url || image.url).filter(Boolean);
  const additionalProperty = (content.specifications || []).map(({ name, value }) => ({
    '@type': 'PropertyValue',
    name,
    value,
  }));
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: content.title,
    description: content.meta_description || content.short_description,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(images.length ? { image: images } : {}),
    ...((product.categories || []).length ? { category: product.categories.map(({ name }) => name).join(', ') } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),
  };
  const faqSchema = (content.faq || []).length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: content.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }
    : null;
  return { product: productSchema, ...(faqSchema ? { faq: faqSchema } : {}) };
}

function validateContent(content, product, previousOutputs, profile) {
  if (!content || typeof content !== 'object') throw new Error('DeepSeek returned invalid JSON.');
  const requiredStrings = ['product_type', 'primary_topic', 'title', 'meta_description', 'short_description', 'description'];
  for (const key of requiredStrings) {
    if (typeof content[key] !== 'string' || !content[key].trim()) throw new Error(`DeepSeek field ${key} is missing.`);
  }
  if (content.title.length < 40 || content.title.length > 80) throw new Error('DeepSeek title must be 40 to 80 characters.');
  if (content.meta_description.length < 120 || content.meta_description.length > 180) throw new Error('DeepSeek meta description must be 120 to 180 characters.');
  if (!Array.isArray(content.key_features) || content.key_features.length < 2 || content.key_features.length > 8) {
    throw new Error('DeepSeek key_features must contain 2 to 8 items.');
  }
  if (!Array.isArray(content.faq) || content.faq.length < 2 || content.faq.length > 5) {
    throw new Error('DeepSeek faq must contain 2 to 5 items.');
  }
  if (!Array.isArray(content.specifications)) throw new Error('DeepSeek specifications must be an array.');
  if (!Array.isArray(content.applications)) throw new Error('DeepSeek applications must be an array.');
  const combined = [content.title, content.meta_description, content.short_description, content.description, ...content.key_features].join(' ');
  if (forbiddenPhrases.test(combined)) throw new Error('DeepSeek used a formulaic AI marketing phrase.');
  for (const previous of previousOutputs) {
    const previousText = [previous.title, previous.short_description, previous.description].join(' ');
    if (similarity(combined, previousText) > 0.34) throw new Error('DeepSeek output is too similar to another product.');
  }
  return {
    ...content,
    source_id: product.source_id,
    editorial_profile: profile[0],
    enrichment_status: 'generated',
    generated_at: new Date().toISOString(),
    model,
  };
}

async function rewriteProduct(product, previousOutputs, profile) {
  const facts = productFacts(product);
  const [profileName, profileDirection] = profile;
  const system = `You are a senior English B2B catalog editor for OUOOO, an independent sourcing website. First identify what the product actually is from its original title, categories, attributes, and descriptions; then write the copy. Return only a valid JSON object. Write genuinely useful copy for human wholesale buyers, conventional search engines, and answer engines. Ground every statement in the supplied facts. Never mention Mecrt, Alibaba, the source website, copying, or rewriting. Never invent materials, dimensions, certifications, MOQ, lead time, country of origin, stock, pricing, customization, audiences, occasions, benefits, or performance claims. If a fact is absent, omit it.\n\nSEO: express one clear product topic naturally in the title and opening; use specific entity-attribute-value language; keep related terms natural; avoid keyword stuffing and near-duplicate boilerplate.\nGEO: make factual answers self-contained and quotable; use direct answers in FAQ; name the product before pronouns; preserve concrete specifications and distinctions.\nHuman style: vary sentence length and paragraph rhythm; prefer plain, precise words; do not use hype, generic scene-setting, symmetrical list prose, repetitive transitions, or phrases such as “elevate,” “perfect blend,” “whether you're,” “meticulously crafted,” “testament to,” and “look no further.” Do not give every product the same opening or section order.\n\nAssigned editorial profile: ${profileName}. ${profileDirection}\n\nThe JSON must have exactly this structure: {"product_type":"specific product identity","primary_topic":"natural primary search topic","title":"40-80 character natural buyer-focused title","meta_description":"120-180 character factual summary","short_description":"one concise paragraph","description":"three to five varied factual paragraphs separated by newline characters","key_features":["specific verified fact"],"specifications":[{"name":"verified attribute","value":"verified value"}],"applications":["verified use only"],"faq":[{"question":"real buyer question","answer":"direct answer based only on supplied facts"}]}.`;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const body = {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Create the JSON product copy from these facts. Revision attempt ${attempt}; avoid formulaic overlap with other catalog entries.\n${JSON.stringify(facts)}` },
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        max_tokens: 1800,
        stream: false,
      };
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable) throw new Error(`DeepSeek rejected the request with HTTP ${response.status}.`);
        throw new Error(`Temporary DeepSeek error HTTP ${response.status}.`);
      }
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) throw new Error('DeepSeek returned empty content.');
      return validateContent(JSON.parse(raw), product, previousOutputs, profile);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /rejected the request/.test(error.message)) break;
      if (attempt < maxAttempts) await sleep(Math.min(20_000, 1500 * 2 ** (attempt - 1)) + Math.random() * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  process.stderr.write(`DeepSeek fallback for source_id ${product.source_id}: ${lastError instanceof Error ? lastError.message : 'unknown error'}\n`);
  return sourceFallback(product, profile, lastError);
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const catalog = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error('Catalog input is empty or invalid.');
  const products = [];
  const profileCounts = editorialProfiles.map(() => 0);
  for (const product of catalog.products) {
    process.stdout.write(`Rewriting product ${products.length + 1}/${catalog.products.length}...\n`);
    const profile = balancedEditorialProfile(product, profileCounts);
    const ai = await rewriteProduct(product, products.map(({ ai: previous }) => previous), profile);
    products.push({ ...product, ai, structured_data: structuredData(product, ai) });
  }
  const generated = products.filter(({ ai }) => ai.enrichment_status === 'generated').length;
  const result = {
    ...catalog,
    enriched_at: new Date().toISOString(),
    enrichment_model: model,
    enrichment_summary: { generated, source_fallback: products.length - generated },
    products,
  };
  await writeFile(temporaryFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Catalog enriched: ${products.length} products.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
