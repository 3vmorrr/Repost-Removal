import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const outDir = 'dist';
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await build({ entryPoints: ['src/main.ts'], outfile: `${outDir}/main.js`, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], sourcemap: false, minify: true, treeShaking: true });
await build({ entryPoints: ['src/preload.ts'], outfile: `${outDir}/preload.js`, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], sourcemap: false });
await build({ entryPoints: ['src/social-links.ts'], outfile: `${outDir}/social-links.js`, bundle: true, platform: 'node', format: 'cjs', sourcemap: false });
await build({ entryPoints: ['src/session-state.ts'], outfile: `${outDir}/session-state.js`, bundle: true, platform: 'node', format: 'cjs', sourcemap: false });
await cp('src/renderer', `${outDir}/renderer`, { recursive: true });
