import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const queueFile = resolve(process.env.MECRT_CATALOG_QUEUE_FILE || '.ouooo-control/catalog-queue.json');
const outputFile = resolve(process.env.MECRT_CATALOG_OUTPUT || 'src/data/catalog-index.json');
const queue = JSON.parse(await readFile(queueFile, 'utf8'));
const inflight = new Set((queue.inflightSourceIds || []).map(String));
if (inflight.size === 0) {
  process.stdout.write('Catalog queue has no inflight batch to acknowledge.\n');
  process.exit(0);
}

queue.pendingSourceIds = (queue.pendingSourceIds || []).map(String).filter((id) => !inflight.has(id));
queue.processed = Number(queue.processed || 0) + inflight.size;
queue.inflightSourceIds = [];
queue.updatedAt = new Date().toISOString();
const complete = queue.pendingSourceIds.length === 0;
if (complete) queue.deletedSourceIds = [];

const temporaryQueue = `${queueFile}.tmp-${process.pid}`;
await writeFile(temporaryQueue, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
await rename(temporaryQueue, queueFile);

if (complete) {
  const catalog = JSON.parse(await readFile(outputFile, 'utf8'));
  catalog.sync_cursor = queue.windowStartedAt;
  catalog.synchronized_at = new Date().toISOString();
  const temporaryCatalog = `${outputFile}.tmp-${process.pid}`;
  await writeFile(temporaryCatalog, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  await rename(temporaryCatalog, outputFile);
}

process.stdout.write(
  `Catalog batch acknowledged: ${inflight.size} products; ${queue.pendingSourceIds.length} remain.\n`
);
