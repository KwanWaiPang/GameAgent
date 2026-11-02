import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
rmSync(assets, { recursive: true, force: true });
cpSync(resolve(dist, 'assets'), assets, { recursive: true });
writeFileSync(resolve(root, 'index.html'), html);
for (const name of readdirSync(dist)) {
  if (name === 'assets' || name === 'index.html' || name === 'index.source.html') continue;
  cpSync(resolve(dist, name), resolve(root, name), { recursive: true });
}
const js = readdirSync(assets).filter((file) => file.endsWith('.js'));
console.info(`[sync-pages-build] wrote index.html + assets (${js.join(', ')})`);
void join;
