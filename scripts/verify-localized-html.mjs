import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };
import { extractHtmlCopy } from './site-copy-html.mjs';

const locale = String(process.env.OUOOO_LOCALE || '')
  .trim()
  .toLowerCase();
if (!localeData.locales[locale] || locale === localeData.defaultLocale)
  throw new Error('OUOOO_LOCALE must be a configured non-English locale.');

const root = resolve(process.env.OUOOO_SITE_COPY_HTML_ROOT || 'dist/client');
const copy = JSON.parse(await readFile(resolve(`src/data/i18n/${locale}/site-copy.json`), 'utf8'));
const changedSources = new Set(
  copy.entries.filter(({ source, translation }) => source !== translation).map(({ source }) => source)
);

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.html') && !path.includes(`${join('decapcms', '')}`))
      files.push(path);
  }
  return files;
}

const misses = [];
const files = await htmlFiles(root);
for (const file of files) {
  const values = extractHtmlCopy(await readFile(file, 'utf8'));
  for (const source of values.values()) {
    if (changedSources.has(source)) misses.push({ file, source });
  }
}
if (misses.length) {
  throw new Error(`Localized HTML for ${locale} still contains ${misses.length} translatable English strings.`);
}
process.stdout.write(`Localized HTML verified for ${locale}: ${files.length} files, 0 scoped English remnants.\n`);
