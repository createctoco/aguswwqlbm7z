Exit code: 0
Wall time: 1.6 seconds
Output:
import siteCatalog from './site-catalog.json';
import { BUILD_LOCALE, DEFAULT_LOCALE, type SupportedLocale } from '~/i18n/config';
import type { ProductLocalization } from '~/i18n/catalog';

export type ProductSpecification = { name: string; value: string };
export type ProductFaq = { question: string; answer: string };
export type ProductCategory = { id: string; name: string; slug: string };

export type ProductPricing = {
  price: string;
  regularPrice?: string;
  currency: string;
  onSale: boolean;
  priceRange?: { min: string; max: string };
};

export type Product = {
  productId: string;
  sourceId: string;
  sourceFingerprint?: string;
  locale: SupportedLocale;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  catholicContext: string;
  catholicRelevance: 'explicit' | 'devotional_context' | 'none';
  categories: ProductCategory[];
  sku: string;
  imageUrl: string;
  imageAlt: string;
  gallery: Array<{ url: string; alt: string }>;
  variantImages: Array<{ url: string; alt: string; label: string; sku: string }>;
  accent: string;
  features: string[];
  specifications: ProductSpecification[];
  applications: string[];
  faq: ProductFaq[];
  pricing?: ProductPricing;
  structuredData: Record<string, unknown>;
  localization: ProductLocalization;
};

type SiteCatalog = { locale?: SupportedLocale; products: Product[] };
type CatalogModule = { default: SiteCatalog };

const localizedCatalogs = import.meta.glob<CatalogModule>('./i18n/*/site-catalog.json', { eager: true });
const localizedCatalog = localizedCatalogs[`./i18n/${BUILD_LOCALE}/site-catalog.json`]?.default;
const selectedCatalog = BUILD_LOCALE === DEFAULT_LOCALE ? (siteCatalog as unknown as SiteCatalog) : localizedCatalog;

if (!selectedCatalog) {
  throw new Error(`No static catalog is available for locale ${BUILD_LOCALE}.`);
}

export const products = selectedCatalog.products as Product[];

export const collections = Array.from(
  products
    .reduce((items, product) => {
      for (const category of product.categories || []) {
        const current = items.get(category.slug) || { ...category, products: [] as Product[] };
        current.products.push(product);
        items.set(category.slug, current);
      }
      return items;
    }, new Map<string, ProductCategory & { products: Product[] }>())
    .values()
).sort((a, b) => a.name.localeCompare(b.name));

