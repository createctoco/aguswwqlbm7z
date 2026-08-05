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

function validateContent(content, product) {
  if (!content || typeof content !== 'object') throw new Error('DeepSeek returned invalid JSON.');
  const requiredStrings = ['title', 'meta_description', 'short_description', 'description'];
  for (const key of requiredStrings) {
    if (typeof content[key] !== 'string' || !content[key].trim()) throw new Error(`DeepSeek field ${key} is missing.`);
  }
  if (content.title.length > 80) throw new Error('DeepSeek title is longer than 80 characters.');
  if (content.meta_description.length > 180) throw new Error('DeepSeek meta description is longer than 180 characters.');
  if (!Array.isArray(content.key_features) || content.key_features.length < 2 || content.key_features.length > 8) {
    throw new Error('DeepSeek key_features must contain 2 to 8 items.');
  }
  if (!Array.isArray(content.faq) || content.faq.length < 2 || content.faq.length > 5) {
    throw new Error('DeepSeek faq must contain 2 to 5 items.');
  }
  return {
    ...content,
    source_id: product.source_id,
    generated_at: new Date().toISOString(),
    model,
  };
}

async function rewriteProduct(product) {
  const facts = productFacts(product);
  const system = `You are an English B2B catalog editor for OUOOO, an independent sourcing website. Return only a valid JSON object. Rewrite the supplied product facts into original, natural English for wholesale buyers and AI search engines. Never mention Mecrt, Alibaba, the source website, or copying/rephrasing. Never invent materials, dimensions, certifications, MOQ, lead time, country of origin, stock, pricing, customization, or performance claims. If a fact is absent, omit it. Avoid keyword stuffing and superlatives. The JSON must have exactly this useful structure: {"title":"60-75 character buyer-focused title","meta_description":"140-165 character summary","short_description":"one concise paragraph","description":"three to five factual paragraphs separated by newline characters","key_features":["fact"],"faq":[{"question":"buyer question","answer":"answer based only on supplied facts"}]}.`;
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Create the JSON product copy from these facts:\n${JSON.stringify(facts)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1600,
    stream: false,
  };

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
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
      return validateContent(JSON.parse(raw), product);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /rejected the request/.test(error.message)) throw error;
      if (attempt < maxAttempts) await sleep(Math.min(20_000, 1500 * 2 ** (attempt - 1)) + Math.random() * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('DeepSeek enrichment failed after retries.');
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const catalog = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) throw new Error('Catalog input is empty or invalid.');
  const products = [];
  for (const product of catalog.products) {
    process.stdout.write(`Rewriting product ${products.length + 1}/${catalog.products.length}...\n`);
    products.push({ ...product, ai: await rewriteProduct(product) });
  }
  const result = { ...catalog, enriched_at: new Date().toISOString(), enrichment_model: model, products };
  await writeFile(temporaryFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Catalog enriched: ${products.length} products.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
