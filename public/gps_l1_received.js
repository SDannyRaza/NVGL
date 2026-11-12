/* One observation-anchored GPS L1 C/A source shared by Signal Simulation and Front End. */
(function(root){
 'use strict';
 const ADC_RATE=38.192e6,MODEL_RATE=4*ADC_RATE,DISPLAY_SAMPLES=4000;
 function complete(selection){return selection?.satellite?.startsWith('G')&&selection.signal?.prn_mode==='gps-ca'&&['Pseudorange','Doppler','Carrier phase','C/N\u2080'].every(key=>Number.isFinite(selection.measurements?.[key]?.value));}
 function prepare(channels){return channels.filter(complete).map(selection=>({selection,model:root.RECEIVER_MODEL.prepare({selection,epoch:selection.epoch,prn:root.PRNLAB.gpsCA(selection.prn_number),component:'C/A data'})}));}
 function synthesize(entries,satellite,options={}){
  const count=options.samples||16384,fs=options.sampleRate||MODEL_RATE,includeNoise=options.includeNoise!==false;
  if(!Number.isInteger(count)||count<32||count>32768||!(fs>0))throw Error('Invalid received-signal calculation grid.');
  const chosen=entries.find(entry=>entry.selection.satellite===satellite);
  if(!chosen||entries.some(entry=>!complete(entry.selection)||entry.selection.epoch!==chosen.selection.epoch))throw Error('Complete GPS L1 C/A observations at one epoch are required.');
  const cleanI=new Array(count).fill(0),cleanQ=cleanI.slice(),selectedI=cleanI.slice(),selectedQ=cleanI.slice(),contributions=entries.map(()=>new Array(count));
  for(let j=0;j<entries.length;j++){
   const entry=entries[j],m=entry.model;
   if(!m||![m.cn0,m.doppler,m.initialCarrierPhase,m.delayChips].every(Number.isFinite))throw Error('Missing received-signal model parameters.');
   const amplitude=Math.sqrt(10**(m.cn0/10)/fs);
   for(let n=0;n<count;n++){
    const t=n/fs,sign=root.RECEIVER_MODEL.codeSign(m,t)*root.RECEIVER_MODEL.navSign(m,t),phase=m.initialCarrierPhase+2*Math.PI*m.doppler*t;
    const i=amplitude*sign*Math.cos(phase),q=amplitude*sign*Math.sin(phase);
    cleanI[n]+=i;cleanQ[n]+=q;contributions[j][n]=i;
    if(entry===chosen){selectedI[n]=i;selectedQ[n]=q;}
   }
  }
  const sumI=cleanI.slice(),sumQ=cleanQ.slice(),individualI=selectedI.slice(),individualQ=selectedQ.slice();
  let seed=Math.trunc(root.RECEIVER_MODEL.epochMillis(chosen.selection.epoch))>>>0;
  const uniform=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+1)/4294967297;};
  if(includeNoise)for(let n=0;n<count;n++){
   const r=Math.sqrt(-2*Math.log(uniform()))/Math.SQRT2,angle=2*Math.PI*uniform(),ni=r*Math.cos(angle),nq=r*Math.sin(angle);
   sumI[n]+=ni;sumQ[n]+=nq;individualI[n]+=ni;individualQ[n]+=nq;
  }
  return {epoch:chosen.selection.epoch,satellite,sampleRate:fs,includeNoise,tUs:Array.from({length:count},(_,n)=>n/fs*1e6),
   composite:{I:sumI,Q:sumQ,cleanI,cleanQ},individual:{I:individualI,Q:individualQ,cleanI:selectedI,cleanQ:selectedQ},contributions};
 }
 function readContext(){try{
  const saved=JSON.parse(root.sessionStorage.getItem('nvgl.gps-l1-context')||'null');
  if(saved&&Number.isInteger(saved.epoch)&&saved.epoch>=0&&/^G\d{2}$/.test(saved.satellite))return saved;
 }catch{}return null;}
 function saveContext(value){try{
  if(!Number.isInteger(value.epoch)||value.epoch<0||!/^G\d{2}$/.test(value.satellite))return;
  root.sessionStorage.setItem('nvgl.gps-l1-context',JSON.stringify({...value,signalId:'G-1C'}));
 }catch{}}
 const api={ADC_RATE,MODEL_RATE,DISPLAY_SAMPLES,complete,prepare,synthesize,readContext,saveContext};
 root.GPS_L1_RECEIVED=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
