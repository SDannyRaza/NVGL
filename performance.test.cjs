const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const test=require('node:test');

test('deterministic API GETs share work, reuse results, retry errors and leave static fetches alone',async()=>{
 const messages=[];let nativeCalls=0;
 class Worker{postMessage(data){messages.push(data);queueMicrotask(()=>this.onmessage({data:{id:data.id,kind:'response',status:data.query.fail?'503':200,data:{route:data.route}}}));}terminate(){}}
 const context={window:{fetch:async()=>{nativeCalls++;return new Response('static');}},document:{createElement:()=>({setAttribute(){},style:{}}),body:{append(){}}},Worker,URL,URLSearchParams,Response,Map,location:{href:'https://lab.test/',origin:'https://lab.test'},console};
 vm.runInNewContext(fs.readFileSync('public/api_browser.js','utf8'),context);
 const fetch=context.window.fetch;
 const [a,b]=await Promise.all([fetch('/api/signals/epoch?index=2'),fetch('/api/signals/epoch?index=2')]);
 assert.equal(messages.length,1);assert.deepEqual(await a.json(),await b.json());
 await fetch('/api/signals/epoch?index=2');assert.equal(messages.length,1);
 await fetch('/api/signals/epoch?fail=1');await fetch('/api/signals/epoch?fail=1');assert.equal(messages.length,3);
 await fetch('/vendor/plotly.min.js');assert.equal(nativeCalls,1);
});

test('worker loads only requested groups, loads numpy only for SPP and indexes RINEX once',async()=>{
 const manifest=JSON.parse(fs.readFileSync('public/python-assets.json'));const requests=[],packages=[],messages=[];let indexing=0;
 const py={FS:{mkdirTree(){},writeFile(){}},runPython(){},runPythonAsync:async()=>{indexing++;},globals:{get:()=>()=>JSON.stringify({status:200,data:{ok:true}})},loadPackage:async name=>packages.push(name)};
 const ctx={self:{postMessage:m=>messages.push(m)},importScripts(){},loadPyodide:async()=>py,fetch:async url=>{requests.push(url);return {ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(0)};},console};
 vm.runInNewContext(fs.readFileSync('public/browser_worker.js','utf8'),ctx);
 async function request(id,route){ctx.self.onmessage({data:{id,method:'GET',route}});while(!messages.some(m=>m.id===id))await new Promise(r=>setImmediate(r));assert.equal(messages.find(m=>m.id===id).status,200);}
 await request(1,'/api/signals/meta');assert.deepEqual(packages,[]);assert.ok(!requests.some(r=>r.startsWith('/data/')));assert.ok(!requests.some(r=>r.includes('/spp/')));
 const first=requests.length;await request(2,'/api/signals/epoch');assert.equal(requests.length,first);
 await request(3,'/api/spp/epoch');assert.deepEqual(packages,['numpy']);
 await request(4,'/api/view');await request(5,'/api/view');assert.equal(indexing,1);
});

test('portable compact cache matches source computations without importing SPP or numpy',()=>{
 const py=`import sys,json
from pathlib import Path
sys.path.insert(0,'public/py')
import science_dispatcher as d
from signal_engine import SignalEngine
from gnss_orbit import OrbitEngine
d.ROOT=Path('public/py').resolve()
obs='public/data/COM14___9600_260914_111044.26O';nav='public/data/COM14___9600_260914_111044.26P'
s=SignalEngine(obs,nav)
checks=[('/api/signals/meta',{},s.metadata()),('/api/signals/epoch',{'index':2},s.epoch(2)),('/api/signals/selection',{'epoch':0,'sat':'G03','signal':'G-1C'},s.selection(0,'G03','G-1C')),('/api/signals/scene',{'epoch':2},s.scene(2))]
for route,q,expected in checks:
 out=json.loads(d.handle_request('GET',route,json.dumps(q)));assert out['status']==200,out
 assert out['data']==json.loads(json.dumps(expected)),route
o=OrbitEngine(obs,nav)
assert json.loads(d.handle_request('GET','/api/orbit/meta'))['data']==json.loads(json.dumps(o.metadata()))
assert 'numpy' not in sys.modules
assert 'spp' not in sys.modules
print('Science cache matches original engines; no NumPy/SPP startup')`;
 const result=execFileSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['-c',py],{cwd:__dirname,encoding:'utf8'});assert.ok(result.includes('matches original'));
});
