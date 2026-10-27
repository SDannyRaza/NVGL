/* Satellite geometry and frame lessons. All live values come from the orbit API. */
const studyCamera={yaw:-.65,pitch:.65};
const TAU=2*Math.PI, degrees=x=>x*180/Math.PI;
const addV=(a,b)=>a.map((x,i)=>x+b[i]), mulV=(a,k)=>a.map(x=>x*k);
const normalizeAngle=x=>(x%TAU+TAU)%TAU;
let lessonAngle=null;
const frames=document.createElement('section');
frames.id='frames';frames.className='view';
frames.innerHTML=`<section class="card"><div class="card-head"><div><h2>Satellite position in ECI and ECEF</h2><small id="frame-caption">Same satellite and epoch · two coordinate bases</small></div></div><div class="study-grid">${['eci','ecef'].map(f=>`<div><h3>${f==='eci'?'ECI · inertial approximation':'ECEF · Earth-fixed'}</h3><canvas class="study-canvas" id="single-${f}" aria-label="${f.toUpperCase()} XYZ axes, selected satellite position and orbit"></canvas><div class="coordinate-readout" id="coords-${f}"></div><p class="diagram-note">${f==='eci'?'X points toward the reference equinox; Z is the north rotation axis in this simplified model.':'X crosses the Greenwich meridian; Y crosses 90° east; Z points north.'} Dashed lines project the satellite vector onto the coordinate planes. Distances are in kilometres.</p></div>`).join('')}</div><p class="diagram-note">Both views use the same scale and viewing direction. The curves are propagated trajectories; each ECEF sample is expressed in the Earth-fixed frame at its own epoch. The ECI view uses the app’s GMST-only approximation, not a precision J2000 realization.</p></section>`;
$('mathematics').after(frames);
const conversion=document.createElement('section');conversion.id='conversion';conversion.className='view';
conversion.innerHTML=`<section class="card lesson"><h2>From inertial coordinates to Earth-fixed coordinates</h2><p>A satellite has one physical position, but its coordinates depend on the axes used to describe it. ECI axes retain a celestial orientation; ECEF axes rotate with Earth. Both origins are at Earth’s centre of mass.</p><p><a href="https://iers-conventions.obspm.fr/conventions/content/tn36.pdf#page=43" target="_blank" rel="noopener">IERS Conventions (2010), Chapter 5 — reference frames</a> defines these axes and explains the use of rotation matrices. The interactive worked example below applies those ideas to the selected satellite.</p><table class="lesson-table"><thead><tr><th>Axis</th><th>ECI</th><th>ECEF</th></tr></thead><tbody><tr><td>X</td><td>Reference equinox direction</td><td>Equator at Greenwich (0° longitude)</td></tr><tr><td>Y</td><td>Completes the right-handed basis</td><td>Equator at 90° east longitude</td></tr><tr><td>Z</td><td>Reference north pole</td><td>Earth’s north rotation axis</td></tr></tbody></table><div class="lesson-flow"><span>1 · Choose the epoch</span><span>→ 2 · Compute sidereal angle θ</span><span>→ 3 · Rotate the coordinate components</span><span>→ 4 · Check the result</span></div></section>
<section class="card math-extra"><div class="card-head"><div><h2>Earth rotation and coordinate components</h2><small>View from above the north pole · +Z points toward you</small></div></div><div class="study-grid"><div><canvas id="rotation-lesson" class="study-canvas" aria-label="Fixed inertial axes and rotating Earth-fixed axes with satellite vector"></canvas><p class="diagram-note">The satellite vector stays fixed in space. The Earth-fixed axes rotate counterclockwise by θ; its coordinate components rotate by −θ.</p></div><div><h3>Explore the rotation angle</h3><div class="lesson-control"><label for="rotation-angle">θ</label><input id="rotation-angle" type="range" min="0" max="360" step="0.1"><output id="rotation-value"></output><button id="rotation-live">Use epoch angle</button></div><p id="rotation-mode"></p><div class="matrix">r_ECEF = Rz(−θ) r_ECI

       ⎡ cosθ   sinθ   0 ⎤
Rz(−θ)=⎢−sinθ   cosθ   0 ⎥
       ⎣   0      0    1 ⎦

x =  X cosθ + Y sinθ
y = −X sinθ + Y cosθ
z =  Z</div><p>The inverse is the transpose: r_ECI = Rz(+θ) r_ECEF. Here Rz(+θ) denotes an active right-handed rotation; stating the matrix avoids sign-convention ambiguity.</p></div></div></section>
<section class="card lesson math-extra"><h2>Worked conversion for <span id="conversion-sat"></span></h2><p id="conversion-epoch"></p><div id="conversion-numbers" class="matrix"></div><p id="conversion-check"></p></section>
<section class="card lesson math-extra"><h2>Epoch, time scales, and model accuracy</h2><h3>1 · Convert the observation time</h3><p>The observation epoch is labelled in GPS time. The app subtracts the navigation dataset’s leap-second offset to obtain UTC. Earth rotation is formally tied to UT1; this classroom model approximates UT1 with UTC.</p><h3>2 · Evaluate Greenwich mean sidereal time</h3><div class="matrix">T = (JD − 2451545.0) / 36525
θ = [280.46061837 + 360.98564736629(JD − 2451545.0)
     + 0.000387933 T² − T³/38710000] mod 360°</div><p>JD is the Julian date computed from the UTC epoch in this implementation. Convert θ to radians before applying sine and cosine.</p><h3>3 · Apply the rotation at the same epoch</h3><p>The matrix above rotates a position vector about a shared Z axis. It preserves vector length and the Z component. Do not apply it directly to velocity without accounting for the moving axes: v_ECEF = Rz(−θ)v_ECI − ω_E × r_ECEF.</p><h3>4 · Understand the approximation</h3><p>The IERS reference distinguishes a fixed reference-epoch celestial frame from the rotating terrestrial frame. A full celestial-to-terrestrial conversion also needs celestial pole motion (including precession and nutation), Earth rotation, and polar motion. The app omits those pole corrections and uses GMST with UTC, so its ECI coordinates are an educational approximation and must not be labelled precision J2000 coordinates.</p><p>For the rigorous frame chain, <a href="https://iers-conventions.obspm.fr/conventions/content/tn36.pdf#page=43" target="_blank" rel="noopener">IERS Conventions (2010), Chapter 5</a> defines r_GCRS = Q R W r_ITRS. The inverse is r_ITRS = Wᵀ Rᵀ Qᵀ r_GCRS. This full chain requires consistent Earth-orientation data and time scales.</p><p><a href="https://iers-conventions.obspm.fr/conventions/content/tn36.pdf#page=43" target="_blank" rel="noopener">IERS Conventions (2010), Chapter 5 — reference frames</a> · <a href="https://iers-conventions.obspm.fr/conventions/content/tn36.pdf#page=43" target="_blank" rel="noopener">IERS Conventions (2010), Chapter 5 — reference frames</a></p></section>`;
