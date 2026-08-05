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

The sync client uses authenticated requests, retries with exponential backoff, and atomic output replacement.

## Deployment

Recommended Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22 or newer

## License

The project retains the original AstroWind MIT license and attribution in `LICENSE.md`.
