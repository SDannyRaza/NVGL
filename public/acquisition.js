'use strict';

const $ = id => document.getElementById(id);
const COLORS = {cyan:'#35cdef',green:'#48dca5',amber:'#ffb84a',pink:'#f74e8e',violet:'#a58cff',blue:'#6aa9ff',grid:'#2a4555',text:'#dceaf1',muted:'#7f9aa8',bg:'#0f1a24'};
const plotConfig = {displaylogo:false,responsive:true,scrollZoom:false,modeBarButtonsToRemove:['select2d','lasso2d','autoScale2d']};
const baseLayout = (extra={}) => ({paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Segoe UI,Arial',color:COLORS.text,size:13},margin:{l:60,r:25,t:20,b:52},xaxis:{gridcolor:COLORS.grid,zerolinecolor:COLORS.grid,titlefont:{size:14},tickfont:{color:COLORS.muted}},yaxis:{gridcolor:COLORS.grid,zerolinecolor:COLORS.grid,titlefont:{size:14},tickfont:{color:COLORS.muted}},hoverlabel:{bgcolor:'#122735',bordercolor:'#35566a',font:{color:'#f3fbff'}},...extra});

const PROFILES = {
  gps:{system:'G',label:'GPS L1 C/A',carrierMHz:1575.42,ifMHz:9.55,fsMHz:38.196,codeRate:1.023e6,codeLength:1023,prns:Array.from({length:32},(_,i)=>i+1),generator:p=>PRNLAB.gpsCA(Number(p)),source:'IS-GPS-200 family / uploaded SoftGNSS source profile'},
  bds:{system:'C',label:'BeiDou B1I',carrierMHz:1561.098,ifMHz:9.55,fsMHz:38.196,codeRate:2.046e6,codeLength:2046,prns:Array.from({length:37},(_,i)=>i+1),generator:p=>PRNLAB.beidou(Number(p)),source:'BeiDou B1I/B2I ICD generator implemented in the Signal Simulation chapter'},
  glo:{system:'R',label:'GLONASS L1OF · standard code',carrierMHz:1602.0,ifMHz:9.55,fsMHz:38.196,codeRate:0.511e6,codeLength:511,prns:['Common'],generator:()=>PRNLAB.glonass(),source:'Legacy GLONASS standard ranging code · satellite separation by FDMA'},
  qzss:{system:'J',label:'QZSS L1 C/A',carrierMHz:1575.42,ifMHz:9.55,fsMHz:38.196,codeRate:1.023e6,codeLength:1023,prns:Array.from({length:10},(_,i)=>193+i),generator:p=>PRNLAB.qzssCA(Number(p)),source:'IS-QZSS-PNT C/A assignment'},
  sbas:{system:'S',label:'SBAS L1 C/A',carrierMHz:1575.42,ifMHz:9.55,fsMHz:38.196,codeRate:1.023e6,codeLength:1023,prns:Array.from({length:39},(_,i)=>120+i),generator:p=>PRNLAB.sbasCA(Number(p)),source:'IS-GPS-200 additional C/A assignments'}
};

const cache = new Map();
let current = null;

function systemColor(profile){return (window.GNSS_COLORS && GNSS_COLORS[profile.system]) || COLORS.cyan;}
function fmt(v,d=2){return Number(v).toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});}
function signed(v,d=0){return `${v>=0?'+':''}${Number(v).toFixed(d)}`;}
function sinc(x){return Math.abs(x)<1e-12?1:Math.sin(x)/x;}
function hashNoise(a,b,seed=13){let x=(Math.imul((a+17),73856093)^Math.imul((b+31),19349663)^Math.imul(seed,83492791))>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%10000)/10000;}

