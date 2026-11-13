/* GPS L1 C/A receiver views use the existing shared source, without resynthesis. */
(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=[['all','All-Satellite Receiver','GPS L1 C/A mixture at one epoch'],['individual','Individual Received Signal','I/Q for the selected GPS satellite'],['delay','Doppler and Code Delay','Measured frequency shift and delayed chips']];
const line=(x,y,name,color='#72d8ef')=>({x,y,name,mode:'lines',type:'scatter',line:{color,width:1.5}});
const metric=(label,value,note)=>`<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
const graph=(id,title)=>`<div class="fe-rx-graph"><h4>${title}</h4><div id="${id}" class="fe-plot"></div></div>`;
const fftCache=new WeakMap();
function dataFor(path,view){return path?.received?.[view==='all'?'composite':'individual']||null;}
function render(s){
 const view=s.receivedView||'individual',model=s.path?.models[s.path.satellites.indexOf(s.satellite)],ready=!!model;
 const metrics=ready?metric('Selected GPS satellite',esc(s.satellite),'GPS L1 C/A; carrier 1575.42 MHz')+metric('Observed Doppler',model.doppler.toFixed(3)+' Hz','RINEX D observable')+metric('Code offset',model.delayChips.toFixed(3)+' chips','Pseudorange-derived offset modulo 1023 chips'):'';
 const panels=view==='all'?`${graph('fe-rx-strength','GPS L1 C/A observations at this epoch')}${graph('fe-rx-wave','Composite received I/Q envelope')}${graph('fe-rx-spectrum','RF spectrum of the composite envelope')}`:view==='individual'?`${graph('fe-rx-wave','Selected satellite: received I and Q')}${graph('fe-rx-cloud','I/Q amplitude distribution')}${graph('fe-rx-spectrum','Selected satellite RF spectrum')}`:`<div id="fe-rx-delay-values" class="fe-rx-metrics"></div><div class="fe-rx-formula"><strong>From measured pseudorange to code offset</strong><span>&tau; = P / c<br>Code offset = (&tau; &times; 1,023,000) modulo 1023 chips</span><p>P is measured pseudorange in metres; c = 299,792,458 m/s. P includes receiver-clock and propagation errors, so &tau; is an apparent delay.</p></div><div id="fe-rx-code-offset"></div>${graph('fe-rx-code','Local and received C/A code at the same epoch')}<p class="fe-rx-explanation">For constant recorded Doppler D, the carrier phase changes by &Delta;&phi; = 2&pi;D&Delta;t. Phase describes position within a wave cycle; 2&pi; radians correspond to one complete cycle. The graph shows change relative to the observation epoch, with time converted to seconds in the formula.</p>${graph('fe-rx-doppler','Phase change implied by the recorded Doppler')}`;
 const explanation=view==='all'?'A single antenna receives the sum of all observed GPS L1 C/A contributions and receiver noise. The selected satellite is one contribution to this mixture; other constellations and GPS bands are excluded.':view==='individual'?'I is the in-phase component and Q is the quadrature component, referenced to a carrier 90 degrees apart. This view isolates the selected satellite contribution for teaching; a physical antenna does not separate satellites.': 'Doppler is the change in received carrier frequency relative to the nominal carrier. Code delay is the displacement of the received ranging-code pattern relative to a local replica. Both come from the selected satellite at the same observation epoch. The plots illustrate recorded observations; they do not estimate these quantities from the waveform.';
 return `<section class="card fe-card fe-received-lab" id="fe-received-lab" aria-labelledby="fe-rx-title"><div class="card-head"><span class="eyebrow">RECEIVED-SIGNAL LABORATORY</span><h3 id="fe-rx-title">GPS L1 C/A at the Receiver</h3></div><div class="fe-rx-body"><p>Explore the same signal used by GNSS Signal Simulation, Modules 08, 09 and 10. The satellite and epoch selected here continue through every Front End stage.</p><div class="fe-rx-controls"><label>Observed GPS satellite<select id="fe-rx-satellite" ${ready?'':'disabled'}>${s.scene.map(c=>`<option value="${esc(c.satellite)}" ${c.satellite===s.satellite?'selected':''}>${esc(c.satellite)}</option>`).join('')}</select></label><label>Observation epoch index<input type="number" id="fe-rx-epoch" min="0" max="${Math.max(0,(s.meta?.dataset.epoch_count||1)-1)}" value="${s.epoch}" ${s.meta?'':'disabled'}></label><label>Receiver noise<select id="fe-rx-noise" ${ready?'':'disabled'}><option value="noisy" ${s.includeNoise?'selected':''}>Include modeled noise</option><option value="ideal" ${s.includeNoise?'':'selected'}>Idealized: no noise</option></select></label></div><p id="fe-rx-status" class="fe-rx-status" role="status" data-satellite="${esc(s.satellite)}" data-epoch-index="${s.epoch}">${ready?`${esc(s.satellite)} &middot; ${esc(s.path.epoch)} &middot; ${s.scene.length} complete GPS L1 C/A channels. ${esc(s.selectionNotice||'')}`:esc(s.sceneError||'Loading the observed GPS L1 C/A scene. The lesson remains available.')}</p><div class="fe-rx-tabs" role="tablist" aria-label="Received GPS L1 C/A views">${tabs.map(([id,title,sub])=>`<button type="button" id="fe-rx-tab-${id}" role="tab" aria-selected="${view===id}" aria-controls="fe-rx-panel" tabindex="${view===id?0:-1}" data-rx-view="${id}"><strong>${title}</strong><small>${sub}</small></button>`).join('')}</div><div id="fe-rx-panel" role="tabpanel" aria-labelledby="fe-rx-tab-${view}"><p class="fe-rx-explanation">${explanation}</p><div class="fe-rx-metrics">${metrics}</div>${panels}</div><div class="fe-rx-boundary"><strong>Before the ADC</strong><p>I/Q here describes the analog RF envelope mathematically. The plotted points are a calculation grid, not samples recorded at the antenna. Waveforms are reconstructed from RINEX observations and modeled noise; they are not captured RF recordings.</p></div><div class="fe-rx-actions"><a href="/signals/#${view==='all'?'scene':view==='delay'?'delay':'received'}">Open this view in GNSS Signal Simulation &#8599;</a><button type="button" id="fe-rx-follow">Follow this signal through the Front End &#8594;</button></div></div></section>`;
}
function bind(s,actions){
 document.querySelectorAll('[data-rx-view]').forEach(button=>{
  button.onclick=()=>actions.view(button.dataset.rxView);
  button.onkeydown=event=>{const index=tabs.findIndex(t=>t[0]===button.dataset.rxView);let next;if(event.key==='ArrowRight')next=(index+1)%3;else if(event.key==='ArrowLeft')next=(index+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();actions.view(tabs[next][0]);document.getElementById('fe-rx-tab-'+tabs[next][0])?.focus({preventScroll:true});};
 });
 const byId=id=>document.getElementById(id);if(!byId('fe-rx-satellite'))return;
 byId('fe-rx-satellite').onchange=e=>actions.satellite(e.target.value);
 byId('fe-rx-epoch').onchange=e=>actions.epoch(Number(e.target.value));
 byId('fe-rx-noise').onchange=e=>actions.noise(e.target.value==='noisy');
 byId('fe-rx-follow').onclick=()=>actions.follow();
}
function draw(s,plot){
 if(!document.getElementById('fe-received-lab')||!s.path)return;
 const view=s.receivedView||'individual',source=dataFor(s.path,view),received=s.path.received,model=s.path.models[s.path.satellites.indexOf(s.satellite)];if(!source||!model)return;
 if(view==='delay'){
  const values=document.getElementById('fe-rx-delay-values');
  values.innerHTML=metric('Measured pseudorange',(model.pseudorange/1000).toFixed(3)+' km','RINEX C observable')+metric('Apparent delay',(model.apparentDelaySec*1000).toFixed(6)+' ms','Measured pseudorange divided by c')+metric('Code-rate Doppler',model.codeDoppler.toFixed(6)+' chips/s','Carrier Doppler / 1540');
  const offsetX=55+model.delayChips/1023*840;
  document.getElementById('fe-rx-code-offset').innerHTML=`<div class="fe-rx-offset"><svg viewBox="0 0 950 120" role="img" aria-label="Apparent code offset within one C/A period"><path d="M55 60H895" stroke="#52768e" stroke-width="2"/><path d="M55 52V68M895 52V68" stroke="#8aaabd"/><path d="M${offsetX} 38V76" stroke="#72d8ef" stroke-width="3"/><circle cx="${offsetX}" cy="60" r="5" fill="#72d8ef"/><text x="55" y="100" fill="#b8cddd" font-size="13">0 chips</text><text x="895" y="100" text-anchor="end" fill="#b8cddd" font-size="13">1023 chips = 1 ms</text><text x="${Math.max(125,Math.min(825,offsetX))}" y="25" text-anchor="middle" fill="#72d8ef" font-size="14">Offset: ${model.delayChips.toFixed(3)} chips</text></svg></div>`;
  const code=root.RECEIVER_MODEL.codeComparison(model,96),local=line(code.x,code.local,'Local PRN replica','#ffd17a'),delayed=line(code.x,code.received,'Received PRN, same GPS satellite');local.line.shape=delayed.line.shape='hv';
  plot('fe-rx-code',[local,delayed],'Chip intervals after the observation epoch','Bipolar code sign',{yaxis:{title:'Bipolar code sign',range:[-1.3,1.3],tickvals:[-1,1],gridcolor:'#294758',automargin:true}});
  const ms=Array.from({length:401},(_,i)=>i/100),phase=ms.map(t=>2*Math.PI*model.doppler*t/1000);
  plot('fe-rx-doppler',[line(ms,phase,'Phase change from measured Doppler')],'Time after observation epoch (ms)','Phase change (radians)');
  return;
 }
 const count=root.GPS_L1_RECEIVED.DISPLAY_SAMPLES,t=received.tUs.slice(0,count);
 plot('fe-rx-wave',[line(t,source.I.slice(0,count),'I'),line(t,source.Q.slice(0,count),'Q','#ffd17a')],'Time after observation epoch (microseconds)','Relative RF-envelope amplitude');
 let cached=fftCache.get(source);if(!cached){cached=root.FRONT_END_PATH.fftSpectrum(source.I,source.Q,received.sampleRate);fftCache.set(source,cached);}
 plot('fe-rx-spectrum',[line(cached.f.map(f=>1575.42+f/1e6),cached.p,'GPS L1 C/A RF envelope spectrum')],'RF frequency (MHz)','Relative power per frequency bin (dB)',{xaxis:{title:'RF frequency (MHz)',range:[1570.42,1580.42],gridcolor:'#294758',automargin:true}});
 if(view==='all'){
  plot('fe-rx-strength',[{x:s.path.satellites,y:s.path.models.map(m=>m.cn0),type:'bar',name:'Recorded carrier-to-noise-density ratio',marker:{color:s.path.satellites.map(sat=>sat===s.satellite?'#ffd17a':'#72d8ef')}}],'GPS satellite observed at this epoch','C/N0 (dB-Hz)');
 }else{
  const I=[],Q=[];for(let i=0;i<count;i+=4){I.push(source.I[i]);Q.push(source.Q[i]);}
  plot('fe-rx-cloud',[{x:I,y:Q,name:'Selected GPS L1 C/A contribution',mode:'markers',type:'scattergl',marker:{color:'#72d8ef',size:3,opacity:.55}}],'In-phase amplitude (I)','Quadrature amplitude (Q)',{showlegend:false,yaxis:{title:'Quadrature amplitude (Q)',scaleanchor:'x',scaleratio:1,gridcolor:'#294758',automargin:true}});
 }
}
const api={render,bind,draw,dataFor};root.FE_RECEIVED_LAB=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
