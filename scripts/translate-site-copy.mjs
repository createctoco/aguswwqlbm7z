import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const locale = String(process.env.OUOOO_LOCALE || '')
  .trim()
  .toLowerCase();
const definition = localeData.locales[locale];
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const maxAttempts = Math.max(2, Number(process.env.DEEPSEEK_MAX_ATTEMPTS || 4));
const chunkSize = Math.min(30, Math.max(10, Number(process.env.OUOOO_SITE_COPY_CHUNK_SIZE || 20)));
const requestTimeoutMs = Math.max(30000, Number(process.env.DEEPSEEK_TIMEOUT_MS || 90000));
const sourceFile = resolve('src/data/site-copy.en.json');
const outputFile = resolve(`src/data/i18n/${locale}/site-copy.json`);
const checkpointFile = resolve(`src/data/i18n/${locale}/site-copy.checkpoint.json`);

if (!definition || locale === localeData.defaultLocale)
  throw new Error('OUOOO_LOCALE must be a configured non-English locale.');
if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required.');

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function parseFirstJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    if (start < 0) throw new Error('DeepSeek site-copy response contains no JSON object.');
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index += 1) {
      const character = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) return JSON.parse(raw.slice(start, index + 1));
      }
    }
    throw new Error('DeepSeek site-copy JSON object is incomplete.');
  }
}

const source = JSON.parse(await readFile(sourceFile, 'utf8'));
const nativeLanguageLabels = new Set(Object.values(localeData.locales).map(({ label }) => label));
const mayRemainUnchanged = (value) =>
  nativeLanguageLabels.has(value) ||
  /^(?:OUOOO|WhatsApp|WeChat|Facebook|DeepSeek|rosarystore|Error|Material|Contact|Guides?|Collections?)$/i.test(
    value
  ) ||
  /^Error(?:\s+\d+)?(?:\s+—\s+OUOOO)?$/i.test(value) ||
  /^(?:Email|WeChat|WhatsApp):?$/i.test(value) ||
  (locale === 'it' && value === 'Privacy') ||
  /^[\d,.]+\s*(?:mm|cm|m(?:²|2)?|kg|g)$/i.test(value) ||
  /(?:Ltd\.?|Road|Street|Tower|Hong Kong|HK$)/i.test(value);
const previous = await readFile(outputFile, 'utf8')
  .then(JSON.parse)
  .catch(() => null);
const checkpoint = await readFile(checkpointFile, 'utf8')
  .then(JSON.parse)
  .catch(() => null);
const reusableEntries = [
  ...(previous?.entries || []),
  ...(checkpoint?.sourceHash === source.sourceHash ? checkpoint.entries || [] : []),
];
const previousById = new Map(reusableEntries.map((entry) => [entry.id, entry]));
const reviewedTranslations = {
  fil: new Map([
    ['Email fallback', 'Alternatibong email'],
    ['Acrylic / resin', 'Acrylic / resin'],
    ['Stock Wholesale — Ready-to-Ship Inventory — OUOOO', 'Pakyawang Stock — Imbentaryong Handa nang Ipadala — OUOOO'],
    ['Quotation.', 'Presyong alok.'],
    ['Swift Code', 'SWIFT Code'],
    ['TT (Telegraphic Transfer)', 'TT (Telegraphic Transfer)'],
    ['International Zinc Association: zinc die casting', 'International Zinc Association: paghuhulma ng zinc sa die'],
    ['After-sales', 'Serbisyo pagkatapos ng benta'],
    ['Bank Code', 'Kodigo ng bangko'],
  ]),
  ro: new Map([['Branding:', 'Branding:']]),
};
const ready = new Map();
const pending = [];

for (const entry of source.entries || []) {
  const reviewed = reviewedTranslations[locale]?.get(entry.source);
  if (reviewed) {
    ready.set(entry.id, { id: entry.id, source: entry.source, translation: reviewed });
    continue;
  }
  const cached = previousById.get(entry.id);
  if (
    cached?.source === entry.source &&
    cached?.translation &&
    (cached.translation !== entry.source || mayRemainUnchanged(entry.source))
  )
    ready.set(entry.id, cached);
  else pending.push(entry);
}

