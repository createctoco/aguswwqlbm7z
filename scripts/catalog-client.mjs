import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = (process.env.MECRT_CATALOG_URL || '').replace(/\/$/, '');
const secret = process.env.MECRT_CATALOG_BRIDGE_SECRET || '';
const outputFile = resolve(process.env.MECRT_CATALOG_OUTPUT || 'src/data/catalog-index.json');
const maxAttempts = 5;
const requestedLimit = Number.parseInt(process.env.MECRT_CATALOG_SYNC_LIMIT || '0', 10);
const syncLimit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 0;
const forceFullSync = /^(1|true|yes)$/i.test(process.env.MECRT_CATALOG_FULL_SYNC || '');
const requestedOverlap = Number.parseInt(process.env.MECRT_CATALOG_SYNC_OVERLAP_SECONDS || '300', 10);
const syncOverlapSeconds = Number.isFinite(requestedOverlap) && requestedOverlap >= 0 ? requestedOverlap : 300;

if (!baseUrl || secret.length < 32) {
  throw new Error('MECRT_CATALOG_URL and a 32+ character MECRT_CATALOG_BRIDGE_SECRET are required.');
}

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function canonical(route, timestamp, nonce, payload) {
  return `POST\n${route}\n${timestamp}\n${nonce}\n${payload}`;
}

