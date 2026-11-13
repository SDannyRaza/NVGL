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
const P=globalThis.FRONT_END_PATH;
const result=P.build(entries,'G03');
assert.equal(result.epoch,entries[0].selection.epoch);
assert.equal(result.selected.satellite,'G03');
for(const source of ['individual','mixed']){
 assert.equal(result[source].length,8);
 for(const [index,stage] of result[source].entries()){
  assert.equal(stage.I.length,index<5?16384:4096);
  assert.equal(stage.analog,index<5);
  assert.ok(stage.I.every(Number.isFinite));assert.ok(stage.Q.every(Number.isFinite));
 }
 const stages=result[source];
 const first=stages[4].first;
 assert.equal(first.analog,true);assert.equal(first.center,47.74e6);assert.equal(first.delaySamples,128);
 assert.deepEqual(first.I,P.filter(stages[2].I,P.firKernel(129,9e6,first.fs)));
 assert.equal(first.voltage.length,16384);
 for(let n=0;n<first.I.length;n+=127){
  const angle=2*Math.PI*47.74e6*n/first.fs;
  assert.ok(Math.abs(first.voltage[n]-Math.SQRT2*(first.I[n]*Math.cos(angle)-first.Q[n]*Math.sin(angle)))<1e-10);
 }

 assert.equal(stages[0].center,1575420000);
 assert.equal(stages[3].center,47740000);
 assert.equal(stages[5].fs,38192000);
 assert.equal(stages[4].fs,4*38192000);
 assert.equal(stages[5].input.length,4096);
 for(let n=0;n<4096;n++)assert.equal(stages[5].input[n],stages[4].voltage[4*n]);
 assert.ok(stages[5].codes.every(x=>x>=0&&x<=15));
 assert.equal(stages[7].bytes.length,8192);
 for(let n=0;n<4096;n++)assert.ok(Math.abs(stages[2].I[n]-10*stages[1].I[n])<1e-12);
}
assert.deepEqual(result.reference,{rfBandwidth:50e6,firstIFBandwidth:18e6,ifGainDb:50,finalIFBandwidth:6e6,lo:1527.68e6,clock:10e6,adcBits:4});
assert.deepEqual(P.build(entries,'G03').individual[7].bytes,result.individual[7].bytes);
for(let angle=0;angle<=360;angle++)assert.ok(Math.abs(P.phaseTest(angle).errorDegrees)<1e-10);
assert.ok(Math.abs(P.phaseTest(90).I)<1e-12);
assert.equal(P.phaseTest(90).Q,1);
const N=4096,k=128,fsRate=P.FS;
const spectrum=P.fftSpectrum(Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*k*n/N)),Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*k*n/N)),fsRate);
const max=spectrum.p.indexOf(Math.max(...spectrum.p));assert.equal(spectrum.f[max],k*fsRate/N);
const tmp=require('node:os').tmpdir(),path=require('node:path'),dir=fs.mkdtempSync(path.join(tmp,'nvgl-cu8-'));
try{
 const input=path.join(dir,'test.cu8'),output=path.join(dir,'test.cf32');fs.writeFileSync(input,Buffer.from([0,255,127,128]));
 execFileSync('python',['public/reference/front_end/cu8_to_cf32.py',input,output]);
 const converted=fs.readFileSync(output);assert.equal(converted.length,16);assert.equal(converted.readFloatLE(0),-127.5/128);assert.equal(converted.readFloatLE(4),127.5/128);
}finally{for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));fs.rmdirSync(dir);}
console.log('Front-end: real observations, 8 stages, deterministic IQ bytes, FFT frequency/sign, 361 ideal phase tests, CU8 conversion verified.');
