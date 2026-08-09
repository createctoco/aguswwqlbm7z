import { defineMiddleware } from 'astro:middleware';

import { BUILD_LOCALE, DEFAULT_LOCALE } from '~/i18n/config';
import { HAS_SITE_COPY, localizeHtml } from '~/i18n/site-copy';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (BUILD_LOCALE === DEFAULT_LOCALE || !HAS_SITE_COPY) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(localizeHtml(await response.text()), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
