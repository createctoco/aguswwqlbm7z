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

Recommended Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

## License

The project retains the original AstroWind MIT license and attribution in `LICENSE.md`.
