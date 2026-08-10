import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stateRoot = join(root, '.ouooo-control');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let databaseId = process.env.OUOOO_D1_DATABASE_ID;
let sessionNamespaceId = process.env.OUOOO_SESSION_KV_ID;
const requested = process.argv.slice(2);
const localeNames = requested.length ? requested : Object.keys(localeData.locales);
const publishedLocales = Object.keys(localeData.locales).join(',');
const manageRoutes = process.env.OUOOO_MANAGE_ROUTES !== '0';

for (const locale of localeNames) {
  if (!localeData.locales[locale]) throw new Error(`Unsupported locale: ${locale}`);
}

function invocation(command, args) {
  if (process.platform !== 'win32' || !command.endsWith('.cmd')) return { command, args };
  return {
    command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
    args: ['/d', '/s', '/c', command, ...args],
  };
}

function run(command, args, environment) {
  return new Promise((resolvePromise, rejectPromise) => {
    const call = invocation(command, args);
    const child = spawn(call.command, call.args, {
      cwd: root,
      env: { ...process.env, ...environment },
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', rejectPromise);
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} exited with code ${code}.`))
    );
  });
}

function capture(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const call = invocation(command, args);
    const child = spawn(call.command, call.args, {
      cwd: root,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', WRANGLER_LOG_PATH: join(stateRoot, 'wrangler.log') },
      shell: false,
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk.toString()));
    child.stderr.on('data', (chunk) => (output += chunk.toString()));
    child.on('error', rejectPromise);
    child.on('close', (code) =>
      code === 0 ? resolvePromise(output) : rejectPromise(new Error(`${command} exited with code ${code}: ${output}`))
    );
  });
}

await mkdir(stateRoot, { recursive: true });
if (!databaseId) {
  const output = await capture(npxCommand, ['wrangler', 'd1', 'list', '--json']);
  const databases = JSON.parse(output.slice(output.indexOf('[')));
  databaseId = databases.find((item) => item.name === 'ouooo-catalog')?.uuid;
}
if (!sessionNamespaceId) {
  const output = await capture(npxCommand, ['wrangler', 'kv', 'namespace', 'list']);
  const namespaces = JSON.parse(output.slice(output.indexOf('[')));
  sessionNamespaceId = namespaces.find((item) => item.title === 'ouooo-catalog-session')?.id;
}
if (!databaseId) throw new Error('Cloudflare D1 database "ouooo-catalog" was not found.');
if (!sessionNamespaceId) throw new Error('Cloudflare KV namespace "ouooo-catalog-session" was not found.');
if (localeNames.some((locale) => locale !== localeData.defaultLocale)) {
  const english = localeData.locales[localeData.defaultLocale];
  const environment = {
    ASTRO_TELEMETRY_DISABLED: '1',
    OUOOO_LOCALE: localeData.defaultLocale,
    OUOOO_SITE_URL: `https://${english.host}`,
    OUOOO_PUBLISHED_LOCALES: publishedLocales,
  };
  process.stdout.write('\n[OUOOO] Extracting the approved English page-copy scope\n');
  await run(npmCommand, ['run', 'build'], environment);
  await run(npmCommand, ['run', 'extract:site-copy'], environment);
  for (const locale of localeNames.filter((item) => item !== localeData.defaultLocale)) {
    await run(npmCommand, ['run', 'translate:site-copy'], { ...environment, OUOOO_LOCALE: locale });
  }
}
for (const locale of localeNames) {
  const definition = localeData.locales[locale];
  const workerName = locale === localeData.defaultLocale ? 'ouooo-catalog' : `ouooo-${locale}`;
  const configFile = join(stateRoot, `deploy-${locale}.jsonc`);
  const config = {
    $schema: '../node_modules/wrangler/config-schema.json',
    name: workerName,
    main: '../dist/server/entry.mjs',
    compatibility_date: '2026-08-01',
    compatibility_flags: ['nodejs_compat'],
    ...(manageRoutes
      ? {
          routes:
            locale === localeData.defaultLocale
              ? [{ pattern: `${definition.host}/*`, zone_name: definition.host }]
              : [{ pattern: definition.host, custom_domain: true }],
        }
      : {}),
    assets: { directory: '../dist/client', binding: 'ASSETS' },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'ouooo-catalog',
        database_id: databaseId,
        migrations_dir: '../migrations',
      },
    ],
    kv_namespaces: [{ binding: 'SESSION', id: sessionNamespaceId }],
    observability: { enabled: true, head_sampling_rate: 0.1 },
  };
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  const environment = {
    ASTRO_TELEMETRY_DISABLED: '1',
    WRANGLER_LOG_PATH: join(stateRoot, `deploy-${locale}.log`),
    OUOOO_LOCALE: locale,
    OUOOO_SITE_URL: `https://${definition.host}`,
    OUOOO_PUBLISHED_LOCALES: publishedLocales,
  };
  process.stdout.write(`\n[OUOOO] Building ${locale} for ${definition.host}\n`);
  await run(npmCommand, ['run', 'build'], environment);
  if (locale !== localeData.defaultLocale) {
    await run(npmCommand, ['run', 'localize:built-html'], environment);
    await run(npmCommand, ['run', 'verify:localized-html'], environment);
  }
  process.stdout.write(`[OUOOO] Deploying ${locale} to ${workerName}\n`);
  await run(
    npxCommand,
    [
      'wrangler',
      'deploy',
      join(root, 'dist', 'server', 'entry.mjs'),
      '--config',
      configFile,
      '--assets',
      join(root, 'dist', 'client'),
    ],
    environment
  );
  process.stdout.write(`[OUOOO] Deployed https://${definition.host}\n`);
}
