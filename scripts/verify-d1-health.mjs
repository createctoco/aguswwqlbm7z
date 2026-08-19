import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const bookmarkFile = resolve(root, '.d1/restore-bookmark.txt');
const minProducts = Number(process.env.OUOOO_D1_MIN_PRODUCTS || 4000);

function run(args) {
  const call =
    process.platform !== 'win32' || !npx.endsWith('.cmd')
      ? { command: npx, args }
      : { command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', args: ['/d', '/s', '/c', npx, ...args] };
  return spawnSync(call.command, call.args, { cwd: root, encoding: 'utf8', env: process.env, shell: false });
}

function query(sql) {
  const result = run(['wrangler', 'd1', 'execute', 'ouooo-catalog', '--remote', '--json', '--command', sql]);
  if (result.status !== 0) throw new Error(`D1 query failed: ${result.stderr || result.stdout || result.error}`);
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error(`Unexpected wrangler output: ${output.slice(0, 200)}`);
  const parsed = JSON.parse(output.slice(start, end + 1));
  return parsed?.[0]?.results || [];
}

function restoreBookmark() {
  let bookmark = '';
  try {
    bookmark = readFileSync(bookmarkFile, 'utf8').trim();
  } catch {
    // No bookmark captured (e.g. recovery deploy with skip_d1_import): fail loudly.
  }
  if (!bookmark) return false;
  const result = run(['wrangler', 'd1', 'time-travel', 'restore', 'ouooo-catalog', '--bookmark', bookmark]);
  if (result.status !== 0) {
    process.stderr.write(`D1 restore failed: ${result.stderr || result.stdout || result.error}\n`);
  }
  return result.status === 0;
}

let failed = false;
try {
  const products = Number(query('SELECT COUNT(*) AS total FROM products;')[0]?.total || 0);
  const uncategorized = Number(
    query("SELECT COUNT(*) AS c FROM product_categories WHERE category_slug='uncategorized';")[0]?.c || 0
  );
  process.stdout.write(
    `D1 health: products=${products} (min ${minProducts}), uncategorized=${uncategorized} (expected 0)\n`
  );
  if (products < minProducts) {
    process.stderr.write(`D1 health check failed: products=${products} below minimum ${minProducts}.\n`);
    failed = true;
  }
  if (uncategorized !== 0) {
    process.stderr.write(`D1 health check failed: uncategorized=${uncategorized} (expected 0).\n`);
    failed = true;
  }
} catch (error) {
  process.stderr.write(`D1 health check error: ${error instanceof Error ? error.message : String(error)}\n`);
  failed = true;
}

if (failed) {
  if (restoreBookmark()) {
    process.stderr.write('D1 restored to the pre-import bookmark. Failing the deploy so it can be retried safely.\n');
  } else {
    process.stderr.write('No D1 restore point available; failing the deploy. Restore D1 manually before retrying.\n');
  }
  process.exit(1);
}
process.stdout.write('D1 catalog is healthy.\n');
