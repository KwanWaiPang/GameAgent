import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const htmlName = existsSync(resolve(dist, 'index.html'))
  ? 'index.html'
  : existsSync(resolve(dist, 'index.source.html'))
    ? 'index.source.html'
    : null;
if (!htmlName) {
  console.error('[sync-pages-build] dist html missing');
  process.exit(1);
}
const html = readFileSync(resolve(dist, htmlName), 'utf8');
if (!html.includes('./assets/')) {
  console.error('[sync-pages-build] built html does not reference ./assets/');
  process.exit(1);
}
const assets = resolve(root, 'assets');
const kept = ['characters', 'runtime', 'maps', 'audio', 'hostages', 'environment', 'ui'];
const stash = resolve(root, '.asset-stash');
rmSync(stash, { recursive: true, force: true });
for (const name of kept) {
  const from = resolve(assets, name);
  if (existsSync(from)) cpSync(from, resolve(stash, name), { recursive: true });
}
rmSync(assets, { recursive: true, force: true });
cpSync(resolve(dist, 'assets'), assets, { recursive: true });
for (const name of kept) copyMissing(resolve(stash, name), resolve(assets, name));
rmSync(stash, { recursive: true, force: true });
writeFileSync(resolve(root, 'index.html'), html);
for (const name of readdirSync(dist)) {
  if (name === 'assets' || name === 'index.html' || name === 'index.source.html') continue;
  cpSync(resolve(dist, name), resolve(root, name), { recursive: true });
}
const js = readdirSync(assets).filter((file) => file.endsWith('.js'));
console.info(`[sync-pages-build] wrote index.html + assets (${js.join(', ')})`);

function copyMissing(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = resolve(from, entry.name);
    const dst = resolve(to, entry.name);
    if (entry.isDirectory()) copyMissing(src, dst);
    else if (!existsSync(dst)) cpSync(src, dst);
  }
}
