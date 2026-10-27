/* Teaching layout and data-derived diagrams. Numerical models remain in spp/. */
window.SPPStudio = (() => {
  let chapter = 'observations', mathStep = '01', errorStep = 'C1', errorPanel='sources', svgSerial=0;
  const chapters = [
    ['without','01','SPP without errors','Geometric pseudorange model · least squares · DOP · accuracy'],
    ['with','02','SPP with errors','Clock · atmosphere · relativity · code bias · error assessment']
  ];
  const shortNames = ['Observation epoch','Broadcast satellite position','Geometric range','Pseudorange model','Initial receiver estimate','Linearization','Geometry matrix H','Observation vector','Least-squares update','Iterative convergence','Coordinates & local frame','Geometry → DOP'];
  const sourceTopics = [
    ['clock','Satellite clock','§7.2.1 · p.304','Broadcast polynomial: af₀ + af₁Δt + af₂Δt². A range correction is not the uncertainty left after applying it.'],
    ['orbit','Ephemeris error','§7.2.2 · pp.305–306','Only the orbit-error component projected onto the line of sight affects range to first order: δρ ≈ uᵀδrₛ. No precise orbit is loaded, so the true ephemeris error is unavailable.'],
    ['relativity','Relativity & Earth rotation','§7.2.3 · pp.306–308','The eccentric-orbit clock term and reception-frame Earth rotation are separate calculations. Earth rotation has its own independent switch; it is retained in the original five presets.'],
    ['ionosphere','Ionosphere','§7.2.4.1 · pp.310–314','Code group delay is positive; carrier-phase advance has the opposite sign. First-order delay scales as 1/f². Broadcast Klobuchar is a model, not a direct TEC measurement.'],
    ['troposphere','Troposphere','§7.2.4.2 · pp.314–319','Dry and wet zenith delays are mapped along the ray. This lab now uses the document’s Black–Eisner mapping with the stated Saastamoinen zenith model.'],
    ['hardware','Hardware bias','§7.2.7 · pp.320–321','Signal-dependent group delay must be distinguished from satellite clock offset. Broadcast TGD/BGD is used where supported; uncalibrated residual biases remain.'],
    ['noise','Noise & multipath','§§7.2.5–7.2.6 · p.319','A single fitted residual does not identify its physical components. Multipath, receiver noise and model errors are not directly separable here.'],
    ['uere','Error budget & geometry','§§7.2.8–7.3.2 · pp.321–332','RSS applies to independent zero-mean error standard deviations, not signed correction amplitudes. DOP maps range uncertainty into position uncertainty under the stated covariance assumptions.']
  ];
  function resize(){requestAnimationFrame(()=>{document.querySelectorAll('.js-plotly-plot').forEach(el=>{if(el.getClientRects().length&&el.offsetWidth)Plotly.Plots.resize(el);});if(typeof map!=='undefined'&&map&&$('map').getClientRects().length)map.invalidateSize();});}
  function selectChapter(value){
    if(value==='with' && !analyzer){ location.href='/spp-analyzer?'+new URLSearchParams({epoch:$('epoch').value,mode,case:$('case').value,mask:$('mask').value}); return; }
    if(value==='without' && analyzer){ location.href='/spp?'+new URLSearchParams({epoch:$('epoch').value,mode,case:$('case').value,mask:$('mask').value}); return; }
    document.querySelectorAll('[data-open-chapter]').forEach(b=>{const on=b.dataset.openChapter===(analyzer?'with':'without');b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    if(analyzer){
      if($('results')) $('results').hidden=true;
      if($('math')) $('math').hidden=false;
      if($('series-section')) $('series-section').hidden=false;
      if($('student-task')) $('student-task').hidden=false;
      if($('receiver-summary')) $('receiver-summary').hidden=false;
      if($('analyzer')) $('analyzer').hidden=false;
    }else{
      if($('results')) $('results').hidden=false;
      if($('math')) $('math').hidden=false;
      if($('series-section')) $('series-section').hidden=false;
      if($('student-task')) $('student-task').hidden=false;
      if($('receiver-summary')) $('receiver-summary').hidden=false;
      if($('analyzer')) $('analyzer').hidden=true;
    }
    resize(); setTimeout(resize,120);
  }

  function sectionDefinitions(){
    return analyzer ? [
      ['error-summary-page','01','GNSS Error Contribution Summary','Start with the overall contribution summary and receiver-state response.'],
      ['correction-switches','02','Correction Model Configuration','Enable or omit the physical correction models used in the receiver solution.'],
      ['error-sources','03','GNSS Pseudorange Error Models','Inspect satellite clock, atmospheric, relativistic and group-delay mathematics.'],
      ['corrections','04','Correction Mathematics by Satellite','Follow the numerical correction terms for the selected satellite and epoch.'],
      ['error-impact','05','Receiver-State and Accuracy Response','Compare corrected solutions, residuals and RMSE response.']
    ] : [
      ['receiver-summary','01','Pseudorange Observation Model and Receiver Solution','Review live observables, constellation geometry and the current SPP solution.'],
      ['math','02','Linearized Pseudorange Positioning Mathematics','Follow geometric range, Taylor linearization, H matrix and iterative least squares.'],
      ['series-section','03','Position Accuracy, Precision and RMSE','Inspect ENU scatter, accuracy statistics, DOP and geographic position results.'],
      ['student-task','04','GNSS SPP Laboratory Exercise','Review the required mathematical and analytical deliverables.']
    ];
  }
  function setSectionCardActive(id){
    document.querySelectorAll('#section-card-nav [data-scroll-target]').forEach(btn=>btn.classList.toggle('active', btn.dataset.scrollTarget===id));
  }
  function scrollToSection(id){
    const target=$(id);
    if(!target) return;
    setSectionCardActive(id);
    target.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(resize,350);
  }
  function observeSections(){
    if(window.__sppSectionObserver) window.__sppSectionObserver.disconnect();
    const nodes=sectionDefinitions().map(([id])=>$(id)).filter(Boolean);
    if(!nodes.length || !('IntersectionObserver' in window)) return;
    window.__sppSectionObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) setSectionCardActive(visible.target.id);
    },{rootMargin:'-18% 0px -62% 0px',threshold:[0,.08,.2,.5]});
    nodes.forEach(n=>window.__sppSectionObserver.observe(n));
  }
  function buildSectionNavigator(){
    const old=$('section-card-nav'); if(old) old.remove();
    const nav=document.createElement('nav');
    nav.id='section-card-nav';
    nav.className='section-card-nav';
    nav.setAttribute('aria-label', analyzer?'SPP with errors section navigation':'SPP without errors section navigation');
    nav.innerHTML=sectionDefinitions().map(([id,n,title,desc],i)=>`<button type="button" data-scroll-target="${id}" ${i===0?'class="active"':''}><span class="nav-index">${n}</span><span><strong>${title}</strong><small>${desc}</small></span></button>`).join('');
    $('studio-nav').after(nav);
    nav.querySelectorAll('[data-scroll-target]').forEach(btn=>btn.onclick=()=>scrollToSection(btn.dataset.scrollTarget));
    requestAnimationFrame(observeSections);
  }
  function refreshSectionNavigator(){ buildSectionNavigator(); }

  function init(){
    document.body.classList.add('studio');
    chapter=analyzer?'with':'without';
    const hero=document.querySelector('.hero');
    hero.innerHTML=`<div class="hero-copy"><div class="eyebrow">Virtual GNSS laboratory / Positioning studio</div><h1 id="title">${analyzer?'SPP Measurement Errors and<br><em>Corrected Position Estimation</em>':'Single Point Positioning:<br><em>Pseudorange to Receiver Coordinates</em>'}</h1><p id="intro">${analyzer?'Apply satellite-clock, relativistic, ionospheric, tropospheric, group-delay and Earth-rotation models, then quantify their influence on the corrected receiver solution.':'Derive the receiver position from RINEX code observations and broadcast satellite coordinates using geometric range, linearization, the geometry matrix and iterative least squares.'}</p><p id="files" class="mono"></p></div><div class="hero-diagram"><svg viewBox="0 0 440 230" role="img" aria-label="Observation to position conceptual workflow"><defs><linearGradient id="hero-glow"><stop stop-color="#62d8f5"/><stop offset="1" stop-color="#9b91ef"/></linearGradient></defs><g fill="none" stroke="#29465c"><ellipse cx="220" cy="113" rx="150" ry="67" transform="rotate(-22 220 113)"/><ellipse cx="220" cy="113" rx="100" ry="90" transform="rotate(35 220 113)"/></g><g stroke="url(#hero-glow)" stroke-width="1.8" stroke-dasharray="4 5"><path d="M86 86L230 161L351 73M161 26L230 161L286 33"/></g><g fill="#081825" stroke="#6cd9ec" stroke-width="2"><rect x="78" y="78" width="16" height="16" rx="3"/><rect x="153" y="18" width="16" height="16" rx="3"/><rect x="278" y="25" width="16" height="16" rx="3"/><rect x="343" y="65" width="16" height="16" rx="3"/><circle cx="230" cy="161" r="10"/></g><g fill="#bfdbe8" font-family="Segoe UI" font-size="12"><text x="176" y="195">X · Y · Z · receiver clock</text><text x="106" y="225">CONCEPTUAL WORKFLOW · NOT ORBIT DATA</text></g></svg></div>`;
    $('files').textContent=`${meta.epoch_count.toLocaleString()} epochs · ${meta.obs_file} + ${meta.nav_file}`;
    const controls=document.querySelector('.shell > .controls');controls.classList.add('session-controls');
    document.querySelector('.modes').classList.add('session-modes');
    const oldFlow=document.querySelector('.shell > .flow');oldFlow.remove();
    const note=$('model-note'),details=document.createElement('details');details.className='model-disclosure';details.innerHTML='<summary>Model assumptions & correction state <span>Inspect the active scientific model</span></summary>';note.before(details);details.append(note);
    const nav=document.createElement('nav');nav.id='studio-nav';nav.setAttribute('aria-label','Positioning workflow');nav.setAttribute('role','tablist');
    nav.innerHTML=chapters.map(([id,n,title,desc])=>`<button data-open-chapter="${id}" role="tab"><span class="chapter-number">${n}</span><span><strong>${title}</strong><small>${desc}</small></span></button>`).join('');$('legend').after(nav);
    buildSectionNavigator();
    const summary=document.createElement('section');summary.id='receiver-summary';$('series-section').before(summary);
    const unavailable=document.createElement('p');unavailable.id='math-unavailable';unavailable.hidden=true;unavailable.className='failure';$('math').prepend(unavailable);
    const errorHeader=document.createElement('div');errorHeader.id='error-overview';$('comparison').before(errorHeader);
    const errorControls=document.createElement('div');errorControls.className='error-case-switch';errorControls.id='error-case-switch';$('comparison').before(errorControls);
    const errorNav=document.createElement('div');errorNav.className='error-satellite-control';errorControls.after(errorNav);
    errorNav.innerHTML='<span class="section-label">Satellite-specific correction inspection</span><label>Selected satellite <select id="error-satellite"></select></label><p>Choose one satellite to inspect its clock, atmospheric, relativistic and range-correction terms using the current epoch and correction configuration.</p>';
    const sources=document.createElement('section');sources.id='error-sources';errorNav.after(sources);
    const impact=document.createElement('section');impact.id='error-impact';sources.after(impact);
    for(const id of ['comparison','compare-plot','compare-series','stop-comparison','comparison-progress','comparison-rmse'])impact.append($(id));
    
    const mapHeader=$('series-section').querySelector('h2');mapHeader.textContent='Position accuracy, RMSE and geographic visualization';
    document.addEventListener('click',e=>{const ch=e.target.closest('[data-open-chapter]');if(ch)selectChapter(ch.dataset.openChapter);const c=e.target.closest('[data-case-select]');if(c){$('case').value=c.dataset.caseSelect;refresh();}const topic=e.target.closest('[data-error-topic]');if(topic)showTopic(topic.dataset.errorTopic);});
    selectChapter(chapter);
    buildSectionNavigator();
  }
  function results(){
    const summary=$('receiver-summary');purgePlots('receiver-summary');summary.replaceChildren();
    if(solution?.ok){
      const block=$('solution-summary');summary.append(block);
      const root=$('results').querySelector('section');
      const measurementTitle=Array.from(root.children).find(el=>el.tagName==='H3');
      if(measurementTitle){const intro=measurementTitle.nextElementSibling,tbl=intro.nextElementSibling;root.prepend(measurementTitle,intro,tbl);}
      root.insertAdjacentHTML('afterbegin','<div class="section-label">01 / Observation model</div><h2>Measured observables and satellite geometry</h2><p>Begin with the code pseudorange observations and the broadcast satellite coordinates used by the solver. Select a satellite here to follow the same signal through the mathematical solution.</p>');
      root.querySelectorAll('.grid > div').forEach(el=>el.classList.add('figure-panel'));
      summary.insertAdjacentHTML('beforeend',`<div class="solution-callout"><span>CONVERGED SOLUTION</span><strong>${f(solution.geodetic.lat_deg,6)}° N &nbsp; ${f(solution.geodetic.lon_deg,6)}° E</strong><small>${solution.count} satellites · ${solution.iterations.length} iterations · ${f(solution.residual_rms_m)} m residual RMS</small></div>`);
      $('math-unavailable').hidden=true;
    }else{summary.innerHTML='<p class="failure">Receiver solution unavailable for this epoch. See observation diagnostics.</p>';$('math-unavailable').hidden=false;$('math-unavailable').textContent=solution?.error||'Solution unavailable';$('steps').replaceChildren();}
    selectChapter(chapter);
    buildSectionNavigator();
  }
  function lessonNavigation(container,group){
    container.querySelectorAll(':scope > .step').forEach(el=>{el.classList.add('active');el.hidden=false;});
    const old=container.parentElement.querySelector('.lesson-nav'); if(old) old.remove();
  }
  function selectLesson(n,group='math'){
    if(group==='math')mathStep=n;else errorStep=n;
    const container=$(group==='math'?'steps':'error-lessons');if(!container)return;
    container.querySelectorAll(':scope > .step').forEach(el=>el.classList.toggle('active',el.dataset.step===n));
    container.parentElement.querySelectorAll('[data-lesson]').forEach(b=>{const on=b.dataset.lesson===n;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'step':'false');});
    resize();setTimeout(resize,100);
  }
  function svgFrame(title,content,caption){const arrowId='spp-arrow-'+(++svgSerial);return `<div class="viz-eyebrow">${title}</div><svg viewBox="0 0 580 340" role="img" aria-label="${esc(title)}"><defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#74d9ed"/></marker></defs>${content.replaceAll('url(#arrow-tip)','url(#'+arrowId+')')}</svg><p class="viz-caption">${caption}</p>`;}
  const text=(x,y,t,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(t)}</text>`;
  function box(x,y,w,h,title,value,color='#74d9ed'){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#122a40" stroke="${color}" stroke-opacity=".55"/>${text(x+18,y+28,title,'svg-label')}${text(x+18,y+60,value,'svg-value')}`;}
  function chain(items){return items.map((item,i)=>box(40,15+i*100,500,78,item[0],item[1])+(i<items.length-1?`<path d="M290 ${93+i*100}v20" stroke="#74d9ed" marker-end="url(#arrow-tip)"/>`:'')).join('');}
  function projection(s,w){
    const points=[w.state.slice(0,3),s.ecef_m],minX=Math.min(0,...points.map(p=>p[0])),maxX=Math.max(0,...points.map(p=>p[0])),minZ=Math.min(0,...points.map(p=>p[2])),maxZ=Math.max(0,...points.map(p=>p[2]));const span=Math.max(maxX-minX,maxZ-minZ,1),X=x=>150+240*(x-minX)/span,Y=z=>285-240*(z-minZ)/span;
    return svgFrame('Satellite–receiver geometry · ECEF X–Z projection',`<path d="M50 ${Y(0)}H535M${X(0)} 305V30" stroke="#46677e"/>${text(493,318,'X [km]')}${text(15,30,'Z [km]')}<path d="M${X(points[0][0])} ${Y(points[0][2])}L${X(points[1][0])} ${Y(points[1][2])}" stroke="${C[s.system]}" stroke-width="3"/>${points.map((p,i)=>`<circle cx="${X(p[0])}" cy="${Y(p[2])}" r="7" fill="${i?C[s.system]:'#fff'}"/>${text(Math.min(X(p[0])+12,405),Y(p[2])-12,i?s.sat:'Receiver')}`).join('')}${text(300,25,'Full 3D range = '+f(s.range_m/1000,3)+' km')}${text(300,50,'ΔY = '+f((s.ecef_m[1]-points[0][1])/1000,3)+' km')}`,`The line uses actual ECEF coordinates. Y is omitted from this projection; the displayed range includes all three components. Receiver X/Z: ${f(points[0][0]/1000,2)} / ${f(points[0][2]/1000,2)} km; satellite X/Z: ${f(points[1][0]/1000,2)} / ${f(points[1][2]/1000,2)} km.`);
  }
  function math(){
    if(!solution?.ok)return;
    const r=solution,w=r.iterations[+$('iteration').value||0],s=w.rows.find(x=>x.sat===selectedSat)||w.rows[0];
    const visuals={
      '01':svgFrame('One observed code range',chain([['OBSERVATION',s.sat+' · '+s.code],['PSEUDORANGE',f(s.pseudorange_m,3)+' m'],['CODE TIME DIFFERENCE',f(s.pseudorange_m/299792458*1000,6)+' ms']]),'The measured interval includes clock offsets and propagation effects; it is not the geometric travel time.'),
      '02':svgFrame('NAV → propagation → reception-frame ECEF',chain([['BROADCAST RECORD',s.sat+' · '+s.nav_time_system],['CONSTELLATION ENGINE',names[s.system]+' orbit propagation'],['SATELLITE ECEF [km]',s.ecef_m.map(v=>f(v/1000,1)).join(' / ')]]),'The orbit engine computes the transmit-time position. Reception-frame rotation is applied only when the Earth rotation switch is ON.'),
      '03':projection(s,w),
      '04':svgFrame('Measured range → modeled range',chain([['MEASURED CODE',f(s.pseudorange_m)+' m'],['APPLIED CORRECTION',f(s.corrected_m-s.pseudorange_m)+' m'],['CORRECTED CODE',f(s.corrected_m)+' m']]),'Signs follow Pcorrected = P + cδtsv − I − T − B. Disabled terms contribute zero by model choice.'),
      '05':svgFrame('The starting point for linearization',chain([['INITIAL RECEIVER ECEF [km]',r.initial.slice(0,3).map(v=>f(v/1000,2)).join(' / ')],['CURRENT ITERATION',String(w.iteration)],['POSITION UPDATE NORM',f(w.correction_m,6)+' m']]),'Only the starting position comes from the header. Each subsequent estimate is solved from the observations.'),
      '08':svgFrame('One row of the observation vector',chain([['CORRECTED PSEUDORANGE',f(s.corrected_m)+' m'],['RANGE + RECEIVER CLOCK',f(s.corrected_m-s.misclosure_m)+' m'],['OBSERVED − COMPUTED',f(s.misclosure_m,6)+' m']]),'This pre-fit misclosure belongs to the selected satellite and iteration.'),
      '09':svgFrame('Solve → update → relinearize',chain([['SYSTEM DIMENSIONS',w.H.length+' observations × '+w.H[0].length+' states'],['SVD / LEAST SQUARES','Rank '+w.rank+' · condition '+f(w.condition,2)],['POSITION CORRECTION [m]',w.delta.slice(0,3).map(v=>f(v,5)).join(' / ')]]),'The state update includes separate constellation clock corrections, shown numerically alongside the position update.'),
      '12':svgFrame('Geometry amplifies range uncertainty',chain([['LOS → GEOMETRY MATRIX',r.count+' satellites · '+r.unknowns.length+' states'],['Q = (HᵀH)⁻¹','PDOP '+f(r.dop.PDOP)+' / HDOP '+f(r.dop.HDOP)],['LOCAL VERTICAL GEOMETRY','VDOP '+f(r.dop.VDOP)]]),'DOP is dimensionless. It becomes an uncertainty in metres only after an appropriate range covariance model is supplied.')
    };
    for(const [n,html] of Object.entries(visuals))$('lesson-viz-'+n).innerHTML=html;
    for(const [n,id] of [['06','linearization'],['07','h-heat'],['10','convergence'],['11','geodetic-viz']]){const panel=$('lesson-viz-'+n);panel.innerHTML='<div class="viz-eyebrow">'+{'06':'Nonlinear range and its tangent','07':'The actual geometry matrix','10':'Convergence of the state correction','11':'Geodetic normal and receiver position'}[n]+'</div>';panel.append($(id));}
    lessonNavigation($('steps'),'math');
  }
  function selectErrorPanel(id){ document.querySelectorAll('[data-error-pane]').forEach(el=>el.hidden=false); resize(); }
  function showTopic(id){document.querySelectorAll('[data-error-topic]').forEach(b=>b.classList.toggle('active',b.dataset.errorTopic===id));const topic=sourceTopics.find(t=>t[0]===id);if(topic)$('error-topic-detail').innerHTML=`<span class="section-label">${topic[2]}</span><h3>${topic[1]}</h3><p>${topic[3]}</p>`;}
  function errors(){
    if(!analyzer)return;
    $('error-overview').innerHTML=`<div class="error-story"><div><span class="section-label">Chapter 7 / GNSS measurement-error modeling</span><h3>A correction model is not itself an accuracy bound.</h3><p>First inspect the physical source. Then apply the modeled correction. Finally assess the residuals and receiver-position effect.</p></div><div class="error-story-equation">Range effects <span>→</span> H &amp; geometry <span>→</span> Position effects</div></div>`;
    $('error-case-switch').innerHTML=meta.cases.map((_,i)=>`<button data-case-select="${i}" class="${+$('case').value===i?'active':''}"><span>CASE ${i}</span><strong>${['Geometry','+ Clock','+ Ionosphere','+ Troposphere','+ Relativity / bias'][i]}</strong></button>`).join('');
    purgePlots('error-sources');$('error-sources').replaceChildren();
    const r=epochCases[+$('case').value]||solution;if(!r?.ok){$('error-sources').textContent=r?.error||'Correction diagnostics unavailable.';return;}
    const s=r.satellites.find(x=>x.sat===selectedSat)||r.satellites[0],a=r.error_analysis,d=a?.satellites.find(x=>x.sat===s.sat);
    const host=$('corrections');
    let lessons=document.createElement('div');lessons.id='error-lessons';const articles=Array.from(host.querySelectorAll(':scope > .step'));host.append(lessons);articles.forEach(el=>lessons.append(el));
    const atlas=document.createElement('section');atlas.className='error-atlas';atlas.innerHTML=`<div class="section-label">Source → observation → solution</div><h2>GNSS Pseudorange Error Sources and Physical Models</h2><p class="source-citation">Reference: <em>gnss positioning with errors 1.pdf</em>, Chapter 7, printed pp.301–333. Historical example budgets in the text are not substituted for measured values.</p><div class="error-atlas-layout"><nav>${sourceTopics.map(([id,title,ref],i)=>`<button data-error-topic="${id}"><span>${String(i+1).padStart(2,'0')}</span><strong>${title}</strong><small>${ref}</small></button>`).join('')}</nav><article id="error-topic-detail"></article></div>`;$('error-sources').append(atlas);showTopic('clock');
    const inspection=document.createElement('div');inspection.className='error-inspection';inspection.innerHTML=`<div class="inspection-heading"><h3>Follow one satellite through the error budget</h3></div>${table(['Effect','This epoch / selected satellite','Interpretation'],[
      ['Satellite clock polynomial',r.corrections.clock?f(d?.polynomial_clock_m)+' m':'OFF','Broadcast polynomial; independently selectable'],
      ['Periodic relativity',r.corrections.relativity?f(d?.relativity_m,6)+' m':'OFF','Independent of the satellite clock polynomial'],
      ['Earth-rotation range change',f(d?.earth_rotation_range_m,6)+' m','Applied range change; zero when Earth rotation is OFF'],
      ['Ionospheric delay',r.corrections.ionosphere?f(s.iono_m)+' m':'OFF','Broadcast-model prediction, not observed true delay'],
      ['Tropospheric delay',r.corrections.troposphere?f(s.tropo_m)+' m':'OFF','Saastamoinen zenith + Black–Eisner mapping'],
      ['Broadcast code delay',r.corrections.bias?f(s.bias_m)+' m':'OFF','TGD/BGD where supported; subtracted from code'],
      ['Post-fit residual',f(s.residual_m)+' m','Combined remaining effects after fitting position and clocks'],
      ['True ephemeris error','Unavailable','No independent precise satellite coordinates'],
      ['Multipath / receiver noise','Not directly separable','No invented deterministic corrections']])}`;atlas.after(inspection);$('error-satellite').innerHTML=r.satellites.map(row=>`<option ${row.sat===s.sat?'selected':''}>${row.sat}</option>`).join('');$('error-satellite').onchange=()=>chooseSat($('error-satellite').value);
    for(const [n,title,items,caption] of [
      ['C1','Satellite clock → equivalent range',[['BROADCAST POLYNOMIAL',exp(s.clock.polynomial_s)+' s'],['MULTIPLY BY c',f(d?.polynomial_clock_m)+' m'],['APPLIED CLOCK TERM',f(s.clock_m)+' m']],'The applied term includes the clock polynomial and/or relativity only when their independent switches are ON.'],
      ['C2','Relativity and Earth rotation are separate',[['PERIODIC CLOCK TERM',f(d?.relativity_m,6)+' m'],['EARTH ROTATION / RANGE',f(d?.earth_rotation_range_m,6)+' m'],['GEOMETRIC FLIGHT TIME',f(d?.geometric_flight_s*1000,6)+' ms']],'Earth-rotation range change is calculated from the same satellite transmit state, with and without frame rotation.'],
      ['C3','Frequency-dependent propagation',[['MODEL',r.corrections.ionosphere?'Broadcast Klobuchar':'OFF in this case'],['CODE GROUP DELAY',r.corrections.ionosphere?f(s.iono_m,6)+' m':'OFF'],['DELAY IN TIME',r.corrections.ionosphere?exp(s.ionosphere.seconds)+' s':'OFF']],'The code is delayed while carrier phase advances. Their ionospheric terms have opposite signs.'],
      ['C4','Zenith delay → slant path',[['ZENITH DRY + WET',r.corrections.troposphere?f(s.troposphere.zenith_m,6)+' m':'OFF'],['BLACK–EISNER MAPPING',r.corrections.troposphere?f(s.troposphere.mapping,6):'OFF'],['SLANT DELAY',r.corrections.troposphere?f(s.tropo_m,6)+' m':'OFF']],'m(El) = 1.001 / √(0.002001 + sin²El), as presented on printed p.318.']
    ])if($('lesson-viz-'+n))$('lesson-viz-'+n).innerHTML=svgFrame(title,chain(items),caption);
    lessonNavigation(lessons,'errors');
    const diagnostic=document.createElement('section');diagnostic.className='document-diagnostics';$('error-sources').append(diagnostic);
    const dual=d?.dual_frequency;
    diagnostic.innerHTML=`<div class="section-label">Measured diagnostics / Chapter 7 §§7.2.4.1 &amp; 7.3</div><h2>Error Propagation from Pseudorange to Receiver Coordinates</h2><div class="grid"><article class="figure-panel"><h3>Dual-frequency code diagnostic</h3><div class="equation">γ = (f₁/f₂)²<br>Î₁ = (P₂ − P₁)/(γ − 1)</div>${dual?sub(`${dual.code1}: P1 = ${f(dual.P1_m)} m\n${dual.code2}: P2 = ${f(dual.P2_m)} m\nγ = ${f(dual.gamma,9)}\nApparent L1 ionosphere = ${f(dual.apparent_L1_iono_m,6)} m\nIonosphere-free code = ${f(dual.ionosphere_free_code_m,6)} m`):'<p class="unavailable">Unavailable for this satellite’s supported signal pair.</p>'}<p>This observed-code diagnostic is not applied as a correction. Differential code bias, multipath and noise can contaminate it, including producing negative apparent delays.</p></article><article class="figure-panel"><h3>Conditional covariance, not measured accuracy</h3><div class="equation">K = (HᵀH)⁻¹Hᵀ<br>Ĉₓ = σ̂fit² (HᵀH)⁻¹</div>${a?sub(`Degrees of freedom = ${a.degrees_of_freedom}\nσfit = √(Σ residual² / (n − p)) = ${f(a.fitted_range_sigma_m)} m\nConditional ENU σ = ${vec(a.position_sigma_enu_m)} m\nConditional DRMS = ${f(a.conditional_drms_m)} m`):'<p>Unavailable</p>'}<p>Assumes an adequate model and independent equal-variance range errors. Post-fit variance is not independent UERE; it can underestimate systematic or correlated error.</p></article></div><div id="conditional-ellipse" class="plot"></div><p class="plot-note">One-sigma horizontal covariance contour, centered on zero position perturbation. Under the bivariate Gaussian model this contour contains about 39% probability, not 68% or 95%. It is distinct from the observed epoch scatter and reference-relative RMSE.</p><details><summary>Why not add correction magnitudes as an RSS error budget?</summary><p>The textbook RSS budget adds independent zero-mean uncertainty variances. Clock, ionosphere and troposphere corrections are signed modeled offsets, so their squares do not estimate residual UERE. A measured independent UERE is unavailable here.</p></details><details><summary>Weighted least squares and correlated errors · p.333</summary><div class="equation">Δx = (HᵀR⁻¹H)⁻¹HᵀR⁻¹v</div><p>R describes range-error covariance. The current solver uses equal weights. The document explains elevation dependence and correlated atmospheric errors, but this dataset does not identify a calibrated full R; no covariance entries are invented.</p></details>`;
    const ellipse=a?.ellipse_1sigma_m;
    if(ellipse){const t=Array.from({length:129},(_,i)=>i*2*Math.PI/128),v=ellipse.vectors,ax=ellipse.axes;plot('conditional-ellipse',[{x:t.map(x=>v[0][0]*ax[0]*Math.cos(x)+v[0][1]*ax[1]*Math.sin(x)),y:t.map(x=>v[1][0]*ax[0]*Math.cos(x)+v[1][1]*ax[1]*Math.sin(x)),name:'Conditional 1σ contour',mode:'lines',fill:'toself',fillcolor:'rgba(116,217,237,.08)',line:{color:'#74d9ed'}},{x:[0],y:[0],name:'Zero position perturbation',mode:'markers',marker:{color:'#fff',size:8}}],{xaxis:{title:'East perturbation [m]'},yaxis:{title:'North perturbation [m]',scaleanchor:'x'}});}else $('conditional-ellipse').textContent='Covariance unavailable: positive residual degrees of freedom are required.';
    selectChapter(chapter);
    buildSectionNavigator();
  }
  return {init,results,math,errors,resize,selectChapter,selectLesson,refreshSectionNavigator};
})();
