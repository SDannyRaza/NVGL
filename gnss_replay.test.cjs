const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
require('./public/gps_lnav_replay.js');
require('./public/signal_receiver_model.js');
require('./public/prn_core.js');
const replay=globalThis.GPS_LNAV_REPLAY;
const receiver=globalThis.RECEIVER_MODEL;
const py=`import json,sys
sys.path.insert(0,'public/py')
from signal_engine import SignalEngine
engine=SignalEngine('public/data/COM14___9600_260914_111044.26O','public/data/COM14___9600_260914_111044.26P')
print(json.dumps(engine.selection(0,'G03','G-1C')))`;
const sel=JSON.parse(execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),['-c',py],{cwd:__dirname,encoding:'utf8'}));
assert.equal(sel.satellite,'G03');
assert.ok(sel.navigation.fields.length>20);
const lnav=replay.create(sel.navigation,sel.signal.id);
assert.ok(lnav,'RINEX G03 shall produce a GPS LNAV word replay');
const epochMs=receiver.epochMillis(sel.epoch);
const {words}=lnav.getWords(epochMs/1000);
assert.equal(words.length,50);
assert.ok(([0x8B,0x74].includes((words[0]>>>22)&0xff)));
for(const [i,word] of words.entries()){
  assert.ok(word>=0 && word<=0x3fffffff);
  assert.equal(word,lnav.getWords(epochMs/1000).words[i]);
}
const age=Math.abs(epochMs/1000-lnav.recordSeconds);
assert.ok(age>2700 && age<3000,`Expected ~47 min NAV/OBS difference; got ${age}`);
assert.equal(replay.create(sel.navigation,'G-2X'),null,'GNSS-SDR-SIM does not re-encode CNAV');
const prn=globalThis.PRNLAB.gpsCA(3);
assert.equal(prn.bits.length,1023);
assert.equal(globalThis.PRNLAB.specialOctal10(prn.bits),'1710','ICD GPS G03 C/A Gold-code fingerprint');
const model=receiver.prepare({selection:sel,epoch:sel.epoch,prn,component:'C/A data'});
assert.ok(model.lnav);
assert.ok(Number.isFinite(model.doppler));
assert.ok(Number.isFinite(model.delayChips));
assert.ok(Math.abs(model.navAgeSeconds-age)<1);
assert.equal(receiver.navSign(model,0),lnav.bitAt(model.transmitSeconds)?1:-1);
const data=receiver.synthesize(model,{samples:128,includeNoise:false});
assert.equal(data.I.length,128);
assert.ok(data.I.every(Number.isFinite));
assert.ok(data.Q.every(Number.isFinite));
console.log(JSON.stringify({satellite:sel.satellite,epoch:sel.epoch,navEpoch:sel.navigation.record_epoch,
  obsNavOffsetSeconds:age,dopplerHz:model.doppler,delayChips:model.delayChips,
  codeRateHz:model.codeRate,lnavWords:words.length,firstWords:words.slice(0,3).map(w=>w.toString(16)),
  replayBit:lnav.bitAt(model.transmitSeconds)}));
