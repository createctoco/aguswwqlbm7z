import { env } from 'cloudflare:workers';

import type { Product, ProductCategory } from '~/data/products';
import type { SupportedLocale } from '~/i18n/config';

type ProductRow = { content_json: string };
type CollectionRow = ProductCategory & { productCount: number; featuredProductJson: string };

const database = () => env.DB;
const parseProduct = (row: ProductRow | null): Product | undefined =>
  row ? (JSON.parse(row.content_json) as Product) : undefined;

export async function getProductBySlug(locale: SupportedLocale, slug: string): Promise<Product | undefined> {
  const row = await database()
    .prepare('SELECT content_json FROM products WHERE locale = ? AND slug = ? LIMIT 1')
    .bind(locale, slug)
    .first<ProductRow>();
  return parseProduct(row);
}

export async function listProducts(
  locale: SupportedLocale,
  page = 1,
  pageSize = 24
): Promise<{ products: Product[]; total: number; page: number; pageSize: number }> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(48, Math.max(1, Math.trunc(pageSize)));
  const offset = (safePage - 1) * safePageSize;
  const [rows, total] = await database().batch([
    database()
      .prepare(
        'SELECT content_json FROM products WHERE locale = ? ORDER BY updated_at DESC, product_id DESC LIMIT ? OFFSET ?'
      )
      .bind(locale, safePageSize, offset),
    database().prepare('SELECT COUNT(*) AS count FROM products WHERE locale = ?').bind(locale),
  ]);
  return {
    products: (rows.results as ProductRow[]).map((row) => JSON.parse(row.content_json) as Product),
    total: Number((total.results[0] as { count?: number } | undefined)?.count || 0),
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function listCollections(locale: SupportedLocale): Promise<CollectionRow[]> {
  const result = await database()
    .prepare(
      `SELECT pc.category_slug AS slug, pc.category_name AS name, pc.category_slug AS id,
              COUNT(*) AS productCount, MIN(p.content_json) AS featuredProductJson
       FROM product_categories pc
       JOIN products p ON p.product_id = pc.product_id AND p.locale = pc.locale
       WHERE pc.locale = ?
       GROUP BY pc.category_slug, pc.category_name
       ORDER BY pc.category_name`
    )
    .bind(locale)
    .all<CollectionRow>();
  return result.results;
}

export async function getCollection(
  locale: SupportedLocale,
  slug: string,
  page = 1,
  pageSize = 24
): Promise<{ name: string; products: Product[]; total: number; page: number; pageSize: number } | undefined> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(48, Math.max(1, Math.trunc(pageSize)));
  const offset = (safePage - 1) * safePageSize;
  const [rows, summary] = await database().batch([
    database()
      .prepare(
        `SELECT p.content_json FROM product_categories pc
         JOIN products p ON p.product_id = pc.product_id AND p.locale = pc.locale
         WHERE pc.locale = ? AND pc.category_slug = ?
         ORDER BY p.updated_at DESC, p.product_id DESC LIMIT ? OFFSET ?`
      )
      .bind(locale, slug, safePageSize, offset),
    database()
      .prepare(
        'SELECT MIN(category_name) AS name, COUNT(*) AS count FROM product_categories WHERE locale = ? AND category_slug = ?'
      )
      .bind(locale, slug),
  ]);
  const data = summary.results[0] as { name?: string; count?: number } | undefined;
  if (!data?.name) return undefined;
  return {
    name: data.name,
    products: (rows.results as ProductRow[]).map((row) => JSON.parse(row.content_json) as Product),
    total: Number(data.count || 0),
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  const categorySlugs = product.categories.map(({ slug }) => slug).slice(0, 8);
  if (!categorySlugs.length) return [];
  const placeholders = categorySlugs.map(() => '?').join(',');
  const result = await database()
    .prepare(
      `SELECT p.content_json, COUNT(*) AS relevance FROM product_categories pc
       JOIN products p ON p.product_id = pc.product_id AND p.locale = pc.locale
       WHERE pc.locale = ? AND pc.category_slug IN (${placeholders}) AND p.product_id != ?
       GROUP BY p.product_id, p.locale, p.content_json
       ORDER BY relevance DESC, p.product_id DESC LIMIT ?`
    )
    .bind(product.locale, ...categorySlugs, product.productId, limit)
    .all<ProductRow>();
  return result.results.map((row) => JSON.parse(row.content_json) as Product);
}

export async function listSitemapSlugs(
  locale: SupportedLocale
): Promise<{ products: string[]; collections: string[] }> {
  const [products, collections] = await database().batch([
    database().prepare('SELECT slug FROM products WHERE locale = ?').bind(locale),
    database().prepare('SELECT DISTINCT category_slug AS slug FROM product_categories WHERE locale = ?').bind(locale),
  ]);
  return {
    products: (products.results as { slug?: string }[]).map((row) => String(row.slug || '')).filter(Boolean),
    collections: (collections.results as { slug?: string }[]).map((row) => String(row.slug || '')).filter(Boolean),
  };
}

export async function listProductsBrief(
  locale: SupportedLocale
): Promise<Array<{ slug: string; title: string; summary: string }>> {
  const result = await database()
    .prepare('SELECT content_json FROM products WHERE locale = ? ORDER BY updated_at DESC')
    .bind(locale)
    .all<ProductRow>();
  return (result.results as ProductRow[]).map((row) => {
    const product = JSON.parse(row.content_json) as Product;
    return { slug: product.slug, title: product.title, summary: product.summary || '' };
  });
}
