import siteCatalog from './site-catalog.json';

export type ProductSpecification = { name: string; value: string };
export type ProductFaq = { question: string; answer: string };
export type ProductCategory = { id: string; name: string; slug: string };

export type Product = {
  sourceId: string;
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
  structuredData: Record<string, unknown>;
};

export const products = siteCatalog.products as Product[];

export const collections = Array.from(
  products.reduce((items, product) => {
    for (const category of product.categories || []) {
      const current = items.get(category.slug) || { ...category, products: [] as Product[] };
      current.products.push(product);
      items.set(category.slug, current);
    }
    return items;
  }, new Map<string, ProductCategory & { products: Product[] }>()).values()
).sort((a, b) => a.name.localeCompare(b.name));
