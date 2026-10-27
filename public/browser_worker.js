/* Browser-only GNSS scientific bridge. No API server, Vercel Function, or deployed Python process. */
'use strict';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/';
let runtimePromise;

function progress(message) { self.postMessage({ kind: 'progress', message }); }

async function initialize() {
  progress('Loading the WebAssembly mathematics engine…');
  importScripts(PYODIDE_BASE + 'pyodide.js');
  const py = await loadPyodide({ indexURL: PYODIDE_BASE });
  await py.loadPackage('numpy');
  const manifestResponse = await fetch('/python-assets.json');
  if (!manifestResponse.ok) throw new Error('Missing bundled scientific data manifest.');
  const manifest = await manifestResponse.json();
  progress('Loading GNSS observations and broadcast ephemerides…');
  py.FS.mkdirTree('/lab');
  let loaded = 0;
  for (const pathname of manifest.paths) {
    const response = await fetch(pathname);
    if (!response.ok) throw new Error('Missing laboratory dataset: ' + pathname);
    const destination = '/lab' + (pathname.startsWith('/py/') ? pathname.slice(3) : pathname);
    const parent = destination.slice(0, destination.lastIndexOf('/'));
    py.FS.mkdirTree(parent);
    py.FS.writeFile(destination, new Uint8Array(await response.arrayBuffer()));
    if (++loaded % 4 === 0) progress('Loading laboratory data (' + loaded + '/' + manifest.paths.length + ')…');
  }
  progress('Initializing the original satellite orbit and positioning models…');
  py.runPython('import sys; sys.path.insert(0, "/lab"); from science_dispatcher import handle_request');
  const handler = py.globals.get('handle_request');
  // This is intentionally initialized only once per dashboard visit.
  const metadata = JSON.parse(handler('GET', '/api/orbit/meta', '{}', '{}'));
  if (metadata.status !== 200) throw new Error(metadata.data?.error || 'GNSS orbit engine could not initialize.');
  self.postMessage({ kind: 'ready' });
  return handler;
}

self.onmessage = async ({ data }) => {
  if (!runtimePromise) runtimePromise = initialize();
  try {
    const handler = await runtimePromise;
    const output = JSON.parse(handler(data.method, data.route,
      JSON.stringify(data.query || {}), JSON.stringify(data.body || {})));
    self.postMessage({ id: data.id, kind: 'response', status: output.status, data: output.data });
  } catch (error) {
    self.postMessage({ id: data.id, kind: 'failure',
      message: String(error?.message || error) });
  }
};
