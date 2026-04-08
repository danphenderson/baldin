import { cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, '..');
const distDir = resolve(frontendDir, 'dist');
const indexHtml = resolve(distDir, 'index.html');
const notFoundHtml = resolve(distDir, '404.html');

await build({
  configFile: resolve(frontendDir, 'vite.config.ts'),
  root: frontendDir,
});

await cp(indexHtml, notFoundHtml);

console.log('Copied dist/index.html to dist/404.html for static hosting fallbacks.');
