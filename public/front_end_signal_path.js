/* Deterministic GPS L1 C/A path. The source is the existing lab receiver model. */
(function(root){
'use strict';
const FS=38.192e6,IF=9.548e6,N=4096;
function firKernel(taps=129,cutoff=1.023e6,fs=FS){const h=[];let total=0;for(let k=0;k<taps;k++){const x=k-(taps-1)/2,v=(x===0?2*cutoff/fs:Math.sin(2*Math.PI*cutoff*x/fs)/(Math.PI*x))*(.54-.46*Math.cos(2*Math.PI*k/(taps-1)));h.push(v);total+=v;}return h.map(v=>v/total);}
function filter(x,h){return x.map((_,n)=>{let v=0;for(let k=0;k<h.length&&k<=n;k++)v+=h[k]*x[n-k];return v;});}
function fftSpectrum(I,Q,fs){const n=I.length,re=I.slice(),im=Q.slice();for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let len=2;len<=n;len*=2){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let j=0;j<len/2;j++){const c=Math.cos(a*j),s=Math.sin(a*j),k=i+j+len/2,t=re[k]*c-im[k]*s,u=re[k]*s+im[k]*c;re[k]=re[i+j]-t;im[k]=im[i+j]-u;re[i+j]+=t;im[i+j]+=u;}}const f=[],p=[];for(let k=0;k<n;k++){const j=(k+n/2)%n;f.push((k-n/2)*fs/n);p.push(10*Math.log10(Math.max(1e-30,(re[j]**2+im[j]**2)/(n*n))));}return {f,p};}
function phaseTest(degrees){const phi=degrees*Math.PI/180,I=Math.cos(phi),Q=Math.sin(phi),recovered=Math.atan2(Q,I),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));const uI=Math.round(127.5+127*I),uQ=Math.round(127.5+127*Q),quantized=Math.atan2(uQ-127.5,uI-127.5);return {I,Q,recoveredDegrees:recovered*180/Math.PI,errorDegrees:wrap(recovered-phi)*180/Math.PI,quantizedErrorDegrees:wrap(quantized-phi)*180/Math.PI,uI,uQ};}
function build(entries,satellite,count=N,options={}){
 if(!entries.length||count<256||count>8192||(count&(count-1)))throw Error('A complete GPS scene and power-of-two block of 256 to 8192 ADC samples are required.');
 const selected=entries.find(e=>e.selection.satellite===satellite);if(!selected)throw Error('Selected GPS satellite is absent from this epoch.');
 if(entries.some(e=>!e.selection.satellite.startsWith('G')||e.selection.signal.prn_mode!=='gps-ca'||e.selection.epoch!==selected.selection.epoch))throw Error('GPS L1 C/A channels must share one observation epoch.');
 const modelFs=root.GPS_L1_RECEIVED.MODEL_RATE;
 const received=root.GPS_L1_RECEIVED.synthesize(entries,satellite,{samples:4*count,sampleRate:modelFs,includeNoise:options.includeNoise});
 const {I,Q}=received.composite,si=received.individual.I,sq=received.individual.Q;
 const rf=firKernel(129,25e6,modelFs),firstIF=firKernel(129,9e6,modelFs),finalIF=firKernel(129,3e6,modelFs);
 const realIF=(i,q)=>i.map((v,n)=>Math.SQRT2*(v*Math.cos(2*Math.PI*47.74e6*n/modelFs)-q[n]*Math.sin(2*Math.PI*47.74e6*n/modelFs)));
 function path(i,q){
  const stages=[{I:i,Q:q,fs:modelFs,center:1575.42e6,kind:'Analog RF voltage envelope',analog:true,delaySamples:0}];
  const fi=filter(i,rf),fq=filter(q,rf);stages.push({I:fi,Q:fq,fs:modelFs,center:1575.42e6,kind:'Analog RF voltage envelope after bandpass filtering',analog:true,delaySamples:64});
  const ai=fi.map(v=>10*v),aq=fq.map(v=>10*v);stages.push({I:ai,Q:aq,fs:modelFs,center:1575.42e6,kind:'Analog RF voltage envelope after amplification',analog:true,delaySamples:64});
  stages.push({I:ai.slice(),Q:aq.slice(),voltage:realIF(ai,aq),fs:modelFs,center:47.74e6,kind:'Analog mixer difference-frequency branch',analog:true,delaySamples:64});
  const ii=filter(ai,firstIF),iq=filter(aq,firstIF),gain=10**(50/20),amplifiedI=ii.map(v=>v*gain),amplifiedQ=iq.map(v=>v*gain),oi=filter(amplifiedI,finalIF),oq=filter(amplifiedQ,finalIF),voltage=realIF(oi,oq);
  stages.push({I:oi,Q:oq,voltage,fs:modelFs,center:47.74e6,kind:'Analog IF after 18 MHz filtering, 50 dB gain and 6 MHz filtering',analog:true,delaySamples:192,first:{I:ii,Q:iq,voltage:realIF(ii,iq),fs:modelFs,center:47.74e6,analog:true,delaySamples:128,kind:'Downconversion output after the 18 MHz first IF filter'},amplified:{I:amplifiedI,Q:amplifiedQ,fs:modelFs}});
  // The computational grid represents continuous analog waveforms. Only here
  // does the modeled ADC take measurements at 38.192 million samples/s.
  return {stages,real:Array.from({length:count},(_,n)=>voltage[4*n])};
 }
 const mixed=path(I,Q),individual=path(si,sq),fullScale=Math.max(...mixed.real.map(Math.abs),...individual.real.map(Math.abs))*1.05;
 for(const output of [mixed,individual]){
  const codes=output.real.map(v=>Math.max(0,Math.min(15,Math.floor((v/fullScale+1)*8)))),decoded=codes.map(k=>(-1+(k+.5)/8)*fullScale);
  output.stages.push({I:decoded,Q:new Array(count).fill(0),input:output.real,fs:FS,center:0,kind:'Four-bit digital IF samples',analog:false,delaySamples:48,codes});
  output.stages.push({...output.stages[5],kind:'Digital output at 9.548 MHz'});
  const h=firKernel(129,3e6,FS),di=filter(decoded.map((v,n)=>Math.SQRT2*v*Math.cos(2*Math.PI*IF*n/FS)),h),dq=filter(decoded.map((v,n)=>-Math.SQRT2*v*Math.sin(2*Math.PI*IF*n/FS)),h),scale=Math.max(...di.map(Math.abs),...dq.map(Math.abs),1e-12)/127;
  const bytes=new Uint8Array(count*2);for(let n=0;n<count;n++){bytes[2*n]=Math.round(127.5+di[n]/scale);bytes[2*n+1]=Math.round(127.5+dq[n]/scale);}
  output.stages.push({I:Array.from({length:count},(_,n)=>(bytes[2*n]-127.5)*scale),Q:Array.from({length:count},(_,n)=>(bytes[2*n+1]-127.5)*scale),fs:FS,center:0,kind:'Supplementary complex baseband CU8 representation',analog:false,delaySamples:112,bytes});
 }
 return {mixed:mixed.stages,individual:individual.stages,received,selected:selected.selection,models:entries.map(e=>e.model),satellites:entries.map(e=>e.selection.satellite),epoch:selected.selection.epoch,fullScale,filterTaps:129,fs:FS,modelFs,reference:{rfBandwidth:50e6,firstIFBandwidth:18e6,ifGainDb:50,finalIFBandwidth:6e6,lo:1527.68e6,clock:10e6,adcBits:4}};
}
const api={build,phaseTest,fftSpectrum,firKernel,filter,FS,IF};root.FRONT_END_PATH=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
