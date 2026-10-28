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
const context={
  document:{addEventListener(){}},console,
  RECEIVER_MODEL:globalThis.RECEIVER_MODEL,
};
vm.runInNewContext(fs.readFileSync('public/signals_scene.js','utf8')+
  '\nglobalThis.simulateScene=sceneSynthesize;globalThis.sceneBands=SCENE_BANDS;',context);
const result=context.simulateScene(entries,context.sceneBands.l1,entries[0].selection.epoch);
assert.equal(result.tUs.length,768);
assert.equal(result.contributions.length,2);
assert.ok(result.sumI.every(Number.isFinite));
assert.ok(result.sumQ.every(Number.isFinite));
assert.ok(result.cleanI.every(Number.isFinite));
assert.ok(result.cleanI.some(x=>Math.abs(x)>0));
const same=context.simulateScene(entries,context.sceneBands.l1,entries[0].selection.epoch);
assert.deepEqual(Array.from(result.sumI),Array.from(same.sumI),'Noise must be deterministic for the epoch');
for(let i=0;i<result.tUs.length;i++){
  const sum=result.contributions.reduce((total,c)=>total+c[i],0);
  assert.ok(Math.abs(result.cleanI[i]-sum)<1e-12,'Every satellite contribution enters the combined I/Q');
}
console.log('Multi-satellite I/Q verified: 2 measured GPS channels, common noise, additive clean I.');
