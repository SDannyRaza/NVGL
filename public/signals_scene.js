/*
 * Epoch-wide RINEX observation scene: satellite membership changes with each
 * epoch; compatible RF channels are summed through one modeled front end.
 * Source: broadcast code/ephemeris + RINEX C/L/D/S at that same epoch.
 * Not a replay of captured IQ or a complete hardware-accurate multi-GNSS RF.
 */
'use strict';
const SCENE_STORE={epoch:null,promise:null,data:null,prns:new Map(),generation:0};
const SCENE_BANDS={
  l1:{title:'L1 / E1',centerMHz:1575.42,match:s=>Math.abs(Number(s.carrier_mhz)-1575.42)<0.3},
  b1:{title:'BeiDou B1',centerMHz:1561.098,match:s=>Math.abs(Number(s.carrier_mhz)-1561.098)<0.3},
  g1:{title:'GLONASS G1',centerMHz:1602,match:s=>s.band==='G1'},
  l2:{title:'L2',centerMHz:1227.60,match:s=>Math.abs(Number(s.carrier_mhz)-1227.60)<0.3},
  e5b:{title:'E5b / B2',centerMHz:1207.14,match:s=>Math.abs(Number(s.carrier_mhz)-1207.14)<0.3},
  g2:{title:'GLONASS G2',centerMHz:1246,match:s=>s.band==='G2'},
};
const sceneSample=(m,name)=>{
  const field=m.measurements?.[name];
  return field?.value===null||field?.value===undefined?null:Number(field.value);
};
async function sceneDataForEpoch(index){
  if(SCENE_STORE.epoch===index && SCENE_STORE.data)return SCENE_STORE.data;
  if(SCENE_STORE.epoch===index && SCENE_STORE.promise)return SCENE_STORE.promise;
  SCENE_STORE.epoch=index;
  SCENE_STORE.data=null;
  SCENE_STORE.prns.clear();
  const pending=getJSON(`/api/signals/scene?epoch=${index}`);
  SCENE_STORE.promise=pending;
  try{
    const loaded=await pending;
    if(SCENE_STORE.epoch===index)SCENE_STORE.data=loaded;
    return loaded;
  }finally{if(SCENE_STORE.promise===pending)SCENE_STORE.promise=null;}
}
async function sceneRangingCode(s){
  const id=s.signal.id,prn=s.prn_number,comp=s.signal.default_component||'';
  const key=`${s.satellite}:${id}:${comp}`;
  if(SCENE_STORE.prns.has(key))return SCENE_STORE.prns.get(key);
  const mode=s.signal.prn_mode;
  const work=(async()=>{
    if(mode==='gps-ca')return PRNLAB.gpsCA(prn);
    if(mode==='qzss-ca')return PRNLAB.qzssCA(prn);
    if(mode==='sbas-ca')return PRNLAB.sbasCA(prn);
    if(mode==='glo-ca')return PRNLAB.glonass();
    if(mode==='bds-b1i'||mode==='bds-b2i')return PRNLAB.beidou(prn);
    if(mode==='gps-l2c')return PRNLAB.gpsL2(prn,'CM');
    if(mode==='qzss-l2c')return PRNLAB.qzssL2(prn,'CM');
    if(mode==='gal-e1'||mode==='gal-e5b')return galileoCode(prn,id,comp);
    return null;
  })();
  SCENE_STORE.prns.set(key,work);
  return work;
}
function sceneChannelRows(channels,band){
  const checked=new Set(channels.filter(c=>band.match(c.signal)).map(c=>`${c.satellite}:${c.signal.id}`));
  const rows=channels.map(c=>{
    const inBand=checked.has(`${c.satellite}:${c.signal.id}`);
    const pr=sceneSample(c,'Pseudorange'),d=sceneSample(c,'Doppler'),cn=sceneSample(c,'C/N₀');
    const color=COLORS[c.satellite[0]]||'#7edddd';
    const carrierAvailable=c.signal.carrier_mhz!==null&&c.signal.carrier_mhz!==undefined;
    const status=!carrierAvailable?'RF channel unknown':pr===null?'Missing code P':inBand?'Mix + inspect':'Other RF band';
    return `<tr class="${inBand?'scene-band-match':''}"><td><span class="scene-system-dot" style="background:${color}"></span><b>${escapeHtml(c.satellite)}</b></td><td>${escapeHtml(c.signal.name)}</td><td>${fmt(c.signal.carrier_mhz,4)} MHz</td><td>${fmt(d,1)} Hz</td><td>${fmt(cn,1)} dB-Hz</td><td>${status}</td><td><button class="scene-isolate" data-sat="${escapeHtml(c.satellite)}" data-signal="${escapeHtml(c.signal.id)}" type="button">Isolate</button></td></tr>`;
  }).join('');
  return `<table class="scene-channel-table"><thead><tr><th>Satellite</th><th>RINEX signal</th><th>Center RF</th><th>Doppler</th><th>C/N₀</th><th>Band status</th><th>Inspect</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function sceneNoiseGenerator(seed){
  let x=(seed>>>0)||12345;
  return ()=>{
    x=(Math.imul(x,1664525)+1013904223)>>>0;const u=(x+1)/4294967297;
    x=(Math.imul(x,1664525)+1013904223)>>>0;const v=(x+1)/4294967297;
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  };
}
async function sceneModels(channels){
  const entries=await Promise.all(channels.map(async selection=>{
    try{
      if(selection.signal.carrier_mhz===null||selection.signal.carrier_mhz===undefined)return null;
      const code=await sceneRangingCode(selection);
      const model=RECEIVER_MODEL.prepare({selection,epoch:selection.epoch,prn:code,component:selection.signal.default_component});
      if(!model||model.pseudorange===null||model.doppler===null)return null;
      return {selection,model};
    }catch(error){console.warn('RINEX scene PRN unavailable',selection.satellite,selection.signal.id,error);return null;}
  }));
  return entries.filter(Boolean);
}
function sceneSynthesize(entries,band,epochISO){
  const n=768;
  const fs=band===SCENE_BANDS.g1||band===SCENE_BANDS.g2?20e6:
    Math.max(4.092e6,...entries.map(e=>4*e.model.codeRate));
  const originHz=band.centerMHz*1e6;
  const tUs=[],sumI=[],sumQ=[],cleanI=[],cleanQ=[];
  const contributions=entries.map(()=>[]);
  const noise=sceneNoiseGenerator(Math.floor(RECEIVER_MODEL.epochMillis(epochISO)));
  for(let i=0;i<n;i++){
    const t=i/fs;
    let re=0,im=0;
    entries.forEach((entry,j)=>{
      const m=entry.model,carrierHz=Number(entry.selection.signal.carrier_mhz)*1e6;
      const cn0=Number.isFinite(m.cn0)?m.cn0:35;
      const amplitude=Math.sqrt(Math.pow(10,cn0/10)/fs);
      const symbol=RECEIVER_MODEL.codeSign(m,t)*RECEIVER_MODEL.navSign(m,t);
      const theta=m.initialCarrierPhase+2*Math.PI*(carrierHz-originHz+m.doppler)*t;
      const i0=amplitude*symbol*Math.cos(theta);
      const q0=amplitude*symbol*Math.sin(theta);
      re+=i0;im+=q0;
      contributions[j].push(i0);
    });
    tUs.push(1e6*t);cleanI.push(re);cleanQ.push(im);
    // A single front-end thermal-noise process is shared by all channels.
    sumI.push(re+noise()*Math.SQRT1_2);
    sumQ.push(im+noise()*Math.SQRT1_2);
  }
  return {tUs,sumI,sumQ,cleanI,cleanQ,contributions,sampleRate:fs};
}
async function renderScene(){
  if(state.view!=='scene')return;
  const token=++SCENE_STORE.generation;
  const index=state.epoch.index;
  const band=SCENE_BANDS[$('scene-rf-band').value]||SCENE_BANDS.l1;
  $('scene-status').textContent='Loading all RINEX-observed satellites for epoch '+index+'…';
  try{
    const scene=await sceneDataForEpoch(index);
    if(token!==SCENE_STORE.generation||state.view!=='scene'||state.epoch.index!==index)return;
    const inBand=scene.channels.filter(c=>band.match(c.signal));
    $('scene-satellite-list').innerHTML=sceneChannelRows(scene.channels,band);
    $('scene-status').textContent=`${scene.satellite_count} observed satellites · ${scene.channel_count} recorded signal channels · ${band.title} front end`;
    const entries=await sceneModels(inBand);
    if(token!==SCENE_STORE.generation||state.view!=='scene'||state.epoch.index!==index)return;
    const observedSats=new Set(inBand.map(c=>c.satellite));
    const mixSats=new Set(entries.map(e=>e.selection.satellite));
    $('scene-metrics').innerHTML=[
      ['Observed satellites',String(scene.satellite_count),'Entire epoch · all constellations'],
      ['Recorded channels',String(scene.channel_count),'RINEX signal codes, all bands'],
      [`${band.title} satellites`,String(observedSats.size),'RF-band compatible channels'],
      ['Reconstructed channels',String(entries.length),`${mixSats.size} satellites with code and Doppler`],
    ].map(([label,value,note])=>`<div class="receiver-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`).join('');
    if(!entries.length){
      $('scene-iq-plot').textContent='No reconstructable channels in this RF group at the selected epoch.';
      $('scene-components-plot').textContent='Select another RF group or epoch.';
      $('scene-status').textContent+=' · no usable pseudorange/Doppler channels';
      return;
    }
    const output=sceneSynthesize(entries,band,scene.epoch);
    plot('scene-iq-plot',[
      {x:output.tUs,y:output.sumI,name:'Combined I + common noise',mode:'lines',line:{width:1.2,color:'#72c7f5'}},
      {x:output.tUs,y:output.sumQ,name:'Combined Q + common noise',mode:'lines',line:{width:1.2,color:'#febf7d'}},
      {x:output.tUs,y:output.cleanI,name:'Noiseless composite I',mode:'lines',line:{width:2,color:'#6de2bb'}},
    ],{xaxis:{title:'Sample time [µs]'},yaxis:{title:'Normalized front-end amplitude'},legend:{orientation:'h',y:1.22},margin:{l:69,r:20,t:45,b:60}});
    const best=entries.map((e,i)=>({...e,index:i})).sort((a,b)=>(b.model.cn0??-100)-(a.model.cn0??-100));
    plot('scene-components-plot',best.map(e=>({
      x:output.tUs,y:output.contributions[e.index],name:`${e.selection.satellite} ${e.selection.signal.name}`,
      mode:'lines',line:{width:1.3,color:COLORS[e.selection.satellite[0]]||'#b3cad8'},
    })),{xaxis:{title:'Sample time [µs]'},yaxis:{title:'Individual clean I contribution'},legend:{orientation:'h',y:1.28},margin:{l:68,r:20,t:70,b:60}});
    $('scene-status').textContent+=` · ${entries.length} channels summed · all ${best.length} contributions available in the legend`;
  }catch(error){
    if(token!==SCENE_STORE.generation)return;
    $('scene-status').textContent='Unable to construct this epoch: '+error.message;
    console.error(error);
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  $('scene-rf-band').addEventListener('change',()=>{if(state.view==='scene')renderScene()});
  $('scene-satellite-list').addEventListener('click',async event=>{
    const target=event.target.closest('button.scene-isolate');
    if(!target)return;
    state.system=target.dataset.sat[0];
    state.sat=target.dataset.sat;
    state.signalId=target.dataset.signal;
    state.component=null;
    populateSystem();
    await refreshSelection('isolated from all-satellite scene');
    switchView('received');
  });
});