async function signedPost(route, body, payload) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(24).toString('hex');
    const signature = createHmac('sha256', secret)
      .update(canonical(route, timestamp, nonce, payload))
      .digest('hex');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-mecrt-timestamp': timestamp,
          'x-mecrt-nonce': nonce,
          'x-mecrt-signature': signature,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) return data;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      const retryAfter = Number(data?.data?.retry_after || data?.retry_after || 0) * 1000;
      if (!retryable) throw new Error(`Catalog request rejected with HTTP ${response.status}.`);
      lastError = new Error(`Temporary catalog error HTTP ${response.status}.`);
      if (attempt < maxAttempts)
        await sleep(Math.max(retryAfter, Math.min(16_000, 1000 * 2 ** (attempt - 1))) + Math.random() * 500);
    } catch (error) {
      if (error instanceof Error && /rejected with HTTP/.test(error.message)) throw error;
      lastError = error;
      if (attempt < maxAttempts) await sleep(Math.min(16_000, 1000 * 2 ** (attempt - 1)) + Math.random() * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Catalog request failed after retries.');
}

async function fetchIndex() {
  const syncStartedAt = new Date().toISOString();
  const previousCatalog = await readFile(outputFile, 'utf8')
    .then(JSON.parse)
    .catch(() => ({ products: [] }));
  const previousProducts = Array.isArray(previousCatalog.products) ? previousCatalog.products : [];
  const fullSync = forceFullSync || previousProducts.length === 0;
  const previousCursor = previousCatalog.sync_cursor || previousCatalog.synchronized_at || '';
  const previousCursorTime = Date.parse(previousCursor);
  const modifiedAfter =
    !fullSync && Number.isFinite(previousCursorTime)
      ? new Date(Math.max(0, previousCursorTime - syncOverlapSeconds * 1000)).toISOString()
      : '';
  const summaries = new Map();
  const deletedSourceIds = new Set();
  let page = 1;
  let totalPages;
  let sourceTotal = Number(previousCatalog.source_total || previousProducts.length || 0);
  do {
    const pageSize = 100;
    const body = { page, page_size: pageSize, modified_after: modifiedAfter };
    const payload = `${page}\n${pageSize}\n${modifiedAfter}`;
    const data = await signedPost('/wp-json/mecrt-catalog/v1/products', body, payload);
    sourceTotal = Number(data.source_total ?? (fullSync ? data.total : sourceTotal) ?? 0);
    totalPages = Math.max(1, Number(data.total_pages || 1));
    for (const sourceId of data.deleted_source_ids || []) deletedSourceIds.add(String(sourceId));
    for (const product of data.products || []) {
      if (!product?.source_id) throw new Error(`Product on page ${page} has no source_id.`);
      summaries.set(String(product.source_id), product);
    }
    page += 1;
  } while (page <= totalPages);

  const productsById = new Map(
    (fullSync ? [] : previousProducts).map((product) => [String(product.source_id), product])
  );
  for (const sourceId of deletedSourceIds) productsById.delete(sourceId);
  let scanned = 0;
  for (const summary of summaries.values()) {
    const identifierType = 'source_id';
    const identifier = String(summary.source_id);
    const body = { identifier, identifier_type: identifierType };
    const payload = `${identifierType}\n${identifier}`;
    const data = await signedPost('/wp-json/mecrt-catalog/v1/product', body, payload);
    if (!data?.product) throw new Error(`Product detail missing for source_id ${identifier}.`);
    productsById.set(identifier, data.product);
    scanned += 1;
    process.stdout.write(`Catalog detail scanned: ${scanned}/${summaries.size}.\n`);
  }
  const availableProducts = [...productsById.values()];
  if (!fullSync && summaries.size === 0 && deletedSourceIds.size === 0) {
    process.stdout.write(`Catalog unchanged since ${modifiedAfter}; reusing ${availableProducts.length} products.\n`);
  }

  const categoryKey = (category) =>
    String(category?.slug || category?.id || category?.name || '')
      .trim()
      .toLowerCase();
  const categoryNames = new Map();
  const productCategories = new Map();
  for (const product of availableProducts) {
    const keys = [...new Set((product.categories || []).map(categoryKey).filter(Boolean))];
    const effectiveKeys = keys.length ? keys : ['uncategorized'];
    productCategories.set(String(product.source_id), effectiveKeys);
    for (const category of product.categories || []) {
      const key = categoryKey(category);
      if (key) categoryNames.set(key, String(category.name || category.slug || key));
    }
    if (!keys.length) categoryNames.set('uncategorized', 'Uncategorized');
  }

  const targetCount = syncLimit ? Math.min(syncLimit, availableProducts.length) : availableProducts.length;
  if (categoryNames.size > targetCount) {
    throw new Error(`Cannot cover ${categoryNames.size} categories with a ${targetCount}-product sync limit.`);
  }

  const selected = [];
  const selectedIds = new Set();
  const uncovered = new Set(categoryNames.keys());
  while (uncovered.size) {
    let bestProduct;
    let bestCoverage = 0;
    for (const product of availableProducts) {
      const id = String(product.source_id);
      if (selectedIds.has(id)) continue;
      const coverage = (productCategories.get(id) || []).filter((key) => uncovered.has(key)).length;
      if (coverage > bestCoverage) {
        bestProduct = product;
        bestCoverage = coverage;
      }
    }
    if (!bestProduct || bestCoverage === 0) break;
    selected.push(bestProduct);
    selectedIds.add(String(bestProduct.source_id));
    for (const key of productCategories.get(String(bestProduct.source_id)) || []) uncovered.delete(key);
  }

  const categoryQueues = new Map(
    [...categoryNames.keys()].map((key) => [
      key,
      availableProducts.filter((product) => (productCategories.get(String(product.source_id)) || []).includes(key)),
    ])
  );
  while (selected.length < targetCount) {
    let added = false;
    for (const queue of categoryQueues.values()) {
      const product = queue.find((candidate) => !selectedIds.has(String(candidate.source_id)));
      if (!product) continue;
      selected.push(product);
      selectedIds.add(String(product.source_id));
      added = true;
      if (selected.length >= targetCount) break;
    }
    if (!added) break;
  }

  const selectedCategoryCounts = Object.fromEntries(
    [...categoryNames.keys()].map((key) => [
      key,
      selected.filter((product) => (productCategories.get(String(product.source_id)) || []).includes(key)).length,
    ])
  );
  const uncoveredCategories = [...categoryNames.keys()].filter((key) => selectedCategoryCounts[key] < 1);
  if (uncoveredCategories.length) throw new Error(`Category coverage failed: ${uncoveredCategories.join(', ')}`);
  if (selected.length !== targetCount)
    throw new Error(`Selected ${selected.length} products instead of ${targetCount}.`);

  return {
    schema_version: '1.0',
    synchronized_at: new Date().toISOString(),
    sync_cursor: syncStartedAt,
    sync_mode: fullSync ? 'full' : 'incremental',
    modified_after: modifiedAfter || null,
    changed_products: summaries.size,
    deleted_products: deletedSourceIds.size,
    changed_source_ids: [...summaries.keys()],
    deleted_source_ids: [...deletedSourceIds],
    source_total: sourceTotal,
    total: selected.length,
    selection: {
      strategy: 'all-category-coverage-then-round-robin',
      available_product_count: availableProducts.length,
      discovered_categories: [...categoryNames].map(([slug, name]) => ({ slug, name })),
      selected_category_counts: selectedCategoryCounts,
      uncovered_categories: uncoveredCategories,
    },
    products: selected,
  };
}

const temporaryFile = `${outputFile}.tmp-${process.pid}`;
try {
  const catalog = await fetchIndex();
  if (catalog.total < 1) throw new Error('Catalog returned zero products; preserving the last successful catalog.');
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(temporaryFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, outputFile);
  process.stdout.write(`Catalog synchronized: ${catalog.total} products.\n`);
} catch (error) {
  await rm(temporaryFile, { force: true });
  throw error;
}
