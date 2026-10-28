'use strict';
const $=id=>document.getElementById(id);
const COLORS={...(window.GNSS_COLORS||{}),G:'#55c7ff',E:'#48dca5',C:'#ff5d8f',R:'#ffb84a',J:'#a58cff',S:'#59e0cf'};
const ORDER=['G','E','C','R','J','S'];
const NAMES={G:'GPS',E:'Galileo',C:'BeiDou',R:'GLONASS',J:'QZSS',S:'SBAS'};
const C=299792458;
const ICD_LIBRARY=[
 {sys:'G',title:'IS-GPS-200N',version:'22 Aug 2022',coverage:'GPS L1 C/A · L2C · LNAV · CNAV',url:'/reference/icd/IS-GPS-200N.pdf'},
 {sys:'G',title:'IS-GPS-705J',version:'22 Aug 2022',coverage:'GPS L5',url:'/reference/icd/IS-GPS-705J.pdf'},
 {sys:'G',title:'IS-GPS-800J',version:'22 Aug 2022',coverage:'GPS L1C',url:'/reference/icd/IS-GPS-800J.pdf'},
 {sys:'E',title:'Galileo OS SIS ICD v2.2',version:'Nov 2025',coverage:'E1 · E5 · E6 open service',url:'/reference/icd/Galileo_OS_SIS_ICD_v2.2.pdf'},
 {sys:'E',title:'Galileo HAS SIS ICD v1.0',version:'May 2022',coverage:'E6-B HAS',url:'/reference/icd/Galileo_HAS_SIS_ICD_v1.0.pdf'},
 {sys:'C',title:'BDS SIS ICD Open Service Signal',version:'v2.1 · 2016',coverage:'BeiDou B1I · B2I',url:'/reference/icd/BeiDou1.pdf'},
 {sys:'C',title:'BDS Open Service Performance Standard',version:'2021 family',coverage:'BeiDou service characteristics',url:'/reference/icd/Beidou2.pdf'},
 {sys:'R',title:'GLONASS ICD L1/L2',version:'Edition 5.1',coverage:'Legacy GLONASS FDMA L1/L2',url:'/reference/icd/GLONASS.ICD.pdf'},
 {sys:'R',title:'GLONASS ICD',version:'Version 4.0 · 1998',coverage:'Historical reference',url:'/reference/icd/ICD_GLONASS_4.0_(1998)_en.pdf'},
 {sys:'J',title:'IS-QZSS-PNT-006',version:'11 Jul 2024',coverage:'QZSS L1 C/A · L1C · L2C · L5',url:'/reference/icd/is-qzss-pnt-006.pdf'},
 {sys:'J',title:'IS-QZSS-L1S-009',version:'20 Feb 2026',coverage:'QZSS L1S',url:'/reference/icd/is-qzss-l1s-009.pdf'},
 {sys:'J',title:'IS-QZSS-L6-008',version:'18 Mar 2026',coverage:'QZSS L6D/L6E',url:'/reference/icd/is-qzss-l6-008.pdf'},
 {sys:'S',title:'IS-GPS-200N · SBAS C/A assignments',version:'22 Aug 2022',coverage:'Additional C/A PRNs 120–158 · Table 6-I',url:'/reference/icd/IS-GPS-200N.pdf'}
];
const GLOSSARY=[
 ['Carrier','A sinusoidal RF waveform at the allocated GNSS center frequency onto which code, data and pilot components are modulated.'],
 ['PRN','Pseudo-random noise ranging code: a deterministic sequence assigned to a satellite or signal component and reproduced locally by the receiver.'],
 ['Ranging code','Known chip sequence whose correlation delay provides the basis for code-phase and pseudorange measurement.'],
 ['Chip','One binary element of a spreading/ranging sequence. A chip is not a navigation-data bit.'],
 ['Chipping rate','Number of ranging-code chips transmitted per second.'],
 ['Code period','Time interval after which the primary ranging sequence repeats.'],
 ['Code phase','Temporal alignment of the received ranging code relative to a local receiver replica.'],
 ['Gold code','Sequence family formed from preferred maximal-length sequences with useful auto- and cross-correlation.'],
 ['Memory code','A ranging sequence published/stored explicitly rather than generated only by a short LFSR recurrence.'],
 ['Primary code','Main high-rate ranging sequence used for code acquisition and tracking.'],
 ['Secondary code','Lower-rate overlay sequence applied to a primary code, often on a pilot component.'],
 ['Data channel','Signal component carrying navigation information in addition to a ranging code.'],
 ['Pilot channel','Data-free component carrying known codes to support long coherent integration and robust tracking.'],
 ['Navigation message','Low-rate broadcast information containing satellite orbit/state, clock, health, time and system parameters.'],
 ['Spreading','Multiplication/XOR of low-rate data with a much higher-rate ranging code.'],
 ['CDMA','Code Division Multiple Access: satellites share a frequency band and are separated primarily by code assignments.'],
 ['FDMA','Frequency Division Multiple Access: satellites are separated by different RF carrier channels, as in legacy GLONASS.'],
 ['BPSK','Binary Phase Shift Keying: binary symbols reverse the carrier phase by 180°.'],
 ['BOC','Binary Offset Carrier: code is multiplied by a square-wave subcarrier to shape the spectrum away from band center.'],
 ['CBOC','Composite BOC: weighted combination of BOC components used by Galileo E1.'],
 ['TMBOC','Time-Multiplexed BOC: different BOC components are transmitted in a prescribed time pattern.'],
 ['QMBOC','Quadrature Multiplexed BOC: BOC components are multiplexed in quadrature according to the signal design.'],
 ['AltBOC','Alternative BOC: wideband multiplexing used for the Galileo E5 signal family.'],
 ['I/Q','In-phase and quadrature signal components, represented as orthogonal complex baseband axes.'],
 ['Correlation','Matched comparison of received samples with a local code/carrier replica.'],
 ['Acquisition','Initial search over code phase and Doppler to detect a satellite signal and initialize tracking.'],
 ['Doppler','Apparent carrier-frequency shift caused mainly by relative satellite-receiver motion and receiver oscillator offset.'],
 ['DLL','Delay-Locked Loop: feedback loop that tracks ranging-code delay.'],
 ['PLL','Phase-Locked Loop: feedback loop that tracks carrier phase.'],
 ['FLL','Frequency-Locked Loop: feedback loop that tracks carrier frequency/Doppler.'],
 ['Symbol','Transmitted channel-coded data unit; one information bit may map to multiple symbols after FEC.'],
 ['Frame / page','Hierarchy used to organize navigation data. Terminology and durations are constellation-specific.'],
 ['Ephemeris','Broadcast parameters used to compute a satellite position/velocity over a limited validity interval.'],
 ['Pseudorange','Code-based range-like measurement containing geometric range plus clock, propagation and measurement effects.'],
 ['Carrier phase','Accumulated carrier-cycle observable used for precise positioning, initially containing an integer ambiguity.'],
 ['C/N₀','Carrier-to-noise-density ratio, commonly expressed in dB-Hz, indicating received signal strength relative to noise spectral density.'],
 ['RINEX OBS','Receiver Independent Exchange Format observation file containing measurements such as code, phase, Doppler and signal strength.'],
 ['RINEX NAV','RINEX navigation file containing decoded broadcast navigation parameters; it does not preserve the original RF message bitstream.'],
 ['ICD / SIS ICD','Controlled interface specification defining signal frequencies, codes, modulation, timing and broadcast-message interfaces.']
];
const NAV_STRUCTURES={
 'LNAV':[['Data rate','50 bit/s'],['Organization','10 words × 30 bits per subframe'],['Frame','5 subframes · 1500 bits · 30 s'],['Role','Clock, ephemeris, almanac/system data']],
 'CNAV':[['Information rate','25 bit/s'],['Channel coding','50 symbols/s after convolutional coding'],['Message','300 information bits · message types'],['Role','Modernized orbit, clock and system data']],
 'I/NAV':[['Service','Galileo Open Service'],['Data channels','E1-B and E5b-I'],['Organization','Pages/page parts with FEC and interleaving'],['Role','Ephemeris, clock, GST, health and service data']],
 'D1':[['Data rate','50 bit/s'],['Frame','300 bits / 10 words'],['Nominal duration','6 s'],['Use','BeiDou non-GEO broadcast navigation']],
 'D2':[['Data rate','500 bit/s'],['Frame','300 bits / 10 words'],['Nominal duration','0.6 s'],['Use','BeiDou GEO-oriented higher-rate message']],
 'GLONASS navigation message':[['Data rate','50 bit/s'],['String','2 s string'],['Frame','15 strings · 30 s'],['Role','State vector, clock, health and system time']],
 'SBAS message':[['Data rate','250 bit/s'],['Message','250 bits · 1 s'],['Role','Augmentation corrections, integrity and system data']],
};

