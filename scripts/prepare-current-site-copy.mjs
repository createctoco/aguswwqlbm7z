import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const locale = String(process.env.OUOOO_LOCALE || localeData.defaultLocale)
  .trim()
  .toLowerCase();
const outputFile = resolve('src/data/site-copy.current.json');
const copy =
  locale === localeData.defaultLocale
    ? { schemaVersion: 1, locale, sourceHash: '', entries: [] }
    : JSON.parse(await readFile(resolve(`src/data/i18n/${locale}/site-copy.json`), 'utf8'));

await writeFile(outputFile, `${JSON.stringify(copy)}\n`, 'utf8');
process.stdout.write(`Prepared build-time site copy for ${locale}: ${copy.entries.length} entries.\n`);
