import type { APIRoute } from 'astro';

// The FAQ page moved from /help to /faq. Redirect old links (and any
// indexed /help URLs) with a 301 so bookmarks and search engines follow.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(null, {
    status: 301,
    headers: { Location: '/faq', 'cache-control': 'public, max-age=3600' },
  });