const state={meta:null,epoch:null,selection:null,system:'G',sat:null,signalId:null,component:null,view:'overview',prn:null,revision:0,generation:0,galileoCache:new Map()};
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function fmt(v,d=3){if(v===null||v===undefined||!Number.isFinite(Number(v)))return '—';const n=Number(v);if(Math.abs(n)>=1e6||Math.abs(n)<1e-4&&n!==0)return n.toExponential(4);return n.toLocaleString(undefined,{maximumFractionDigits:d});}
function color(){return COLORS[state.system]||'#35cdef'}
function systemMeta(){return state.meta?.systems.find(x=>x.id===state.system)}
function signalMeta(){return systemMeta()?.signals.find(x=>x.id===state.signalId)}
function currentSignal(){return state.selection?.signal||signalMeta()||{}}
function setActiveColor(){document.documentElement.style.setProperty('--active',color())}
async function getJSON(url){const r=await fetch(url,{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}
function plot(id,data,extra={}){const el=$(id);if(!el)return;const layout={paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Segoe UI,Arial',color:'#bdd0dc',size:16},margin:{l:76,r:26,t:26,b:70},xaxis:{gridcolor:'#223845',zerolinecolor:'#304c5a'},yaxis:{gridcolor:'#223845',zerolinecolor:'#304c5a'},hoverlabel:{bgcolor:'#10202b',bordercolor:'#36586a',font:{color:'#fff'}},...extra};Plotly.react(el,data,layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']})}
function systemOrder(list){return [...list].sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id))}
function selectOptions(el,items,valueFn,labelFn,selected){el.innerHTML=items.map(x=>`<option value="${escapeHtml(valueFn(x))}" ${String(valueFn(x))===String(selected)?'selected':''}>${escapeHtml(labelFn(x))}</option>`).join('')}
function selectedMeasurement(label){return state.selection?.measurements?.[label]||{}}

function updateEpochReadout(index=state.epoch.index){
  const iso=state.meta.dataset.epoch_times?.[index]||(index===state.epoch.index?state.epoch.epoch:null);
  const label=iso?iso.replace('T',' ').replace(/(?:\+00:00|Z)$/,''):'Loading observation time…';
  $('epoch-readout').textContent=label;
  $('epoch-time').textContent=(state.meta.dataset.time_system||'GNSS time')+' · observation '+(Number(index)+1)+' of '+state.meta.dataset.epoch_count;
  $('epoch-select').setAttribute('aria-valuetext',label+' '+(state.meta.dataset.time_system||'GNSS time'));
}

async function init(){
  state.meta=await getJSON('/api/signals/meta');
  const n=state.meta.dataset.epoch_count;
  const ep=$('epoch-select');ep.max=String(Math.max(0,n-1));ep.value='0';ep.disabled=n<2;
  state.epoch=await getJSON('/api/signals/epoch?index=0');
  updateEpochReadout();
  state.system=state.epoch.systems.G?'G':ORDER.find(s=>state.epoch.systems[s])||Object.keys(state.epoch.systems)[0];
  bindEvents();populateSystem();await refreshSelection('initial dataset load');renderStatic();
}
function bindEvents(){
  $('stage-nav').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(!b)return;switchView(b.dataset.view)});
  $('stage-prev').addEventListener('click',()=>shiftStage(-1));
  $('stage-next').addEventListener('click',()=>shiftStage(1));
  $('focus-stage').addEventListener('click',()=>{
    document.body.classList.toggle('signal-focus-mode');
    $('focus-stage').textContent=document.body.classList.contains('signal-focus-mode')?'◱ Show introduction':'⤢ Focus graphs';
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  });
  $('receiver-noise').addEventListener('change',()=>{if(state.view==='received')renderReceived()});
  let epochRequest=0;
  $('epoch-select').addEventListener('input',e=>{
    ++epochRequest; ++state.revision;
    updateEpochReadout(Number(e.target.value));
  });
  $('epoch-select').addEventListener('change',async e=>{
    const request=++epochRequest,index=e.target.value;
    $('epoch-time').textContent='Loading observation…';
    try{
      const epoch=await getJSON('/api/signals/epoch?index='+index);
      if(request!==epochRequest)return;
      state.epoch=epoch;updateEpochReadout();
      if(!state.epoch.systems[state.system])state.system=ORDER.find(s=>state.epoch.systems[s])||Object.keys(state.epoch.systems)[0];
      populateSystem();await refreshSelection('epoch changed');
    }catch(error){
      if(request!==epochRequest)return;
      $('epoch-select').value=String(state.epoch.index);updateEpochReadout();
      $('epoch-time').textContent='Could not load epoch: '+error.message;
    }
  });
  $('system-select').addEventListener('change',async e=>{state.system=e.target.value;setActiveColor();populateSatellite();populateSignal();populateComponent();await refreshSelection('constellation changed')});
  $('sat-select').addEventListener('change',async e=>{state.sat=e.target.value;state.system=state.sat[0];populateSystem();await refreshSelection('satellite/PRN changed')});
  $('signal-select').addEventListener('change',async e=>{state.signalId=e.target.value;populateComponent();await refreshSelection('signal changed')});
  $('component-select').addEventListener('change',async e=>{state.component=e.target.value;await regeneratePRN('data/pilot component changed');renderContext();renderCurrent()});
  $('glossary-search').addEventListener('input',renderGlossary);
}
function populateSystem(){const available=systemOrder(state.meta.systems.filter(s=>state.epoch.systems[s.id]?.length));selectOptions($('system-select'),available,x=>x.id,x=>`${x.name} (${x.id})`,state.system);setActiveColor();populateSatellite();populateSignal();populateComponent()}
function populateSatellite(){
  const sats=state.epoch.systems[state.system]||[];
  if(!sats.includes(state.sat))state.sat=sats[0];
  $('sat-select').innerHTML=ORDER.filter(sys=>state.epoch.systems[sys]?.length).map(sys=>`<optgroup label="${escapeHtml(NAMES[sys])}">${state.epoch.systems[sys].map(sat=>`<option value="${escapeHtml(sat)}" ${sat===state.sat?'selected':''}>${escapeHtml(sat)}</option>`).join('')}</optgroup>`).join('');
}
function populateSignal(){const sigs=systemMeta()?.signals||[];if(!sigs.some(s=>s.id===state.signalId))state.signalId=sigs[0]?.id;selectOptions($('signal-select'),sigs,x=>x.id,x=>`${x.name} · ${x.observation_codes.join('/')}`,state.signalId)}
function populateComponent(){const comps=signalMeta()?.components||[];if(!comps.includes(state.component))state.component=signalMeta()?.default_component||comps[0];selectOptions($('component-select'),comps,x=>x,x=>x,state.component)}
async function refreshSelection(reason){
  const rev=++state.revision; const url=`/api/signals/selection?epoch=${state.epoch.index}&sat=${encodeURIComponent(state.sat)}&signal=${encodeURIComponent(state.signalId)}`;
  try{const result=await getJSON(url);if(rev!==state.revision)return;state.selection=result;await regeneratePRN(reason,rev);if(rev!==state.revision)return;renderContext();renderCurrent();}
  catch(err){if(rev!==state.revision)return;console.error(err);$('context-title').textContent='Signal selection error';$('context-subtitle').textContent=err.message;}
}
function shiftStage(direction){
  const buttons=[...document.querySelectorAll('#stage-nav button[data-view]')];
  const i=buttons.findIndex(b=>b.dataset.view===state.view);
  const next=buttons[Math.min(buttons.length-1,Math.max(0,i+direction))];
  if(next)switchView(next.dataset.view);
}
function switchView(view){
  const buttons=[...document.querySelectorAll('#stage-nav button[data-view]')];
  const index=buttons.findIndex(b=>b.dataset.view===view);
  if(index<0)return;
  state.view=view;
  renderContext();
  buttons.forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false')});
  document.querySelectorAll('.workspace-view').forEach(p=>p.classList.toggle('active',p.dataset.viewPanel===view));
  $('stage-count').textContent=`${String(index+1).padStart(2,'0')} / ${String(buttons.length).padStart(2,'0')}`;
  $('stage-prev').disabled=index===0;$('stage-next').disabled=index===buttons.length-1;
  const nav=$('stage-nav'),active=buttons[index];
  nav.scrollTo({left:active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.offsetWidth)/2,behavior:'smooth'});
  document.body.classList.toggle('signal-focus-mode',index>=2&&index<=11);
  $('focus-stage').textContent=document.body.classList.contains('signal-focus-mode')?'◱ Show introduction':'⤢ Focus graphs';
  renderCurrent();
  requestAnimationFrame(()=>{
    if(index>=2&&index<=11)document.querySelector('.lab-sidebar').scrollIntoView({block:'start',behavior:'smooth'});
    window.dispatchEvent(new Event('resize'));
  });
}

