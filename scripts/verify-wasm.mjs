/* Optional release check; run with a temporary local `npm install --no-save pyodide`. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPyodide } from 'pyodide';

const project = new URL('../', import.meta.url).pathname;
const files = JSON.parse(await readFile(join(project, 'public/python-assets.json'))).paths;
const py = await loadPyodide();
await py.loadPackage('numpy');
py.FS.mkdirTree('/lab');
for (const file of files) {
  const destination = '/lab' + (file.startsWith('/py/') ? file.slice(3) : file);
  py.FS.mkdirTree(destination.slice(0, destination.lastIndexOf('/')));
  py.FS.writeFile(destination, await readFile(join(project, 'public', file)));
}
py.runPython('import sys; sys.path.insert(0, "/lab"); from science_dispatcher import handle_request');
const handler = py.globals.get('handle_request');
const checks = [
  ['GET', '/api/view'],
  ['GET', '/api/orbit/meta'],
  ['GET', '/api/orbit'],
  ['GET', '/api/signals/meta'],
  ['GET', '/api/signals/epoch'],
  ['GET', '/api/spp/meta'],
  ['GET', '/api/spp/epoch'],
  ['GET', '/api/spp/contributions'],
  ['GET', '/api/spp/series', { start: 0, stop: 2 }],
  ['GET', '/api/sgp4/status'],
];
let failed = 0;
for (const [method, route, query = {}] of checks) {
  const outcome = JSON.parse(handler(method, route, JSON.stringify(query), '{}'));
  const valid = outcome.status === 200;
  console.log(valid ? 'PASS' : 'FAIL', route, outcome.status, valid ? '' : outcome.data?.error);
  if (!valid) failed++;
}
handler.destroy();
if (failed) process.exitCode = 1;
