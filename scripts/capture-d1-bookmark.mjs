import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const bookmarkFile = resolve(root, '.d1/restore-bookmark.txt');

// Windows cannot spawn .cmd files with shell:false; route them through cmd.exe.
function run(args) {
  const call =
    process.platform !== 'win32' || !npx.endsWith('.cmd')
      ? { command: npx, args }
      : { command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', args: ['/d', '/s', '/c', npx, ...args] };
  return spawnSync(call.command, call.args, { cwd: root, encoding: 'utf8', env: process.env, shell: false });
}

// Capture the current D1 Time Travel bookmark BEFORE any catalog imports so a
// later health-check failure can restore the database to this known-good state.
const result = run(['wrangler', 'd1', 'time-travel', 'info', 'ouooo-catalog', '--json']);
if (result.status !== 0) {
  process.stderr.write(`Failed to capture D1 bookmark: ${result.stderr || result.stdout || result.error}\n`);
  process.exit(1);
}
const output = `${result.stdout || ''}${result.stderr || ''}`;
const start = output.indexOf('{');
const bookmark = start >= 0 ? JSON.parse(output.slice(start)).bookmark : '';
if (!bookmark) {
  process.stderr.write(`D1 bookmark was not found in wrangler output: ${output.slice(0, 200)}\n`);
  process.exit(1);
}
mkdirSync(dirname(bookmarkFile), { recursive: true });
writeFileSync(bookmarkFile, `${bookmark}\n`, 'utf8');
process.stdout.write(`D1 restore point captured: ${bookmark}\n`);
