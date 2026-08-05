import siteCatalog from './site-catalog.json';

export type ProductSpecification = { name: string; value: string };
export type ProductFaq = { question: string; answer: string };

export type Product = {
  sourceId: string;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  catholicContext: string;
  catholicRelevance: 'explicit' | 'devotional_context' | 'none';
  sku: string;
  imageUrl: string;
  imageAlt: string;
  gallery: Array<{ url: string; alt: string }>;
  accent: string;
  features: string[];
  specifications: ProductSpecification[];
  applications: string[];
  faq: ProductFaq[];
  structuredData: Record<string, unknown>;
};

export const products = siteCatalog.products as Product[];
