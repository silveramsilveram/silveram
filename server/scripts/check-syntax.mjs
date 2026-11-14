// `node --check` every server source file, so new modules are covered without editing a list.
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['app.js'];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.js')) files.push(path);
  }
};
walk(join(root, 'src'));
let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file.startsWith(root) ? file : join(root, file)], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}
console.log(`Checked ${files.length} files, ${failed} failed.`);
process.exit(failed ? 1 : 0);
