import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const backupsDir = resolve(root, '.d1/backups');
const latestFile = resolve(backupsDir, 'latest.json');

function run(args) {
  const call =
    process.platform !== 'win32' || !npx.endsWith('.cmd')
      ? { command: npx, args }
      : { command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', args: ['/d', '/s', '/c', npx, ...args] };
  return spawnSync(call.command, call.args, { cwd: root, encoding: 'utf8', env: process.env, shell: false });
}

// Current Time Travel bookmark = the restore point this backup represents.
const bm = run(['wrangler', 'd1', 'time-travel', 'info', 'ouooo-catalog', '--json']);
if (bm.status !== 0) {
  process.stderr.write(`Failed to read D1 bookmark: ${bm.stderr || bm.stdout || bm.error}\n`);
  process.exit(1);
}
const bmOutput = `${bm.stdout || ''}${bm.stderr || ''}`;
const bmStart = bmOutput.indexOf('{');
const bookmark = bmStart >= 0 ? JSON.parse(bmOutput.slice(bmStart)).bookmark : '';
if (!bookmark) {
  process.stderr.write(`D1 bookmark not found: ${bmOutput.slice(0, 200)}\n`);
  process.exit(1);
}

const exportedAt = new Date().toISOString();
const stamp = exportedAt.replace(/[:.]/g, '-');
const outFile = resolve(backupsDir, `backup-${stamp}.sql`);
mkdirSync(backupsDir, { recursive: true });

const exp = run(['wrangler', 'd1', 'export', 'ouooo-catalog', '--remote', '--output', outFile, '-y']);
if (exp.status !== 0) {
  process.stderr.write(`D1 export failed: ${exp.stderr || exp.stdout || exp.error}\n`);
  process.exit(1);
}
const sizeBytes = statSync(outFile).size;
if (sizeBytes < 1000) {
  process.stderr.write(`D1 export looks empty (${sizeBytes} bytes): ${outFile}\n`);
  process.exit(1);
}

const meta = { exportedAt, bookmark, file: outFile, sizeBytes };
writeFileSync(latestFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
process.stdout.write(`D1 backup complete: ${outFile} (${sizeBytes} bytes), bookmark ${bookmark}\n`);