frames.after(conversion);

function switchStudyTab(b){
 document.body.classList.toggle('study-mode',b.dataset.view!=='dashboard');
 document.querySelectorAll('.page-tab').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));
 $('satellite-toolbar').classList.toggle('hidden',b.dataset.view==='dashboard');
 if(b.dataset.view==='dashboard'){drawAll();fitGroundViewport(false)}
 renderStudy();if(b.dataset.view==='mathematics')drawTransforms();
}
document.querySelectorAll('.page-tab').forEach(b=>b.onclick=()=>switchStudyTab(b));
function fitGroundViewport(home){
 if(!groundMap||!$('dashboard').classList.contains('active'))return;
 const size=groundMap.getSize();
 // Fit the square Mercator world *around* the viewport, preventing blank margins.
 const min=Math.ceil(Math.log2(Math.max(size.x,size.y)/256)*10)/10;
 groundMap.setMinZoom(min);
 if(home||!groundMap._studyFitted){groundMap.setView([0,0],min,{animate:false});groundMap._studyFitted=true}
}
function addLocalGroundBase(){
 // Keep geographic context visible while online imagery loads or is unavailable.
 const Base=L.GridLayer.extend({createTile(coords){
  const tile=document.createElement('canvas');tile.width=tile.height=256;
  const c=tile.getContext('2d');c.fillStyle='#14334b';c.fillRect(0,0,256,256);
  const project=([lon,lat])=>{const p=groundMap.project(L.latLng(clamp(lat,-85,85),lon),coords.z);return [p.x-coords.x*256,p.y-coords.y*256]};
  c.strokeStyle='#47748b';c.fillStyle='#385f69';c.lineWidth=.8;
  for(const polygon of LAND_POLYS){c.beginPath();polygon.forEach((v,i)=>{const q=project(v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fill();c.stroke()}
  c.strokeStyle='#7291a333';
  for(let lon=-180;lon<=180;lon+=30){c.beginPath();c.moveTo(...project([lon,-85]));c.lineTo(...project([lon,85]));c.stroke()}
  for(let lat=-60;lat<=60;lat+=30){c.beginPath();c.moveTo(...project([-180,lat]));c.lineTo(...project([180,lat]));c.stroke()}
  return tile;
 }});
 new Base({noWrap:true,attribution:'Local schematic basemap when online tiles are unavailable'}).addTo(groundMap);
}
$('ground-home').onclick=()=>fitGroundViewport(true);
$('geometry-home').onclick=()=>{studyCamera.yaw=-.65;studyCamera.pitch=.65;renderStudy()};
$('study-epoch').oninput=()=>{$('epoch').value=$('study-epoch').value;clearTimeout(window._studyEpoch);window._studyEpoch=setTimeout(()=>refresh(),160)};
$('rotation-angle').oninput=()=>{lessonAngle=Number($('rotation-angle').value)*Math.PI/180;drawConversion()};
$('rotation-live').onclick=()=>{lessonAngle=null;drawConversion()};
function chosenSatellite(){return snap?.satellites.find(s=>s.sat===snap.selected_sat&&s.status==='ok')}
function renderStudy(){
 if(!snap)return;
 const sat=chosenSatellite();
 $('study-epoch').max=$('epoch').max;$('study-epoch').value=snap.epoch_index;
 $('study-time').textContent='GPS '+snap.epoch_gps.replace('+00:00','');
 $('math-summary').innerHTML=`<span>Satellite</span><code>${snap.selected_sat}</code><span>Epoch</span><code>${snap.epoch_index+1}</code><span>Azimuth</span><code>${fmt(sat?.az_deg,2)}°</code><span>Elevation</span><code>${fmt(sat?.el_deg,2)}°</code>`;
 $('satellite-chips').replaceChildren(...snap.satellites.filter(s=>s.status==='ok').map(s=>{const b=document.createElement('button');b.className='filter-btn'+(s.sat===snap.selected_sat?' active':'');b.textContent=s.sat;b.setAttribute('aria-pressed',String(s.sat===snap.selected_sat));b.title=sysNames[s.system];b.onclick=()=>refresh(s.sat);return b}));
 const g=snap.geometry;
 $('geometry-caption').textContent=`${snap.selected_sat} · ${sat?.name||''} · instantaneous two-body geometry`;
 $('element-values').innerHTML=g?[[`a`,fmt(g.a/1000,2)+' km','Semi-major axis'],['e',fmt(g.e,6),'Eccentricity'],['i',fmt(degrees(g.i),2)+'°','Inclination'],['Ω',g.equatorial?'Undefined':fmt(degrees(g.Omega),2)+'°','Inertial ascending node'],['ω',g.circular||g.equatorial?'Undefined':fmt(degrees(g.omega),2)+'°','Argument of perigee'],['ν',g.circular?'Undefined':fmt(degrees(g.nu),2)+'°','True anomaly']].map(([k,v,l])=>`<div class="element-value"><small>${k} · ${l}</small><strong>${v}</strong></div>`).join(''):'<p>No bound Keplerian ellipse is available for this state.</p>';
 if($('mathematics').classList.contains('active')){drawKepler();drawShape()}
 if($('frames').classList.contains('active')){drawSingleFrame('eci');drawSingleFrame('ecef');$('frame-caption').textContent=snap.selected_sat+' · UTC '+snap.epoch_utc.replace('+00:00','')}
 if($('conversion').classList.contains('active'))drawConversion();
}
function scene(id,extent){
 const {ctx,w,h}=resize($(id));ctx.clearRect(0,0,w,h);ctx.fillStyle='#091521';ctx.fillRect(0,0,w,h);
 const scale=Math.min(w,h)*.33/extent;
 // Oblique orthographic camera with a visible north axis.
 const project=v=>{const co=Math.cos(studyCamera.yaw),si=Math.sin(studyCamera.yaw),cp=Math.cos(studyCamera.pitch),sp=Math.sin(studyCamera.pitch);const x=co*v[0]-si*v[1],y=si*v[0]+co*v[1];return[w/2+x*scale,h*.53+(sp*y-cp*v[2])*scale]};
 const line=(points,color,width=1.5,dash=[])=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();ctx.setLineDash([])};
 const text=(v,label,color='#d8e9f5')=>{const p=project(v);ctx.font='12px Segoe UI';ctx.fillStyle=color;ctx.fillText(label,Math.max(8,Math.min(w-85,p[0]+7)),Math.max(18,Math.min(h-12,p[1]-7)))};
 const arrow=(v,color,label)=>{const a=project([0,0,0]),b=project(v);drawArrow2D(ctx,...a,...b,color,'');if(label)text(v,label,color)};
 return {ctx,w,h,project,line,text,arrow};
}
function drawKepler(){
 const g=snap.geometry,s=scene('kepler-orbit',g?g.a*(1+g.e):1);if(!g)return;
 const {ctx,project,line,text,arrow}=s,R=g.a*1.1;
 const circle=(fn,start=0,end=TAU)=>Array.from({length:121},(_,j)=>fn(start+(end-start)*j/120));
 const plane=circle(t=>[R*Math.cos(t),R*Math.sin(t),0]);ctx.beginPath();plane.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.closePath();ctx.fillStyle='#25476155';ctx.fill();line(plane,'#436681');
 arrow([R,0,0],'#ff8f8f','X ECI');arrow([0,R,0],'#75dfbb','Y ECI');arrow([0,0,R],'#71bbff','Z ECI');
 const orbit=t=>addV(mulV(g.p,g.a*(Math.cos(t)-g.e)),mulV(g.q,g.a*Math.sqrt(1-g.e*g.e)*Math.sin(t)));
 line(circle(orbit),'#66e0d0',2.5);
 line([mulV(g.node,-R),mulV(g.node,R)],'#ffce7a',1.5,[5,5]);text(mulV(g.node,R),'Ascending node','#ffce7a');
 arrow(mulV(g.p,g.a*(1-g.e)),'#bfa1ff','Perigee');
 const sv=chosenSatellite();if(sv){arrow(sv.eci_m,'#ffffff');const p=project(sv.eci_m);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(...p,5,0,TAU);ctx.fill();text(sv.eci_m,sv.sat)}
 const origin=project([0,0,0]);ctx.fillStyle='#2c88b1';ctx.beginPath();ctx.arc(...origin,Math.max(4,Math.min(s.w,s.h)*.33*6378137/(g.a*(1+g.e))),0,TAU);ctx.fill();text([0,0,0],'Earth');
 line(circle(t=>[R*.3*Math.cos(t),R*.3*Math.sin(t),0],0,g.Omega),'#ffce7a',2);text([R*.34*Math.cos(g.Omega/2),R*.34*Math.sin(g.Omega/2),0],'Ω','#ffce7a');
 const inPlane=t=>addV(mulV(g.node,Math.cos(t)),mulV(addV(mulV(g.p,-Math.sin(g.omega)),mulV(g.q,Math.cos(g.omega))),Math.sin(t)));
 line(circle(t=>mulV(inPlane(t),R*.45),0,g.omega),'#bfa1ff',2);text(mulV(inPlane(g.omega/2),R*.48),'ω','#bfa1ff');
 line(circle(t=>mulV(addV(mulV(g.p,Math.cos(t)),mulV(g.q,Math.sin(t))),R*.6),0,g.nu),'#f4ef9a',2);text(mulV(addV(mulV(g.p,Math.cos(g.nu/2)),mulV(g.q,Math.sin(g.nu/2))),R*.63),'ν','#f4ef9a');
 const tangent=[-g.node[1],g.node[0],0];const tilt=t=>[tangent[0]*Math.cos(t)*R*.8,tangent[1]*Math.cos(t)*R*.8,Math.sin(t)*R*.8];
 line(circle(tilt,0,g.i),'#ff91a4',2);text(tilt(g.i/2),'i','#ff91a4');
}
function drawShape(){
 const {ctx,w,h}=resize($('kepler-shape'));ctx.clearRect(0,0,w,h);const g=snap.geometry;if(!g)return;
 const a=Math.min(w*.34,h*.32),b=a*Math.sqrt(1-g.e*g.e),cx=w/2,cy=h*.52,fx=cx+a*g.e;
 ctx.strokeStyle='#69e1d0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,a,b,0,0,TAU);ctx.stroke();
 const radius=g.a*(1-g.e*g.e)/(1+g.e*Math.cos(g.nu)),x=fx+radius/g.a*a*Math.cos(g.nu),y=cy-radius/g.a*a*Math.sin(g.nu);
 drawArrow2D(ctx,fx,cy,x,y,'#fff',snap.selected_sat);
 drawArrow2D(ctx,cx,cy+12,cx+a,cy+12,'#70bbff','');ctx.fillStyle='#70bbff';ctx.font='13px Segoe UI';ctx.fillText('a = '+fmt(g.a/1000,1)+' km',cx-20,cy+34);
 ctx.setLineDash([4,4]);ctx.strokeStyle='#54728a';ctx.beginPath();ctx.moveTo(cx-a-15,cy);ctx.lineTo(cx+a+15,cy);ctx.stroke();ctx.setLineDash([]);
 for(const [px,label,color] of [[cx,'Centre','#859eb3'],[fx,'Earth / focus','#ffce7a']]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,cy,4,0,TAU);ctx.fill();ctx.fillText(label,px-30,label==='Centre'?cy+55:cy-16)}
 ctx.fillStyle='#c2adff';ctx.fillText('Perigee',cx+a-20,cy-18);
 drawAngleArc(ctx,fx,cy,a*.32,0,-g.nu,'#f4ef9a','ν');
 ctx.fillStyle='#adc5d8';ctx.fillText('e = c/a = '+fmt(g.e,6),16,26);ctx.fillText('r = '+fmt(radius/1000,2)+' km',16,h-20);
}
function drawSingleFrame(frame){
 const sat=chosenSatellite();if(!sat)return;const track=snap.tracks.find(t=>t.sat===sat.sat);const points=track?.[frame+'_m']||[];
 const max=Math.max(Math.hypot(...sat.eci_m),...((track?.eci_m||[]).map(v=>Math.hypot(...v))),6378137)*1.08;
 const {ctx,project,line,text,arrow}=scene('single-'+frame,max);
 for(const [axis,color,j] of [['X','#ff8f8f',0],['Y','#75dfbb',1],['Z','#71bbff',2]]){const v=[0,0,0];v[j]=max;arrow(v,color,axis);v[j]=-max;line([[0,0,0],v],color,1,[3,5])}
 const origin=project([0,0,0]);ctx.fillStyle='#247ba2';ctx.beginPath();ctx.arc(...origin,Math.min(ctx.canvas.clientWidth,ctx.canvas.clientHeight)*.33*6378137/max,0,TAU);ctx.fill();text([0,0,0],'Earth');
 if(points.length)line(points,colors[sat.system],1.8);
 const v=sat[frame+'_m'];line([v,[v[0],v[1],0],[v[0],0,0]],'#c5d8e9',1,[4,4]);line([[v[0],v[1],0],[0,v[1],0]],'#c5d8e9',1,[4,4]);line([v,[0,0,v[2]]],'#c5d8e9',1,[4,4]);arrow(v,'#fff',sat.sat);
 const p=project(v);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(...p,5,0,TAU);ctx.fill();
 $('coords-'+frame).innerHTML=v.map((x,j)=>`<div><strong>${'XYZ'[j]}</strong>${fmt(x/1000,3)} km</div>`).join('');
}
function drawConversion(){
 const sat=chosenSatellite();if(!sat)return;
 const th=lessonAngle??snap.gmst_rad,c=Math.cos(th),s=Math.sin(th),[X,Y,Z]=sat.eci_m;
 const out=[c*X+s*Y,-s*X+c*Y,Z];
 $('rotation-angle').value=degrees(th);$('rotation-value').textContent=fmt(degrees(th),3)+'°';
 $('rotation-mode').textContent=lessonAngle===null?'Live angle at the selected epoch.':'Exploration mode: the ECI vector is held fixed while you rotate the axes. Use epoch angle to restore the actual ECEF position.';
 $('conversion-sat').textContent=sat.sat;$('conversion-epoch').textContent='UTC '+snap.epoch_utc.replace('+00:00','')+' · θ = '+fmt(th,8)+' rad';
 $('conversion-numbers').textContent=`Input ECI (km): [${sat.eci_m.map(x=>fmt(x/1000,6)).join(', ')}]\n\ncosθ = ${fmt(c,9)}; sinθ = ${fmt(s,9)}\nx = (${fmt(c,6)}) × (${fmt(X/1000,6)}) + (${fmt(s,6)}) × (${fmt(Y/1000,6)})\n  = ${fmt(out[0]/1000,6)} km\ny = −(${fmt(s,6)}) × (${fmt(X/1000,6)}) + (${fmt(c,6)}) × (${fmt(Y/1000,6)})\n  = ${fmt(out[1]/1000,6)} km\nz = ${fmt(Z/1000,6)} km\n\n${lessonAngle===null?'Epoch ECEF':'Exploration coordinates'} (km): [${out.map(x=>fmt(x/1000,6)).join(', ')}]`;
 const residual=Math.hypot(...out.map((x,j)=>x-sat.ecef_m[j]));
 $('conversion-check').textContent=`Length preserved: ${fmt(Math.hypot(...out)/1000,6)} km. Z is unchanged. `+(lessonAngle===null?`Difference from the propagated ECEF position: ${residual.toExponential(2)} m.`:'These exploration coordinates use your chosen angle, not the epoch angle.');
 const {ctx,w,h}=resize($('rotation-lesson')),cx=w/2,cy=h/2,R=Math.min(w,h)*.33;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#164663';ctx.beginPath();ctx.arc(cx,cy,R*.48,0,TAU);ctx.fill();
 drawArrow2D(ctx,cx,cy,cx+R,cy,'#bca5ff','X ECI');drawArrow2D(ctx,cx,cy,cx,cy-R,'#bca5ff','Y ECI');
 drawArrow2D(ctx,cx,cy,cx+R*c,cy-R*s,'#68e0bd','x ECEF');drawArrow2D(ctx,cx,cy,cx-R*s,cy-R*c,'#68e0bd','y ECEF');
 drawAngleArc(ctx,cx,cy,R*.65,0,-th,'#ffd27b','θ');
 const scale=R*.9/Math.max(Math.hypot(X,Y),1);drawArrow2D(ctx,cx,cy,cx+X*scale,cy-Y*scale,'#fff',sat.sat);
 ctx.fillStyle='#adc5d8';ctx.font='12px Segoe UI';ctx.fillText('+Z ECI / +z ECEF: out of screen',14,h-18);
}
for(const id of ['kepler-orbit','single-eci','single-ecef']){
 const canvas=$(id);canvas.classList.add('interactive');let last=null;
 canvas.onpointerdown=e=>{last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!last)return;studyCamera.yaw+=(e.clientX-last[0])*.008;studyCamera.pitch=clamp(studyCamera.pitch+(e.clientY-last[1])*.008,-1.4,1.4);last=[e.clientX,e.clientY];renderStudy()};
 canvas.onpointerup=canvas.onpointercancel=()=>last=null;
}
window.addEventListener('resize',()=>{clearTimeout(window._studyResize);window._studyResize=setTimeout(()=>{fitGroundViewport(false);renderStudy()},160)});
init();
