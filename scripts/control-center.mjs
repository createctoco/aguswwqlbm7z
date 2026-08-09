import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import localeData from '../src/i18n/locales.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = join(root, 'tools', 'control-center');
const stateRoot = join(root, '.ouooo-control');
const logRoot = join(stateRoot, 'logs');
const runtimeConfig = join(stateRoot, 'wrangler.runtime.jsonc');
const host = '127.0.0.1';
const port = Number.parseInt(process.env.OUOOO_CONTROL_PORT || '4173', 10);
const csrfToken = randomBytes(24).toString('hex');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

let activeTask = null;
let latestTask = null;

await mkdir(logRoot, { recursive: true });

const taskDefinitions = {
  sync: {
    label: 'Synchronize source catalog',
    steps: [{ label: 'Pull changed products from MECRT', command: npmCommand, args: ['run', 'sync:catalog'] }],
  },
  enrich: {
    label: 'Rewrite English catalog with DeepSeek',
    steps: [{ label: 'Enrich changed products', command: npmCommand, args: ['run', 'enrich:catalog'] }],
  },
  prepare: {
    label: 'Prepare website catalog',
    steps: [{ label: 'Generate validated website catalog', command: npmCommand, args: ['run', 'prepare:catalog'] }],
  },
  publishData: {
    label: 'Publish English data to D1',
    dynamic: publishEnglishData,
  },
  deploy: {
    label: 'Build and publish Worker',
    dynamic: deployWorker,
  },
  full: {
    label: 'Process and publish next 10-product batch',
    dynamic: runFullPipeline,
  },
};

function safeTimestamp() {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function taskSnapshot(task) {
  if (!task) return null;
  return {
    id: task.id,
    action: task.action,
    label: task.label,
    status: task.status,
    step: task.step,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    exitCode: task.exitCode,
    error: task.error,
    logFile: task.logFile ? task.logFile.split(/[\\/]/).at(-1) : '',
  };
}

async function fileExists(path) {
  return access(path).then(
    () => true,
    () => false
  );
}

async function readEnvValues() {
  const content = await readFile(join(root, '.env'), 'utf8').catch(() => '');
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2').trim();
    values.set(match[1], value);
  }
  return values;
}

