# OUOOO

Pure-static English B2B product catalog and inquiry website for `ouooo.com`.

Built with Astro and Tailwind CSS, based on the open-source AstroWind theme. Product data can be synchronized from the public Mecrt catalog bridge during the build process; customer and order data are not consumed by this project.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated static website is written to `dist/`.

## Product synchronization

Copy `.env.example` to `.env`, then configure the catalog endpoint and secret locally. Never commit `.env` or production secrets.

```bash
npm run sync:catalog
```

The first sync downloads the full catalog. Later syncs request only products modified since the last successful cursor, merge them into the existing snapshot, and preserve the last good file through atomic replacement. The client also accepts upstream `deleted_source_ids` tombstones. Set `MECRT_CATALOG_FULL_SYNC=true` for a periodic reconciliation.

Price, regular-price, sale state, currency, and variation ranges flow from the source product details into the generated site catalog. Variable products without a parent price use their minimum variation price instead of losing pricing entirely.

## Deployment

The catalog uses Astro's mostly-static/on-demand rendering model on Cloudflare Workers:

- marketing and guide pages remain prerendered static assets;
- product lists, product details, and collections render on demand from D1;
- responses use edge cache headers so D1 is not queried on every visit;
- catalog imports upsert only changed product IDs when an incremental sync provides them.

Create the `ouooo-catalog` D1 database, replace the placeholder database ID for local deployment, and apply migrations:

```bash
npx wrangler d1 create ouooo-catalog
npx wrangler d1 migrations apply ouooo-catalog --remote
```

GitHub Actions deployment requires `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and
`CLOUDFLARE_D1_DATABASE_ID`. The committed zero UUID is local-only; the workflow replaces it before remote
operations. It then applies migrations, imports English and published localized catalogs, builds Astro, and deploys
the Worker.

## License

The project retains the original AstroWind MIT license and attribution in `LICENSE.md`.

