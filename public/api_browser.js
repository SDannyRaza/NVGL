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
  const responses = new Map();
  const inFlight = new Map();
  let cacheBytes = 0;
  const MAX_CACHE_BYTES = 8 * 1024 * 1024;
  function remember(key, response) {
    if(response.status !== 200) return;
    const size = JSON.stringify(response.data).length * 2;
    if(size > MAX_CACHE_BYTES) return;
    if(responses.has(key)) { cacheBytes -= responses.get(key).size; responses.delete(key); }
    responses.set(key,{response,size}); cacheBytes += size;
    while(cacheBytes > MAX_CACHE_BYTES || responses.size > 64) {
      const oldest = responses.keys().next().value;
      cacheBytes -= responses.get(oldest).size; responses.delete(oldest);
    }
  }

  function announce(message, isError = false, background = false) {
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('gnss-engine-status', {detail:{message,isError,background}}));
    }
    if(background)return;
    const localLoader=document.getElementById?.('rinex-loader');
    if(localLoader && !localLoader.hidden) return;
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

  function getWorker(background = false) {
    if (worker) return worker;
    announce('Preparing scientific computation in your browser...', false, background);
    worker = new Worker('/browser_worker.js');
    worker.onmessage = ({ data }) => {
      if (data?.kind === 'progress') {
        const foreground=[...waiting.values()].some(item=>!item.background);
        announce(data.message,false,Boolean(data.background)&&!foreground);
        return;
      }
      if (data?.kind === 'ready') {
        announce('',false,Boolean(data.background));
        return;
      }
      const item = waiting.get(data?.id);
      if (!item) return;
      waiting.delete(data.id);
      if (data.kind === 'failure') {
        announce(data.message || 'The browser scientific engine could not load.', true, item.background);
        item.resolve({ status: 503, data: { error: data.message || 'Browser scientific engine unavailable.' } });
      } else {
        if(item.route==='/api/view'&&data.status===200&&typeof window.dispatchEvent==='function') {
          window.dispatchEvent(new CustomEvent('gnss-rinex-ready'));
        }
        item.resolve({ status: data.status, data: data.data });
      }
    };
    worker.onerror = (event) => {
      const message = event.message || 'Browser worker could not start.';
      announce(message, true, ![...waiting.values()].some(item=>!item.background));
      for (const item of waiting.values()) item.resolve({ status: 503, data: { error: message } });
      waiting.clear();
      worker.terminate();
      worker = null;
    };
    return worker;
  }

  function dispatchWorker(request, background=false) {
    const id=++sequence;
    return new Promise(resolve=>{
      waiting.set(id,{resolve,background,route:request.route});
      try {getWorker(background).postMessage({id,...request,background});}
      catch(error){waiting.delete(id);resolve({status:503,data:{error:String(error.message||error)}});}
    });
  }
  let warmup;
  window.GNSS_BROWSER={warmupRinex(){
    if(!warmup)warmup=dispatchWorker({method:'GET',route:'/api/view',query:{file:'obs',section:'header'},body:{}},true).then(result=>{
      if(result.status!==200)warmup=null;
      return result;
    });
    return warmup;
  }};

  window.fetch = async (input, options = {}) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const url = new URL(raw, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/') ||
        url.pathname === '/api/constellations.js') {
      return nativeFetch(input, options);
    }
    const method = (options.method || (input && input.method) || 'GET').toUpperCase();
    const query = [...url.searchParams].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
    const key = url.pathname + '?' + new URLSearchParams(query);
    const cacheable = method === 'GET';
    let response;
    if(cacheable && responses.has(key)) {
      const entry=responses.get(key); responses.delete(key); responses.set(key,entry);
      response=entry.response;
    } else {
      let pending = cacheable ? inFlight.get(key) : null;
      if(!pending) {
        const request={method,route:url.pathname,query:Object.fromEntries(url.searchParams),body:options.body?JSON.parse(options.body):{}};
        pending=(async()=>{
          if(window.RINEX_PREVIEW){
            const preview=await window.RINEX_PREVIEW.fetchHeader(nativeFetch,request);
            if(preview)return {status:preview.status,data:await preview.json()};
          }
          return dispatchWorker(request);
        })();
        if(cacheable) {
          inFlight.set(key,pending);
          pending.then(result=>{inFlight.delete(key);remember(key,result);});
        }
      }
      response = await pending;
    }
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  };
})();
