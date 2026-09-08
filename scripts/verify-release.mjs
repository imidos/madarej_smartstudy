import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';

export async function verifyRelease(path) {
  const files = unzipSync(await readFile(path));
  if (!files['manifest.json']) throw new Error('Missing manifest');
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  for (const required of [
    'httpdocs/index.html',
    'httpdocs/.htaccess',
    'httpdocs/web.config',
    'httpdocs/3rdpartylicenses.txt',
    'httpdocs/fonts/Amiri-Regular.ttf',
    'DEPLOYMENT.md',
    'PRODUCTION-TEST.md',
    'generation-config.example.json',
  ]) {
    if (!files[required]) throw new Error('Missing release file: ' + required);
  }
  const expected = new Set(['manifest.json']);
  for (const file of manifest.files) {
    if (expected.has(file.file)) throw new Error('Duplicate manifest entry');
    expected.add(file.file);
    const bytes = files[file.file];
    if (
      !bytes ||
      bytes.length !== file.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== file.sha256
    )
      throw new Error('Hash mismatch: ' + file.file);
  }
  if (manifest.runtimeConfigured && !files['httpdocs/generation-config.json'])
    throw new Error('Missing configured runtime file');
  for (const name of Object.keys(files)) {
    if (!expected.has(name)) throw new Error('Unlisted archive file: ' + name);
    if (name.endsWith('.map') || /(^|\/)(\.git|node_modules|src|scripts|tmp)(\/|$)/.test(name))
      throw new Error('Excluded file in release: ' + name);
  }
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: npm run verify:release -- release/file.zip');
  const manifest = await verifyRelease(process.argv[2]);
  console.log(`Verified ${manifest.version}: ${manifest.files.length} files and SHA-256 hashes`);
}