function populateProfiles(){
  $('profile-select').innerHTML=Object.entries(PROFILES).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('');
  $('profile-select').value='gps';
  populatePrns();
}
function populatePrns(){
  const p=PROFILES[$('profile-select').value];
  $('prn-select').innerHTML=p.prns.map(v=>`<option value="${v}">${p.system}${v}</option>`).join('');
  if(p===PROFILES.gps)$('prn-select').value='21';
  const phase=$('phase-slider');phase.max=p.codeLength-1;phase.value=Math.min(359,p.codeLength-1);updateReadouts();
}
function updateReadouts(){
  $('doppler-readout').textContent=`${signed(Number($('doppler-slider').value)/1000,2)} kHz`;
  $('phase-readout').textContent=`${$('phase-slider').value} chips`;
  $('cn0-readout').textContent=`${$('cn0-slider').value} dB-Hz`;
}
function codeKey(profileKey,prn){return `${profileKey}:${prn}`;}
function getCode(profileKey,prn){
  const key=codeKey(profileKey,prn);if(cache.has(key))return cache.get(key);
  const p=PROFILES[profileKey],res=p.generator(prn);const bits=Array.from(res.bits),bipolar=bits.map(b=>b?1:-1),N=bipolar.length;
  const corr=new Float64Array(N);
  for(let lag=0;lag<N;lag++){let s=0;for(let i=0;i<N;i++)s+=bipolar[i]*bipolar[(i+lag)%N];corr[lag]=s/N;}
  const out={...res,bits,bipolar,corr};cache.set(key,out);return out;
}
function state(){
  const profileKey=$('profile-select').value,p=PROFILES[profileKey],prn=$('prn-select').value,span=Number($('span-select').value),step=Number($('step-select').value),coh=Number($('coh-select').value),dwells=1,cn0=Number($('cn0-slider').value),trueD=Number($('doppler-slider').value),truePhase=Number($('phase-slider').value),method=$('method-select').value;
  return {profileKey,p,prn,span,step,coh,dwells,cn0,trueD,truePhase,method,code:getCode(profileKey,prn)};
}
function calc(s){
  const bins=Math.floor((2*s.span)/s.step)+1;
  const estD=Math.max(-s.span,Math.min(s.span,Math.round(s.trueD/s.step)*s.step));
  const estPhase=Math.round(s.truePhase);
  const inside=Math.abs(s.trueD)<=s.span;
  const metric=inside?Math.max(1.05,1+(s.cn0-22)/8*Math.sqrt(s.coh*Math.sqrt(s.dwells))):1.08;
  const detected=inside&&metric>=2;
  const samples1ms=Math.round(s.p.fsMHz*1e6*0.001);
  const dataMs=s.coh*s.dwells;
  const samples=Math.round(s.p.fsMHz*1e6*dataMs/1000);
  return {...s,bins,estD,estPhase,metric,detected,samples1ms,dataMs,samples,serialTests:s.p.codeLength*bins,pfssaReps:s.p.codeLength,pcpsReps:bins};
}
function phaseGrid(s,maxPoints=520){
  const N=s.p.codeLength,step=Math.max(1,Math.ceil(N/maxPoints));const xs=[];for(let i=0;i<N;i+=step)xs.push(i);if(!xs.includes(s.truePhase))xs.push(s.truePhase);xs.sort((a,b)=>a-b);return xs;
}
function surface(s){
  const xs=phaseGrid(s),ys=[];for(let f=-s.span;f<=s.span+0.1;f+=s.step)ys.push(f);
  const z=ys.map((f,fi)=>xs.map((phase,pi)=>{
    const lag=((phase-s.truePhase)%s.p.codeLength+s.p.codeLength)%s.p.codeLength;
    const c=s.code.corr[lag];const fr=sinc(Math.PI*(f-s.trueD)*(s.coh/1000));
    const snr=Math.max(.35,Math.pow(10,(s.cn0-38)/12));const signal=snr*(c*c)*(fr*fr)*s.dwells;
    const noise=.018+.055*hashNoise(pi,fi,Number(String(s.prn).replace(/\D/g,''))||7);
    return noise+signal;
  }));
  return {xs,ys,z};
}
function nearestRow(surf,f){let k=0,b=Infinity;surf.ys.forEach((v,i)=>{const d=Math.abs(v-f);if(d<b){b=d;k=i;}});return {x:surf.xs,y:surf.z[k],f:surf.ys[k]};}
function run(){
  current=calc(state());current.surface=surface(current);renderAll(current);
}
function resultStrip(s){
  const methodNames={serial:'Serial Search Acquisition',pfssa:'Parallel Frequency Space Search',pcps:'Parallel Code Phase Search'};
  $('result-strip').innerHTML=[
    ['Detection',s.detected?'ACQUIRED':'NOT ACQUIRED',s.detected?'good':'warn'],
    ['Method',methodNames[s.method],''],
    ['Estimated Doppler',`${signed(s.estD/1000,2)} kHz`,''],
    ['Estimated code phase',`${s.estPhase} chips`,''],
    ['Illustrative metric',s.metric.toFixed(2),s.metric>=2?'good':'warn'],
    ['Search bins',`${s.bins} × ${s.p.codeLength}`,'']
  ].map(([a,b,c])=>`<div class="result-chip ${c}"><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function heatmap(id,s,title='Teaching correlation power'){
  const sf=s.surface,color=systemColor(s.p);
  Plotly.react(id,[{x:sf.xs,y:sf.ys.map(v=>v/1000),z:sf.z,type:'heatmap',colorscale:[[0,'#08141d'],[.25,'#123143'],[.55,color],[.8,COLORS.amber],[1,'#fff1a6']],colorbar:{title:'Power',thickness:12},hovertemplate:'Code phase %{x} chips<br>Doppler %{y:.2f} kHz<br>Power %{z:.3f}<extra></extra>'},{x:[s.estPhase],y:[s.estD/1000],mode:'markers',type:'scatter',marker:{size:13,symbol:'x',color:'#ffffff',line:{width:2,color:'#071117'}},name:'Estimate',hovertemplate:'Estimated peak<br>τ̂=%{x} chips<br>f̂D=%{y:.2f} kHz<extra></extra>'}],baseLayout({margin:{l:70,r:70,t:12,b:58},xaxis:{title:'Code phase [chips]',gridcolor:COLORS.grid,tickfont:{color:COLORS.muted}},yaxis:{title:'Doppler frequency [kHz]',gridcolor:COLORS.grid,tickfont:{color:COLORS.muted}},showlegend:false}),plotConfig);
}
function cutPlot(id,s){
  const row=nearestRow(s.surface,s.estD),color=systemColor(s.p);
  Plotly.react(id,[{x:row.x,y:row.y,type:'scatter',mode:'lines',line:{color,width:2.5},fill:'tozeroy',fillcolor:'rgba(53,205,239,.05)',hovertemplate:'τ=%{x} chips<br>Power=%{y:.3f}<extra></extra>'}],baseLayout({margin:{l:58,r:22,t:10,b:52},xaxis:{title:'Code phase [chips]',gridcolor:COLORS.grid},yaxis:{title:'Correlation power',gridcolor:COLORS.grid}}),plotConfig);
}
function renderOverview(s){
  heatmap('overview-heatmap',s);
  const map=$('overview-heatmap');
  if(!map.lessonClickBound){
    map.on('plotly_click',event=>{
      const p=event.points[0];
      $('cell-readout').textContent=`Hypothesis: code delay ${p.x} chips; Doppler ${Number(p.y).toFixed(2)} kHz${p.z!==undefined?`; teaching correlation power ${Number(p.z).toFixed(3)}`:''}. One cell tests both unknowns together.`;
    });map.lessonClickBound=true;
  }
}
function renderSerial(s){
  $('serial-metrics').innerHTML=metricCards([
    ['Code-phase hypotheses',s.p.codeLength,'One chip per hypothesis'],['Doppler hypotheses',s.bins,`${signed(-s.span/1000,0)} to ${signed(s.span/1000,0)} kHz in ${s.step} Hz bins`],['Serial combinations',s.serialTests.toLocaleString(),'Every τ × fD pair'],['Decision metric',s.metric.toFixed(2),'Heuristic teaching indicator']
  ]);
  cutPlot('serial-cut',s);
}
function metricCards(rows){const accents=[COLORS.cyan,COLORS.green,COLORS.amber,COLORS.violet];return rows.map((r,i)=>`<div class="metric-card" style="--card-accent:${accents[i%accents.length]}"><span>${r[0]}</span><strong>${r[1]}</strong><small>${r[2]||''}</small></div>`).join('');}
function renderPrn(s){
  const cr=s.p.codeRate/1e6;$('prn-title').textContent=`${s.p.label} · ${s.p.system}${s.prn}`;
  $('prn-meta').innerHTML=[['Code family',s.code.method],['Code length',`${s.code.totalLength.toLocaleString()} chips`],['Chipping rate',`${cr.toFixed(3)} Mcps`],['Code period',`${(s.code.totalLength/s.p.codeRate*1000).toFixed(3)} ms`],['Assignment',s.code.assignment||'System-defined'],['Source',s.p.source]].map(([a,b])=>`<div class="parameter"><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('chip-readout').textContent=s.code.bits.slice(0,96).join(' ')+' …';
  const n=Math.min(80,s.code.bits.length),x=Array.from({length:n},(_,i)=>i),y=s.code.bits.slice(0,n).map(b=>b?1:-1),color=systemColor(s.p);
  Plotly.react('prn-plot',[{x,y,type:'scatter',mode:'lines',line:{shape:'hv',width:2.4,color}}],baseLayout({margin:{l:55,r:20,t:10,b:52},xaxis:{title:'Chip index',gridcolor:COLORS.grid},yaxis:{title:'Bipolar chip',range:[-1.35,1.35],tickvals:[-1,1],gridcolor:COLORS.grid}}),plotConfig);
  const corrX=phaseGrid(s,620),corrY=corrX.map(l=>s.code.corr[l]);
  Plotly.react('prn-corr',[{x:corrX,y:corrY,type:'scatter',mode:'lines',line:{width:2,color:COLORS.green}}],baseLayout({margin:{l:58,r:20,t:8,b:52},xaxis:{title:'Circular code shift [chips]',gridcolor:COLORS.grid},yaxis:{title:'Normalized correlation',gridcolor:COLORS.grid}}),plotConfig);
}
function renderCarrier(s){
  const color=systemColor(s.p),N=220,x=Array.from({length:N},(_,i)=>i/(N-1)*6),fDisp=1.15+s.estD/20000,yc=x.map(t=>Math.cos(2*Math.PI*fDisp*t)),ys=x.map(t=>Math.sin(2*Math.PI*fDisp*t));
  Plotly.react('carrier-plot',[{x,y:yc,name:'I · cosine',mode:'lines',line:{color,width:2.3}},{x,y:ys,name:'Q · sine',mode:'lines',line:{color:COLORS.violet,width:2.1,dash:'dot'}}],baseLayout({margin:{l:58,r:20,t:10,b:54},legend:{orientation:'h',x:0,y:1.1},xaxis:{title:'Normalized time',gridcolor:COLORS.grid},yaxis:{title:'Amplitude',range:[-1.2,1.2],gridcolor:COLORS.grid}}),plotConfig);
  $('carrier-meta').innerHTML=[['RF carrier',`${s.p.carrierMHz.toFixed(3)} MHz`],['Receiver IF',`${s.p.ifMHz.toFixed(3)} MHz`],['Doppler hypothesis',`${signed(s.estD/1000,3)} kHz`],['Local oscillator',`${(s.p.ifMHz+s.estD/1e6).toFixed(6)} MHz`],['Quadrature separation','90°'],['Complex wipe-off','I + jQ → baseband candidate']].map(([a,b])=>`<div class="parameter"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function renderPfssa(s){
  const f=[];const p=[];for(let hz=-s.span;hz<=s.span;hz+=Math.max(50,s.step/2)){f.push(hz/1000);const r=sinc(Math.PI*(hz-s.trueD)*(s.coh/1000));p.push(.05+Math.pow(r,2)*Math.max(1,Math.pow(10,(s.cn0-38)/10)));}
  Plotly.react('pfssa-plot',[{x:f,y:p,type:'scatter',mode:'lines',line:{color:COLORS.amber,width:2.5},fill:'tozeroy',fillcolor:'rgba(255,184,74,.06)'}],baseLayout({margin:{l:60,r:22,t:10,b:54},xaxis:{title:'Residual carrier frequency [kHz]',gridcolor:COLORS.grid},yaxis:{title:'FFT magnitude-squared',gridcolor:COLORS.grid}}),plotConfig);
}
function renderPcps(s){heatmap('pcps-heatmap',s);}

function humanBytes(n){if(n<1024)return `${n} B`;if(n<1024**2)return `${(n/1024).toFixed(1)} KiB`;return `${(n/1024**2).toFixed(2)} MiB`;}

function renderEstimate(s){
  $('estimate-cards').innerHTML=metricCards([
    ['Acquisition decision',s.detected?'Detected':'Not detected',s.detected?'Peak metric exceeds threshold':'Adjust span / integration / C/N₀'],
    ['τ̂acq',`${s.estPhase} chips`,`Coarse code-delay estimate`],
    ['f̂D,acq',`${signed(s.estD/1000,3)} kHz`,`Nearest configured Doppler bin`],
    ['Illustrative metric',s.metric.toFixed(2),'Heuristic teaching indicator; not a calibrated detector']
  ]);
  const row=nearestRow(s.surface,s.estD),idx=row.x.reduce((best,v,i)=>Math.abs(v-s.estPhase)<Math.abs(row.x[best]-s.estPhase)?i:best,0),lo=Math.max(0,idx-20),hi=Math.min(row.x.length,idx+21);
  Plotly.react('estimate-plot',[{x:row.x.slice(lo,hi),y:row.y.slice(lo,hi),type:'scatter',mode:'lines+markers',line:{color:COLORS.green,width:2.5},marker:{size:5}},{x:[s.estPhase],y:[Math.max(...row.y)],type:'scatter',mode:'markers',marker:{size:13,color:COLORS.amber,symbol:'diamond'},name:'Estimate'}],baseLayout({margin:{l:58,r:22,t:15,b:55},showlegend:false,xaxis:{title:'Code phase near detected peak [chips]',gridcolor:COLORS.grid},yaxis:{title:'Correlation power',gridcolor:COLORS.grid}}),plotConfig);
}
function renderAll(s){resultStrip(s);renderOverview(s);renderSerial(s);renderPrn(s);renderCarrier(s);renderPfssa(s);renderPcps(s);renderTeaching(s);renderEstimate(s);resizeVisible();}
function resizeVisible(){setTimeout(()=>document.querySelectorAll('.workspace-view.active .plot').forEach(el=>{if(el.data)Plotly.Plots.resize(el)}),60);}
function switchView(view){
  if(view!=='execution')pauseSweep();
  document.querySelectorAll('.stage-nav button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  document.querySelectorAll('.workspace-view').forEach(p=>p.classList.toggle('active',p.dataset.viewPanel===view));
  resizeVisible();
  document.querySelector('.workspace-view.active').scrollIntoView({block:'start',behavior:'instant'});
}

function bind(){
  document.querySelectorAll('#pillar-nav button').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  ['doppler-slider','phase-slider','cn0-slider'].forEach(id=>$(id).addEventListener('input',updateReadouts));
  $('profile-select').addEventListener('change',()=>{populatePrns();run();});
  $('prn-select').addEventListener('change',run);
  ['method-select','span-select','step-select','coh-select'].forEach(id=>$(id).addEventListener('change',run));
  $('run-acq').addEventListener('click',run);
  ['doppler-slider','phase-slider','cn0-slider'].forEach(id=>$(id).addEventListener('change',run));
  window.addEventListener('resize',resizeVisible);
}

let sweepTimer = null;
const SEARCH_METHODS = [
  {key:'serial',name:'Serial Search Acquisition',color:'#f98aaf',unit:'One cell',total:84},
  {key:'pfssa',name:'Parallel Frequency Space Search',color:'#ffd17a',unit:'One column',total:12},
  {key:'pcps',name:'Parallel Code Phase Search',color:'#6ce0bc',unit:'One row',total:7}
];
function renderTeaching(s){
  $('search-counts').innerHTML=`<div><span>Code-delay hypotheses</span><strong>${s.p.codeLength.toLocaleString()}</strong><small>One full ${s.p.label} code period</small></div><div><span>Doppler hypotheses</span><strong>${s.bins}</strong><small>(2 × ${s.span.toLocaleString()} Hz / ${s.step} Hz) + 1</small></div><div><span>Total search cells</span><strong>${s.serialTests.toLocaleString()}</strong><small>${s.p.codeLength.toLocaleString()} delays × ${s.bins} frequencies</small></div>`;
  const counts=[s.serialTests,s.pfssaReps,s.pcpsReps];
  const covered=['1 cell',`${s.bins} frequency hypotheses`,`${s.p.codeLength.toLocaleString()} chip-delay hypotheses`];
  $('repetition-counts').innerHTML=SEARCH_METHODS.map((m,i)=>`<div class="repetition-row" style="--method-color:${m.color}"><div><b>${m.name}</b><span>${covered[i]} per repetition</span></div><strong>${counts[i].toLocaleString()}<small>repetitions</small></strong><div class="repetition-equation">${i===0?`${s.p.codeLength.toLocaleString()} × ${s.bins}`:i===1?`${s.p.codeLength.toLocaleString()} code delays`:`${s.bins} Doppler bins`}</div></div>`).join('');
  drawSweep();
}
function drawSweep(){
  const step=Number($('sweep-progress').value);
  $('sweep-position').textContent=`${step} / 84`;
  $('sweep-comparison').innerHTML=SEARCH_METHODS.map(m=>{
    const done=Math.min(step,m.total);let cells='';
    for(let row=0;row<7;row++)for(let col=0;col<12;col++){
      const index=m.key==='serial'?row*12+col:m.key==='pfssa'?col:row;
      cells+=`<rect x="${45+col*20}" y="${24+(6-row)*20}" width="17" height="17" rx="2" fill="${index<done?m.color:'#15303e'}" opacity="${index===done-1?1:.55}" stroke="${index===done-1?'#fff':'#315363'}" stroke-width="${index===done-1?2:1}"/>`;
    }
    return `<article class="sweep-method" style="--method-color:${m.color}"><h3>${m.name}</h3><p>${m.unit} per repetition</p><svg viewBox="0 0 300 205" role="img" aria-label="${m.name}: ${done} of ${m.total} repetitions completed"><text x="14" y="95" transform="rotate(-90 14 95)" text-anchor="middle">Doppler ↑</text>${cells}<text x="165" y="192" text-anchor="middle">Code delay →</text></svg><div class="sweep-counter"><strong>${done} / ${m.total}</strong><span>${done===m.total?'Sweep complete':'repetitions'}</span></div></article>`;
  }).join('');
}
function pauseSweep(){clearInterval(sweepTimer);sweepTimer=null;$('sweep-play').textContent='Play';}
function advanceSweep(){const control=$('sweep-progress');control.value=Math.min(84,Number(control.value)+1);drawSweep();if(Number(control.value)===84)pauseSweep();}
function bindTeaching(){
  const grid=$('hypothesis-grid');
  grid.innerHTML='<span>Hz / chips</span>'+Array.from({length:7},(_,col)=>`<span>${col}</span>`).join('')+[1000,500,0,-500,-1000].map(f=>`<span>${f>0?'+':''}${f}</span>`+Array.from({length:7},(_,col)=>`<button type="button" data-delay="${col}" data-frequency="${f}" aria-label="Code delay ${col} chips, Doppler ${f} hertz" aria-pressed="false"></button>`).join('')).join('');
  function selectCell(button){
    grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    button.textContent='×';grid.querySelectorAll('button').forEach(b=>{if(b!==button)b.textContent='';});
    $('hypothesis-readout').textContent=`Selected pair: τ = ${button.dataset.delay} chips; f = ${button.dataset.frequency} Hz. This is one of 7 × 5 = 35 hypotheses in this example.`;
  }
  grid.addEventListener('click',e=>{if(e.target.matches('button'))selectCell(e.target);});
  selectCell(grid.querySelector('[data-delay="3"][data-frequency="0"]'));
  $('sweep-play').addEventListener('click',()=>{
    if(sweepTimer){pauseSweep();return;}
    if(Number($('sweep-progress').value)===84)$('sweep-progress').value=0;
    $('sweep-play').textContent='Pause';sweepTimer=setInterval(advanceSweep,250);
  });
  $('sweep-step').addEventListener('click',()=>{pauseSweep();advanceSweep();});
  $('sweep-reset').addEventListener('click',()=>{pauseSweep();$('sweep-progress').value=0;drawSweep();});
  $('sweep-progress').addEventListener('input',()=>{pauseSweep();drawSweep();});
  document.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.lesson)));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseSweep();});
}

populateProfiles();bind();bindTeaching();run();
const trackingTransfer=document.createElement('button');
trackingTransfer.type='button';trackingTransfer.textContent='Initialize tracking with this GPS C/A result';
trackingTransfer.className='secondary-button';
trackingTransfer.style.cssText='margin:16px 0;padding:12px 18px;font:inherit;cursor:pointer';
const transferStatus=document.createElement('p');transferStatus.setAttribute('role','status');
document.querySelector('.workbench-disclosure').after(trackingTransfer,transferStatus);
trackingTransfer.addEventListener('click',()=>{
  if(current.profileKey!=='gps'){transferStatus.textContent='The tracking teaching model uses GPS C/A. Select GPS before transferring this result.';return;}
  if(!current.detected){transferStatus.textContent='This acquisition scenario has no accepted detection. Adjust the search and signal settings first.';return;}
  try{
    sessionStorage.setItem('vglTrackingSeed',JSON.stringify({profile:'gps',prn:String(current.prn),delay:current.estPhase%1023,doppler:current.estD,fs:current.p.fsMHz,ifMHz:current.p.ifMHz,T:current.coh}));
    location.href='/tracking#inputs';
  }catch(error){transferStatus.textContent='Browser storage is unavailable. Open GNSS Tracking to use its clearly labelled default scenario.';}
});
