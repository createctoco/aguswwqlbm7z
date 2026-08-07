# OUOOO localization architecture

OUOOO currently publishes English only. The localization layer exists so future languages can be generated and deployed without changing English URLs or product identities.

## Production policy

- `https://ouooo.com` is the English source and `x-default` site.
- `https://www.ouooo.com` redirects permanently to the apex domain.
- Future locales use one Cloudflare Pages project per subdomain.
- Translation generation never runs during a public page request.
- A locale is not buildable until its static catalog exists.

## Locale build interface

Each Pages project uses the same repository and sets three build variables:

```text
OUOOO_LOCALE=es
OUOOO_SITE_URL=https://es.ouooo.com
OUOOO_PUBLISHED_LOCALES=en,es
```

The default values are English-only. `scripts/validate-locale-build.mjs` blocks accidental publication of a locale that has no static catalog at:

```text
src/data/i18n/<locale>/site-catalog.json
```

Astro receives the locale-specific canonical origin through `OUOOO_SITE_URL`. The sitemap integration therefore produces a sitemap for the current subdomain only.

## Stable product identity

`productId` is copied from the bridge `source_id` and never translated. `sourceId` remains for compatibility. The English slug is reused from the previous site catalog when products are synchronized again, so an AI title change does not silently change an indexed URL.

Each product has localization metadata:

```json
{
  "sourceLocale": "en",
  "sourceHash": "sha256...",
  "translations": {
    "en": {
      "status": "source",
      "sourceHash": "sha256...",
      "contentHash": "sha256...",
      "attempts": 0,
      "updatedAt": "ISO-8601"
    }
  }
}
```

Future translation states are `pending`, `generating`, `ready`, `stale`, `failed`, and `fallback`. A translation is fresh only when its stored `sourceHash` matches the current English `sourceHash`.

## SEO and direction

The shared metadata component exposes alternate-language links. Only locales listed in `OUOOO_PUBLISHED_LOCALES` are emitted, preventing links to unfinished language sites. English also emits `hreflang="x-default"`.

The root layout takes `lang` and `dir` from the locale registry. Arabic is already configured as `rtl`; all current content remains `ltr` because English is the only published locale.

## Translation fallback

The content resolver accepts a translated record only when its status is `ready` and its `sourceHash` is current. Otherwise it returns the English content and marks the resolution as a fallback. A future translation generator should retain the last successful translation, retry transient DeepSeek failures, and write files atomically.

No translated catalog, language subdomain, or DeepSeek translation request is created at this stage.

The event-driven generator, independent Pages deployment model, automatic product updates, retry policy, and staged rollout are specified in [`multilingual-automation-plan.md`](./multilingual-automation-plan.md).