async function galileoCode(prn,signalId,component){
  let file,length,channel;
  if(signalId==='E-1X'){if(component.includes('E1-C')){file='C8_E1C.txt';channel='E1-C pilot'}else{file='C7_E1B.txt';channel='E1-B data'}length=4092}
  else{if(component.includes('E5b-Q')){file='C6_E5bQ.txt';channel='E5b-Q pilot'}else{file='C5_E5bI.txt';channel='E5b-I data'}length=10230}
  if(!state.galileoCache.has(file))state.galileoCache.set(file,fetch('/reference/icd/galileo_codes/'+file).then(r=>{if(!r.ok)throw new Error(`Cannot load ${file}`);return r.text()}));
  const text=await state.galileoCache.get(file);const tag=String(prn).padStart(2,'0');const line=text.split(/\r?\n/).find(x=>x.includes(`Code_No_${tag};`));if(!line)throw new Error(`Galileo code ${tag} not found in ICD electronic code table ${file}`);const hex=line.split(';')[1].trim();
  return {bits:PRNLAB.hexToBits(hex,length),totalLength:length,method:`Galileo ${channel} official electronic primary code`,initial:'Published memory-code sequence',assignment:`Code No. ${tag} from ${file}`,feedback:'Not synthesized from a short LFSR in this dashboard; exact ICD electronic code table used.',source:`Galileo OS SIS ICD v2.2 · Annex C electronic file ${file}`,exact:true};
}
async function generatePRN(){
  const s=currentSignal(),prn=state.selection.prn_number,comp=state.component||'';let r;
  if(s.prn_mode==='gps-ca')r=PRNLAB.gpsCA(prn);
  else if(s.prn_mode==='gps-l2c'){
    if(comp.includes('TDM')){const cm=PRNLAB.gpsL2(prn,'CM'),cl=PRNLAB.gpsL2(prn,'CL'),out=new Uint8Array(cl.bits.length*2);for(let i=0;i<cl.bits.length;i++){out[2*i]=cm.bits[i%cm.bits.length];out[2*i+1]=cl.bits[i]}r={bits:out,totalLength:out.length,method:'GPS L2C exact CM/CL time-division composite',initial:`CM ${cm.initial} · CL ${cl.initial}`,assignment:'PRN-specific CM and CL initial states; alternating transmitted chips',feedback:cm.feedback,source:`${s.icd} · ${s.icd_section}`,exact:true,secondaryBits:cl.bits,secondaryLabel:'L2CL pilot'};}
    else r=PRNLAB.gpsL2(prn,comp.startsWith('CL')?'CL':'CM');
  }
  else if(s.prn_mode==='glo-ca')r=PRNLAB.glonass();
  else if(s.prn_mode==='qzss-ca')r=PRNLAB.qzssCA(prn);
  else if(s.prn_mode==='qzss-l2c'){
    if(comp.includes('TDM')){const cm=PRNLAB.qzssL2(prn,'CM'),cl=PRNLAB.qzssL2(prn,'CL'),out=new Uint8Array(cl.bits.length*2);for(let i=0;i<cl.bits.length;i++){out[2*i]=cm.bits[i%cm.bits.length];out[2*i+1]=cl.bits[i]}r={bits:out,totalLength:out.length,method:'QZSS L2C exact CM/CL time-division composite',initial:`CM ${cm.initial} · CL ${cl.initial}`,assignment:'QZSS PRN-specific CM and CL initial states; alternating transmitted chips',feedback:cm.feedback,source:`${s.icd} · ${s.icd_section}`,exact:true,secondaryBits:cl.bits,secondaryLabel:'L2CL pilot'};}
    else r=PRNLAB.qzssL2(prn,comp.startsWith('CL')?'CL':'CM');
  }
  else if(s.prn_mode==='sbas-ca')r=PRNLAB.sbasCA(prn);
  else if(s.prn_mode==='bds-b1i'||s.prn_mode==='bds-b2i')r=PRNLAB.beidou(prn);
  else if(s.prn_mode==='gal-e1'||s.prn_mode==='gal-e5b'){
    if(comp.includes('composite')){const data=await galileoCode(prn,state.signalId,state.signalId==='E-1X'?'E1-B data':'E5b-I data'),pilot=await galileoCode(prn,state.signalId,state.signalId==='E-1X'?'E1-C pilot':'E5b-Q pilot');r={...data,method:`Galileo ${state.signalId==='E-1X'?'E1-B/E1-C':'E5b-I/E5b-Q'} exact dual primary-code set`,secondaryBits:pilot.bits,secondaryLabel:state.signalId==='E-1X'?'E1-C pilot':'E5b-Q pilot',source:`${data.source} + ${pilot.source}`};}
    else r=await galileoCode(prn,state.signalId,comp);
  }
  else throw new Error(`No ICD-backed PRN generator is configured for ${state.signalId}.`);
  r.exact=true;r.source=r.source||`${s.icd} · ${s.icd_section}`;r.fingerprint=PRNLAB.fingerprint(r.bits)+(r.secondaryBits?`/${PRNLAB.fingerprint(r.secondaryBits)}`:'');r.first10Octal=r.bits.length>=10?PRNLAB.specialOctal10(r.bits):'—';return r;
}
async function regeneratePRN(reason,existingRev){
  const rev=existingRev??++state.revision;const generation=++state.generation;$('generation-counter').textContent='#'+generation;$('generation-reason').textContent=reason;
  try{const r=await generatePRN();if(rev!==state.revision)return;state.prn=r;$('side-mode').textContent='Exact ICD PRN active';$('side-source').textContent=`${state.sat} · ${state.signalId} · ${r.fingerprint}`;}
  catch(err){if(rev!==state.revision)return;state.prn={error:err.message,bits:new Uint8Array(0),exact:false};$('side-mode').textContent='PRN unavailable';$('side-source').textContent=err.message;}
}
function renderContext(){
  if(state.view==='scene'){
    $('context-title').textContent=`All ${state.epoch.satellite_count} satellites · complete receiver epoch`;
    $('context-subtitle').textContent=`RINEX epoch ${state.epoch.index} · ${state.epoch.epoch.replace('T',' ')} · switch RF groups below to view compatible satellite mixtures`;
    $('context-status').innerHTML=`<span class="good">Observed constellations: ${escapeHtml(Object.keys(state.epoch.systems).join(', '))}</span><span>Individual inspection: ${escapeHtml(state.sat||'—')} · ${escapeHtml(state.signalId||'—')}</span><span>All observed channels remain available in the inventory</span>`;
    return;
  }
  const s=currentSignal(),sel=state.selection,nav=sel.navigation;$('context-title').textContent=`${NAMES[state.system]} ${state.sat} · ${s.name}`;$('context-subtitle').textContent=`Epoch ${state.epoch.index} · ${new Date(state.epoch.epoch).toISOString().replace('T',' ').replace('.000Z','Z')} · RINEX ${s.observation_codes?.join(', ')||''}`;
  const prnGood=state.prn&&!state.prn.error;const pills=[`OBS: ${s.observation_codes?.join('/')||'—'}`,nav?`NAV record: ${nav.record_epoch.replace('T',' ')}`:'NAV record unavailable',prnGood?'PRN: exact ICD sequence':'PRN: unavailable',`PRN/SV: ${sel.prn_number}`,`Component: ${state.component}`];$('context-status').innerHTML=pills.map((x,i)=>`<span class="${i===1&&!nav||i===2&&!prnGood?'warn':'good'}">${escapeHtml(x)}</span>`).join('');
}
function renderStatic(){renderIcdLibrary();renderGlossary();$('obs-file-name').textContent=state.meta.dataset.observation_file;$('nav-file-name').textContent=state.meta.dataset.navigation_file;renderDatasetSummary()}
function renderCurrent(){renderOverview();const fn={rinex:renderRinex,carrier:renderCarrier,prn:renderPrn,nav:renderNav,mod:renderMod,composite:renderComposite,scene:renderScene,received:renderReceived,delay:renderDelay,navrx:renderNavReceiver,decode:renderDecode,icd:renderIcd}[state.view];if(fn)fn()}

