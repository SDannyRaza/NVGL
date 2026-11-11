/* Browser-only GNSS scientific bridge. No API server, Vercel Function, or deployed Python process. */
'use strict';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/';
let runtimePromise;
let pythonRuntime;
let requestQueue = Promise.resolve();
let deferredCache;
let numpyLoaded = false;

function progress(message) { self.postMessage({ kind: 'progress', message }); }

async function initialize(initialRoute) {
  progress('Loading the WebAssembly mathematics engine…');
  importScripts(PYODIDE_BASE + 'pyodide.js');
  const py = await loadPyodide({ indexURL: PYODIDE_BASE });
  if(initialRoute !== '/api/view'){ await py.loadPackage('numpy'); numpyLoaded = true; }
  const manifestResponse = await fetch('/python-assets.json');
  if (!manifestResponse.ok) throw new Error('Missing bundled scientific data manifest.');
  const manifest = await manifestResponse.json();
  if(initialRoute === '/api/view'){ deferredCache = manifest.paths.find(p=>p.endsWith('/precomputed.pkl.gz')); manifest.paths = manifest.paths.filter(p=>p!==deferredCache); }
  progress('Loading GNSS observations and broadcast ephemerides…');
  py.FS.mkdirTree('/lab');
  let loaded = 0, cursor = 0;
  await Promise.all(Array.from({length: Math.min(4, manifest.paths.length)}, async () => {
    while (cursor < manifest.paths.length) {
      const pathname = manifest.paths[cursor++];
      const response = await fetch(pathname);
      if (!response.ok) throw new Error('Missing laboratory dataset: ' + pathname);
      const destination = '/lab' + (pathname.startsWith('/py/') ? pathname.slice(3) : pathname);
      py.FS.mkdirTree(destination.slice(0, destination.lastIndexOf('/')));
      const reader = response.body?.getReader();
      if (reader) {
        const stream = py.FS.open(destination, 'w');
        try {
          for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            py.FS.write(stream, value, 0, value.length);
          }
        } finally { py.FS.close(stream); reader.releaseLock(); }
      } else py.FS.writeFile(destination, new Uint8Array(await response.arrayBuffer()));
      progress('Loading laboratory data (' + (++loaded) + '/' + manifest.paths.length + ')');
    }
  }));
  progress('Initializing the original satellite orbit and positioning models…');
  py.runPython('import sys; sys.path.insert(0, "/lab"); from science_dispatcher import handle_request, initialize_rinex_async');
  const handler = py.globals.get('handle_request');
  pythonRuntime = py;
  self.postMessage({ kind: 'ready' });
  return handler;
}

async function dispatch(data) {
  if (!runtimePromise) runtimePromise = initialize(data.route);
  try {
    const handler = await runtimePromise;
    if (data.route === '/api/view') {
      progress('Indexing RINEX records in asynchronous batches...');
      await pythonRuntime.runPythonAsync('await initialize_rinex_async()');
      self.postMessage({kind: 'ready'});
    }
    if(data.route !== '/api/view' && !numpyLoaded){await pythonRuntime.loadPackage('numpy');numpyLoaded=true;}
    if(data.route !== '/api/view' && deferredCache){
      const response = await fetch(deferredCache);
      if(!response.ok)throw new Error('Unable to load the precomputed GNSS dataset.');
      pythonRuntime.FS.writeFile('/lab/precomputed.pkl.gz',new Uint8Array(await response.arrayBuffer()));
      deferredCache = null;
    }
    const output = JSON.parse(handler(data.method, data.route,
      JSON.stringify(data.query || {}), JSON.stringify(data.body || {})));
    self.postMessage({ id: data.id, kind: 'response', status: output.status, data: output.data });
  } catch (error) {
    self.postMessage({ id: data.id, kind: 'failure',
      message: String(error?.message || error) });
  }
};

self.onmessage = ({data}) => { requestQueue = requestQueue.then(() => dispatch(data)); };
