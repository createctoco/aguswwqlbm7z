// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite/client" />
/// <reference types="../vendor/integration/types.d.ts" />

// Fontsource packages ship CSS only (no type declarations); declare them so
// side-effect imports type-check under TypeScript 6 strict (ts2882).
declare module '@fontsource-variable/*';
declare module '@fontsource/*';

interface ImportMetaEnv {
  readonly OUOOO_LOCALE?: string;
  readonly OUOOO_SITE_URL?: string;
  readonly OUOOO_PUBLISHED_LOCALES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
