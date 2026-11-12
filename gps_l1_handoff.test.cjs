const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
require('./public/gps_lnav_replay.js');
require('./public/signal_receiver_model.js');
require('./public/prn_core.js');
const py=`import json,sys
sys.path.insert(0,'public/py')
from signal_engine import SignalEngine
e=SignalEngine('public/data/COM14___9600_260914_111044.26O','public/data/COM14___9600_260914_111044.26P')
print(json.dumps([e.selection(0,'G03','G-1C'),e.selection(0,'G08','G-1C')]))`;
const entries=JSON.parse(execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),['-c',py],{cwd:__dirname,encoding:'utf8'})).map(selection=>({
  selection,model:globalThis.RECEIVER_MODEL.prepare({selection,epoch:selection.epoch,
    prn:globalThis.PRNLAB.gpsCA(selection.prn_number),component:'C/A data'})
}));
assert.ok(entries.every(e=>e.model));

require('./public/gps_l1_received.js');
require('./public/front_end_signal_path.js');
const shared=globalThis.GPS_L1_RECEIVED;
const composite=shared.synthesize(entries,'G03');
const individual=shared.synthesize([entries[0]],'G03');
const path=globalThis.FRONT_END_PATH.build(entries,'G03');
assert.equal(composite.sampleRate,shared.MODEL_RATE);
assert.deepEqual(path.mixed[0].I,composite.composite.I);
assert.deepEqual(path.mixed[0].Q,composite.composite.Q);
assert.deepEqual(path.individual[0].I,individual.composite.I);
assert.deepEqual(path.individual[0].Q,individual.composite.Q);
assert.deepEqual(composite.individual.I,individual.individual.I);
assert.deepEqual(composite.individual.Q,individual.individual.Q);
const display=shared.synthesize([entries[0]],'G03',{samples:shared.DISPLAY_SAMPLES});
assert.deepEqual(path.individual[0].I.slice(0,shared.DISPLAY_SAMPLES),display.individual.I);
assert.deepEqual(path.individual[0].Q.slice(0,shared.DISPLAY_SAMPLES),display.individual.Q);
const clean=shared.synthesize(entries,'G03',{includeNoise:false});
const cleanPath=globalThis.FRONT_END_PATH.build(entries,'G03',4096,{includeNoise:false});
assert.deepEqual(cleanPath.mixed[0].I,clean.composite.cleanI);
assert.deepEqual(cleanPath.individual[0].Q,clean.individual.cleanQ);
assert.ok(path.mixed[0].I.some((v,i)=>v!==cleanPath.mixed[0].I[i]));
assert.throws(()=>shared.synthesize([{...entries[0],selection:{...entries[0].selection,epoch:'2000-01-01'}},entries[1]],'G03'),/one epoch/);
const missing=JSON.parse(JSON.stringify(entries[0].selection));missing.measurements['C/N\u2080'].value=null;
assert.equal(shared.complete(missing),false);
assert.equal(shared.prepare([missing,entries[1].selection]).length,1);
let stored=null;globalThis.sessionStorage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
shared.saveContext({epoch:2,satellite:'G08',source:'individual',includeNoise:false});
assert.deepEqual(shared.readContext(),{epoch:2,satellite:'G08',source:'individual',includeNoise:false,signalId:'G-1C'});
shared.saveContext({epoch:-1,satellite:'E01'});assert.equal(shared.readContext().satellite,'G08');
const context={document:{addEventListener(){}},console,RECEIVER_MODEL:globalThis.RECEIVER_MODEL,GPS_L1_RECEIVED:shared};
vm.runInNewContext(fs.readFileSync('public/signals_scene.js','utf8')+'\nglobalThis.synthesizeGPS=sceneSynthesize;globalThis.gpsBand=SCENE_BANDS.gpsl1;',context);
shared.saveContext({epoch:0,satellite:'G03',source:'mixed',includeNoise:true});
const scene=context.synthesizeGPS(entries,context.gpsBand,entries[0].selection.epoch);
assert.deepEqual(Array.from(scene.sumI),path.mixed[0].I.slice(0,shared.DISPLAY_SAMPLES));
assert.deepEqual(Array.from(scene.sumQ),path.mixed[0].Q.slice(0,shared.DISPLAY_SAMPLES));
console.log('Exact GPS handoff: Module 08 composite and Module 09 individual I/Q match Front End input; epoch, source/noise context, completeness and deterministic noise verified.');
