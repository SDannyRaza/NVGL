const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('public/front_end_principles.js','utf8'),context);
const model=context.FE_PRINCIPLES;
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);
test('reference bandpass sampling maps the full 6 MHz IF without self-overlap',()=>{
 const mapped=model.aliasBand(38.192);
 close(mapped.center,9.548);close(mapped.low,6.548);close(mapped.high,12.548);close(mapped.nyquist,19.096);
 assert.equal(mapped.overlap,false);
 for(let n=0;n<200;n++){
  const frequency=44.74+6*n/199;
  const mappedFrequency=model.aliasFrequency(frequency,38.192);
  for(let sample=0;sample<15;sample++){
   close(Math.cos(2*Math.PI*frequency*sample/38.192),Math.cos(2*Math.PI*mappedFrequency*sample/38.192));
  }
 }
});
test('a valid centre alias does not imply the complete IF band can be sampled safely',()=>{
 for(const rate of [24,32]){
  const mapped=model.aliasBand(rate);
  assert.ok(mapped.center>=0&&mapped.center<=rate/2);
  assert.equal(mapped.overlap,true,'rate '+rate+' must fold the reference passband');
  // 47 and 49 MHz straddle the folding boundary at 48 MHz and become indistinguishable.
  close(model.aliasFrequency(47,rate),model.aliasFrequency(49,rate));
 }
 const fast=model.aliasBand(110);
 assert.equal(fast.overlap,false);close(fast.low,44.74);close(fast.high,50.74);
 assert.throws(()=>model.aliasBand(0),/Positive sample rate/);
});