async function catalogSummary() {
  const data = await readFile(join(root, 'src', 'data', 'site-catalog.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  const localizedRoot = join(root, 'src', 'data', 'i18n');
  const localeDirectories = await readdir(localizedRoot, { withFileTypes: true }).catch(() => []);
  return {
    products: data?.products?.length || 0,
    generatedAt: data?.generatedAt || '',
    locales: localeDirectories.filter((entry) => entry.isDirectory()).length,
  };
}

async function runCommand(task, step) {
  task.step = step.label;
  await log(task, `\n[STEP] ${step.label}\n`);
  const environment = {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    WRANGLER_LOG_PATH: join(stateRoot, 'wrangler.log'),
    ...step.env,
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const invocation = commandInvocation(step.command, step.args);
    const child = spawn(invocation.command, invocation.args, {
      cwd: step.cwd || root,
      env: environment,
      shell: false,
      windowsHide: true,
    });
    child.stdout.on('data', (chunk) => log(task, chunk.toString()));
    child.stderr.on('data', (chunk) => log(task, chunk.toString()));
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${step.label} exited with code ${code}.`));
    });
  });
}

async function log(task, message) {
  const clean = String(message).replace(/(DEEPSEEK_API_KEY|MECRT_CATALOG_BRIDGE_SECRET)=\S+/gi, '$1=[hidden]');
  task.tail = `${task.tail || ''}${clean}`.slice(-40_000);
  await appendFile(task.logFile, clean, 'utf8');
}

async function discoverD1() {
  const output = await captureCommand(npxCommand, ['wrangler', 'd1', 'list', '--json']);
  const databases = JSON.parse(output.slice(output.indexOf('[')));
  const database = databases.find((item) => item.name === 'ouooo-catalog');
  if (!database?.uuid) throw new Error('Cloudflare D1 database "ouooo-catalog" was not found.');
  return database;
}

async function captureCommand(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const invocation = commandInvocation(command, args);
    const child = spawn(invocation.command, invocation.args, {
      cwd: root,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', WRANGLER_LOG_PATH: join(stateRoot, 'wrangler.log') },
      shell: false,
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk.toString()));
    child.stderr.on('data', (chunk) => (output += chunk.toString()));
    child.on('error', rejectPromise);
    child.on('close', (code) => (code === 0 ? resolvePromise(output) : rejectPromise(new Error(output))));
  });
}

function commandInvocation(command, args) {
  if (process.platform !== 'win32' || !command.toLowerCase().endsWith('.cmd')) return { command, args };
  return {
    command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
    args: ['/d', '/s', '/c', command, ...args],
  };
}

async function writeRuntimeConfig(databaseId) {
  const config = {
    $schema: '../node_modules/wrangler/config-schema.json',
    name: 'ouooo-catalog',
    main: '../dist/server/entry.mjs',
    compatibility_date: '2026-08-01',
    compatibility_flags: ['nodejs_compat'],
    assets: { directory: '../dist/client' },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'ouooo-catalog',
        database_id: databaseId,
        migrations_dir: '../migrations',
      },
    ],
    observability: { enabled: true, head_sampling_rate: 0.1 },
  };
  await writeFile(runtimeConfig, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function cloudflareContext(task) {
  task.step = 'Discover Cloudflare D1 database';
  await log(task, '\n[STEP] Discover Cloudflare D1 database\n');
  const database = await discoverD1();
  await writeRuntimeConfig(database.uuid);
  await log(task, `Using D1 database ${database.name}.\n`);
  return database;
}

async function publishEnglishData(task) {
  await cloudflareContext(task);
  await runCommand(task, {
    label: 'Apply D1 migrations',
    command: npxCommand,
    args: ['wrangler', 'd1', 'migrations', 'apply', 'ouooo-catalog', '--remote', '--config', runtimeConfig],
  });
  await runCommand(task, {
    label: 'Prepare English D1 import',
    command: npmCommand,
    args: ['run', 'prepare:d1'],
    env: { OUOOO_LOCALE: 'en' },
  });
  await runCommand(task, {
    label: 'Import English catalog to D1',
    command: npxCommand,
    args: [
      'wrangler',
      'd1',
      'execute',
      'ouooo-catalog',
      '--remote',
      '--file',
      join(root, '.d1', 'import-en.sql'),
      '--config',
      runtimeConfig,
    ],
  });
}

async function deployWorker(task) {
  await cloudflareContext(task);
  await runCommand(task, { label: 'Build OUOOO Worker', command: npmCommand, args: ['run', 'build'] });
  await runCommand(task, {
    label: 'Deploy OUOOO Worker',
    command: npxCommand,
    args: [
      'wrangler',
      'deploy',
      join(root, 'dist', 'server', 'entry.mjs'),
      '--config',
      runtimeConfig,
      '--assets',
      join(root, 'dist', 'client'),
    ],
  });
}

async function runFullPipeline(task) {
  for (const action of ['sync', 'enrich', 'prepare']) {
    for (const step of taskDefinitions[action].steps) await runCommand(task, step);
  }
  await publishEnglishData(task);
  for (const locale of Object.keys(localeData.locales).filter((item) => item !== localeData.defaultLocale)) {
    const translatedFile = join(root, 'src', 'data', 'i18n', locale, 'site-catalog.json');
    const importFile = join(root, '.d1', `import-${locale}.sql`);
    await runCommand(task, {
      label: `Translate changed products to ${locale}`,
      command: npmCommand,
      args: ['run', 'translate:catalog'],
      env: { OUOOO_LOCALE: locale },
    });
    await runCommand(task, {
      label: `Prepare ${locale} D1 import`,
      command: npmCommand,
      args: ['run', 'prepare:d1'],
      env: {
        OUOOO_LOCALE: locale,
        OUOOO_D1_CATALOG_INPUT: translatedFile,
        OUOOO_D1_IMPORT_OUTPUT: importFile,
      },
    });
    await runCommand(task, {
      label: `Import ${locale} catalog to D1`,
      command: npxCommand,
      args: ['wrangler', 'd1', 'execute', 'ouooo-catalog', '--remote', '--file', importFile, '--config', runtimeConfig],
    });
  }
  await runCommand(task, {
    label: 'Acknowledge completed product batch',
    command: npmCommand,
    args: ['run', 'ack:catalog'],
  });
}

async function startTask(action) {
  if (activeTask) throw new Error('Another task is already running.');
  const definition = taskDefinitions[action];
  if (!definition) throw new Error('Unknown task.');
  const task = {
    id: randomBytes(8).toString('hex'),
    action,
    label: definition.label,
    status: 'running',
    step: 'Starting',
    startedAt: new Date().toISOString(),
    finishedAt: '',
    exitCode: null,
    error: '',
    tail: '',
    logFile: join(logRoot, `${safeTimestamp()}-${action}.log`),
  };
  activeTask = task;
  latestTask = task;
  await log(task, `[OUOOO] ${task.label}\nStarted: ${task.startedAt}\n`);

  void (async () => {
    try {
      if (definition.dynamic) await definition.dynamic(task);
      else for (const step of definition.steps) await runCommand(task, step);
      task.status = 'success';
      task.exitCode = 0;
      await log(task, `\n[OK] Completed successfully.\n`);
    } catch (error) {
      task.status = 'failed';
      task.exitCode = 1;
      task.error = error instanceof Error ? error.message : String(error);
      await log(task, `\n[FAILED] ${task.error}\n`);
    } finally {
      task.finishedAt = new Date().toISOString();
      activeTask = null;
    }
  })();
  return taskSnapshot(task);
}

async function statusPayload() {
  const envValues = await readEnvValues();
  const catalog = await catalogSummary();
  const git = await captureCommand('git', ['status', '--short', '--branch']).catch(() => 'Unavailable');
  const queue = await readFile(join(stateRoot, 'catalog-queue.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  return {
    csrfToken,
    activeTask: taskSnapshot(activeTask),
    latestTask: taskSnapshot(latestTask),
    tail: latestTask?.tail || '',
    catalog,
    queue: {
      pending: queue?.pendingSourceIds?.length || 0,
      inflight: queue?.inflightSourceIds?.length || 0,
      processed: queue?.processed || 0,
      sourceTotal: queue?.sourceTotal || 0,
    },
    git: git.trim(),
    config: {
      mecrt:
        /^https:\/\//i.test(envValues.get('MECRT_CATALOG_URL') || '') &&
        (envValues.get('MECRT_CATALOG_BRIDGE_SECRET') || '').length >= 32,
      deepseek: (envValues.get('DEEPSEEK_API_KEY') || '').length >= 20,
      cloudflare: await fileExists(
        join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml')
      ),
    },
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, `http://${host}:${port}`).pathname;
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(uiRoot, relative);
  if (!filePath.startsWith(`${uiRoot}\\`) && filePath !== uiRoot)
    return sendJson(response, 403, { error: 'Forbidden' });
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return sendJson(response, 404, { error: 'Not found' });
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  };
  response.writeHead(200, {
    'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (request.method === 'GET' && url.pathname === '/api/status')
      return sendJson(response, 200, await statusPayload());
    if (request.method === 'POST' && url.pathname.startsWith('/api/tasks/')) {
      if (request.headers['x-ouooo-token'] !== csrfToken)
        return sendJson(response, 403, { error: 'Invalid local token.' });
      const action = url.pathname.split('/').at(-1);
      return sendJson(response, 202, { task: await startTask(action) });
    }
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
    return serveStatic(request, response);
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

function openControlCenter() {
  const url = `http://${host}:${port}`;
  const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const opener = spawn(command, args, { detached: true, shell: false, stdio: 'ignore', windowsHide: true });
  opener.unref();
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    console.log(`OUOOO Control Center is already running at http://${host}:${port}`);
    openControlCenter();
    process.exit(0);
  }
  throw error;
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`OUOOO Control Center: ${url}`);
  if (process.argv.includes('--open')) openControlCenter();
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
