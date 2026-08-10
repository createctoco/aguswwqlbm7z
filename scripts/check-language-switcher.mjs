import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import localeData from '../src/i18n/locales.json' with { type: 'json' };
import { extractHtmlCopy, translateHtml } from './site-copy-html.mjs';

const expectedLabels = {
  en: 'English',
  it: 'Italiano',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  pl: 'Polski',
  de: 'Deutsch',
  fil: 'Filipino',
  hr: 'Hrvatski',
  sl: 'Slovenščina',
  ro: 'Română',
  ar: 'العربية',
  'zh-hant': '繁體中文',
  'zh-hans': '简体中文',
};

assert.deepEqual(
  Object.fromEntries(Object.entries(localeData.locales).map(([locale, definition]) => [locale, definition.label])),
  expectedLabels,
  'Language names must remain fixed in their native form.'
);
assert.equal(localeData.locales.ar.direction, 'rtl', 'Arabic pages must use RTL layout.');

const component = await readFile(new URL('../src/components/common/LanguageSwitcher.astro', import.meta.url), 'utf8');
assert.ok(
  component.match(/data-ouooo-no-translate/g)?.length >= 2,
  'Both the current language and menu language names must opt out of translation.'
);

const sample = '<span data-ouooo-no-translate>Italiano</span><p>Available languages</p>';
const extracted = [...extractHtmlCopy(sample).values()];
assert.deepEqual(
  extracted,
  ['Available languages'],
  'Protected language names must not enter the translation manifest.'
);

const translated = translateHtml(
  sample,
  new Map([
    ['Italiano', 'Italian'],
    ['Available languages', 'Lingue disponibili'],
  ])
);
assert.ok(translated.includes('>Italiano<'), 'Protected language names must not be rewritten in built HTML.');
assert.ok(translated.includes('>Lingue disponibili<'), 'Ordinary interface copy must remain translatable.');

process.stdout.write('Language switcher native labels and translation protection verified.\n');
