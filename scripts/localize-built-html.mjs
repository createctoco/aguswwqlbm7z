import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };
import { translateHtml } from './site-copy-html.mjs';

const locale = String(process.env.OUOOO_LOCALE || '')
  .trim()
  .toLowerCase();
if (!localeData.locales[locale] || locale === localeData.defaultLocale) process.exit(0);
const root = resolve(process.env.OUOOO_SITE_COPY_HTML_ROOT || 'dist/client');
const copy = JSON.parse(await readFile(resolve(`src/data/i18n/${locale}/site-copy.json`), 'utf8'));
const translations = new Map(copy.entries.map(({ source, translation }) => [source, translation]));

async function localize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await localize(path);
    else if (entry.isFile() && entry.name.endsWith('.html') && !path.includes(`${join('decapcms', '')}`)) {
      const html = await readFile(path, 'utf8');
      await writeFile(path, translateHtml(html, translations), 'utf8');
    }
  }
}

await localize(root);
process.stdout.write(`Localized built HTML for ${locale}.\n`);
