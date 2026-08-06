import localeData from './locales.json';

export type TextDirection = 'ltr' | 'rtl';
export type SupportedLocale = keyof typeof localeData.locales;

export type LocaleDefinition = {
  label: string;
  hreflang: string;
  openGraphLocale: string;
  direction: TextDirection;
  host: string;
};

export type AlternateLanguageLink = {
  hrefLang: string;
  href: string;
};

export const DEFAULT_LOCALE = localeData.defaultLocale as SupportedLocale;
export const LOCALES = localeData.locales as Record<SupportedLocale, LocaleDefinition>;
export const SUPPORTED_LOCALES = Object.keys(LOCALES) as SupportedLocale[];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return Object.prototype.hasOwnProperty.call(LOCALES, value);
}

function requireSupportedLocale(value: string | undefined, source: string): SupportedLocale {
  const locale = (value || DEFAULT_LOCALE).trim().toLowerCase();
  if (!isSupportedLocale(locale)) {
    throw new Error(`${source} contains unsupported locale "${locale}".`);
  }
  return locale;
}

function normalizeSiteUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('OUOOO locale site URLs must use HTTPS.');
  return url.origin;
}

export const BUILD_LOCALE = requireSupportedLocale(import.meta.env.OUOOO_LOCALE, 'OUOOO_LOCALE');
export const BUILD_LOCALE_CONFIG = LOCALES[BUILD_LOCALE];
export const BUILD_SITE_URL = normalizeSiteUrl(import.meta.env.OUOOO_SITE_URL || `https://${BUILD_LOCALE_CONFIG.host}`);

const requestedPublishedLocales = (import.meta.env.OUOOO_PUBLISHED_LOCALES || DEFAULT_LOCALE)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export const PUBLISHED_LOCALES = Array.from(new Set(requestedPublishedLocales)).map((locale) =>
  requireSupportedLocale(locale, 'OUOOO_PUBLISHED_LOCALES')
);

if (!PUBLISHED_LOCALES.includes(BUILD_LOCALE)) {
  throw new Error(`OUOOO_PUBLISHED_LOCALES must include the current build locale "${BUILD_LOCALE}".`);
}

export function getLocaleSiteUrl(locale: SupportedLocale): string {
  if (locale === BUILD_LOCALE && import.meta.env.OUOOO_SITE_URL) return BUILD_SITE_URL;
  return `https://${LOCALES[locale].host}`;
}

export function getLocalizedUrl(path: string, locale: SupportedLocale): string {
  const parsedPath = new URL(path || '/', 'https://ouooo.invalid');
  const pathname = parsedPath.pathname === '/' ? '/' : parsedPath.pathname.replace(/\/$/, '');
  const relative = `${pathname}${parsedPath.search}${parsedPath.hash}`;
  const localized = new URL(relative, getLocaleSiteUrl(locale));
  return localized.pathname === '/' && !localized.search && !localized.hash ? localized.origin : localized.toString();
}

export function getAlternateLanguageLinks(
  path: string,
  availableLocales: SupportedLocale[] = PUBLISHED_LOCALES
): AlternateLanguageLink[] {
  const locales = Array.from(new Set(availableLocales));
  const links = locales.map((locale) => ({
    hrefLang: LOCALES[locale].hreflang,
    href: getLocalizedUrl(path, locale),
  }));

  if (locales.includes(DEFAULT_LOCALE)) {
    links.push({ hrefLang: 'x-default', href: getLocalizedUrl(path, DEFAULT_LOCALE) });
  }
  return links;
}
