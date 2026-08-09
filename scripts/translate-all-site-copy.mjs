import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const locales = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(localeData.locales).filter((locale) => locale !== localeData.defaultLocale);

for (const locale of locales) {
  if (!localeData.locales[locale] || locale === localeData.defaultLocale)
    throw new Error(`Unsupported locale: ${locale}`);
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'scripts/translate-site-copy.mjs'], {
      cwd: root,
      env: { ...process.env, OUOOO_LOCALE: locale },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', rejectPromise);
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : rejectPromise(new Error(`Site-copy translation failed for ${locale} (${code}).`))
    );
  });
}
