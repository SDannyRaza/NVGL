/* GPS L1 input overview: real RF voltage and exact selected C/A replicas. */
(function(root){
'use strict';
const RF=1575420000,TWO_PI=2*Math.PI;
let delayEnabled=true,dopplerEnabled=true,windowChips=32;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelFor=s=>s.path?.models[s.path.satellites.indexOf(s.satellite)]||null;
const line=(x,y,name,color)=>({x,y,name,type:'scatter',mode:'lines',line:{color,width:1.6}});
function variant(model,applyDelay,applyDoppler){return {...model,delayChips:applyDelay?model.delayChips:0,effectiveCodeRate:model.codeRate+(applyDoppler?model.doppler*model.codeRate/RF:0),doppler:applyDoppler?model.doppler:0};}
function signalAt(model,time,options={}){
 const shifted=variant(model,options.delay!==false,options.doppler!==false),navigationSign=options.navigationSign??root.RECEIVER_MODEL.navSign(model,0),phase=model.initialCarrierPhase||0;
 return navigationSign*root.RECEIVER_MODEL.codeSign(shifted,time)*Math.cos(TWO_PI*(RF+shifted.doppler)*time+phase);
}
function firstTransition(model){
 const raw=model.receivePhase-model.delayChips,phase=((raw%model.codeLength)+model.codeLength)%model.codeLength;
 let time=(Math.floor(phase)+1-phase)/model.effectiveCodeRate;
 for(let n=0;n<model.codeLength;n++,time+=1/model.effectiveCodeRate)if(root.RECEIVER_MODEL.codeSign(model,time-1e-12)!==root.RECEIVER_MODEL.codeSign(model,time+1e-12))return time;
 return 0;
}
function buildData(model,options={}){
 const applyDelay=options.delay!==false,applyDoppler=options.doppler!==false,chips=options.chips||32,duration=chips/model.codeRate,reference=variant(model,false,false),received=variant(model,applyDelay,applyDoppler),navigationSign=root.RECEIVER_MODEL.navSign(model,0);
 const events=[0,duration];
 for(const m of [reference,received]){
  const phase=((m.receivePhase-m.delayChips)%m.codeLength+m.codeLength)%m.codeLength;
  for(let t=(Math.floor(phase)+1-phase)/m.effectiveCodeRate;t<duration;t+=1/m.effectiveCodeRate)events.push(t);
 }
 const times=[...new Set(events)].sort((a,b)=>a-b),codeTimeUs=times.map(t=>t*1e6),referenceCode=times.map(t=>root.RECEIVER_MODEL.codeSign(reference,t+1e-12)),receivedCode=times.map(t=>root.RECEIVER_MODEL.codeSign(received,t+1e-12));
 const rfCentre=firstTransition(received),rfTimeNs=Array.from({length:1201},(_,i)=>-8+16*i/1200),referenceRF=rfTimeNs.map(ns=>signalAt(model,rfCentre+ns*1e-9,{delay:false,doppler:false,navigationSign})),receivedRF=rfTimeNs.map(ns=>signalAt(model,rfCentre+ns*1e-9,{delay:applyDelay,doppler:applyDoppler,navigationSign}));
 const phaseTimeMs=Array.from({length:401},(_,i)=>i/100),phaseChange=phaseTimeMs.map(ms=>TWO_PI*received.doppler*ms/1000);
 return {codeTimeUs,referenceCode,receivedCode,rfTimeNs,referenceRF,receivedRF,rfCentre,phaseTimeMs,phaseChange,navigationSign,doppler:received.doppler,delayChips:received.delayChips};
}
function render(state){
 const model=modelFor(state),ready=!!model;
 return `<section class="card fe-card fe-overview" id="fe-overview-lab" aria-labelledby="fe-overview-title"><div class="card-head"><span class="eyebrow">THE SIGNAL AT THE ANTENNA</span><h3 id="fe-overview-title">GPS L1 C/A Replica, Code Delay and Doppler</h3></div><div class="fe-overview-body"><p class="fe-overview-lead">The antenna supplies one real-valued analog RF voltage. This overview compares the selected satellite's clean GPS L1 C/A replica with the same replica after applying its recorded code delay and Doppler.</p><div class="fe-overview-source"><label>Observed GPS satellite<select id="fe-overview-satellite" ${ready?'':'disabled'}>${state.scene.map(channel=>`<option value="${esc(channel.satellite)}" ${channel.satellite===state.satellite?'selected':''}>${esc(channel.satellite)}</option>`).join('')}</select></label><label>Observation epoch index<input id="fe-overview-epoch" type="number" min="0" max="${Math.max(0,(state.meta?.dataset.epoch_count||1)-1)}" value="${state.epoch}" ${state.meta?'':'disabled'}></label></div><p id="fe-overview-status" class="fe-overview-status" role="status" data-satellite="${esc(state.satellite)}" data-epoch-index="${state.epoch}">${ready?`${esc(state.satellite)} &middot; ${esc(state.path.epoch)} &middot; GPS L1 C/A only. ${esc(state.selectionNotice||'')}`:esc(state.sceneError||'Loading the observed GPS L1 C/A channel. The overview remains available.')}</p><div class="fe-overview-flow" aria-label="Apply observed code delay and Doppler to the same PRN replica"><div><strong>Same GPS C/A code</strong><span>Actual satellite PRN sequence</span></div><b aria-hidden="true">&#8594;</b><div><strong>Code delay and Doppler</strong><span>Recorded observations</span></div><b aria-hidden="true">&#8594;</b><div><strong>Received RF illustration</strong><span>One real analog voltage</span></div></div><div class="fe-overview-controls"><label class="fe-overview-check"><input type="checkbox" id="fe-overview-delay" ${delayEnabled?'checked':''}> Apply observed code delay</label><label class="fe-overview-check"><input type="checkbox" id="fe-overview-doppler" ${dopplerEnabled?'checked':''}> Apply observed Doppler</label><label>Code time window<select id="fe-overview-window"><option value="32" ${windowChips===32?'selected':''}>32 chips: transition detail</option><option value="96" ${windowChips===96?'selected':''}>96 chips: longer segment</option><option value="1023" ${windowChips===1023?'selected':''}>1023 chips: one 1 ms period</option></select></label></div><div class="fe-overview-metrics" id="fe-overview-metrics"></div><h4>Code timing: actual GPS C/A replica</h4><p>Both lines use the selected satellite's 1023-chip Gold code. The reference has no imposed delay or Doppler. Toggling code delay shifts that same pattern; Doppler also produces the corresponding small code-rate change.</p><div id="fe-overview-code" class="fe-plot"></div><h4>Real RF voltage: a nanosecond-scale view</h4><p>GPS L1 oscillates at 1575.42 MHz, with a period of approximately 0.635 ns. This 16 ns window resolves the real carrier and is centred on a received-code sign transition. A negative code sign reverses the carrier by 180 degrees.</p><p class="fe-overview-caption" id="fe-overview-rf-context"></p><div id="fe-overview-rf" class="fe-plot"></div><h4>Doppler accumulates phase over time</h4><p>A few kilohertz of Doppler is tiny beside the 1.57542 GHz carrier. Its change across a few nanoseconds is correspondingly small. The millisecond-scale graph below shows the accumulated phase change without artificially magnifying the RF frequency shift.</p><div id="fe-overview-phase" class="fe-plot"></div><div class="fe-overview-equation"><strong>One real-valued signal, with code timing and frequency shift</strong><span>s(t) = A d<sub>0</sub> c[&#952;<sub>c,0</sub> + (R<sub>c</sub> + &#916;R<sub>c</sub>)t &#8722; &#964;<sub>c</sub>] cos[2&#960;(f<sub>L1</sub> + D)t + &#966;<sub>0</sub>]<br>&#916;R<sub>c</sub> = D R<sub>c</sub>/f<sub>L1</sub> &nbsp; ; &nbsp; &#916;&#966;(t) = 2&#960;Dt</span><p>A is normalized to one; d<sub>0</sub> is the navigation-symbol sign, held fixed for this comparison. R<sub>c</sub> = 1,023,000 chips/s; D is recorded Doppler in Hz; &#952;<sub>c,0</sub> is the local code phase at the epoch; &#964;<sub>c</sub> is the code offset in chips. Both RF traces share the same initial carrier-phase convention.</p></div><p class="fe-overview-caption">The code offset is (P/c) &times; R<sub>c</sub> modulo 1023. P is measured pseudorange, so this apparent delay includes clock and propagation effects. These are clean, observation-anchored replicas, not captured RF recordings. Actual reception also includes other satellites and receiver noise. This overview describes the front-end input only.</p></div></section>`;
}
function draw(state,plot){
 if(!document.getElementById('fe-overview-code'))return;const model=modelFor(state);if(!model)return;
 const data=buildData(model,{delay:delayEnabled,doppler:dopplerEnabled,chips:windowChips}),local=line(data.codeTimeUs,data.referenceCode,'GPS C/A replica: no imposed effects','#a4bbcf'),shifted=line(data.codeTimeUs,data.receivedCode,'Same C/A code with enabled effects','#72d8ef');local.line.shape=shifted.line.shape='hv';
 plot('fe-overview-code',[local,shifted],'Time after observation epoch (microseconds)','Bipolar code sign',{yaxis:{title:'Bipolar code sign',range:[-1.35,1.35],tickvals:[-1,1],gridcolor:'#294758'}});
 plot('fe-overview-rf',[line(data.rfTimeNs,data.referenceRF,'Real RF reference','#a4bbcf'),line(data.rfTimeNs,data.receivedRF,'Real RF with enabled effects','#72d8ef')],'Time relative to displayed code transition (ns)','Normalized real RF voltage',{yaxis:{title:'Normalized real RF voltage',range:[-1.25,1.25],gridcolor:'#294758'}});
 plot('fe-overview-phase',[line(data.phaseTimeMs,data.phaseTimeMs.map(()=>0),'No Doppler','#a4bbcf'),line(data.phaseTimeMs,data.phaseChange,'Phase change from enabled Doppler','#72d8ef')],'Time after observation epoch (ms)','Carrier-phase change (radians)');
 document.getElementById('fe-overview-rf-context').textContent='RF view centre: '+(data.rfCentre*1e6).toFixed(6)+' microseconds after the observation epoch. The calculation uses 1201 points over 16 ns (75 billion intervals/s); this is a plotting grid, not front-end sampling.';
 document.getElementById('fe-overview-metrics').innerHTML=`<div><span>Recorded Doppler</span><strong>${model.doppler.toFixed(3)} Hz</strong><small>Applied: ${data.doppler.toFixed(3)} Hz</small></div><div><span>Recorded code offset</span><strong>${model.delayChips.toFixed(3)} chips</strong><small>Applied: ${data.delayChips.toFixed(3)} chips</small></div><div><span>Recorded apparent delay</span><strong>${(model.apparentDelaySec*1000).toFixed(6)} ms</strong><small>Measured pseudorange divided by c</small></div>`;
}
function bind(state,actions){
 if(!document.getElementById('fe-overview-lab'))return;
 document.getElementById('fe-overview-satellite').onchange=e=>actions.satellite(e.target.value);
 document.getElementById('fe-overview-epoch').onchange=e=>actions.epoch(Number(e.target.value));
 document.getElementById('fe-overview-delay').onchange=e=>{delayEnabled=e.target.checked;draw(state,actions.plot);};
 document.getElementById('fe-overview-doppler').onchange=e=>{dopplerEnabled=e.target.checked;draw(state,actions.plot);};
 document.getElementById('fe-overview-window').onchange=e=>{windowChips=Number(e.target.value);draw(state,actions.plot);};
 draw(state,actions.plot);
}
const api={render,bind,draw,signalAt,buildData,variant,firstTransition,RF};root.FE_OVERVIEW=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
