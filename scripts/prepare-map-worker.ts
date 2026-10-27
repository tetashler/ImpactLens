import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// MapLibre v6 requires an explicit same-origin ESM worker URL with bundlers.
const distribution = dirname(fileURLToPath(import.meta.resolve('maplibre-gl')));
const target = fileURLToPath(new URL('../public/vendor/maplibre/', import.meta.url));
mkdirSync(target, { recursive: true });
for (const filename of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(join(distribution, filename), join(target, filename));
for (const filename of ['LICENSE.txt', 'LICENSE']) if (existsSync(join(distribution, '..', filename))) copyFileSync(join(distribution, '..', filename), join(target, filename));
console.log('Prepared same-origin MapLibre worker and licence.');
