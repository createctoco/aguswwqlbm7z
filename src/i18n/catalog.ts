import { DEFAULT_LOCALE, type SupportedLocale } from './config';

export type TranslationStatus = 'source' | 'pending' | 'generating' | 'ready' | 'stale' | 'failed' | 'fallback';

export type ProductTranslationState = {
  status: TranslationStatus;
  sourceHash: string;
  contentHash?: string;
  attempts: number;
  updatedAt: string;
  model?: string;
  error?: string;
  fallbackLocale?: SupportedLocale;
};

export type ProductLocalization = {
  sourceLocale: typeof DEFAULT_LOCALE;
  sourceHash: string;
  translations: Partial<Record<SupportedLocale, ProductTranslationState>>;
};

export type TranslatableProductContent = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  catholicContext: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  imageAlt: string;
  gallery: Array<{ url: string; alt: string }>;
  variantImages: Array<{ url: string; alt: string; label: string; sku: string }>;
  features: string[];
  specifications: Array<{ name: string; value: string }>;
  applications: string[];
  faq: Array<{ question: string; answer: string }>;
  structuredData: Record<string, unknown>;
};

export type LocalizedContentRecord = {
  productId: string;
  locale: SupportedLocale;
  sourceHash: string;
  contentHash: string;
  status: Exclude<TranslationStatus, 'source'>;
  attempts: number;
  updatedAt: string;
  model?: string;
  error?: string;
  content?: TranslatableProductContent;
};

export type LocalizedContentResolution = {
  content: TranslatableProductContent;
  state: ProductTranslationState;
  usedFallback: boolean;
};

export function isFreshTranslation(localization: ProductLocalization, locale: SupportedLocale): boolean {
  const state = localization.translations[locale];
  if (!state) return false;
  if (locale === DEFAULT_LOCALE) return state.status === 'source';
  return state.status === 'ready' && state.sourceHash === localization.sourceHash;
}

export function getTranslationState(
  localization: ProductLocalization,
  locale: SupportedLocale
): ProductTranslationState {
  return (
    localization.translations[locale] || {
      status: 'fallback',
      sourceHash: localization.sourceHash,
      attempts: 0,
      updatedAt: localization.translations[DEFAULT_LOCALE]?.updatedAt || new Date(0).toISOString(),
      fallbackLocale: DEFAULT_LOCALE,
    }
  );
}

export function resolveLocalizedContent(
  sourceContent: TranslatableProductContent,
  localization: ProductLocalization,
  locale: SupportedLocale,
  translated?: LocalizedContentRecord
): LocalizedContentResolution {
  const state = getTranslationState(localization, locale);
  const isFresh =
    translated?.status === 'ready' && translated.sourceHash === localization.sourceHash && translated.content != null;

  if (isFresh && translated) {
    return { content: translated.content as TranslatableProductContent, state, usedFallback: false };
  }

  return {
    content: sourceContent,
    state: {
      ...state,
      status: locale === DEFAULT_LOCALE ? 'source' : 'fallback',
      fallbackLocale: locale === DEFAULT_LOCALE ? undefined : DEFAULT_LOCALE,
    },
    usedFallback: locale !== DEFAULT_LOCALE,
  };
}
