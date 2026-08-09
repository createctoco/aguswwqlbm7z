import { BUILD_LOCALE, DEFAULT_LOCALE } from './config';
import selected from '../data/site-copy.current.json';

type SiteCopyEntry = { id: string; source: string; translation: string };
type SiteCopy = { locale: string; sourceHash: string; entries: SiteCopyEntry[] };
const siteCopy = selected as SiteCopy;
export const HAS_SITE_COPY = BUILD_LOCALE === DEFAULT_LOCALE || siteCopy.locale === BUILD_LOCALE;
const translations = new Map((siteCopy.entries || []).map(({ source, translation }) => [source, translation]));

const normalize = (value: string) =>
  value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim();

const protectedBlockPattern =
  /(?:<(script|style|svg|code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>|<article\s+class="group"[^>]*>[\s\S]*?<\/article\s*>)/gi;
const structuredTextKeys = new Set(['name', 'description', 'text', 'headline', 'alternativeHeadline', 'caption']);
const escapeText = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (value: string) => escapeText(value).replaceAll('"', '&quot;');

function withProtectedBlocks(html: string, transform: (masked: string) => string): string {
  const blocks: string[] = [];
  const masked = html.replace(protectedBlockPattern, (block) => {
    const token = `___OUOOO_PROTECTED_BLOCK_${blocks.length}___`;
    blocks.push(block);
    return token;
  });
  return transform(masked).replace(
    /___OUOOO_PROTECTED_BLOCK_(\d+)___/g,
    (_, index: string) => blocks[Number(index)] || ''
  );
}

export function localizeHtml(html: string): string {
  if (BUILD_LOCALE === DEFAULT_LOCALE || !HAS_SITE_COPY) return html;
  const withStructuredData = html.replace(
    /<script\b(?=[^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script\s*>/gi,
    (tag, raw: string) => {
      try {
        const visit = (value: unknown, key = ''): unknown => {
          if (typeof value === 'string' && structuredTextKeys.has(key))
            return translations.get(normalize(value)) || value;
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
    const withText = masked.replace(/>([^<>]+)</g, (match, raw: string) => {
      const translation = translations.get(normalize(raw));
      if (!translation) return match;
      const leading = raw.match(/^\s*/)?.[0] || '';
      const trailing = raw.match(/\s*$/)?.[0] || '';
      return `>${leading}${escapeText(translation)}${trailing}<`;
    });
    const withAttributes = withText.replace(
      /\b(alt|aria-label|title)="([^"]+)"/gi,
      (match, attribute: string, raw: string) => {
        const translation = translations.get(normalize(raw));
        return translation ? `${attribute}="${escapeAttribute(translation)}"` : match;
      }
    );
    return withAttributes.replace(/<meta\b[^>]*>/gi, (tag) => {
      const key = tag.match(/\b(?:name|property)="([^"]+)"/i)?.[1]?.toLowerCase();
      if (!['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(key || '')) {
        return tag;
      }
      return tag.replace(/\bcontent="([^"]+)"/i, (match, raw: string) => {
        const translation = translations.get(normalize(raw));
        return translation ? `content="${escapeAttribute(translation)}"` : match;
      });
    });
  });
}
