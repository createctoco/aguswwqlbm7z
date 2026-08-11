import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// .cmd files cannot be spawned directly on Windows; route them through cmd.exe.
function invoke(command, args, options = {}) {
  if (process.platform === 'win32' && command.endsWith('.cmd')) {
    return execFileSync(
      process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', command, ...args],
      options
    );
  }
  return execFileSync(command, args, options);
}
const tmp = mkdtempSync(join(tmpdir(), 'ouooo-reconcile-'));

// Locate the production D1 database id (env override or wrangler d1 list).
let databaseId = process.env.OUOOO_D1_DATABASE_ID || '';
if (!databaseId) {
  const raw = invoke(npxCommand, ['wrangler', 'd1', 'list', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
  const list = JSON.parse(raw.slice(raw.indexOf('[')));
  databaseId = list.find((item) => item.name === 'ouooo-catalog')?.uuid;
}
if (!databaseId) throw new Error('D1 database ouooo-catalog was not found.');

const configFile = join(tmp, 'wrangler.jsonc');
writeFileSync(
  configFile,
  JSON.stringify(
    {
      name: 'ouooo-catalog',
      compatibility_date: '2026-08-01',
      d1_databases: [{ binding: 'DB', database_name: 'ouooo-catalog', database_id: databaseId }],
    },
    null,
    2
  )
);

const d1 = (sql, { json = false } = {}) => {
  const base = ['wrangler', 'd1', 'execute', 'ouooo-catalog', '--remote', '--config', configFile];
  if (json) {
    const out = invoke(npxCommand, [...base, '--command', sql, '--json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024,
    });
    return JSON.parse(out);
  }
  const file = join(tmp, 'statement.sql');
  writeFileSync(file, sql, 'utf8');
  invoke(npxCommand, [...base, '--file', file], { cwd: root, encoding: 'utf8', stdio: 'inherit' });
};

const readCatalog = (locale) => {
  const file =
    locale === localeData.defaultLocale ? 'src/data/site-catalog.json' : `src/data/i18n/${locale}/site-catalog.json`;
  return JSON.parse(readFileSync(join(root, file), 'utf8'));
};

const locales = Object.keys(localeData.locales);
const catalogIdsByLocale = new Map();
const catalogCategoriesByLocale = new Map();
for (const locale of locales) {
  const catalog = readCatalog(locale);
  const ids = new Set(catalog.products.map((p) => String(p.productId)));
  const categories = new Map();
  for (const product of catalog.products) {
    categories.set(
      String(product.productId),
      new Set((product.categories || []).map((c) => String(c.slug)).filter(Boolean))
    );
  }
  catalogIdsByLocale.set(locale, ids);
  catalogCategoriesByLocale.set(locale, categories);
}

const d1ProductsRaw = d1('SELECT locale, product_id FROM products;', { json: true });
const d1ProductsByLocale = new Map();
for (const row of d1ProductsRaw.flatMap((r) => r.results || [])) {
  if (!d1ProductsByLocale.has(row.locale)) d1ProductsByLocale.set(row.locale, new Set());
  d1ProductsByLocale.get(row.locale).add(String(row.product_id));
}
const d1CatsRaw = d1('SELECT locale, product_id, category_slug FROM product_categories;', { json: true });
const d1CatsByLocale = new Map();
for (const row of d1CatsRaw.flatMap((r) => r.results || [])) {
  if (!d1CatsByLocale.has(row.locale)) d1CatsByLocale.set(row.locale, new Map());
  const map = d1CatsByLocale.get(row.locale);
  if (!map.has(String(row.product_id))) map.set(String(row.product_id), new Set());
  map.get(String(row.product_id)).add(String(row.category_slug));
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const summary = [];
let fixed = false;
for (const locale of locales) {
  const catalogIds = catalogIdsByLocale.get(locale) || new Set();
  const d1Ids = d1ProductsByLocale.get(locale) || new Set();
  const missing = [...catalogIds].filter((id) => !d1Ids.has(id));
  const extra = [...d1Ids].filter((id) => !catalogIds.has(id));
  const missingCategories = [];
  const catalogCats = catalogCategoriesByLocale.get(locale) || new Map();
  const d1Cats = d1CatsByLocale.get(locale) || new Map();
  for (const [id, slugs] of catalogCats) {
    if (!d1Ids.has(id)) continue; // already counted as missing product
    const present = d1Cats.get(id) || new Set();
    for (const slug of slugs) if (!present.has(slug)) missingCategories.push(id);
  }

  if (missing.length || extra.length || missingCategories.length) {
    fixed = true;
    // Re-import the full locale catalog (fixes missing products + categories).
    if (missing.length || missingCategories.length) {
      invoke(npmCommand, ['run', 'prepare:d1'], {
        cwd: root,
        env: { ...process.env, OUOOO_LOCALE: locale },
        encoding: 'utf8',
        stdio: 'inherit',
      });
      const importFile = join(root, '.d1', `import-${locale}.sql`);
      invoke(
        npxCommand,
        ['wrangler', 'd1', 'execute', 'ouooo-catalog', '--remote', '--config', configFile, '--file', importFile],
        {
          cwd: root,
          encoding: 'utf8',
          stdio: 'inherit',
        }
      );
      summary.push(
        `${locale}: re-imported full catalog (missing products ${missing.length}, missing categories ${missingCategories.length})`
      );
    }
    if (extra.length) {
      const ids = extra.map(quote).join(',');
      d1(
        `DELETE FROM product_categories WHERE locale='${locale}' AND product_id IN (${ids});\nDELETE FROM products WHERE locale='${locale}' AND product_id IN (${ids});`
      );
      summary.push(`${locale}: deleted ${extra.length} stale products not in catalog`);
    }
  } else {
    summary.push(`${locale}: ok (${catalogIds.size} products)`);
  }
}

console.log('=== D1 reconciliation ===');
for (const line of summary) console.log(line);
console.log(fixed ? 'Fixes applied (re-run to verify).' : 'All locales are consistent.');
rmSync(tmp, { recursive: true, force: true });
