/* Header-only fast path. Detailed records always use the existing worker API. */
(()=>{
  'use strict';
  const PREVIEW_URL='/rinex-preview.json';
  let pending, scheduled=false;
  function valid(header){
    return header && typeof header.name==='string' && typeof header.observation==='boolean' &&
      ['line_count','record_count','satellite_count','total'].every(k=>Number.isInteger(header[k])&&header[k]>=0) &&
      Array.isArray(header.systems) && header.types && Array.isArray(header.rows) && header.rows.length===header.total &&
      header.rows.every(row=>Number.isInteger(row.number)&&typeof row.raw==='string'&&typeof row.context==='string'&&Array.isArray(row.fields)&&row.fields.every(f=>Number.isInteger(f.start)&&Number.isInteger(f.end)&&f.start>=0&&f.end>=f.start&&['title','unit','description','kind','value'].every(k=>typeof f[k]==='string')));
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    const start=()=>window.GNSS_BROWSER?.warmupRinex();
    // Allow the first header to render before any runtime/data download starts.
    const afterPaint=()=>{if(window.requestIdleCallback)window.requestIdleCallback(start,{timeout:2000});else window.setTimeout(start,100);};
    if(window.requestAnimationFrame)window.requestAnimationFrame(()=>window.requestAnimationFrame(afterPaint));else window.setTimeout(afterPaint,0);
  }
  async function fetchHeader(nativeFetch,request){
    if(request.method!=='GET'||request.route!=='/api/view'||(request.query.section||'header')!=='header')return null;
    const key=request.query.file||'obs';
    if(key!=='obs'&&key!=='nav')return null;
    const start=Number(request.query.start||0),record=Number(request.query.record||0);
    if(!Number.isInteger(start)||!Number.isInteger(record))return null;
    try{
      if(!pending)pending=nativeFetch(PREVIEW_URL).then(async response=>{
        if(!response.ok)throw Error('Preview unavailable');
        const data=await response.json();
        if(data.schema!==1||!valid(data.headers?.obs)||!valid(data.headers?.nav))throw Error('Invalid preview');
        return data.headers;
      }).catch(error=>{pending=null;throw error;});
      const headers=await pending,header=headers[key],query=(request.query.query||'').toLowerCase();
      // Python casefold differs for some non-ASCII queries; defer those to Python.
      if(/[^\x00-\x7f]/.test(query))return null;
      const rows=query?header.rows.filter(row=>row.raw.toLowerCase().includes(query)):header.rows;
      const offset=Math.max(0,Math.min(start,Math.max(0,rows.length-1)));
      const data={...header,record:Math.max(0,Math.min(record,header.record_count-1)),start:offset,total:rows.length,rows:rows.slice(offset,offset+60)};
      schedule();
      return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json; charset=utf-8'}});
    }catch{return null;}
  }
  window.RINEX_PREVIEW={fetchHeader};
})();
