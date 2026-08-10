import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = (process.env.MECRT_CATALOG_URL || '').replace(/\/$/, '');
const secret = process.env.MECRT_CATALOG_BRIDGE_SECRET || '';
const outputFile = resolve(process.env.MECRT_CATALOG_OUTPUT || 'src/data/catalog-index.json');
const maxAttempts = 5;
const requestedBatchSize = Number.parseInt(process.env.MECRT_CATALOG_BATCH_SIZE || '10', 10);
const batchSize = Number.isFinite(requestedBatchSize) ? Math.max(1, Math.min(10, requestedBatchSize)) : 10;
const requestedConcurrency = Number.parseInt(process.env.MECRT_CATALOG_SYNC_CONCURRENCY || '2', 10);
const detailConcurrency = Number.isFinite(requestedConcurrency) ? Math.max(1, Math.min(4, requestedConcurrency)) : 2;
const queueFile = resolve(process.env.MECRT_CATALOG_QUEUE_FILE || '.ouooo-control/catalog-queue.json');
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
      const raw = await response.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
      if (response.ok && data?.success) return data;
      const retryAfter = Number(data?.data?.retry_after || data?.retry_after || 0) * 1000;
      const applicationStatus = Number(data?.data?.status || 0);
      const errorCode = String(data?.code || data?.error || '');
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500 ||
        applicationStatus === 408 ||
        applicationStatus === 429 ||
        applicationStatus >= 500 ||
        retryAfter > 0 ||
        /rate|temporar|timeout/i.test(errorCode);
      const safeReason = String(
        data?.message || errorCode || (raw && raw.trim() ? 'non-JSON response' : 'empty response')
      ).slice(0, 180);
      if (!retryable) throw new Error(`Catalog request rejected: ${safeReason} (HTTP ${response.status}).`);
      lastError = new Error(`Temporary catalog error: ${safeReason} (HTTP ${response.status}).`);
      if (attempt < maxAttempts)
        await sleep(Math.max(retryAfter, Math.min(16_000, 1000 * 2 ** (attempt - 1))) + Math.random() * 500);
    } catch (error) {
      if (error instanceof Error && /Catalog request rejected:/.test(error.message)) throw error;
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
  const savedQueue = forceFullSync
    ? null
    : await readFile(queueFile, 'utf8')
        .then(JSON.parse)
        .catch(() => null);
  const hasPendingQueue = Array.isArray(savedQueue?.pendingSourceIds) && savedQueue.pendingSourceIds.length > 0;
  const fullSync = forceFullSync || previousProducts.length === 0 || !savedQueue;
  const previousCursor = previousCatalog.sync_cursor || previousCatalog.synchronized_at || '';
  const previousCursorTime = Date.parse(previousCursor);
  const modifiedAfter =
    !fullSync && Number.isFinite(previousCursorTime)
      ? new Date(Math.max(0, previousCursorTime - syncOverlapSeconds * 1000)).toISOString()
      : '';
  const summaries = new Map();
  const deletedSourceIds = new Set(hasPendingQueue ? savedQueue.deletedSourceIds || [] : []);
  let page = 1;
  let totalPages;
  let sourceTotal = Number(previousCatalog.source_total || previousProducts.length || 0);
  if (!hasPendingQueue) {
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
  }

  const pendingSourceIds = [
    ...new Set(hasPendingQueue ? savedQueue.pendingSourceIds.map(String) : [...summaries.keys()]),
  ];
  const savedInflightSourceIds = [
    ...new Set(Array.isArray(savedQueue?.inflightSourceIds) ? savedQueue.inflightSourceIds.map(String) : []),
  ];
  const currentBatchIds =
    savedInflightSourceIds.length > 0 ? savedInflightSourceIds : pendingSourceIds.slice(0, batchSize);
  const queueWindowStartedAt = hasPendingQueue ? savedQueue.windowStartedAt : syncStartedAt;
  await mkdir(dirname(queueFile), { recursive: true });
  await writeFile(
    queueFile,
    `${JSON.stringify(
      {
        version: 1,
        windowStartedAt: queueWindowStartedAt,
        modifiedAfter: hasPendingQueue ? savedQueue.modifiedAfter : modifiedAfter || null,
        sourceTotal: hasPendingQueue ? savedQueue.sourceTotal : sourceTotal,
        pendingSourceIds,
        inflightSourceIds: currentBatchIds,
        deletedSourceIds: [...deletedSourceIds],
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const productsById = new Map(previousProducts.map((product) => [String(product.source_id), product]));
  for (const sourceId of deletedSourceIds) productsById.delete(sourceId);
  const summaryList = currentBatchIds.map((sourceId) => ({ source_id: sourceId }));
  const missingSourceIds = new Set();
  let nextSummaryIndex = 0;
  let scanned = 0;
  const workerCount = Math.min(detailConcurrency, summaryList.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextSummaryIndex < summaryList.length) {
        const summaryIndex = nextSummaryIndex;
        nextSummaryIndex += 1;
        const summary = summaryList[summaryIndex];
        const identifierType = 'source_id';
        const identifier = String(summary.source_id);
        const body = { identifier, identifier_type: identifierType };
        const payload = `${identifierType}\n${identifier}`;
        try {
          const data = await signedPost('/wp-json/mecrt-catalog/v1/product', body, payload);
          if (!data?.product) throw new Error(`Product detail missing for source_id ${identifier}.`);
          productsById.set(identifier, data.product);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          const productUnavailable =
            /not found|could not be loaded|non-JSON response/i.test(reason) &&
            !/HTTP (5\d\d|429|408)\)/.test(reason);
          if (productUnavailable) {
            missingSourceIds.add(identifier);
            productsById.delete(identifier);
            process.stdout.write(`Product unavailable, skipping: ${identifier}.\n`);
            continue;
          }
          throw error;
        }
        scanned += 1;
        process.stdout.write(`Catalog detail scanned: ${scanned}/${summaryList.length}.\n`);
      }
    })
  );
  for (const sourceId of missingSourceIds) deletedSourceIds.add(sourceId);
  const effectivePendingSourceIds = pendingSourceIds.filter((sourceId) => !missingSourceIds.has(sourceId));
  const remainingSourceIds = effectivePendingSourceIds.slice(currentBatchIds.length);
  const availableProducts = [...productsById.values()];
  if (!fullSync && pendingSourceIds.length === 0 && deletedSourceIds.size === 0) {
    process.stdout.write(`Catalog unchanged since ${modifiedAfter}; reusing ${availableProducts.length} products.\n`);
  }

  await writeFile(
    queueFile,
    `${JSON.stringify(
      {
        version: 1,
        windowStartedAt: queueWindowStartedAt,
        modifiedAfter: hasPendingQueue ? savedQueue.modifiedAfter : modifiedAfter || null,
        sourceTotal: hasPendingQueue ? savedQueue.sourceTotal : sourceTotal,
        pendingSourceIds: effectivePendingSourceIds,
        inflightSourceIds: currentBatchIds,
        deletedSourceIds: [...deletedSourceIds],
        processed: Number(savedQueue?.processed || 0),
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  return {
    schema_version: '1.0',
    synchronized_at: new Date().toISOString(),
    sync_cursor: previousCursor,
    sync_mode: fullSync ? 'full' : 'incremental',
    modified_after: modifiedAfter || null,
    changed_products: currentBatchIds.length,
    deleted_products: deletedSourceIds.size,
    changed_source_ids: currentBatchIds,
    deleted_source_ids: [...deletedSourceIds],
    source_total: sourceTotal,
    total: availableProducts.length,
    queue: { batchSize, processedThisRun: currentBatchIds.length, remaining: remainingSourceIds.length },
    products: availableProducts,
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
