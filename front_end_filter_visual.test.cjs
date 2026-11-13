const test=require('node:test'),assert=require('node:assert/strict');
require('./public/front_end_signal_path.js');require('./public/front_end_filter_visual.js');
const P=globalThis.FRONT_END_PATH,V=globalThis.FE_FILTER_VISUAL;
test('finite filter response uses actual coefficients, unity DC gain and expected cutoff/stopband',()=>{
 for(const [key,c] of Object.entries(V.choices)){
  const h=P.firKernel(129,c.cutoff,152.768e6);
  assert.ok(Math.abs(V.responseDb(h,0,152.768e6))<1e-10,key);
  assert.ok(Math.abs(V.responseDb(h,c.cutoff,152.768e6)+6.02)<.1,key);
  assert.ok(V.responseDb(h,Math.min(70e6,c.cutoff+20e6),152.768e6)<-45,key);
 }
});
test('final IF comparison isolates the final filter and preserves identical records and absolute gain',()=>{
 const fs=152.768e6,N=16384,low=128,high=896;
 const I=Array.from({length:N},(_,n)=>100*Math.cos(2*Math.PI*low*n/N)+50*Math.cos(2*Math.PI*high*n/N));
 const Q=Array.from({length:N},(_,n)=>100*Math.sin(2*Math.PI*low*n/N)+50*Math.sin(2*Math.PI*high*n/N));
 const h=P.firKernel(129,3e6,fs),before={I,Q,fs},after={I:P.filter(I,h),Q:P.filter(Q,h),fs,amplified:before};
 const stages=[{}, {}, {}, {}, after],path={individual:stages,filterTaps:129};
 const d=V.compare(path,'individual','final');assert.equal(d.before,before);assert.equal(d.after,after);
 assert.equal(d.start,384);assert.equal(d.count,8192);assert.equal(d.beforeSpectrum.f.length,d.afterSpectrum.f.length);
 const nearest=f=>d.beforeSpectrum.f.reduce((best,x,i)=>Math.abs(x-f)<Math.abs(d.beforeSpectrum.f[best]-f)?i:best,0);
 for(const k of [low,high]){const f=fs*k/N,i=nearest(f),change=d.afterSpectrum.p[i]-d.beforeSpectrum.p[i];assert.ok(Math.abs(change-V.responseDb(h,f,fs))<.15,'Measured tone gain differs from coefficient response');}
 const pass=nearest(fs*low/N);assert.ok(d.beforeSpectrum.p[pass]>30,'Input gain was incorrectly normalized away');
 assert.deepEqual(d.beforeSpectrum.f,d.afterSpectrum.f);
});


test('RF bandwidth experiment changes output rejection without mutating the reference path',()=>{
 const fs=152.768e6,N=16384,low=128,high=896;
 const I=Array.from({length:N},(_,n)=>Math.cos(2*Math.PI*low*n/N)+Math.cos(2*Math.PI*high*n/N));
 const Q=Array.from({length:N},(_,n)=>Math.sin(2*Math.PI*low*n/N)+Math.sin(2*Math.PI*high*n/N));
 const before={I,Q,fs,center:1575.42e6},referenceKernel=P.firKernel(129,25e6,fs),reference={I:P.filter(I,referenceKernel),Q:P.filter(Q,referenceKernel),fs};
 const path={individual:[before,reference],filterTaps:129},snapshot=reference.I.slice();
 const ordinary=V.compare(path,'individual','rf');assert.equal(ordinary.after,reference);
 const experiment=V.compare(path,'individual','rf',6e6);
 assert.equal(experiment.before,before);assert.notEqual(experiment.after,reference);assert.equal(experiment.choice.bandwidth,6e6);
 assert.deepEqual(experiment.beforeSpectrum,ordinary.beforeSpectrum);assert.deepEqual(reference.I,snapshot);assert.equal(V.choices.rf.bandwidth,50e6);
 const target=fs*high/N,index=experiment.afterSpectrum.f.reduce((best,f,i)=>Math.abs(f-target)<Math.abs(experiment.afterSpectrum.f[best]-target)?i:best,0);
 assert.ok(experiment.afterSpectrum.p[index]<ordinary.afterSpectrum.p[index]-40,'Narrow RF experiment should reject the 8.35 MHz tone');
 assert.match(V.render(3),/id="fe-filter-rf-bandwidth"/);
});
