import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const locale = String(process.env.OUOOO_LOCALE || localeData.defaultLocale)
  .trim()
  .toLowerCase();
const definition = localeData.locales[locale];
if (!definition) throw new Error(`Unsupported OUOOO_LOCALE: ${locale}`);

const expectedSiteUrl = `https://${definition.host}`;
const siteUrl = String(process.env.OUOOO_SITE_URL || expectedSiteUrl).replace(/\/$/, '');
if (!siteUrl.startsWith('https://')) throw new Error('OUOOO_SITE_URL must use HTTPS.');

const publishedLocales = String(process.env.OUOOO_PUBLISHED_LOCALES || localeData.defaultLocale)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
for (const publishedLocale of publishedLocales) {
  if (!localeData.locales[publishedLocale]) {
    throw new Error(`OUOOO_PUBLISHED_LOCALES contains unsupported locale: ${publishedLocale}`);
  }
}
if (!publishedLocales.includes(locale)) {
  throw new Error(`OUOOO_PUBLISHED_LOCALES must include the current build locale "${locale}".`);
}

if (locale !== localeData.defaultLocale) {
  const catalogPath = resolve(`src/data/i18n/${locale}/site-catalog.json`);
  try {
    await access(catalogPath);
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
    if (catalog.locale !== locale || !Array.isArray(catalog.products) || catalog.products.length < 1) {
      throw new Error(`Localized catalog is invalid for ${locale}.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Localized catalog is invalid')) throw error;
    throw new Error(
      `Localized catalog for ${locale} is not published. Expected src/data/i18n/${locale}/site-catalog.json. English remains the only buildable locale.`,
      { cause: error }
    );
  }

  const sourceCopyPath = resolve('src/data/site-copy.en.json');
  const localizedCopyPath = resolve(`src/data/i18n/${locale}/site-copy.json`);
  try {
    const sourceCopy = JSON.parse(await readFile(sourceCopyPath, 'utf8'));
    const localizedCopy = JSON.parse(await readFile(localizedCopyPath, 'utf8'));
    const sourceEntries = Array.isArray(sourceCopy.entries) ? sourceCopy.entries : [];
    const localizedEntries = Array.isArray(localizedCopy.entries) ? localizedCopy.entries : [];
    const localizedById = new Map(localizedEntries.map((entry) => [entry.id, entry]));
    const complete =
      localizedCopy.locale === locale &&
      localizedCopy.sourceHash === sourceCopy.sourceHash &&
      localizedEntries.length === sourceEntries.length &&
      sourceEntries.every((entry) => {
        const translated = localizedById.get(entry.id);
        return (
          translated?.source === entry.source &&
          typeof translated.translation === 'string' &&
          translated.translation.trim().length > 0
        );
      });
    if (!complete) throw new Error(`Localized site copy is incomplete or outdated for ${locale}.`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Localized site copy is incomplete')) throw error;
    throw new Error(
      `Localized site copy for ${locale} is not ready. Run the English copy extraction and ${locale} translation before deploying.`,
      { cause: error }
    );
  }
}

process.stdout.write(`Locale build validated: ${locale} -> ${siteUrl}\n`);
