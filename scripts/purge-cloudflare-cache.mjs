import localeData from '../src/i18n/locales.json' with { type: 'json' };

const apiToken = process.env.CLOUDFLARE_PURGE_TOKEN || process.env.CLOUDFLARE_API_TOKEN || '';
const hosts = [...new Set(Object.values(localeData.locales).map(({ host }) => host))];

if (!apiToken) {
  console.warn('CLOUDFLARE_API_TOKEN not set; skipping cache purge.');
  process.exit(0);
}

const headers = { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' };

// Best-effort: purge every host's zone so deployments show immediately.
// Failures are logged but do not fail the deploy (the token may not have the
// Cache Purge permission).
for (const host of hosts) {
  try {
    const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${host}`, { headers });
    const list = await listRes.json();
    const zoneId = list?.result?.[0]?.id;
    if (!zoneId) {
      console.warn(`No Cloudflare zone found for ${host}.`);
      continue;
    }
    const purgeRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ purge_everything: true }),
    });
    const purge = await purgeRes.json();
    if (purge?.success) console.log(`Purged cache for ${host} (${zoneId}).`);
    else console.warn(`Purge failed for ${host}: ${JSON.stringify(purge?.errors || purge).slice(0, 200)}`);
  } catch (error) {
    console.warn(`Purge error for ${host}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log('Cloudflare cache purge finished (best effort).');
