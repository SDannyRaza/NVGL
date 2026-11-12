/* Scientific computation stays off the UI thread; load only the active engine. */
'use strict';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/';
let runtimePromise;
let pythonRuntime;
let manifest;
let requestQueue = Promise.resolve();
let numpyLoaded = false;
let rinexReady = false;
let backgroundRequest = false;
const loaded = new Map();
function progress(message) { self.postMessage({kind:'progress', message, background:backgroundRequest}); }

async function loadAsset(pathname) {
  if (loaded.has(pathname)) return loaded.get(pathname);
  const pending = (async () => {
    const version = manifest.versions?.[pathname];
    const response = await fetch(pathname + (version ? '?v=' + version : ''));
    if (!response.ok) throw new Error('Missing laboratory asset: ' + pathname);
    const destination = '/lab' + (pathname.startsWith('/py/') ? pathname.slice(3) : pathname);
    pythonRuntime.FS.mkdirTree(destination.slice(0, destination.lastIndexOf('/')));
    const reader = response.body?.getReader();
    if (reader) {
      const stream = pythonRuntime.FS.open(destination, 'w');
      try {
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          pythonRuntime.FS.write(stream, value, 0, value.length);
        }
      } finally { pythonRuntime.FS.close(stream); reader.releaseLock(); }
    } else pythonRuntime.FS.writeFile(destination, new Uint8Array(await response.arrayBuffer()));
  })();
  loaded.set(pathname, pending);
  try { await pending; } catch(error) { loaded.delete(pathname); throw error; }
}
async function loadGroup(group) {
  const paths = manifest.groups[group];
  if (!paths) throw new Error('Unknown scientific asset group: ' + group);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(4, paths.length)}, async () => {
    while(cursor < paths.length) await loadAsset(paths[cursor++]);
  }));
}
async function initialize() {
  progress('Loading the browser mathematics engine...');
  const manifestRequest = fetch('/python-assets.json', {cache:'no-cache'}).then(response => {
    if (!response.ok) throw new Error('Missing scientific asset manifest.');
    return response.json();
  });
  importScripts(PYODIDE_BASE + 'pyodide.js');
  [pythonRuntime, manifest] = await Promise.all([loadPyodide({indexURL:PYODIDE_BASE}), manifestRequest]);
  pythonRuntime.FS.mkdirTree('/lab');
  await loadGroup('base');
  pythonRuntime.runPython('import sys; sys.path.insert(0, "/lab"); from science_dispatcher import handle_request, initialize_rinex_async');
  return pythonRuntime.globals.get('handle_request');
}
async function dispatch(data) {
  backgroundRequest = Boolean(data.background);
  try {
    if (!runtimePromise) runtimePromise = initialize().catch(error => {
      runtimePromise = null; loaded.clear(); numpyLoaded = false; rinexReady = false;
      throw error;
    });
    const handler = await runtimePromise;
    if (data.route === '/api/view') {
      if (!rinexReady) {
        progress('Loading the observation and navigation files...');
        await loadGroup('rinex');
        progress('Indexing RINEX records in asynchronous batches...');
        await pythonRuntime.runPythonAsync('await initialize_rinex_async()');
        rinexReady = true;
      }
    } else if (/^\/api\/(signals\/|orbit(?:\/|$)|spp\/)/.test(data.route)) {
      if (!manifest.groups.science.every(path => loaded.has(path))) progress('Preparing the requested scientific module...');
      await loadGroup('science');
      if (data.route.startsWith('/api/spp/') && data.route !== '/api/spp/coordinates') {
        await loadGroup('spp');
        if (!numpyLoaded) { await pythonRuntime.loadPackage('numpy'); numpyLoaded = true; }
      }
    }
    const output = JSON.parse(handler(data.method, data.route, JSON.stringify(data.query || {}), JSON.stringify(data.body || {})));
    self.postMessage({id:data.id, kind:'response', status:output.status, data:output.data});
    self.postMessage({kind:'ready',background:backgroundRequest});
  } catch(error) {
    self.postMessage({id:data.id, kind:'failure', message:String(error?.message || error)});
  }
}
self.onmessage = ({data}) => { requestQueue = requestQueue.then(() => dispatch(data)).catch(error => {
  self.postMessage({id:data.id, kind:'failure', message:String(error?.message || error)});
}); };
