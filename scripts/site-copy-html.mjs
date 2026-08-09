import { createHash } from 'node:crypto';

const protectedExact = new Set(['OUOOO', 'WhatsApp', 'WeChat', 'Facebook', 'DeepSeek']);
const structuredTextKeys = new Set(['name', 'description', 'text', 'headline', 'alternativeHeadline', 'caption']);
const protectedBlockPattern =
  /(?:<(script|style|svg|code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>|<article\s+class="group"[^>]*>[\s\S]*?<\/article\s*>)/gi;

export const normalizeCopy = (value) =>
  String(value || '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim();

export const copyId = (source) => createHash('sha256').update(normalizeCopy(source)).digest('hex').slice(0, 24);
export const contentHash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function isTranslatableCopy(value) {
  const text = normalizeCopy(value);
  if (text.length < 2 || protectedExact.has(text)) return false;
  if (text.includes('___OUOOO_PROTECTED_BLOCK_')) return false;
  if (!/\p{L}/u.test(text)) return false;
  if (/^(?:https?:\/\/|mailto:|tel:|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(text)) return false;
  if (/^(?:index|noindex)(?:\s*,\s*(?:follow|nofollow))?$/i.test(text)) return false;
  if (/^[A-Z0-9_.:/+-]{2,}$/u.test(text)) return false;
  return true;
}

function withProtectedBlocks(html, transform) {
  const blocks = [];
  const masked = html.replace(protectedBlockPattern, (block) => {
    const token = `___OUOOO_PROTECTED_BLOCK_${blocks.length}___`;
    blocks.push(block);
    return token;
  });
  const transformed = transform(masked);
  return transformed.replace(/___OUOOO_PROTECTED_BLOCK_(\d+)___/g, (_, index) => blocks[Number(index)] || '');
}

export function extractHtmlCopy(html) {
  const values = new Map();
  const add = (value) => {
    const source = normalizeCopy(value);
    if (isTranslatableCopy(source)) values.set(copyId(source), source);
  };
  html.replace(/<script\b(?=[^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script\s*>/gi, (tag, raw) => {
    try {
      const visit = (value, key = '') => {
        if (typeof value === 'string' && structuredTextKeys.has(key)) add(value);
        else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
        else if (value && typeof value === 'object')
          Object.entries(value).forEach(([childKey, item]) => visit(item, childKey));
      };
      visit(JSON.parse(raw));
    } catch {
      // Invalid JSON-LD is left untouched and will be caught by page validation.
    }
    return tag;
  });
  withProtectedBlocks(html, (masked) => {
    masked.replace(/>([^<>]+)</g, (_, value) => {
      add(value);
      return _;
    });
    masked.replace(/\b(?:alt|aria-label|title)="([^"]+)"/gi, (_, value) => {
      add(value);
      return _;
    });
    masked.replace(/<meta\b[^>]*>/gi, (tag) => {
      const key = tag.match(/\b(?:name|property)="([^"]+)"/i)?.[1]?.toLowerCase();
      if (['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(key)) {
        add(tag.match(/\bcontent="([^"]+)"/i)?.[1]);
      }
      return tag;
    });
    return masked;
  });
  return values;
}

const escapeText = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (value) => escapeText(value).replaceAll('"', '&quot;');

export function translateHtml(html, translationsBySource) {
  const withStructuredData = html.replace(
    /<script\b(?=[^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script\s*>/gi,
    (tag, raw) => {
      try {
        const visit = (value, key = '') => {
          if (typeof value === 'string' && structuredTextKeys.has(key)) {
            return translationsBySource.get(normalizeCopy(value)) || value;
          }
          if (Array.isArray(value)) return value.map((item) => visit(item, key));
          if (value && typeof value === 'object') {
            return Object.fromEntries(
              Object.entries(value).map(([childKey, item]) => [childKey, visit(item, childKey)])
            );
          }
          return value;
        };
        return tag.replace(raw, JSON.stringify(visit(JSON.parse(raw))).replaceAll('<', '\\u003c'));
      } catch {
        return tag;
      }
    }
  );
  return withProtectedBlocks(withStructuredData, (masked) => {
    const withText = masked.replace(/>([^<>]+)</g, (match, raw) => {
      const source = normalizeCopy(raw);
      const translation = translationsBySource.get(source);
      if (!translation) return match;
      const leading = raw.match(/^\s*/)?.[0] || '';
      const trailing = raw.match(/\s*$/)?.[0] || '';
      return `>${leading}${escapeText(translation)}${trailing}<`;
    });
    const withAttributes = withText.replace(/\b(alt|aria-label|title)="([^"]+)"/gi, (match, attribute, raw) => {
      const translation = translationsBySource.get(normalizeCopy(raw));
      return translation ? `${attribute}="${escapeAttribute(translation)}"` : match;
    });
    return withAttributes.replace(/<meta\b[^>]*>/gi, (tag) => {
      const key = tag.match(/\b(?:name|property)="([^"]+)"/i)?.[1]?.toLowerCase();
      if (!['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(key)) {
        return tag;
      }
      return tag.replace(/\bcontent="([^"]+)"/i, (match, raw) => {
        const translation = translationsBySource.get(normalizeCopy(raw));
        return translation ? `content="${escapeAttribute(translation)}"` : match;
      });
    });
  });
}
