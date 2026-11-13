const test=require('node:test'),assert=require('node:assert/strict');
require('./public/prn_core.js');require('./public/signal_receiver_model.js');require('./public/front_end_overview.js');
const O=globalThis.FE_OVERVIEW,R=globalThis.RECEIVER_MODEL;
const model={code:globalThis.PRNLAB.gpsCA(3).bits,codeLength:1023,codeRate:1023000,receivePhase:.35,delayChips:123.75,doppler:-4500,initialCarrierPhase:.7,transmitSeconds:0,symbolRate:50,navModelSeed:42};
model.effectiveCodeRate=model.codeRate+model.doppler*model.codeRate/O.RF;
test('overview uses the actual selected Gold code and one real RF carrier',()=>{
 assert.equal(model.code.length,1023);const m=O.variant(model,false,false),nav=R.navSign(model,0);
 assert.equal(m.effectiveCodeRate,model.codeRate);assert.equal(m.delayChips,0);
 for(const t of [0,1e-10,3e-9,1.4e-6]){
  const expected=nav*R.codeSign(m,t)*Math.cos(2*Math.PI*1575420000*t+model.initialCarrierPhase);
  assert.equal(O.signalAt(model,t,{delay:false,doppler:false}),expected);
 }
});
test('disabling both imposed effects restores identical real-voltage and code replicas',()=>{
 const d=O.buildData(model,{delay:false,doppler:false,chips:96});assert.deepEqual(d.referenceCode,d.receivedCode);assert.deepEqual(d.referenceRF,d.receivedRF);assert.ok(d.phaseChange.every(v=>Object.is(v,0)||v===0));assert.equal(d.doppler,0);assert.equal(d.delayChips,0);
});
test('recorded delay and Doppler change the same code and accumulate the expected RF phase',()=>{
 const d=O.buildData(model,{delay:true,doppler:true,chips:1023});assert.notDeepEqual(d.referenceCode,d.receivedCode);
 const shifted=O.variant(model,true,true);
 assert.equal(shifted.effectiveCodeRate,model.effectiveCodeRate);
 for(let n=0;n<d.codeTimeUs.length;n+=31){const t=d.codeTimeUs[n]/1e6+1e-12;assert.equal(d.receivedCode[n],R.codeSign(shifted,t));}
 assert.ok(Math.abs(d.phaseChange.at(-1)-2*Math.PI*model.doppler*.004)<1e-12);
 assert.equal(d.rfTimeNs.length,1201);assert.equal(d.rfTimeNs[0],-8);assert.equal(d.rfTimeNs.at(-1),8);
 const plotRate=1200/(16e-9);assert.ok(plotRate>40*O.RF);
 assert.notEqual(R.codeSign(shifted,d.rfCentre-1e-12),R.codeSign(shifted,d.rfCentre+1e-12));
});
