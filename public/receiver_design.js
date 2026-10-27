'use strict';
/* Local vector artwork shared by the three receiver chapters. */
const VGL_ART={
 antenna:'<path d="M12 9a20 20 0 0 0 28 28L12 9Z"/><path d="M27 29L43 13M39 9l8 8M25 39l-3 14M12 54h30"/><path d="M39 3a22 22 0 0 1 22 22M40 11a13 13 0 0 1 13 13"/>',
 wave:'<path d="M3 32c9-30 15-30 24 0s15 30 24 0 10-20 10-20"/><path d="M4 53h56" opacity=".3"/>',
 code:'<path d="M3 45h10V19h13v26h12V19h13v26h10"/><path d="M4 55h56" opacity=".3"/>',
 search:'<circle cx="27" cy="27" r="19"/><path d="M41 41l16 16M15 27h24M27 15v24"/><circle cx="27" cy="27" r="5"/>',
 loop:'<path d="M49 18a22 22 0 0 0-37 9M49 7v13H36M15 46a22 22 0 0 0 37-9M15 57V44h13"/><circle cx="32" cy="32" r="7"/>',
 filter:'<path d="M3 50h11l9-34h18l9 34h11"/><path d="M4 58h56M8 8v48" opacity=".35"/>',
 amplifier:'<path d="M16 10v44l38-22-38-22ZM2 32h14M54 32h8M26 32h15M33 25v14"/>',
 mixer:'<circle cx="32" cy="32" r="22"/><path d="M17 17l30 30M47 17L17 47M1 32h9M54 32h9M32 54v9"/>',
 samples:'<path d="M6 52h52M11 48V37M22 48V15M33 48V25M44 48V11M55 48V33"/><g fill="currentColor" stroke="none"><circle cx="11" cy="35" r="3"/><circle cx="22" cy="13" r="3"/><circle cx="33" cy="23" r="3"/><circle cx="44" cy="9" r="3"/><circle cx="55" cy="31" r="3"/></g>',
 clock:'<circle cx="32" cy="32" r="24"/><path d="M32 15v18l13 8M32 8v4M8 32h4M52 32h4M32 52v4"/>',
 target:'<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="15"/><circle cx="32" cy="32" r="5"/><path d="M32 2v12M32 50v12M2 32h12M50 32h12"/>',
 book:'<path d="M32 16C22 8 11 8 4 11v39c9-3 19-2 28 5 9-7 19-8 28-5V11c-7-3-18-3-28 5v39M11 22l13 3M11 32l13 3M40 25l13-3M40 35l13-3"/>',
 satellite:'<path d="M24 23h17v18H24zM2 17h16v29H2zM47 17h15v29H47zM18 31h6M41 31h6M32 41v9M25 51h14M10 17v29M47 31h15M2 31h16"/>',
 noise:'<path d="M3 33h6l3-16 5 31 5-39 6 48 5-33 6 16 6-24 5 30 4-13h7"/>',
 check:'<circle cx="32" cy="32" r="24"/><path d="M19 32l9 9 18-21"/>',
 phase:'<circle cx="32" cy="32" r="24"/><path d="M7 32h50M32 57V7M32 32l17-17"/><path d="M44 32a12 12 0 0 0-4-9"/>',
 reflection:'<path d="M5 12l52 5M5 12l26 39 26-34M17 55h28"/><circle cx="5" cy="12" r="3"/><circle cx="57" cy="17" r="3"/>',
 chip:'<rect x="15" y="15" width="34" height="34" rx="5"/><path d="M24 24h16v16H24zM22 4v11M32 4v11M42 4v11M22 49v11M32 49v11M42 49v11M4 22h11M4 32h11M4 42h11M49 22h11M49 32h11M49 42h11"/>'
};
function vglKind(text){let s=text.toLowerCase();return /antenna|polariz|reception/.test(s)?'antenna':/costas|feedback|tracking|loop/.test(s)?'loop':/phase|quadrature|in-phase/.test(s)?'phase':/acquis|search|detect/.test(s)?'search':/noise|weak/.test(s)?'noise':/gain|amplif|sensitivity/.test(s)?'amplifier':/filter|band|selectivity/.test(s)?'filter':/mix|translat/.test(s)?'mixer':/clock|time|delay|integration/.test(s)?'clock':/sample|digit|quant/.test(s)?'samples':/code|early|prompt|late|correl/.test(s)?'code':/multipath|reflect/.test(s)?'reflection':/carrier|frequency|doppler|signal|wave/.test(s)?'wave':/satellite/.test(s)?'satellite':/lock|output|ready|result/.test(s)?'check':/oscillator/.test(s)?'chip':'book';}
function vglGlyph(kind){return VGL_ART[kind]||VGL_ART[vglKind(kind)]||VGL_ART.book;}
function vglIcon(kind,cls=''){return `<svg class="vgl-icon ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${vglGlyph(kind)}</svg>`;}
function vglSvgIcon(kind,x,y,size=34,color='#74e5db'){return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" stroke="${color}" color="${color}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${vglGlyph(kind)}</svg>`;}
function vglBanner(type){
  const txt=(x,y,str,color='#eaf4ff',size=14,weight=700,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Inter,Segoe UI,Arial,sans-serif">${str}</text>`;
  const arrow=(x,y,color='#a6bfdd')=>`<path d="M${x} ${y}h35m-8 -7 8 7-8 7" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const icon=(kind,x,y,color)=>vglSvgIcon(kind,x,y,54,color);
  const wrapper=(contents,description)=>`<svg class="vgl-hero-vector" viewBox="0 0 600 270" role="img" aria-label="${description}" preserveAspectRatio="xMidYMid meet">${contents}</svg>`;
  if(type==='front-end'){
    const stages=[['antenna','RECEIVE','1575.42 MHz RF','#5ce5d6'],['filter','CONDITION','47.74 MHz IF','#87baff'],['samples','DIGITIZE','38.192 MS/s','#ffcb7f']];
    return wrapper(`<path d="M7 220H593" stroke="#365574" stroke-dasharray="3 8"/>`+
      `<path d="M4 125q18-52 36 0t36 0t36 0" fill="none" stroke="#55dbc6" stroke-width="4" opacity=".85"/>`+
      stages.map((s,i)=>{const x=110+i*167;return `<rect x="${x}" y="42" width="132" height="158" rx="22" fill="#132c40" stroke="${s[3]}" stroke-width="2"/><rect x="${x+16}" y="57" width="100" height="91" rx="14" fill="${s[3]}" fill-opacity=".10"/>${icon(s[0],x+39,74,s[3])}${txt(x+66,178,s[1],'#f0f8ff',14,800)}${txt(x+66,236,s[2],s[3],12,650)}${i<2?arrow(x+132,121):''}`;}).join('')+
      `<path d="M4 255H596" stroke="#294c66" stroke-dasharray="2 10"/>`,'GNSS front end: receive at 1575.42 megahertz, condition at 47.74 megahertz IF and digitize at 38.192 mega-samples per second.');
  }
  if(type==='acquisition'){
    const cells=[];for(let r=0;r<6;r++){for(let c=0;c<11;c++){
      const d=Math.hypot(c-7,r-2),intensity=Math.max(0,(4.5-d)/4.5),isPeak=(c===7&&r===2);
      const fill=isPeak?'#ffcf7c':intensity>.62?'#b37fdd':intensity>.34?'#7c64bd':'#363665';
      cells.push(`<rect x="${92+c*37}" y="${43+r*29}" width="31" height="23" rx="4" fill="${fill}" opacity="${isPeak?1:.35+intensity*.6}"/>`);
    }}
    return wrapper(`<rect x="70" y="23" width="459" height="205" rx="18" fill="#161e3a" stroke="#a27ad5" stroke-width="1.5"/>${cells.join('')}`+
      `<path d="M86 39V215H517" fill="none" stroke="#b3acd5" stroke-width="1.5"/>`+
      `<circle cx="${92+7*37+15.5}" cy="${43+2*29+11.5}" r="20" fill="none" stroke="#fff0a7" stroke-width="3"/>`+
      `<rect x="415" y="5" width="159" height="35" rx="11" fill="#4f324d" stroke="#eda9d2"/>`+
      txt(493,27,'DETECTED PEAK','#fff0f9',12,800)+
      `<path d="M492 40L370 109" stroke="#ffdb90" stroke-width="2" stroke-dasharray="6 5"/>`+
      txt(290,254,'CODE DELAY  →','#dcc8fa',13,750)+
      `<text x="29" y="150" text-anchor="middle" transform="rotate(-90 29 150)" fill="#dcc8fa" font-size="12" font-weight="700" font-family="Inter,Arial">DOPPLER FREQUENCY</text>`,'Acquisition search across code delay and Doppler frequency, with a highlighted correlation peak.');
  }
  const box=(x,y,w,h,color,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
  return wrapper(`<path d="M125 134H166V72H198M166 134V201H198M382 72H423V134H454M382 201H423V134" fill="none" stroke="#ac91a5" stroke-width="3"/>`+
    box(15,81,110,121,'#af8b9e','#292739')+icon('wave',39,91,'#ffc680')+txt(70,173,'RECEIVED','#ffd9a4',12)+txt(70,190,'SAMPLES','#ffd9a4',12)+
    box(198,21,184,105,'#ffba78','#44323b')+icon('phase',215,34,'#ffbb78')+txt(305,60,'CARRIER','#ffe0ae',14,800)+txt(305,82,'Costas / PLL','#ffe0ae',12,500)+`<path d="M243 103h103" stroke="#ffba78" stroke-width="3"/>`+
    box(198,150,184,105,'#69e0da','#1e3b47')+icon('code',215,160,'#69e0da')+txt(310,191,'CODE','#9af1e7',14,800)+txt(310,212,'Delay lock / DLL','#a7ebe9',12,500)+
    box(454,80,131,124,'#d0a6de','#3a314c')+icon('target',490,90,'#dcc2ef')+txt(519,171,'STAY','#f4e4fa',13)+txt(519,188,'LOCKED','#f4e4fa',13),
    'Tracking continuously synchronizes local carrier with a Costas or PLL loop and code with a delay-locked loop.');
}
function vglDecorate(root=document){root.querySelectorAll('.card-head').forEach(head=>{if(head.querySelector('.vgl-heading-icon'))return;let title=head.querySelector('h3,h2');if(title){const badge=document.createElement('span');badge.className='vgl-heading-icon';badge.innerHTML=vglIcon(vglKind(title.textContent));head.prepend(badge);}});root.querySelectorAll('.tr-card').forEach((c,i)=>{c.dataset.tone=i%4;});root.querySelectorAll('.fe-card').forEach((c,i)=>{c.dataset.tone=i%4;});}
function illustrateTrackingBlocks(root=document){root.querySelectorAll('.tr-diagram g[role="button"]').forEach(g=>{if(g.querySelector('svg'))return;let r=g.querySelector('rect');if(!r)return;const x=Number(r.getAttribute('x')),y=Number(r.getAttribute('y')),w=Number(r.getAttribute('width')),kind=vglKind(g.dataset.term||g.textContent);r.setAttribute('fill','#1a3650');r.setAttribute('rx','12');g.insertAdjacentHTML('beforeend',vglSvgIcon(kind,x+w/2-13,Math.max(0,y-28),26,'#a4dace'));});}
document.addEventListener('DOMContentLoaded',()=>{const route=location.pathname.replace(/\/+$/,'');const type=route==='/front-end'||route==='/front_end.html'?'front-end':route==='/acquisition'||route==='/acquisition.html'?'acquisition':'tracking';document.body.classList.add('receiver-redesign',`chapter-${type}`);let hero=document.querySelector('.hero'),graphic=hero?.querySelector('.hero-graphic');if(hero){if(!graphic){graphic=document.createElement('div');graphic.className='hero-graphic';hero.append(graphic);}graphic.innerHTML=vglBanner(type);}vglDecorate();});
