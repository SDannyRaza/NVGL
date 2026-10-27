import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'dist');

if (!fs.existsSync(path.join(publicDir, 'landing.html'))) {
  throw new Error('public/landing.html is missing.');
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(publicDir, outDir, { recursive: true, force: true });
fs.copyFileSync(path.join(publicDir, 'landing.html'), path.join(outDir, 'index.html'));

const routes = ['rinex', 'orbits', 'spp', 'signals', 'front-end', 'acquisition', 'tracking'];
for (const route of routes) {
  const entry = path.join(outDir, route, 'index.html');
  if (!fs.existsSync(entry)) throw new Error(`Missing dashboard route: /${route}/`);
}
console.log(`Built frontend-only VGL with ${routes.length} dashboard routes in dist/.`);
