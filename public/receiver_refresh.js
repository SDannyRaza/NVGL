'use strict';
/*
 * Bespoke chapter banners and an acquisition learning map.
 * Artwork remains editable SVG and works entirely offline.
 */
function vglBanner(type){
  const motif=(kind,x,y,size,color)=>vglSvgIcon(kind,x,y,size,color);
  if(type==='front-end'){
    return '<svg viewBox="0 0 540 284" role="img" aria-label="GNSS wave entering an antenna, passing through signal conditioning and becoming digital samples">'+
      '<defs><linearGradient id="rfg" x1="0" x2="1"><stop stop-color="#59ebd6"/><stop offset=".55" stop-color="#79bbff"/><stop offset="1" stop-color="#ffd089"/></linearGradient><radialGradient id="rfr"><stop stop-color="#4bd7c4" stop-opacity=".19"/><stop offset="1" stop-color="#4bd7c4" stop-opacity="0"/></radialGradient></defs>'+
      '<ellipse cx="272" cy="120" rx="245" ry="135" fill="url(#rfr)"/>'+
      '<g fill="none" stroke="#4f8493" opacity=".6"><path d="M12 219H527M12 245H527M12 271H527M53 12V269M158 12V269M265 12V269M371 12V269M477 12V269" stroke-dasharray="3 10"/></g>'+
      '<path d="M3 112c15-40 27-40 42 0s27 40 42 0 27-40 42 0" stroke="#65edda" stroke-width="4" opacity=".8" fill="none"/>'+
      [[90,'antenna','RECEIVE','#59ebd6'],[250,'filter','CONDITION','#81baff'],[410,'samples','DIGITIZE','#ffd089']].map(([x,k,label,color],i)=>
        '<rect x="'+x+'" y="57" width="122" height="148" rx="22" fill="#152b3b" stroke="'+color+'" stroke-width="2"/>'+
        '<rect x="'+(x+15)+'" y="72" width="92" height="84" rx="17" fill="'+color+'" fill-opacity=".10"/>'+
        motif(k,x+43,90,55,color)+
        '<text x="'+(x+61)+'" y="183" text-anchor="middle" fill="#e9f8ff" font-size="14" font-weight="700">'+label+'</text>'+
        (i<2?'<path d="M'+(x+122)+' 129h35m-8 -8 8 8-8 8" fill="none" stroke="url(#rfg)" stroke-width="3"/>':'')
      ).join('')+
      '<text x="155" y="237" text-anchor="middle" fill="#75e6d4" font-size="12">1575.42 MHz RF</text>'+
      '<text x="310" y="237" text-anchor="middle" fill="#9bc9ff" font-size="12">47.74 MHz IF</text>'+
      '<text x="468" y="237" text-anchor="middle" fill="#ffe3ae" font-size="12">38.192 MS/s</text>'+
      '</svg>';
  }
  if(type==='acquisition'){
    let cells='';
    for(let row=0;row<6;row++)for(let col=0;col<10;col++){
      const d=(col-7)**2/9+(row-2)**2/3.2,heat=Math.exp(-d),color=heat>.72?'#ffd583':heat>.27?'#d78af0':'#635caf';
      cells+='<rect x="'+(88+col*34)+'" y="'+(44+row*27)+'" width="28" height="21" rx="4" fill="'+color+'" fill-opacity="'+(.18+heat*.8)+'"/>';
    }
    return '<svg viewBox="0 0 540 290" role="img" aria-label="Color-coded acquisition correlation heatmap over code phase and Doppler frequency with a highlighted detection peak">'+
      '<defs><linearGradient id="acgs" x1="0" x2="1"><stop stop-color="#aa83ff"/><stop offset="1" stop-color="#fb8dd8"/></linearGradient><radialGradient id="acgl"><stop stop-color="#c783ff" stop-opacity=".28"/><stop offset="1" stop-color="#c783ff" stop-opacity="0"/></radialGradient></defs>'+
      '<ellipse cx="285" cy="134" rx="244" ry="137" fill="url(#acgl)"/>'+
      '<rect x="64" y="21" width="401" height="207" rx="18" fill="#171b37" stroke="#7460a3" stroke-width="1.5"/>'+
      '<path d="M78 30V214H451" stroke="#7d81af" stroke-width="2" fill="none"/>'+cells+
      '<circle cx="340" cy="109" r="17" fill="none" stroke="#fff2ca" stroke-width="3"/>'+
      '<path d="M340 81v10m0 36v10m-28-28h10m36 0h10" stroke="#fff2ca" stroke-width="2.3"/>'+
      '<path d="M356 95l58-52" stroke="#ffde91" stroke-width="2" stroke-dasharray="5 5"/>'+
      '<rect x="385" y="15" width="125" height="35" rx="10" fill="#453353" stroke="#e8a0dd"/>'+
      '<text x="447" y="37" font-size="12" fill="#fff1e9" text-anchor="middle" font-weight="700">DETECTED PEAK</text>'+
      '<text x="278" y="251" font-size="14" fill="#dbc8ff" text-anchor="middle">CODE DELAY →</text>'+
      '<text x="26" y="150" font-size="13" fill="#e9b6ec" transform="rotate(-90 26 150)" text-anchor="middle">DOPPLER FREQUENCY →</text>'+
      '<g fill="none" stroke="url(#acgs)" stroke-width="3"><path d="M166 268h220m-10-8 10 8-10 8"/></g>'+
      '</svg>';
  }
  return '<svg viewBox="0 0 540 290" role="img" aria-label="Tracking has a carrier loop and a code loop, both returning corrections to their local generators">'+
    '<defs><linearGradient id="trgl" x1="0" x2="1"><stop stop-color="#ffd18b"/><stop offset="1" stop-color="#ff91a6"/></linearGradient><radialGradient id="trbg"><stop stop-color="#d88377" stop-opacity=".2"/><stop offset="1" stop-color="#d88377" stop-opacity="0"/></radialGradient></defs>'+
    '<ellipse cx="262" cy="143" rx="260" ry="135" fill="url(#trbg)"/>'+
    '<rect x="22" y="42" width="110" height="206" rx="19" fill="#292b3c" stroke="#9b7579"/>'+motif('wave',51,100,55,'#f9c590')+
    '<text x="77" y="190" fill="#ffe1bc" font-size="12" text-anchor="middle">RECEIVED</text><text x="77" y="207" fill="#ffe1bc" font-size="12" text-anchor="middle">SAMPLES</text>'+
    '<path d="M132 143h48V86h23M180 143v95h23" fill="none" stroke="#a58a95" stroke-width="3"/>'+
    '<rect x="205" y="39" width="154" height="103" rx="19" fill="#45333c" stroke="#ffb879" stroke-width="2"/>'+
    motif('phase',219,55,40,'#ffd18b')+'<text x="305" y="69" fill="#ffe0b1" font-size="13" font-weight="700" text-anchor="middle">CARRIER</text><text x="305" y="88" fill="#fff1dc" font-size="12" text-anchor="middle">Costas / PLL</text>'+
    '<path d="M236 117h97" stroke="#ffbc79" stroke-width="3"/><circle cx="333" cy="117" r="6" fill="#ffd28c"/>'+
    '<rect x="205" y="177" width="154" height="102" rx="19" fill="#203b46" stroke="#72d9d7" stroke-width="2"/>'+
    motif('code',219,191,40,'#7adeda')+'<text x="305" y="207" fill="#99eee8" font-size="13" font-weight="700" text-anchor="middle">CODE</text>'+
    '<text x="305" y="228" fill="#dcf8f7" font-size="12" text-anchor="middle">Delay-lock / DLL</text>'+
    '<path d="M236 253h97" stroke="#7adeda" stroke-width="3"/><circle cx="333" cy="253" r="6" fill="#7adeda"/>'+
    '<path d="M359 90h47v142h-47" fill="none" stroke="#cf94ab" stroke-width="3"/>'+
    '<rect x="411" y="101" width="105" height="121" rx="23" fill="#372f44" stroke="#c99bd2" stroke-width="2"/>'+
    motif('target',439,117,50,'#ead0ff')+
    '<text x="463" y="184" fill="#f5e4ff" font-size="13" font-weight="700" text-anchor="middle">STAY</text>'+
    '<text x="463" y="203" fill="#f5e4ff" font-size="13" font-weight="700" text-anchor="middle">LOCKED</text>'+
    '<path d="M210 18h304" stroke="url(#trgl)" stroke-width="2" stroke-dasharray="6 7" opacity=".85"/>'+
    '</svg>';
}

