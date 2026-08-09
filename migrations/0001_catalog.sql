CREATE TABLE IF NOT EXISTS products (
  product_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  slug TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  content_json TEXT NOT NULL,
  PRIMARY KEY (product_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  PRIMARY KEY (product_id, locale, category_slug),
  FOREIGN KEY (product_id, locale) REFERENCES products(product_id, locale) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_locale_slug ON products(locale, slug);
CREATE INDEX IF NOT EXISTS idx_categories_locale_slug ON product_categories(locale, category_slug);