function implementationLabel(){const s=currentSignal();if(state.prn?.exact)return ['Exact ICD implementation',''];return ['ICD-based simulation','sim']}
function renderOverview(){
  const s=currentSignal(),sel=state.selection;if(!sel)return;const [lab,cls]=implementationLabel();$('implementation-badge').textContent=lab;$('implementation-badge').className='verification-badge '+cls;$('overview-title').textContent=`${NAMES[state.system]} ${state.sat} · ${s.name}`;
  const items=[['Constellation',NAMES[state.system],state.sat],['RINEX signal',s.observation_codes?.join(' · '),`suffix ${s.rinex}`],['Band / carrier',s.band,`${fmt(s.carrier_mhz,6)} MHz`],['Wavelength',`${fmt(s.wavelength_m,4)} m`,'λ = c/fc'],['Access',s.access,'multiple access'],['Ranging code',s.code,`${fmt(s.code_rate/1e6,4)} Mcps`],['Primary length',fmt(s.code_length,0)+' chips',`${fmt(s.period_ms,3)} ms`],['Component',state.component,'data/pilot selection'],['Navigation',s.nav_family_selected||s.nav,s.nav_rate_selected||s.nav_rate],['Modulation',s.modulation,'signal-specific'],['ICD',s.icd,s.icd_section],['PRN fingerprint',state.prn?.fingerprint||'—','generated sequence identity']];
  $('passport').innerHTML=items.map(x=>`<div class="passport-item"><span>${escapeHtml(x[0])}</span><strong>${escapeHtml(x[1]??'—')}</strong><small>${escapeHtml(x[2]??'')}</small></div>`).join('');
  const chain=['RF carrier','PRN code','NAV parameters','Spreading','Modulation','Composite RF','Received I/Q','Doppler + delay','NAV at receiver','RINEX observables'];$('full-chain').innerHTML=chain.map((x,i)=>`<div class="chain-step"><b>${String(i+1).padStart(2,'0')} · ${x}</b><small>${['fc / λ','ICD chips','decoded NAV','data × code','signal architecture','ideal signal','epoch-anchored','C/D observations','symbol timeline','C / L / D / S'][i]}</small></div>`).join('');renderMeasurements('overview-measurements');
}
function renderMeasurements(id){const m=state.selection?.measurements||{};$(id).innerHTML=Object.values(m).map(x=>`<div class="metric"><span>${escapeHtml(x.code||'—')} · ${escapeHtml(Object.keys(m).find(k=>m[k]===x)||'')}</span><strong>${fmt(x.value,4)}</strong><small>${escapeHtml(x.unit||'')}</small></div>`).join('')}
function renderDatasetSummary(){
  const d=state.meta.dataset;$('rinex-header-summary').innerHTML=`<div class="metric-list"><div class="metric"><span>Epochs</span><strong>${d.epoch_count.toLocaleString()}</strong><small>${escapeHtml(d.time_system||'GNSS time')}</small></div><div class="metric"><span>Time span</span><strong>${escapeHtml(d.first_epoch.slice(11,19))} → ${escapeHtml(d.last_epoch.slice(11,19))}</strong><small>${escapeHtml(d.first_epoch.slice(0,10))}</small></div></div>`;
  $('nav-coverage').innerHTML=systemOrder(state.meta.systems).map(s=>`<div class="callout"><strong style="color:${s.color}">${escapeHtml(s.name)}</strong><p>${s.nav_satellites.length}/${s.satellites.length} observed satellites have broadcast NAV records in this file.</p></div>`).join('');
}
function renderRinex(){
  const rows=[];for(const sys of systemOrder(state.meta.systems)){for(const s of sys.signals)rows.push(`<tr><td><span style="color:${sys.color};font-weight:800">${sys.id}</span> ${escapeHtml(sys.name)}</td><td>${escapeHtml(s.observation_codes.join(', '))}</td><td>${escapeHtml(s.name)}</td><td>${fmt(s.fc_mhz,6)} MHz</td><td>${escapeHtml(s.code)}</td><td>${escapeHtml(s.nav)}</td><td>${escapeHtml(s.modulation)}</td></tr>`)}
  $('mapping-table').innerHTML=`<table><thead><tr><th>System</th><th>RINEX OBS</th><th>Physical signal</th><th>Carrier</th><th>Ranging code</th><th>NAV family</th><th>Modulation</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
function renderCarrier(){
  const s=currentSignal(),f=s.carrier_mhz*1e6;if(!f)return;const cycles=7,N=900,T=cycles/f,x=[],y=[];for(let i=0;i<N;i++){const t=i*T/(N-1);x.push(t*1e9);y.push(Math.cos(2*Math.PI*f*t))}plot('carrier-plot',[{x,y,mode:'lines',line:{color:color(),width:2.2},name:'carrier'}],{xaxis:{title:'Time [ns]'},yaxis:{title:'Normalized amplitude',range:[-1.2,1.2]},showlegend:false});
  $('carrier-math').innerHTML=[['Selected carrier',`${fmt(s.carrier_mhz,6)} MHz`],['Carrier wavelength',`${fmt(s.wavelength_m,5)} m`],['Period',`${fmt(1/f*1e9,5)} ns`],['Frequency source',state.system==='R'&&s.fdma_channel!==undefined?`GLONASS ${s.band} FDMA channel k = ${s.fdma_channel}`:`${s.band} nominal center frequency`]].map(x=>`<div class="math-line"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
}
function generatorBoxes(){const r=state.prn;if(!r||r.error)return `<div class="gen-box"><b>Unavailable</b><small>${escapeHtml(r?.error||'No generated code')}</small></div>`;const parts=[r.initial,r.feedback,r.assignment,`${r.totalLength.toLocaleString()} chips`];return parts.map((x,i)=>`${i?'<span class="gen-arrow">→</span>':''}<div class="gen-box"><b>${['Initial state / code table','Recurrence / memory code','Satellite assignment','Generated replica'][i]}</b><small>${escapeHtml(x)}</small></div>`).join('')}
function sampledAutocorr(bits,lags=80){const N=Math.min(bits.length,12000);if(!N)return {x:[],y:[]};const b=Array.from(bits.slice(0,N),x=>x?1:-1),xs=[],ys=[];for(let lag=-lags;lag<=lags;lag++){let sum=0;for(let i=0;i<N;i++)sum+=b[i]*b[(i+lag+N)%N];xs.push(lag);ys.push(sum/N)}return{x:xs,y:ys}}
function renderPrn(){
  const s=currentSignal(),r=state.prn;const exact=r&&!r.error;$('prn-verification').innerHTML=exact?`<span class="ok">✓ Exact sequence generated</span><span>${escapeHtml(r.source)}</span><span>Satellite ${escapeHtml(state.sat)} → PRN ${state.selection.prn_number}</span><span>Fingerprint ${r.fingerprint}</span>`:`<span class="warning">PRN unavailable</span><span>${escapeHtml(r?.error||'No generator')}</span>`;
  $('generator-name').textContent=exact?r.method:'Code-generation architecture';$('generator-diagram').innerHTML=generatorBoxes();$('generator-details').innerHTML=exact?[['Governing source',r.source],['Code family',s.code],['Chipping rate',`${fmt(s.code_rate/1e6,6)} Mcps`],['Code period',`${fmt(s.period_ms,4)} ms`]].map(x=>`<div class="parameter"><span>${x[0]}</span><strong>${escapeHtml(x[1])}</strong></div>`).join(''):'';
  if(!exact){$('prn-stats').innerHTML='';$('chip-readout').textContent=r?.error||'';$('prn-plot').innerHTML='';$('autocorr-plot').innerHTML='';return}
  const ones=Array.from(r.bits).reduce((a,b)=>a+b,0),zeros=r.bits.length-ones;const verified=r.expectedFirst10?PRNLAB.verifyFirst10(r):true;const statRows=[['Length',r.totalLength.toLocaleString()],['Generated chips',r.bits.length.toLocaleString()],['Ones / zeros',`${ones.toLocaleString()} / ${zeros.toLocaleString()}`],['ICD check',verified?'PASS':'CHECK'],['First-10 octal',r.first10Octal],['Fingerprint',r.fingerprint]];if(r.secondaryBits)statRows.splice(2,0,['Second code',`${r.secondaryBits.length.toLocaleString()} chips`]);$('prn-stats').innerHTML=statRows.map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');let readout=`Primary first 96: ${Array.from(r.bits.slice(0,96)).join('')}\n±1 first 48: ${Array.from(r.bits.slice(0,48),b=>b?'+1':'−1').join('  ')}`;if(r.secondaryBits)readout+=`\n${r.secondaryLabel||'Secondary'} first 96: ${Array.from(r.secondaryBits.slice(0,96)).join('')}`;$('chip-readout').textContent=readout;
  const show=Array.from(r.bits.slice(0,96),b=>b?1:-1),x=show.map((_,i)=>i),traces=[{x,y:show,mode:'lines',name:r.secondaryBits?'Primary':'PRN chips',line:{shape:'hv',color:color(),width:2.2}}];if(r.secondaryBits)traces.push({x,y:Array.from(r.secondaryBits.slice(0,96),b=>b?1:-1),mode:'lines',name:r.secondaryLabel||'Secondary',line:{shape:'hv',color:'#ffb84a',width:1.7,dash:'dot'}});plot('prn-plot',traces,{xaxis:{title:'Chip index'},yaxis:{title:'Chip value',tickvals:[-1,1],ticktext:['−1','+1'],range:[-1.35,1.35]},showlegend:!!r.secondaryBits,legend:{orientation:'h',y:1.12}});const ac=sampledAutocorr(r.bits,70);plot('autocorr-plot',[{x:ac.x,y:ac.y,mode:'lines',fill:'tozeroy',line:{color:color(),width:2}}],{xaxis:{title:'Code-phase offset [chips]'},yaxis:{title:'Normalized correlation',range:[Math.min(-.25,...ac.y),1.06]},showlegend:false});
}
function receiverModel(){return window.RECEIVER_MODEL?.prepare({selection:state.selection,epoch:state.epoch?.epoch||state.selection?.epoch,prn:state.prn,component:state.component})||null}
function navSeedBits(n=80){
  const model=receiverModel();
  if(model)return Array.from({length:n},(_,i)=>RECEIVER_MODEL.navBitAt(model,(model.symbolIndex+i)/model.symbolRate));
  return Array.from({length:n},(_,i)=>((i*31+i*i*17)>>>2)&1);
}
function renderNav(){
  const nav=state.selection.navigation,s=currentSignal(),m=receiverModel();$('nav-message-badge').textContent=m?.lnav?'GPS LNAV re-encoded · GNSS-SDR-SIM':nav?'RINEX NAV parameters; bits illustrative':'No NAV record for selected satellite';$('nav-message-badge').className='verification-badge '+(m?.lnav?'sim':'partial');$('nav-record-title').textContent=nav?`${state.sat} · record ${nav.record_epoch.replace('T',' ')}`:`${state.sat} · no record`;
  $('nav-fields').innerHTML=nav?nav.fields.map(f=>`<div class="nav-field"><span>${escapeHtml(f.name)}</span><strong>${fmt(f.value,8)}</strong><em>${escapeHtml(f.unit)}</em></div>`).join(''):`<div class="callout"><strong>RINEX NAV unavailable</strong><p>This satellite is observed in the selected epoch, but no decoded broadcast record is present in the supplied navigation file.</p></div>`;
  const fam=s.nav_family_selected||s.nav;$('nav-family-title').textContent=`${fam} · ${s.nav_rate_selected||s.nav_rate}`;const arr=NAV_STRUCTURES[fam]||[['Family',fam],['Rate',s.nav_rate_selected||s.nav_rate],['ICD',s.icd],['Note','Constellation-specific frame/page structure per governing interface specification']];$('nav-structure').innerHTML=arr.map(x=>`<div class="message-block"><b>${escapeHtml(x[0])}</b><span>${escapeHtml(x[1])}</span></div>`).join('');
  const bits=navSeedBits(80),y=bits.map(b=>b?1:-1),x=y.map((_,i)=>i);plot('nav-bits-plot',[{x,y,mode:'lines',line:{shape:'hv',color:color(),width:2}}],{xaxis:{title:m?.lnav?'GPS LNAV symbol index (re-encoded)':'Illustrative symbol index'},yaxis:{tickvals:[-1,1],ticktext:['0','1'],range:[-1.3,1.3]},showlegend:false});
}
function samplesFromPrn(n=512){const r=state.prn;if(!r||r.error||!r.bits.length)return Array(n).fill(1);const out=[];for(let i=0;i<n;i++)out.push(r.bits[Math.floor(i/4)%r.bits.length]?1:-1);return out}
function modulationKind(){const s=currentSignal(),m=s.modulation||'';if(/CBOC/i.test(m))return 'CBOC';if(/time division/i.test(m))return 'L2C TDM';if(/BPSK\(2\)/i.test(m))return 'BPSK(2)';return 'BPSK'}
function renderMod(){
  const s=currentSignal(),code=samplesFromPrn(512),bits=navSeedBits(32),data=code.map((_,i)=>bits[Math.floor(i/64)%bits.length]?1:-1),spread=code.map((c,i)=>c*data[i]);const kind=modulationKind();let sub=spread.map(()=>1);if(kind==='CBOC')sub=sub.map((_,i)=>{const t=i/16;return Math.sqrt(10/11)*(Math.sin(2*Math.PI*t)>=0?1:-1)+Math.sqrt(1/11)*(Math.sin(2*Math.PI*6*t)>=0?1:-1)});else if(kind==='BPSK(2)')sub=sub.map((_,i)=>Math.sin(2*Math.PI*(i/8))>=0?1:-1);const mod=spread.map((v,i)=>v*sub[i]);const x=spread.map((_,i)=>i/4);
  $('mod-formula').innerHTML=kind==='CBOC'?`s(t) ∝ D(t)·C(t)·[α·BOC(1,1) + β·BOC(6,1)]`:`s(t) ∝ D(t)·C(t)·m(t)`;$('mod-title').textContent=`${kind} representation · ${s.name}`;plot('spreading-plot',[{x,y:data,mode:'lines',name:'Data',line:{shape:'hv',color:'#ffb84a'}},{x,y:code,mode:'lines',name:'PRN',line:{shape:'hv',color:color()}},{x,y:spread,mode:'lines',name:'D × C',line:{shape:'hv',color:'#f4f8fb',width:2}}],{xaxis:{title:'Normalized chip time'},yaxis:{range:[-1.4,1.4]},legend:{orientation:'h',y:1.12}});plot('modulation-plot',[{x,y:mod,mode:'lines',line:{shape:'hv',color:color(),width:2}}],{xaxis:{title:'Normalized chip time'},yaxis:{title:'Normalized baseband',range:[-1.5,1.5]},showlegend:false});
  $('mod-theory').innerHTML=[['BPSK','Code/data signs reverse the carrier phase; no offset subcarrier is required.'],['BOC','A square-wave subcarrier multiplies the code, splitting spectral energy around band center.'],['CBOC','Galileo E1 combines BOC(1,1) and BOC(6,1) components with specified weighting.'],['L2C TDM','GPS/QZSS L2C time-multiplex CM data and CL pilot chips rather than transmitting them as a simple single code.'],['Data vs pilot','Data components carry navigation symbols; pilot components omit data to permit longer coherent integration.'],['I/Q components','Orthogonal components may carry different signal channels and are represented separately in complex baseband.']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
function dft(y){const N=Math.min(256,y.length),out=[];for(let k=0;k<N/2;k++){let re=0,im=0;for(let n=0;n<N;n++){const a=-2*Math.PI*k*n/N;re+=y[n]*Math.cos(a);im+=y[n]*Math.sin(a)}out.push(10*Math.log10(re*re+im*im+1e-9))}const max=Math.max(...out);return out.map(v=>v-max)}
function renderComposite(){
  const model=receiverModel();
  if(!model){$('composite-plot').textContent='Select a satellite with a valid ranging-code generator.';return}
  // Lesson 07 shows ideal satellite-side construction; the subsequent receiver
  // lessons apply the RINEX-measured delay, Doppler and C/N0 to this waveform.
  const transmitted={...model,receivePhase:0,delayChips:0,doppler:0,effectiveCodeRate:model.codeRate,initialCarrierPhase:0};
  const w=RECEIVER_MODEL.synthesize(transmitted,{samples:1024,includeNoise:false});
  const equivalentIF=200000;
  const rf=w.tUs.map((t,i)=>w.cleanI[i]*Math.cos(2*Math.PI*equivalentIF*t*1e-6)-w.cleanQ[i]*Math.sin(2*Math.PI*equivalentIF*t*1e-6));
  plot('composite-plot',[{x:w.tUs,y:rf,mode:'lines',line:{color:color(),width:1.6},name:'Equivalent IF'}],{xaxis:{title:'Time after selected epoch [µs]'},yaxis:{title:'Normalized equivalent IF amplitude'},showlegend:false});
  const psd=dft(w.cleanI),f=psd.map((_,i)=>i*model.sampleRate/256/1000);
  plot('spectrum-plot',[{x:f,y:psd,mode:'lines',fill:'tozeroy',line:{color:color(),width:2}}],{xaxis:{title:'Relative baseband frequency [kHz]'},yaxis:{title:'Relative power [dB]'},showlegend:false});
}
function renderCorrelation(){const r=state.prn;if(!r||r.error){$('correlation-plot').innerHTML='';return}const ac=sampledAutocorr(r.bits,100);plot('correlation-plot',[{x:ac.x,y:ac.y,mode:'lines',fill:'tozeroy',line:{color:color(),width:2.4}}],{xaxis:{title:'Replica code offset [chips]'},yaxis:{title:'Normalized matched correlation'},showlegend:false})}
function acquisitionCenters(){const s=currentSignal(),p=selectedMeasurement('Pseudorange').value,d=selectedMeasurement('Doppler').value;const codeRate=s.code_rate||1.023e6,codeLen=s.code_length||1023;const codePhase=Number.isFinite(Number(p))?((Number(p)/C*codeRate)%codeLen):0;const dop=Number.isFinite(Number(d))?Number(d):0;return{codePhase,doppler:dop}}
function renderAcquisition(){const {codePhase,doppler}=acquisitionCenters(),x=Array.from({length:61},(_,i)=>-3+i*.1),y=Array.from({length:51},(_,i)=>doppler-2500+i*100),z=y.map(yy=>x.map(xx=>Math.exp(-.5*(xx/.45)**2)*Math.exp(-.5*((yy-doppler)/420)**2)+.035*Math.cos(xx*3+yy/900)));plot('acquisition-plot',[{x,y,z,type:'heatmap',colorscale:[[0,'#0a131b'],[.35,'#123b52'],[.7,color()],[1,'#fff3b0']],colorbar:{title:'Corr.'}}],{xaxis:{title:'Relative code offset [chips]'},yaxis:{title:'Doppler [Hz]'},annotations:[{x:0,y:doppler,text:`Peak near observed Doppler ${fmt(doppler,1)} Hz`,showarrow:true,arrowcolor:'#fff',font:{color:'#fff'}}]});$('acq-live').innerHTML=`<span>RINEX Doppler ${fmt(doppler,2)} Hz</span><span>Code phase mod period ${fmt(codePhase,3)} chips</span>`}
function renderTracking(){const x=Array.from({length:121},(_,i)=>-1.5+i*.025),tri=x.map(v=>Math.max(0,1-Math.abs(v))),early=x.map(v=>Math.max(0,1-Math.abs(v+.5))),late=x.map(v=>Math.max(0,1-Math.abs(v-.5)));plot('tracking-plot',[{x,y:early,mode:'lines',name:'Early',line:{color:'#ffb84a'}},{x,y:tri,mode:'lines',name:'Prompt',line:{color:color(),width:3}},{x,y:late,mode:'lines',name:'Late',line:{color:'#f74e8e'}}],{xaxis:{title:'Code-phase error [chips]'},yaxis:{title:'Normalized correlation',range:[0,1.08]},legend:{orientation:'h',y:1.12}})}
function showReceiverMetrics(id,items){
  $(id).innerHTML=items.map(([label,value,source])=>`<div class="receiver-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(source)}</small></div>`).join('');
}
function receiverUnavailable(ids){
  for(const id of ids){const el=$(id);if(el)el.innerHTML='<div class="receiver-empty">Exact PRN replica unavailable for the current selection. Choose a supported satellite/signal.</div>'}
}
function renderReceived(){
  const m=receiverModel();if(!m){receiverUnavailable(['receiver-metrics','receiver-iq-plot','receiver-cloud-plot']);return}
  showReceiverMetrics('receiver-metrics',[
    ['RINEX Doppler',m.doppler===null?'Unavailable':`${fmt(m.doppler,2)} Hz`,state.selection.measurements.Doppler?.code||'D observable'],
    ['Apparent code delay',m.apparentDelaySec===null?'Unavailable':`${fmt(m.apparentDelaySec*1000,5)} ms`,'C pseudorange / c'],
    ['Code offset',m.delayChips===null?'Unavailable':`${fmt(m.delayChips,3)} chips`,'Modulo primary-code length'],
    ['RINEX C/N₀',m.cn0===null?'Unavailable':`${fmt(m.cn0,1)} dB-Hz`,'Receiver S observable'],
  ]);
  const noise=$('receiver-noise').checked,w=RECEIVER_MODEL.synthesize(m,{samples:2048,includeNoise:noise});
  plot('receiver-iq-plot',[
    {x:w.tUs,y:w.I,name:'In-phase (I)',mode:'lines',line:{color:'#62d7ec',width:1.3}},
    {x:w.tUs,y:w.Q,name:'Quadrature (Q)',mode:'lines',line:{color:'#f2bd70',width:1.3}},
  ],{xaxis:{title:'Time from selected RINEX epoch [µs]'},yaxis:{title:'Normalized amplitude'},legend:{orientation:'h',y:1.17},margin:{l:65,r:17,t:37,b:60}});
  const step=3,scatterI=[],scatterQ=[];for(let i=0;i<w.I.length;i+=step){scatterI.push(w.I[i]);scatterQ.push(w.Q[i])}
  plot('receiver-cloud-plot',[
    {x:scatterI,y:scatterQ,name:noise?'With modeled noise':'Idealized/noiseless',mode:'markers',type:'scattergl',marker:{color:'#55c7ff',opacity:noise?.45:.8,size:4}},
  ],{xaxis:{title:'In-phase (I)',zeroline:true},yaxis:{title:'Quadrature (Q)',zeroline:true,scaleanchor:'x',scaleratio:1},showlegend:false,margin:{l:60,r:18,t:21,b:57}});
}
function renderDelay(){
  const m=receiverModel();if(!m){receiverUnavailable(['delay-metrics','received-code-plot','received-doppler-plot']);return}
  const phase=m.carrierCycles===null?null:((m.carrierCycles%1)+1)%1;
  showReceiverMetrics('delay-metrics',[
    ['Observed Doppler',m.doppler===null?'Unavailable':`${fmt(m.doppler,2)} Hz`,'RINEX D field'],
    ['Measured pseudorange',m.pseudorange===null?'Unavailable':`${fmt(m.pseudorange/1000,3)} km`,'RINEX C field; apparent range'],
    ['Code delay modulo period',m.delayChips===null?'Unavailable':`${fmt(m.delayChips,3)} chips`,'C/c × chip rate mod N'],
    ['Fractional carrier phase',phase===null?'Unavailable':`${fmt(phase,4)} cycles`,'RINEX L field; integer ambiguity'],
  ]);
  const code=RECEIVER_MODEL.codeComparison(m,96);
  plot('received-code-plot',[
    {x:code.x,y:code.local,mode:'lines',name:'Local PRN',line:{shape:'hv',color:'#f3bb78',width:2}},
    {x:code.x,y:code.received,mode:'lines',name:'Delayed received PRN',line:{shape:'hv',color:'#60d7ed',width:2}},
  ],{xaxis:{title:'Chip intervals after receive epoch'},yaxis:{title:'Bipolar code sign',tickvals:[-1,1],range:[-1.35,1.35]},legend:{orientation:'h',y:1.17},margin:{l:65,r:17,t:37,b:60}});
  const w=RECEIVER_MODEL.dopplerWave(m,4,700);
  plot('received-doppler-plot',[
    {x:w.ms,y:w.I,mode:'lines',name:'I',line:{color:'#65d8e9',width:2}},
    {x:w.ms,y:w.Q,mode:'lines',name:'Q',line:{color:'#f5bc79',width:2}},
  ],{xaxis:{title:'Time from selected epoch [ms]'},yaxis:{title:'Despread carrier amplitude',range:[-1.16,1.16]},legend:{orientation:'h',y:1.17},margin:{l:65,r:17,t:37,b:60}});
}
function renderNavReceiver(){
  const m=receiverModel();if(!m){receiverUnavailable(['nav-receiver-metrics','received-nav-plot','received-nav-details']);return}
  const nav=state.selection.navigation;
  const txLabel=Number.isFinite(m.transmitSeconds)?new Date(m.transmitSeconds*1000).toISOString().replace('T',' ').slice(0,23):'Unavailable';
  showReceiverMetrics('nav-receiver-metrics',[
    ['Navigation symbol rate',`${fmt(m.symbolRate,1)} sym/s`,'ICD family teaching rate'],
    ['Apparent TX time',txLabel,'GNSS time scale; receive epoch − C/c'],
    ['Selected navigation symbol',m.pilot?'Pilot: no NAV data':(RECEIVER_MODEL.navSign(m,0)>0?'+1':'−1'),m.lnav?'GPS LNAV parity-encoded replay':'Illustrative model; not received bits'],
    ['NAV record offset',Number.isFinite(m.navAgeSeconds)?`${fmt(m.navAgeSeconds/60,1)} min`:'Unavailable',m.navAgeSeconds>7200?'Historical ephemeris gap >2 h':m.navAgeSeconds>300?'NAV time differs from observation':'Nearest decoded RINEX NAV record'],
  ]);
  const series=RECEIVER_MODEL.navigationTimeline(m,9);
  const symbolDuration=1000/m.symbolRate;
  plot('received-nav-plot',[
    {x:series.relativeMs,y:series.bits,mode:'lines+markers',name:m.pilot?'Pilot sign':m.lnav?'LNAV re-encoded bits':'Illustrative symbols',line:{shape:'hv',color:color(),width:3},marker:{size:4,color:'#7ce8cd'}},
    {x:[0,0],y:[-1.38,1.38],mode:'lines',name:'Selected receive epoch',line:{color:'#ffd17f',dash:'dash',width:2}},
  ],{xaxis:{title:'Symbol time relative to selected epoch [ms]',range:[series.relativeMs[0]-symbolDuration/2,series.relativeMs.at(-1)+symbolDuration/2]},yaxis:{title:'Data sign',tickvals:[-1,1],ticktext:['−1','+1'],range:[-1.38,1.38]},legend:{orientation:'h',y:1.18},margin:{l:65,r:18,t:39,b:60}});
  $('received-nav-details').innerHTML=nav?[
    ['Selected satellite',m.satellite+' · '+m.signalName],
    ['Broadcast NAV record',nav.record_epoch.replace('T',' ')],
    ['Decoded RINEX NAV parameters',String(nav.fields.length)+' parameter fields'],
    ...nav.fields.slice(0,3).map(f=>[f.name,`${fmt(f.value,7)} ${f.unit||''}`]),
    ['Reconstruction method',m.mode],
    ['Ephemeris / OBS time difference',Number.isFinite(m.navAgeSeconds)?`${fmt(m.navAgeSeconds,0)} seconds`:'Not available'],
    ['Navigation-bit evidence',m.lnav?'GPS LNAV encoded from decoded ephemeris; not over-the-air verification':'Original NAV bits unavailable; symbols illustrative'],
  ].map(([k,v])=>`<div class="nav-detail"><b>${escapeHtml(k)}</b><span>${escapeHtml(v)}</span></div>`).join(''):
  '<div class="nav-detail"><b>Missing NAV record</b><span>The selected satellite has OBS measurements, but no matched decoded NAV record. Displayed navigation signs are illustrative only.</span></div>';
}
function renderDecode(){const nodes=['Incoming RF / IF','PRN code timing','Doppler estimation','Carrier phase','Navigation demodulation','Pseudorange / C/N₀','RINEX OBS & NAV'];$('receiver-chain').innerHTML=nodes.map(x=>`<div class="receiver-node"><b>${x}</b><small>${x==='RINEX OBS & NAV'?'measured output':'receiver processing'}</small></div>`).join('');renderMeasurements('decode-obs');const nav=state.selection.navigation;$('decode-nav').innerHTML=nav?`<div class="callout accent"><strong>${escapeHtml(state.sat)} navigation record</strong><p>${nav.fields.length} decoded fields available from ${escapeHtml(nav.record_epoch)}. RINEX NAV is decoded broadcast data, not the original bitstream.</p></div><div class="source-actions"><button class="button-link" onclick="document.querySelector('[data-view=nav]').click()">Open Navigation Message Laboratory</button></div>`:`<div class="callout"><strong>No matching navigation record</strong><p>The observation can still be tracked, but this supplied NAV file does not include a record for the selected satellite.</p></div>`}
function renderIcd(){const s=currentSignal();$('selected-source').innerHTML=`<span class="eyebrow">SELECTED SIGNAL SOURCE</span><h3>${escapeHtml(s.icd||'Interface specification')}</h3><p>${escapeHtml(s.icd_section||'')} · ${escapeHtml(NAMES[state.system])} ${escapeHtml(s.name||'')}</p><div class="source-actions">${ICD_LIBRARY.filter(x=>x.sys===state.system).map(x=>`<a class="button-link ${x.title===s.icd?'':'secondary'}" href="${x.url}" target="_blank">Open ${escapeHtml(x.title)}</a>`).join('')}</div>`;renderGlossary()}
function renderIcdLibrary(){$('icd-library').innerHTML=ICD_LIBRARY.map(x=>`<article class="icd-card"><span class="eyebrow" style="color:${COLORS[x.sys]||'#35cdef'}">${escapeHtml(NAMES[x.sys]||x.sys)}</span><h3>${escapeHtml(x.title)}</h3><div class="mini">${escapeHtml(x.version)}</div><p>${escapeHtml(x.coverage)}</p><a class="button-link secondary" href="${x.url}" target="_blank">Open local PDF</a></article>`).join('')}
function renderGlossary(){const q=($('glossary-search')?.value||'').toLowerCase().trim(),items=GLOSSARY.filter(x=>!q||x[0].toLowerCase().includes(q)||x[1].toLowerCase().includes(q));$('glossary-grid').innerHTML=items.map(x=>`<div class="glossary-item"><b>${escapeHtml(x[0])}</b><p>${escapeHtml(x[1])}</p></div>`).join('')}

document.addEventListener('DOMContentLoaded',()=>init().catch(err=>{console.error(err);document.body.insertAdjacentHTML('afterbegin',`<div style="padding:15px;background:#5a231e;color:white">GNSS Signal Simulation failed to initialize: ${escapeHtml(err.message)}</div>`)}));
