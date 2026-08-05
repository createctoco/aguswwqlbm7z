import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = (process.env.MECRT_CATALOG_URL || '').replace(/\/$/, '');
const secret = process.env.MECRT_CATALOG_BRIDGE_SECRET || '';
const outputFile = resolve(process.env.MECRT_CATALOG_OUTPUT || 'src/data/catalog-index.json');
const maxAttempts = 5;

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
    const signature = createHmac('sha256', secret).update(canonical(route, timestamp, nonce, payload)).digest('hex');
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
      if (attempt < maxAttempts) await sleep(Math.max(retryAfter, Math.min(16_000, 1000 * 2 ** (attempt - 1))) + Math.random() * 500);
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
  const all = new Map();
  let page = 1;
  let totalPages = 1;
  do {
    const pageSize = 100;
    const modifiedAfter = '';
    const body = { page, page_size: pageSize, modified_after: modifiedAfter };
    const payload = `${page}\n${pageSize}\n${modifiedAfter}`;
    const data = await signedPost('/wp-json/mecrt-catalog/v1/products', body, payload);
    totalPages = Math.max(1, Number(data.total_pages || 1));
    for (const product of data.products || []) {
      if (!product?.source_id) throw new Error(`Product on page ${page} has no source_id.`);
      all.set(String(product.source_id), product);
    }
    page += 1;
  } while (page <= totalPages);

  return {
    schema_version: '1.0',
    synchronized_at: new Date().toISOString(),
    total: all.size,
    products: [...all.values()],
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
