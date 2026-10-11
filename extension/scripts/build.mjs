import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const entryPoints = {
  background: resolve('src/background.ts'), content: resolve('src/content.ts'),
  popup: resolve('src/popup.ts'), options: resolve('src/options.ts'), review: resolve('src/review.ts')
};
const files = ['popup.html', 'popup.css', 'options.html', 'options.css', 'review.html', 'review.css'];

async function buildTarget(directory, target, manifest) {
  await mkdir(`${directory}/icons`, { recursive: true });
  await build({ entryPoints, bundle: true, outdir: directory, format: 'iife', target, minify: true, sourcemap: false, logLevel: 'info' });
  await Promise.all([
    writeFile(`${directory}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`),
    ...files.map((file) => cp(`src/${file}`, `${directory}/${file}`)),
    ...[16, 32, 48, 128].map((size) => cp(`assets/icon-${size}.png`, `${directory}/icons/icon-${size}.png`))
  ]);
}

await rm('dist', { recursive: true, force: true });
const chromiumManifest = JSON.parse(await readFile('src/manifest.json', 'utf8'));
await buildTarget('dist', 'chrome120', chromiumManifest);

const firefoxManifest = structuredClone(chromiumManifest);
delete firefoxManifest.minimum_chrome_version;
firefoxManifest.background = { scripts: ['background.js'] };
firefoxManifest.browser_specific_settings = {
  gecko: { id: 'repost-remover@omarebrahim1', strict_min_version: '128.0' },
  gecko_android: { strict_min_version: '128.0' }
};
await buildTarget('dist/firefox', 'firefox128', firefoxManifest);