document.addEventListener('DOMContentLoaded',()=>{
  if(!document.body.classList.contains('chapter-acquisition'))return;
  const overview=document.querySelector('[data-view-panel="overview"]');
  const head=overview?.querySelector('.section-head');
  if(head&&!overview.querySelector('.receiver-route')){
    head.insertAdjacentHTML('afterend',
      '<div class="receiver-route" aria-label="Acquisition learning map">'+
      '<div class="route-heading">'+vglIcon('search')+'The search in three questions</div>'+
      '<div class="route-steps">'+
      '<div class="route-step"><small>01 · IDENTIFY</small><strong>Which satellite?</strong><span>Generate its known PRN code.</span></div>'+
      '<div class="route-step"><small>02 · SEARCH</small><strong>Where in delay and frequency?</strong><span>Test many code-phase and Doppler hypotheses.</span></div>'+
      '<div class="route-step"><small>03 · DECIDE</small><strong>Is the peak strong enough?</strong><span>Interpret the detection metric, then initialize tracking.</span></div>'+
      '</div></div>');
  }
  const kinds={prn:'code',carrier:'wave',search:'search',serial:'samples',pfssa:'filter',pcps:'chip',estimate:'target'};
  document.querySelectorAll('.workspace-view').forEach(panel=>{
    if(panel.dataset.viewPanel==='overview')return;
    const heading=panel.querySelector('.section-head h2');
    if(!heading)return;
    const icon=kinds[panel.dataset.viewPanel]||'search';
    const eyebrow=panel.querySelector('.section-head .eyebrow');
    eyebrow?.insertAdjacentHTML('afterbegin',vglIcon(icon));
  });
  // Put a readable, icon-led overview before each full mathematical schematic.
  // The original I/Q SVG remains available in a disclosure for detailed study.
  const algorithmSteps={
    serial:[
      ['code','Choose PRN and delay','One local code-shift hypothesis'],
      ['wave','Choose Doppler','One local carrier-frequency hypothesis'],
      ['samples','Correlate I and Q','Multiply, integrate, then form I² + Q²'],
      ['target','Move to next cell','Visit the code–frequency grid one cell at a time']
    ],
    pfssa:[
      ['code','Choose code delay','Hold one code-shift candidate'],
      ['wave','Evaluate frequencies','Use a frequency transform across the Doppler dimension'],
      ['samples','Read correlation power','Evaluate the same code delay across all frequency bins'],
      ['target','Advance code delay','Repeat for each shifted code hypothesis']
    ],
    pcps:[
      ['wave','Choose Doppler','Compensate the signal at one trial frequency'],
      ['chip','Correlate by FFT','Transform and correlate all code delays in parallel'],
      ['samples','Read the correlation row','Build power estimates across all code-phase shifts'],
      ['target','Advance frequency','Repeat for the next Doppler hypothesis']
    ]
  };
  Object.entries(algorithmSteps).forEach(([key,steps])=>{
    const card=document.querySelector('[data-view-panel="'+key+'"] .diagram-card');
    const source=card?.querySelector('.diagram-scroll');
    if(!source)return;
    const colors=['#bda4ff','#f48acb','#ffce89','#8fe5d9'];
    const map=document.createElement('div');
    map.className='receiver-flow';
    map.setAttribute('aria-label','High-level '+key+' acquisition algorithm');
    map.innerHTML=steps.map(([icon,title,explain],i)=>
      '<div class="flow-node" style="--flow-color:'+colors[i]+'">'+
      '<span class="flow-icon">'+vglIcon(icon)+'</span>'+
      '<span class="flow-count">STEP '+(i+1)+'</span>'+
      '<b>'+title+'</b><small>'+explain+'</small></div>'
    ).join('');
    source.parentNode.insertBefore(map,source);
    const detail=document.createElement('details');
    detail.className='lesson-detail acq-detailed-diagram';
    detail.innerHTML='<summary>Explore the full I/Q correlation schematic</summary>';
    source.replaceWith(detail);
    detail.append(source);
  });
  const chainIcons=['wave','filter','search','loop','book','samples','target'];
  document.querySelectorAll('.receiver-chain>div').forEach((block,index)=>{
    block.insertAdjacentHTML('afterbegin',vglIcon(chainIcons[index]||'chip'));
  });
});
