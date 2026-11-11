/* Deterministic GPS L1 C/A path. The source is the existing lab receiver model. */
(function(root){
'use strict';
const FS=38.192e6,IF=9.548e6,N=4096;
function firKernel(taps=129,cutoff=1.023e6,fs=FS){const h=[];let total=0;for(let k=0;k<taps;k++){const x=k-(taps-1)/2,v=(x===0?2*cutoff/fs:Math.sin(2*Math.PI*cutoff*x/fs)/(Math.PI*x))*(.54-.46*Math.cos(2*Math.PI*k/(taps-1)));h.push(v);total+=v;}return h.map(v=>v/total);}
function filter(x,h){return x.map((_,n)=>{let v=0;for(let k=0;k<h.length&&k<=n;k++)v+=h[k]*x[n-k];return v;});}
function fftSpectrum(I,Q,fs){const n=I.length,re=I.slice(),im=Q.slice();for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let len=2;len<=n;len*=2){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let j=0;j<len/2;j++){const c=Math.cos(a*j),s=Math.sin(a*j),k=i+j+len/2,t=re[k]*c-im[k]*s,u=re[k]*s+im[k]*c;re[k]=re[i+j]-t;im[k]=im[i+j]-u;re[i+j]+=t;im[i+j]+=u;}}const f=[],p=[];for(let k=0;k<n;k++){const j=(k+n/2)%n;f.push((k-n/2)*fs/n);p.push(10*Math.log10(Math.max(1e-30,(re[j]**2+im[j]**2)/(n*n))));}return {f,p};}
function phaseTest(degrees){const phi=degrees*Math.PI/180,I=Math.cos(phi),Q=Math.sin(phi),recovered=Math.atan2(Q,I),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));const uI=Math.round(127.5+127*I),uQ=Math.round(127.5+127*Q),quantized=Math.atan2(uQ-127.5,uI-127.5);return {I,Q,recoveredDegrees:recovered*180/Math.PI,errorDegrees:wrap(recovered-phi)*180/Math.PI,quantizedErrorDegrees:wrap(quantized-phi)*180/Math.PI,uI,uQ};}
function build(entries,satellite,count=N){
 if(!entries.length||count<256||(count&(count-1)))throw Error('A nonempty GPS scene and power-of-two block are required.');
 const selected=entries.find(e=>e.selection.satellite===satellite);if(!selected)throw Error('Selected GPS satellite is absent from this epoch.');
 if(entries.some(e=>!e.selection.satellite.startsWith('G')||e.selection.signal.prn_mode!=='gps-ca'||e.selection.epoch!==selected.selection.epoch))throw Error('The path requires GPS L1 C/A channels at exactly one epoch.');
 const I=new Array(count).fill(0),Q=I.slice(),si=I.slice(),sq=I.slice();
 for(const entry of entries){const m=entry.model;if(!Number.isFinite(m.doppler)||!Number.isFinite(m.delayChips)||!Number.isFinite(m.cn0))throw Error('Missing C/N0, Doppler or code delay: no measurement is invented.');const clean=root.RECEIVER_MODEL.synthesize(m,{samples:count,sampleRate:FS,includeNoise:false}),a=Math.sqrt(10**(m.cn0/10)/FS);for(let n=0;n<count;n++){I[n]+=a*clean.I[n];Q[n]+=a*clean.Q[n];if(entry===selected){si[n]=a*clean.I[n];sq[n]=a*clean.Q[n];}}}
 // Common epoch-seeded noise: the isolated display uses the same noise realization.
 let seed=Math.trunc(root.RECEIVER_MODEL.epochMillis(selected.selection.epoch))>>>0;const uniform=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+1)/4294967297;};
 for(let n=0;n<count;n++){const r=Math.sqrt(-2*Math.log(uniform()))/Math.sqrt(2),a=2*Math.PI*uniform(),ni=r*Math.cos(a),nq=r*Math.sin(a);I[n]+=ni;Q[n]+=nq;si[n]+=ni;sq[n]+=nq;}
 const h=firKernel();
 function path(i,q){
  const stages=[{I:i,Q:q,fs:FS,center:1575.42e6,kind:'complex RF envelope',delaySamples:0}];
  const fi=filter(i,h),fq=filter(q,h);stages.push({I:fi,Q:fq,fs:FS,center:1575.42e6,kind:'filtered RF envelope',delaySamples:64});
  const ai=fi.map(v=>v*10),aq=fq.map(v=>v*10);stages.push({I:ai,Q:aq,fs:FS,center:1575.42e6,kind:'amplified RF envelope',delaySamples:64});
  stages.push({I:ai.slice(),Q:aq.slice(),fs:FS,center:47.74e6,kind:'analog IF complex envelope',delaySamples:64});
  const ii=filter(ai,h),iq=filter(aq,h);stages.push({I:ii,Q:iq,fs:FS,center:47.74e6,kind:'IF-filtered complex envelope',delaySamples:128});
  const real=ii.map((v,n)=>Math.SQRT2*(v*Math.cos(2*Math.PI*IF*n/FS)-iq[n]*Math.sin(2*Math.PI*IF*n/FS)));
  return {stages,real};
 }
 const mixed=path(I,Q),individual=path(si,sq),fullScale=Math.max(...mixed.real.map(Math.abs),...individual.real.map(Math.abs))*1.05;
 for(const output of [mixed,individual]){
  const codes=output.real.map(v=>Math.max(0,Math.min(15,Math.floor((v/fullScale+1)*8)))),decoded=codes.map(k=>(-1+(k+.5)/8)*fullScale);
  output.stages.push({I:decoded,Q:new Array(count).fill(0),fs:FS,center:0,kind:'real 4-bit ADC samples',delaySamples:128,codes});
  output.stages.push({...output.stages[5],kind:'real digital IF at 9.548 MHz'});
  const di=filter(decoded.map((v,n)=>Math.SQRT2*v*Math.cos(2*Math.PI*IF*n/FS)),h),dq=filter(decoded.map((v,n)=>-Math.SQRT2*v*Math.sin(2*Math.PI*IF*n/FS)),h);
  // Same-rate quadrature output. An RTL device is a separate hardware architecture.
  const scale=Math.max(...di.map(Math.abs),...dq.map(Math.abs),1e-12)/127;
  const bytes=new Uint8Array(count*2);for(let n=0;n<count;n++){bytes[2*n]=Math.round(127.5+di[n]/scale);bytes[2*n+1]=Math.round(127.5+dq[n]/scale);}
  output.stages.push({I:Array.from({length:count},(_,n)=>(bytes[2*n]-127.5)*scale),Q:Array.from({length:count},(_,n)=>(bytes[2*n+1]-127.5)*scale),fs:FS,center:0,kind:'complex baseband serialized as CU8',delaySamples:192,bytes});
 }
 return {mixed:mixed.stages,individual:individual.stages,selected:selected.selection,models:entries.map(e=>e.model),satellites:entries.map(e=>e.selection.satellite),epoch:selected.selection.epoch,fullScale,filterTaps:h.length,fs:FS};
}
const api={build,phaseTest,fftSpectrum,firKernel,filter,FS,IF};root.FRONT_END_PATH=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
