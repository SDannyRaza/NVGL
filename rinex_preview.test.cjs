const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const {execFileSync}=require('node:child_process');
const preview=JSON.parse(fs.readFileSync('public/rinex-preview.json','utf8'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function environment(nativeFetch,failWorker=false){
 const posts=[],idle=[],events=[];let workers=0;
 class Worker{constructor(){workers++;}postMessage(data){posts.push(data);queueMicrotask(()=>this.onmessage({data:{id:data.id,kind:failWorker?'failure':'response',status:200,message:'Temporary engine failure',data:{record:data.query.section==='record',rows:[]}}}));}terminate(){}}
 const ctx={fetch:nativeFetch,Worker,URL,URLSearchParams,Response,Map,console,location:{href:'https://lab.test/rinex/',origin:'https://lab.test'},setTimeout,
  requestAnimationFrame:fn=>fn(),requestIdleCallback:fn=>idle.push(fn),dispatchEvent:event=>events.push(event),CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
  document:{getElementById:()=>null,createElement:()=>({style:{},setAttribute(){}}),body:{append(){}}}};
 ctx.window=ctx;
 vm.runInNewContext(fs.readFileSync('public/rinex_preview.js','utf8'),ctx);
 vm.runInNewContext(fs.readFileSync('public/api_browser.js','utf8'),ctx);
 return {ctx,posts,idle,events,get workers(){return workers;}};
}

test('preview is exact, handles both headers and search, and starts no worker until idle',async()=>{
 let downloads=0;const e=environment(async()=>{downloads++;return new Response(JSON.stringify(preview));});
 const response=await e.ctx.fetch('/api/view?file=obs&section=header');assert.deepEqual(await response.json(),preview.headers.obs);
 const nav=await e.ctx.fetch('/api/view?file=nav&section=header');assert.deepEqual(await nav.json(),preview.headers.nav);
 const filtered=await (await e.ctx.fetch('/api/view?file=obs&section=header&query=antenna')).json();assert.ok(filtered.rows.length>0);assert.ok(filtered.rows.every(row=>row.raw.toLowerCase().includes('antenna')));
 assert.equal(downloads,1);assert.equal(e.workers,0);assert.equal(e.idle.length,1);
 e.idle[0]();await tick();assert.equal(e.workers,1);assert.equal(e.posts.length,1);assert.equal(e.posts[0].background,true);
});

test('a delayed preview starts no worker early, while records bypass that delay',async()=>{
 let release;const e=environment(()=>new Promise(resolve=>release=resolve));
 const header=e.ctx.fetch('/api/view?file=obs&section=header');await tick();assert.equal(e.workers,0);
 const record=await e.ctx.fetch('/api/view?file=obs&section=record');assert.equal((await record.json()).record,true);assert.equal(e.workers,1);
 release(new Response(JSON.stringify(preview)));assert.deepEqual(await (await header).json(),preview.headers.obs);
 assert.equal(e.posts.length,1);
});

for(const [name,result] of [['missing',()=>new Response('',{status:404})],['malformed',()=>new Response('{broken')],['invalid schema',()=>new Response(JSON.stringify({schema:1,headers:{}}))]]){
 test(name+' preview falls back to exactly one worker request',async()=>{
  const e=environment(async()=>result());const r=await e.ctx.fetch('/api/view?file=obs&section=header');assert.equal(r.status,200);assert.equal(e.posts.length,1);assert.equal(e.idle.length,0);
 });
}

test('background failure leaves cached headers usable and records can retry',async()=>{
 const e=environment(async()=>new Response(JSON.stringify(preview)),true);
 await e.ctx.fetch('/api/view?file=obs&section=header');e.idle[0]();await tick();
 assert.ok(e.events.some(event=>event.detail?.isError&&event.detail.background));
 assert.deepEqual(await (await e.ctx.fetch('/api/view?file=obs&section=header')).json(),preview.headers.obs);assert.equal(e.posts.length,1);
 const r=await e.ctx.fetch('/api/view?file=obs&section=record');assert.equal(r.status,503);assert.equal(e.posts.length,2);
});

test('warm-up and simultaneous record requests share one initialization and index pass',async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/python-assets.json','utf8'));let loads=0,indexes=0;const messages=[];
 const py={FS:{mkdirTree(){},writeFile(){}},runPython(){},runPythonAsync:async()=>{indexes++;await tick();},globals:{get:()=>()=>JSON.stringify({status:200,data:{}})}};
 const ctx={self:{postMessage:m=>messages.push(m)},importScripts(){},loadPyodide:async()=>{loads++;await tick();return py;},fetch:async()=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(0)})};
 vm.runInNewContext(fs.readFileSync('public/browser_worker.js','utf8'),ctx);
 ctx.self.onmessage({data:{id:1,method:'GET',route:'/api/view',query:{section:'header'},background:true}});
 ctx.self.onmessage({data:{id:2,method:'GET',route:'/api/view',query:{section:'record'}}});
 while(!messages.some(m=>m.id===2))await tick();assert.equal(loads,1);assert.equal(indexes,1);assert.equal(messages.find(m=>m.id===2).status,200);
});

test('generated header annotations and metadata match the original parser',()=>{
 const python=`import json,sys
sys.path.insert(0,'public/py')
from rinex_explorer import load_data
saved=json.load(open('public/rinex-preview.json'))
for key,item in load_data('public/data').items():
 expected=item.view('header');expected['rows']=[item.annotate(i) for i in range(item.header_end)]
 assert expected==saved['headers'][key],key
print('Exact headers verified')`;
 assert.match(execFileSync(process.platform==='win32'?'python':'python3',['-c',python],{encoding:'utf8'}),/verified/);
});
