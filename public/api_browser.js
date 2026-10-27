/* The seven dashboards keep their established fetch() contract while all scientific requests are resolved locally in the browser.
 * Requests are resolved by a Web Worker running the original Python GNSS
 * algorithms in WebAssembly, entirely on the visitor's device. */
(() => {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const waiting = new Map();
  let worker;
  let sequence = 0;
  let status;

  function announce(message, isError = false) {
    if (!status) {
      status = document.createElement('div');
      status.id = 'browser-gnss-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      Object.assign(status.style, {
        position: 'fixed', bottom: '20px', left: '20px', zIndex: 2147483600,
        maxWidth: 'min(420px, calc(100vw - 40px))',
        padding: '12px 16px', borderRadius: '9px',
        color: '#e5f7ff', background: '#082a40',
        border: '1px solid #3a849b', boxShadow: '0 12px 30px #0007',
        font: '500 13px/1.55 Inter, sans-serif'
      });
      document.body.append(status);
    }
    status.textContent = message;
    status.style.borderColor = isError ? '#ee7a82' : '#3a849b';
    status.hidden = !message;
  }

  function getWorker() {
    if (worker) return worker;
    announce('Preparing scientific computation in your browser. The first load may take a moment…');
    worker = new Worker('/browser_worker.js');
    worker.onmessage = ({ data }) => {
      if (data?.kind === 'progress') {
        announce(data.message);
        return;
      }
      if (data?.kind === 'ready') {
        announce('');
        return;
      }
      const item = waiting.get(data?.id);
      if (!item) return;
      waiting.delete(data.id);
      if (data.kind === 'failure') {
        announce(data.message || 'The browser scientific engine could not load.', true);
        item.resolve({ status: 503, data: { error: data.message || 'Browser scientific engine unavailable.' } });
      } else {
        item.resolve({ status: data.status, data: data.data });
      }
    };
    worker.onerror = (event) => {
      const message = event.message || 'Browser worker could not start.';
      announce(message, true);
      for (const item of waiting.values()) item.resolve({ status: 503, data: { error: message } });
      waiting.clear();
      worker.terminate();
      worker = null;
    };
    return worker;
  }

  window.fetch = async (input, options = {}) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const url = new URL(raw, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/') ||
        url.pathname === '/api/constellations.js') {
      return nativeFetch(input, options);
    }
    const id = ++sequence;
    const method = (options.method || (input && input.method) || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const result = new Promise((resolve) => waiting.set(id, { resolve }));
    getWorker().postMessage({ id, method, route: url.pathname,
      query: Object.fromEntries(url.searchParams), body });
    const response = await result;
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  };
})();
