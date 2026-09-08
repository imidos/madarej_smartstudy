import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { zipSync } from 'fflate';
import { verifyRelease } from './verify-release.mjs';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const createdAt = new Date().toISOString();
const destination = resolve('release', `madarej-${pkg.version}-${createdAt.replace(/[:.]/g, '-')}`);
const archive = {};
async function write(name, bytes) {
  archive[name] = new Uint8Array(bytes);
  const target = join(destination, name);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, archive[name]);
}
async function add(source, name) {
  await write(name, await readFile(source));
}
async function copy(source, prefix) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.endsWith('.map') || /^generation-config/.test(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error('Release inputs must not contain symlinks');
    const name = prefix + '/' + entry.name;
    if (entry.isDirectory()) await copy(join(source, entry.name), name);
    else await add(join(source, entry.name), name);
  }
}
const html = await readFile('dist/feasibility/browser/index.html', 'utf8');
if (/\son\w+\s*=/i.test(html)) throw new Error('Inline handlers conflict with the deployment CSP');
await copy('dist/feasibility/browser', 'httpdocs');
for (const file of ['.htaccess', 'web.config'])
  await add(join('deployment', file), 'httpdocs/' + file);
for (const [source, target] of [
  ['docs/deployment.md', 'DEPLOYMENT.md'],
  ['docs/production-test.md', 'PRODUCTION-TEST.md'],
  ['docs/code-review.md', 'CODE-REVIEW.md'],
  ['docs/release-notes.md', 'RELEASE-NOTES.md'],
  ['dist/feasibility/3rdpartylicenses.txt', 'httpdocs/3rdpartylicenses.txt'],
])
  await add(source, target);
let configText;
try {
  configText = await readFile('public/generation-config.json', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Cannot read runtime configuration');
  configText = await readFile('public/generation-config.example.json', 'utf8');
}
let config;
try {
  config = JSON.parse(configText);
} catch {
  throw new Error('Invalid runtime configuration JSON');
}
const runtimeConfigured = typeof config.apiKey === 'string' && !!config.apiKey.trim();
const encode = (value) => new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n');
await write('generation-config.example.json', encode({ ...config, apiKey: '' }));
if (runtimeConfigured) await write('httpdocs/generation-config.json', encode(config));
await copy('examples', 'examples');
let commit = 'unavailable',
  dirty = true;
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  dirty = !!execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  /* Per-file hashes still identify the actual working-tree release. */
}
const manifest = {
  version: pkg.version,
  createdAt,
  commit,
  dirty,
  runtimeConfigured,
  node: process.version,
  lockfileSha256: createHash('sha256')
    .update(await readFile('package-lock.json'))
    .digest('hex'),
  files: Object.entries(archive)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, bytes]) => ({
      file,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })),
};
archive['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + '\n');
await writeFile(join(destination, 'manifest.json'), archive['manifest.json']);
const zip = destination + '.zip';
await writeFile(zip, zipSync(archive, { level: 6 }));
await verifyRelease(zip);
const hash = createHash('sha256')
  .update(await readFile(zip))
  .digest('hex');
await writeFile(zip + '.sha256', hash + '  ' + zip.split(/[\\/]/).at(-1) + '\n');
console.log(`Release ZIP: ${zip}\nSHA-256: ${hash}\nFiles: ${manifest.files.length}`);
