import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const site = fs.existsSync(path.join(root, 'dist')) ? path.join(root, 'dist') : path.join(root, 'public');
const routes = [
  ['RINEX Explorer','rinex'],
  ['Satellite Orbits','orbits'],
  ['Single Point Positioning','spp'],
  ['GNSS Signal Simulation','signals'],
  ['GNSS Front End','front-end'],
  ['GNSS Acquisition','acquisition'],
  ['GNSS Tracking','tracking']
];

let failures = 0;
// /signals/ and /signals.html share one script and must expose the same DOM.
for (const base of new Set([path.join(root, 'public'), site])) {
  const canonical = fs.readFileSync(path.join(base, 'signals.html'), 'utf8');
  const routed = fs.readFileSync(path.join(base, 'signals', 'index.html'), 'utf8');
  if (canonical !== routed) {
    console.error(`FAIL signal dashboard HTML differs between /signals.html and /signals/ in ${base}`);
    failures++;
  }
  for (const id of ['epoch-readout', 'epoch-time']) {
    if (!routed.includes(`id="${id}"`)) {
      console.error(`FAIL signal dashboard is missing #${id}`); failures++;
    }
  }
  if (!/id="epoch-select"[^>]*type="range"/.test(routed)) {
    console.error('FAIL signal dashboard epoch control must be a range slider'); failures++;
  }
}
const localRef = /(?:src|href)=["'](\/[A-Za-z0-9_./?=#%+~-]+)["']/g;
for (const [name, route] of routes) {
  const file = path.join(site, route, 'index.html');
  if (!fs.existsSync(file)) {
    console.error(`FAIL ${name}: missing /${route}/index.html`); failures++; continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('/api_browser.js')) {
    console.error(`FAIL ${name}: browser scientific API bridge is missing`); failures++; continue;
  }
  let broken = [];
  for (const m of html.matchAll(localRef)) {
    const ref = m[1].split(/[?#]/)[0];
    if (!ref || ref === '/' || ref.startsWith('/api/')) continue;
    const target = path.join(site, ref.replace(/^\//,''));
    const routeIndex = path.join(target, 'index.html');
    if (!fs.existsSync(target) && !fs.existsSync(routeIndex)) broken.push(ref);
  }
  if (broken.length) {
    console.error(`FAIL ${name}: broken local assets: ${[...new Set(broken)].join(', ')}`); failures++;
  } else console.log(`PASS ${name.padEnd(26)} /${route}/`);
}

for (const required of ['api_browser.js','browser_worker.js','python-assets.json','api/constellations.js']) {
  if (!fs.existsSync(path.join(site, required))) {
    console.error(`FAIL shared browser engine asset: /${required}`); failures++;
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(site,'python-assets.json'),'utf8'));
for (const url of manifest.paths) {
  if (!fs.existsSync(path.join(site, url.replace(/^\//,'')))) {
    console.error(`FAIL scientific manifest asset: ${url}`); failures++;
  }
}
if (!failures) console.log(`PASS scientific manifest (${manifest.paths.length} client-side assets)`);
process.exitCode = failures ? 1 : 0;
