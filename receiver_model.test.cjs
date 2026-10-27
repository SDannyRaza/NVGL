const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'public/signal_receiver_model.js'), 'utf8');
const context = {Math,Date,window:{},console};
vm.runInNewContext(source,context,{filename:'signal_receiver_model.js'});
const model = context.window.RECEIVER_MODEL;

const sat = {
  satellite:'G03',prn_number:3,epoch:'2026-09-14T11:12:24.005000+00:00',
  signal:{id:'G-1C',name:'L1 C/A',carrier_mhz:1575.42,code_rate:1023000,nav_rate_selected:'50 bit/s'},
  measurements:{
    Pseudorange:{code:'C1C',value:25858239.872},
    'Carrier phase':{code:'L1C',value:135885916.745},
    Doppler:{code:'D1C',value:-4325.112},
    'C/N₀':{code:'S1C',value:35},
  },
  navigation:{record_epoch:'2026-09-14T11:59:44+00:00',fields:[{name:'Toe',value:388800,unit:'s of week'}]},
};
const prn={bits:Uint8Array.from({length:1023},(_,i)=>((i*7+i*i*11)%19)<9?1:0)};
const input={selection:sat,epoch:sat.epoch,prn,component:'C/A data'};
const m=model.prepare(input);
assert.ok(m,'valid model from dataset');
assert.ok(Math.abs(m.apparentDelaySec-25858239.872/299792458)<1e-11);
assert.ok(m.delayChips>=0&&m.delayChips<1023);
assert.equal(m.doppler,-4325.112);
assert.ok(m.codeDoppler<0,'negative Doppler also contracts code chipping rate');
assert.ok(Math.abs((m.effectiveCodeRate-m.codeRate)-m.codeDoppler)<1e-6);
assert.equal(m.cn0,35);
assert.equal(m.symbolRate,50);
assert.ok(Math.abs(m.receiveSeconds-m.transmitSeconds-m.apparentDelaySec)<1e-5);
assert.equal(model.epochMillis('2026-09-14T11:12:24.005000'),model.epochMillis('2026-09-14T11:12:24.005000+00:00'));

const a=model.synthesize(m,{samples:256,includeNoise:true});
const b=model.synthesize(m,{samples:256,includeNoise:true});
assert.deepEqual(a.I,b.I,'deterministic repeat at same epoch');
assert.deepEqual(a.Q,b.Q,'deterministic repeat at same epoch');
assert.ok(a.I.every(Number.isFinite)&&a.Q.every(Number.isFinite));
assert.ok(a.I.some((value,i)=>Math.abs(value-a.cleanI[i])>0.001),'simulated noise is present');
const clean=model.synthesize(m,{samples:256,includeNoise:false});
assert.deepEqual(clean.I,clean.cleanI,'noiseless waveform is exact');
assert.ok(clean.I.some((value,i)=>i>0&&Math.abs(value-clean.I[0])>0.1));

const next=model.prepare({...input,epoch:'2026-09-14T11:12:25.005000+00:00'});
assert.notEqual(m.symbolIndex,next.symbolIndex,'selected epoch changes navigation timing');
const alternative=model.prepare({...input,prn:{bits:Uint8Array.from(prn.bits,b=>1-b)}});
assert.notDeepEqual(model.synthesize(m,{samples:32,includeNoise:false}).I,
  model.synthesize(alternative,{samples:32,includeNoise:false}).I,'PRN changes the generated I/Q');

const pilot=model.prepare({...input,component:'CL pilot'});
assert.equal(model.navSign(pilot,0),1,'pilot does not carry navigation data');
const missing=model.prepare({...input,selection:{...sat,measurements:{},navigation:null}});
assert.equal(missing.doppler,null);
assert.equal(missing.delayChips,null);
assert.ok(model.synthesize(missing,{samples:64}).I.every(Number.isFinite));
console.log('GNSS receiver model tests passed: RINEX C/L/D/S, epoch, PRN, deterministic I/Q, missing data.');
