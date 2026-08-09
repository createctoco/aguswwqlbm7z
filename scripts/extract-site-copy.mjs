import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { contentHash, extractHtmlCopy } from './site-copy-html.mjs';

const inputRoot = resolve(process.env.OUOOO_SITE_COPY_HTML_ROOT || 'dist/client');
const outputFile = resolve(process.env.OUOOO_SITE_COPY_OUTPUT || 'src/data/site-copy.en.json');

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.html') && !path.includes(`${join('decapcms', '')}`))
      files.push(path);
  }
  return files;
}

const values = new Map();
for (const file of await htmlFiles(inputRoot)) {
  const extracted = extractHtmlCopy(await readFile(file, 'utf8'));
  for (const [id, source] of extracted) values.set(id, source);
}
const entries = [...values].map(([id, source]) => ({ id, source })).sort((a, b) => a.id.localeCompare(b.id));
const manifest = {
  schemaVersion: 1,
  locale: 'en',
  generatedAt: new Date().toISOString(),
  sourceHash: contentHash(entries),
  entries,
};
await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`English site copy extracted: ${entries.length} unique strings.\n`);