async function translateChunk(entries) {
  const system = `Translate OUOOO website copy from English into ${definition.label} (${locale}). Return only valid JSON in exactly this shape: {"translations":{"id":"translation"}}. Preserve every supplied id exactly and return every id. Translate naturally for a professional B2B Catholic-gifts website. Preserve OUOOO, WhatsApp, WeChat, email addresses, URLs, product identifiers, numbers, currencies, placeholders in braces, and factual meaning. Translate Catholic terminology accurately. Do not add claims, explanations, markdown, HTML, or source branding. Keep interface labels concise. For Arabic use natural RTL Arabic; for Chinese use the requested script.`;
  let lastError;
  let remaining = [...entries];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const requested = Object.fromEntries(remaining.map(({ id, source: text }) => [id, text]));
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(requestTimeoutMs),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          thinking: { type: 'disabled' },
          temperature: 0.2,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: JSON.stringify({
                locale,
                strings: requested,
                ...(attempt > 1
                  ? {
                      retryInstruction:
                        'These entries were missing or returned unchanged before. Translate every ordinary English word into the target language now. Only protected brands, identifiers, addresses, numbers, and units may stay unchanged.',
                    }
                  : {}),
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 300);
        const retryable =
          response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
        if (!retryable)
          throw new Error(`DeepSeek rejected site-copy translation with HTTP ${response.status}: ${body}`);
        throw new Error(`Temporary DeepSeek error HTTP ${response.status}: ${body}`);
      }
      const payload = await response.json();
      if (payload.choices?.[0]?.finish_reason === 'length') {
        throw new Error('DeepSeek truncated the site-copy JSON; reduce OUOOO_SITE_COPY_CHUNK_SIZE.');
      }
      const raw = payload.choices?.[0]?.message?.content;
      if (!raw) throw new Error('DeepSeek returned empty site-copy content.');
      const translated = parseFirstJsonObject(raw).translations;
      if (!translated || typeof translated !== 'object') throw new Error('DeepSeek returned invalid site-copy JSON.');
      const missing = [];
      for (const { id, source: sourceText } of remaining) {
        const translation = String(translated[id] || '').trim();
        if (translation && (translation !== sourceText || mayRemainUnchanged(sourceText))) {
          ready.set(id, { id, source: sourceText, translation });
        } else missing.push({ id, source: sourceText });
      }
      if (missing.length === 0) return;
      remaining = missing;
      await writeCheckpoint();
      lastError = new Error(`DeepSeek omitted ${missing.length} site-copy ids.`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxAttempts) await delay(Math.min(15000, 800 * 2 ** (attempt - 1)));
  }
  throw lastError || new Error('Site-copy translation failed.');
}

async function writeCheckpoint() {
  await mkdir(dirname(checkpointFile), { recursive: true });
  const entries = (source.entries || []).map(({ id }) => ready.get(id)).filter(Boolean);
  const temporaryFile = `${checkpointFile}.tmp-${process.pid}`;
  await writeFile(
    temporaryFile,
    `${JSON.stringify({ schemaVersion: 1, locale, sourceHash: source.sourceHash, updatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
    'utf8'
  );
  await rename(temporaryFile, checkpointFile);
}

for (let index = 0; index < pending.length; index += chunkSize) {
  const chunk = pending.slice(index, index + chunkSize);
  process.stdout.write(
    `Translating ${locale} site copy ${Math.min(index + chunk.length, pending.length)}/${pending.length}...\n`
  );
  await translateChunk(chunk);
  await writeCheckpoint();
}

const entries = (source.entries || []).map(({ id }) => ready.get(id));
if (entries.some((entry) => !entry)) throw new Error(`Incomplete site-copy translation for ${locale}.`);
const output = {
  schemaVersion: 1,
  locale,
  sourceLocale: 'en',
  sourceHash: source.sourceHash,
  contentHash: hash(entries),
  model,
  generatedAt: new Date().toISOString(),
  translationSummary: { total: entries.length, reused: entries.length - pending.length, translated: pending.length },
  entries,
};
await mkdir(dirname(outputFile), { recursive: true });
const temporaryFile = `${outputFile}.tmp-${process.pid}`;
await writeFile(temporaryFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
await rename(temporaryFile, outputFile);
await rm(checkpointFile, { force: true });
process.stdout.write(`Translated ${locale} site copy: ${entries.length} ready, ${pending.length} new or changed.\n`);
