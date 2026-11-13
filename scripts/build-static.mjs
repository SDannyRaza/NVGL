import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'dist');

if (!fs.existsSync(path.join(publicDir, 'landing.html'))) {
  throw new Error('public/landing.html is missing.');
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(publicDir, outDir, { recursive: true, force: true, filter: file =>
  !file.split(path.sep).includes('__pycache__') && !file.endsWith('.pyc') &&
  path.basename(file) !== 'precomputed.pkl.gz' &&
  !/^reference\/front_end\/.*\.pdf$/i.test(path.relative(publicDir, file).split(path.sep).join('/'))
});
fs.copyFileSync(path.join(publicDir, 'landing.html'), path.join(outDir, 'index.html'));

const routes = ['rinex', 'orbits', 'spp', 'signals', 'front-end', 'acquisition', 'tracking'];
for (const route of routes) {
  const entry = path.join(outDir, route, 'index.html');
  if (!fs.existsSync(entry)) throw new Error(`Missing dashboard route: /${route}/`);
}
console.log(`Built frontend-only VGL with ${routes.length} dashboard routes in dist/.`);

// Content versions keep cached scripts, styles and datasets aligned with a release.
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifestFile = path.join(outDir, 'python-assets.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const cacheInfo = JSON.parse(fs.readFileSync(path.join(publicDir, 'py/science-cache.json'), 'utf8'));
for (const [url, expected] of Object.entries(cacheInfo.sources)) {
  const source = fs.readFileSync(path.join(publicDir, url.slice(1)), 'utf8').replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(source).digest('hex') !== expected) {
    throw new Error('Stale science cache: run python scripts/prepare-science-cache.py');
  }
}
if (hash(path.join(publicDir, 'py/science-cache.pkl.gz')) !== cacheInfo.bundle_sha256) {
  throw new Error('Science cache checksum mismatch; regenerate the bundle.');
}
const previewMeta = JSON.parse(fs.readFileSync(path.join(publicDir, 'rinex-preview-meta.json'), 'utf8'));
for (const [url, expected] of Object.entries(previewMeta.sources)) {
  const source = fs.readFileSync(path.join(publicDir, url.slice(1)), 'utf8').replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(source).digest('hex') !== expected) {
    throw new Error('Stale RINEX preview: run python scripts/prepare-rinex-preview.py');
  }
}
const canonicalPreview = fs.readFileSync(path.join(publicDir, 'rinex-preview.json'), 'utf8').replace(/\r\n/g, '\n');
if (crypto.createHash('sha256').update(canonicalPreview).digest('hex') !== previewMeta.preview_sha256) {
  throw new Error('RINEX preview checksum mismatch; regenerate the preview.');
}
const previewHelper = path.join(outDir, 'rinex_preview.js');
fs.writeFileSync(previewHelper, fs.readFileSync(previewHelper, 'utf8').replace(
  "'/rinex-preview.json'", "'/rinex-preview.json?v=" + previewMeta.preview_sha256.slice(0,16) + "'"));
manifest.versions = Object.fromEntries(manifest.paths.map(url => [url, hash(path.join(outDir, url.slice(1))).slice(0, 16)]));
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
function versionHTML(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) versionHTML(file);
    // Preserve both landing-page entry points byte for byte, including URLs.
    else if (entry.name.endsWith('.html') && file !== path.join(outDir, 'index.html') && file !== path.join(outDir, 'landing.html')) {
      const html = fs.readFileSync(file, 'utf8').replace(/((?:src|href)=["'])(\/[^"'?#]+\.(?:js|css))(["'])/g,
        (match, start, url, end) => {
          const target = path.join(outDir, url.slice(1));
          return fs.existsSync(target) ? start + url + '?v=' + hash(target).slice(0, 16) + end : match;
        });
      fs.writeFileSync(file, html);
    }
  }
}
versionHTML(outDir);
console.log('Versioned script, stylesheet and scientific-data URLs; verified source cache checksums.');
