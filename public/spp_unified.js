/* Unified Single Point Positioning workspace.
   One academic SPP page: overview + mathematics + accuracy + selectable error models. */
window.SPPStudio = (() => {
  let currentView = 'overview';
  let mathStep = '01';
  let selectedError = 'clock';
  let svgSerial = 0;
  // Physical correction categories have their own palette; satellite marks always use GNSS_COLORS.
  window.VGL_ERROR_COLORS = Object.freeze({clock:'#59d9f5', ionosphere:'#bca5ff', troposphere:'#ffc578', relativity:'#f48fad', bias:'#79d9ad', rotation:'#84b5ff', orbit:'#96a6b7', noise:'#b8c1cb', uere:'#d8bdff'});
  const ERROR_EQUATIONS = {
    clock:['Broadcast satellite-clock model','δtₛᵥ = a₀ + a₁(t − tₒc) + a₂(t − tₒc)²','For supported GPS-like Keplerian messages, the polynomial comes from the matching NAV record. GLONASS and SBAS use different broadcast-clock conventions. Convert the appropriate time correction to metres with c; relativity is controlled separately.'],
    relativity:['Periodic relativistic clock correction','Δtᵣₑₗ = −2√μ e√A sin(E) / c²','An eccentric orbit introduces a periodic clock offset. This is not the Earth-rotation (Sagnac) correction.'],
    rotation:['Earth rotation during signal travel','rₛ(reception) = R₃(ωₑτ) rₛ(transmit)','Apply the same Earth-fixed reception frame to satellite and receiver. The actual sign and rotation are inherited from the tested orbit engine.'],
    ionosphere:['First-order code ionospheric delay','I ≈ 40.3 · TEC / f²','Code group delay grows with total electron content and varies inversely with squared frequency. Broadcast Klobuchar is a prediction, not measured TEC.'],
    troposphere:['Zenith delay and elevation mapping','T = m(El) (ZHD + ZWD)','The current solver uses the stated Saastamoinen zenith model with Black–Eisner elevation mapping. Atmospheric inputs include model assumptions.'],
    bias:['Constellation- and signal-dependent hardware delay','Pᶜᵒʳʳ = Pʳᵃʷ + cδtₛᵥ − I − T − B','B denotes the supported broadcast group-delay term (e.g., TGD/BGD). It is distinct from clock bias and only applies where data and model support it.'],
    orbit:['First-order projected broadcast-orbit error','δρ ≈ uᵀ δrₛ','Only the satellite-position-error component along the line of sight perturbs the range to first order. A precise orbit is needed to measure it.'],
    noise:['Post-fit mixture of unmodeled effects','v = Pᵒᵇˢ − Pᵐᵒᵈᵉˡᵉᵈ','Multipath and receiver noise cannot be uniquely separated from a single standalone code residual without independent information.'],
    uere:['Range-to-position covariance propagation','Cₓ = (Hᵀ R⁻¹ H)⁻¹','A credible range covariance R is required to estimate conditional position uncertainty. DOP alone is dimensionless and not an accuracy measurement.']
  };

  const mathNames = [
    ['01','Observation epoch'],['02','Broadcast satellite position'],['03','Geometric range'],
    ['04','Pseudorange observation model'],['05','Initial receiver estimate'],['06','Linearization'],
    ['07','Geometry matrix H'],['08','Observation vector'],['09','Least-squares update'],
    ['10','Iterative convergence'],['11','ECEF, geodetic & ENU frames'],['12','Geometry and DOP']
  ];
  const errorTopics = [
    ['clock','Satellite clock error','§7.2.1 · p.304','Broadcast satellite-clock bias and drift are represented by the navigation-message clock polynomial. A clock correction is a signed modeled range term; it is not the uncertainty remaining after correction.','C1','clock'],
    ['relativity','Relativistic satellite-clock effect','§7.2.3 · pp.306–308','Orbital eccentricity produces a periodic relativistic satellite-clock term. It is physically distinct from the broadcast polynomial and from Earth-rotation compensation.','C2','relativity'],
    ['rotation','Earth rotation during signal flight','§7.2.3 · p.308','The Earth-fixed frame rotates while the GNSS signal propagates. Satellite coordinates must therefore be expressed consistently in the reception frame before forming geometric range.','C2','rotation'],
    ['ionosphere','Ionospheric group delay','§7.2.4.1 · pp.310–314','The ionosphere is dispersive. GNSS code is delayed by a first-order effect proportional to TEC and inversely proportional to carrier frequency squared. The broadcast model predicts this delay; it does not directly measure the true ionosphere.','C3','ionosphere'],
    ['troposphere','Tropospheric propagation delay','§7.2.4.2 · pp.314–319','The neutral atmosphere produces hydrostatic and wet delays. Zenith delays are mapped to the satellite line of sight using an elevation-dependent mapping function.','C4','troposphere'],
    ['bias','Broadcast signal group delay','§7.2.7 · pp.320–321','Signal-dependent satellite hardware delays such as TGD/BGD must be distinguished from satellite clock offset. Their interpretation depends on constellation and signal.','', 'bias'],
    ['orbit','Broadcast ephemeris error','§7.2.2 · pp.305–306','Only the satellite-position error projected onto the receiver line of sight affects pseudorange to first order. This dataset contains no independent precise orbit, so the true ephemeris error cannot be measured separately.','', 'orbit'],
    ['noise','Multipath and receiver noise','§§7.2.5–7.2.6 · p.319','Multipath, receiver noise, interference and remaining model error are mixed in the residuals. They are not uniquely separable from these standalone code observations.','', 'noise'],
    ['uere','Error propagation, covariance and DOP','§§7.2.8–7.3.3 · pp.321–333','Range-domain uncertainty propagates through the geometry matrix into receiver-state uncertainty. DOP describes geometry amplification; weighted least squares requires a defensible range covariance model.','', 'uere']
  ];
  const toggleable = new Set(['clock','relativity','rotation','ionosphere','troposphere','bias']);

  const el = id => document.getElementById(id);
  function resize(){
    requestAnimationFrame(()=>{
      document.querySelectorAll('.js-plotly-plot').forEach(node=>{
        if(node.getClientRects().length && node.offsetWidth) Plotly.Plots.resize(node);
      });
      if(typeof map!=='undefined' && map && el('map')?.getClientRects().length) map.invalidateSize();
    });
  }

  function showView(view){
    currentView=view;
    const headings={
      overview:['Observation model and current SPP solution','Begin with the measured observations and the receiver state. Review modeled corrections at a glance.'],
      math:['Linearized pseudorange positioning mathematics','Follow the textbook derivation using actual values from the selected observation epoch.'],
      accuracy:['Position accuracy, repeatability and uncertainty','Distinguish reference-relative errors from pseudorange residuals and geometry-dependent covariance.'],
      error:['Physical error models and receiver-position response','Inspect one correction model: its mathematical origin, satellite contribution and conditional positioning impact.'],
      task:['GNSS Single Point Positioning laboratory exercise','Reproduce the selected-epoch numerical solution and evaluate the available correction models.']
    };
    const h=document.getElementById('workspace-heading');
    if(h){const [title,desc]=headings[view]||headings.overview;h.querySelector('h2').textContent=title;h.querySelector('p').textContent=desc;}

    document.querySelectorAll('[data-spp-view]').forEach(node=>node.hidden=node.dataset.sppView!==view);
    document.querySelectorAll('[data-view-button]').forEach(btn=>btn.classList.toggle('active',btn.dataset.viewButton===view));
    resize(); setTimeout(resize,100);
  }

  function selectMath(step){
    mathStep=step; showView('math');
    const host=el('steps');
    if(host) host.querySelectorAll(':scope > .step').forEach(node=>{
      const on=node.dataset.step===step;
      node.classList.toggle('active',on); node.hidden=!on;
    });
    document.querySelectorAll('[data-math-step]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mathStep===step));
    resize(); setTimeout(resize,100);
  }

  function openError(id){
    selectedError=id; showView('error');
    document.querySelectorAll('[data-error-topic]').forEach(btn=>btn.classList.toggle('active',btn.dataset.errorTopic===id));
    renderErrorDetail();
  }

  function setSidebarToggle(key,on){
    const original=el('toggle-'+key);
    if(!original) return;
    original.checked=on;
    original.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function sidebarMarkup(){
    const math = mathNames.map(([n,name])=>`<button class="side-sub" data-math-step="${n}"><span>${n}</span>${name}</button>`).join('');
    const errs = errorTopics.map(([id,title,ref])=>{
      const switchHtml=toggleable.has(id)?`<label class="side-toggle" title="Enable or disable ${title}"><input type="checkbox" data-side-toggle="${id}"><span></span></label>`:'<span class="side-static">INFO</span>';
      return `<div class="side-error-row" style="--category-accent:${window.VGL_ERROR_COLORS[id]||'#89ddeb'}"><button class="side-error" data-error-topic="${id}" aria-label="Inspect ${title}"><span class="side-dot" aria-hidden="true"></span><span><strong>${title}</strong><small>${ref}</small></span></button>${switchHtml}</div>`;
    }).join('');
    return `<div class="side-brand"><span>GNSS POSITIONING</span><strong>SPP Laboratory</strong><small>RINEX OBS + NAV → receiver solution</small></div>
      <button class="side-main active" data-view-button="overview"><span class="side-icon">⌂</span><span><strong>SPP Overview</strong><small>Error contribution summary & current solution</small></span></button>
      <div class="side-group"><div class="side-group-title">Positioning Mathematics</div>${math}</div>
      <button class="side-main" data-view-button="accuracy"><span class="side-icon">σ</span><span><strong>Position Accuracy & Statistics</strong><small>ENU, RMSE, DOP and GIS interpretation</small></span></button>
      <div class="side-group"><div class="side-group-title">GNSS Error Models</div>${errs}</div>
      <button class="side-main" data-view-button="task"><span class="side-icon">✓</span><span><strong>Laboratory Task</strong><small>Required analysis and reporting</small></span></button>`;
  }

  function init(){
    document.body.classList.add('studio','unified-spp');
    const hero=document.querySelector('.hero');
    hero.innerHTML=`<div class="hero-copy"><div class="eyebrow">NCGSA Virtual GNSS Laboratory / Single Point Positioning</div><h1>GNSS Single Point Positioning<br><em>Observation Modeling, Error Corrections & Accuracy</em></h1><p>Use the same RINEX observation and navigation files to follow the complete code-positioning chain, selectively enable physical correction models, and quantify their influence on the receiver solution.</p><p id="files" class="mono"></p></div><div class="hero-diagram"><svg viewBox="0 0 440 230" role="img" aria-label="GNSS pseudorange positioning concept"><g fill="none" stroke="#31556e"><circle cx="220" cy="152" r="50"/><path d="M80 42L220 152M160 25L220 152M300 30L220 152M365 78L220 152"/></g><g fill="#081825" stroke="#64e6ff" stroke-width="2"><circle cx="80" cy="42" r="7"/><circle cx="160" cy="25" r="7"/><circle cx="300" cy="30" r="7"/><circle cx="365" cy="78" r="7"/><circle cx="220" cy="152" r="9"/></g><g fill="#d8edf8" font-family="Segoe UI" font-size="12"><text x="172" y="222">PSEUDORANGE → POSITION</text></g></svg></div>`;
    el('files').textContent=`${meta.epoch_count.toLocaleString()} epochs · ${meta.obs_file} + ${meta.nav_file}`;

    const sppTab=el('spp-tab'); if(sppTab){sppTab.textContent='Single Point Positioning';sppTab.classList.add('active');}
    const errorTab=el('error-tab'); if(errorTab) errorTab.remove();
    document.querySelector('.shell > .flow')?.remove();
    const controls=document.querySelector('.shell > .controls'); controls.classList.add('session-controls');
    document.querySelector('.modes')?.classList.add('session-modes');
    const note=el('model-note');
    if(note && !note.parentElement.classList.contains('model-disclosure')){
      const details=document.createElement('details'); details.className='model-disclosure';
      details.innerHTML='<summary>Scientific model configuration <span>Current correction state and assumptions</span></summary>';
      note.before(details); details.append(note);
    }

    if(!el('receiver-summary')){
      const summary=document.createElement('section'); summary.id='receiver-summary'; el('series-section').before(summary);
    }

    const workspace=document.createElement('div'); workspace.id='spp-workspace'; workspace.className='spp-workspace';
    const sidebar=document.createElement('aside'); sidebar.id='spp-sidebar'; sidebar.className='spp-sidebar'; sidebar.innerHTML=sidebarMarkup();
    const content=document.createElement('div'); content.id='spp-content'; content.className='spp-content';
    const workspaceHead=document.createElement('div');workspaceHead.className='workspace-head';workspaceHead.id='workspace-heading';
    workspaceHead.innerHTML='<div class="eyebrow">NCGSA Virtual GNSS Laboratory · Academic Analysis</div><h2>Observation model and current SPP solution</h2><p>Measured RINEX observations, transparent model assumptions and calculated satellite–receiver geometry.</p>';
    content.append(workspaceHead);
    const overview=document.createElement('div'); overview.id='view-overview'; overview.dataset.sppView='overview';
    const math=document.createElement('div'); math.id='view-math'; math.dataset.sppView='math';
    const accuracy=document.createElement('div'); accuracy.id='view-accuracy'; accuracy.dataset.sppView='accuracy';
    const error=document.createElement('div'); error.id='view-error'; error.dataset.sppView='error';
    const task=document.createElement('div'); task.id='view-task'; task.dataset.sppView='task';
    error.innerHTML='<section id="error-detail" class="error-detail"><p class="loading-note">Select an error source from the left panel.</p></section><section id="case-comparison-panel" class="case-comparison-panel" hidden><div class="section-label">Controlled correction experiment</div><h2>Five-Case Receiver-Position Comparison</h2><p>Hold the observation epoch, constellation mode and elevation mask fixed. Calculate each preset model as a separate nonlinear least-squares solution; compare only cases that converge.</p><button id="compare-epoch" type="button">Calculate the five preset cases for this epoch</button><p id="compare-epoch-status" role="status"></p></section>';
    content.append(overview,math,accuracy,error,task); workspace.append(sidebar,content);
    el('legend').after(workspace);

    overview.append(el('receiver-summary'),el('results'));
    math.append(el('math'));
    accuracy.append(el('series-section'));
    task.append(el('student-task'));

    const analyzerHost=el('analyzer');
    if(analyzerHost){
      const casePanel=el('case-comparison-panel');
      for(const id of ['comparison','compare-plot','compare-series','stop-comparison','comparison-progress','comparison-rmse']){
        const node=el(id); if(node) casePanel.append(node);
      }
      analyzerHost.hidden=true;
    }

    const compareEpoch=el('compare-epoch');
    if(compareEpoch)compareEpoch.onclick=async()=>{
      const token=revision, active=query();
      compareEpoch.disabled=true;el('compare-epoch-status').textContent='Solving five independent models for the same observation epoch…';
      try{
        const results=await Promise.all([0,1,2,3,4].map(i=>api('/api/spp/epoch',{...active,case:i})));
        if(token!==revision)return;
        epochCases=results;
        renderComparison();
        el('compare-epoch-status').textContent=`${results.filter(r=>r.ok).length}/5 cases converged. The scatter and numeric table include only successful solutions.`;
      }catch(error){if(token===revision)el('compare-epoch-status').textContent='Case comparison unavailable: '+error.message;}
      finally{compareEpoch.disabled=false;}
    };
    sidebar.addEventListener('click',event=>{
      if(event.target.closest('.side-toggle')) return;
      const view=event.target.closest('[data-view-button]'); if(view) showView(view.dataset.viewButton);
      const step=event.target.closest('[data-math-step]'); if(step) selectMath(step.dataset.mathStep);
      const topic=event.target.closest('[data-error-topic]'); if(topic) openError(topic.dataset.errorTopic);
    });
    sidebar.addEventListener('change',event=>{
      const input=event.target.closest('[data-side-toggle]'); if(input) setSidebarToggle(input.dataset.sideToggle,input.checked);
    });
    document.addEventListener('click',event=>{
      const summaryCard=event.target.closest('[data-open-error]'); if(summaryCard) openError(summaryCard.dataset.openError);
    });
    document.addEventListener('keydown',event=>{
      const card=event.target.closest('[data-open-error]');
      if(card && (event.key==='Enter' || event.key===' ')){event.preventDefault();openError(card.dataset.openError);}
    });
    showView('overview');
  }

  function refreshLayout(){
    const overview=el('view-overview'); if(!overview) return;
    const summary=el('error-summary-page'), switches=el('correction-switches'), receiver=el('receiver-summary'), results=el('results');
    if(summary) overview.prepend(summary);
    if(switches){ if(summary) summary.after(switches); else overview.prepend(switches); }
    if(receiver && receiver.parentElement!==overview) overview.append(receiver);
    if(results && results.parentElement!==overview) overview.append(results);
    syncErrorSwitches();
    renderErrorDetail();
    resize();
  }

  function syncErrorSwitches(){
    document.querySelectorAll('[data-side-toggle]').forEach(input=>{
      const original=el('toggle-'+input.dataset.sideToggle);
      if(original){ input.checked=original.checked; input.closest('.side-error-row')?.classList.toggle('enabled',original.checked); }
    });
  }

  function results(){
    const summary=el('receiver-summary'); if(!summary) return;
    purgePlots('receiver-summary'); summary.replaceChildren();
    if(solution?.ok){
      const block=el('solution-summary'); if(block) summary.append(block);
      const root=el('results')?.querySelector('section');
      if(root && !root.querySelector('.unified-observation-heading')){
        root.insertAdjacentHTML('afterbegin','<div class="unified-observation-heading"><div class="section-label">SPP observations and geometry</div><h2>RINEX Code Observations and Satellite–Receiver Geometry</h2><p>Inspect the pseudorange observations and broadcast satellite coordinates entering the current receiver solution. Selecting a satellite carries the same measurement into the mathematical and error-analysis views.</p></div>');
      }
      root?.querySelectorAll('.grid > div').forEach(node=>{
        node.classList.add('figure-panel');
        if(node.querySelector('.vglm-caption'))return;
        const definitions={
          geometry:'Reception-frame ECEF satellite and receiver positions. The geometry is computed from the NAV record and selected receiver solution.',
          skyplot:'Azimuth is measured clockwise from north; elevation is measured above the local horizon. Satellite marks retain their GNSS-system colors.',
          contribution:'The number of valid observations contributed by each GNSS system depends on the selected mode, ephemeris validity and elevation mask.',
          residuals:'Post-fit pseudorange residuals describe agreement between modeled and observed code measurements. They are not the receiver-position error.'
        };
        const id=Object.keys(definitions).find(key=>node.querySelector('#'+key));
        if(id)node.insertAdjacentHTML('beforeend','<p class="vglm-caption">'+definitions[id]+'</p>');
      });
      summary.insertAdjacentHTML('beforeend',`<div class="solution-callout"><span>CONVERGED RECEIVER SOLUTION</span><strong>${f(solution.geodetic.lat_deg,6)}° N &nbsp; ${f(solution.geodetic.lon_deg,6)}° E</strong><small>${solution.count} satellites · ${solution.iterations.length} iterations · ${f(solution.residual_rms_m)} m residual RMS</small></div>`);
    }else summary.innerHTML='<p class="failure">Receiver solution unavailable for this epoch. Review the satellite and observation diagnostics below.</p>';
    renderErrorDetail();
  }

  function selectLesson(n,group='math'){
    if(group==='math') selectMath(n);
  }
  function lessonNavigation(container){
    if(!container) return;
    container.querySelectorAll(':scope > .step').forEach(node=>{
      const on=node.dataset.step===mathStep; node.classList.toggle('active',on); node.hidden=!on;
    });
  }

  function svgFrame(title,content,caption){const arrowId='spp-arrow-'+(++svgSerial);return `<div class="viz-eyebrow">${title}</div><svg viewBox="0 0 580 340" role="img" aria-label="${esc(title)}"><defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#74d9ed"/></marker></defs>${content.replaceAll('url(#arrow-tip)','url(#'+arrowId+')')}</svg><p class="viz-caption">${caption}</p>`;}
  const textSvg=(x,y,t,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(t)}</text>`;
  function box(x,y,w,h,title,value,color='#74d9ed'){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#122a40" stroke="${color}" stroke-opacity=".55"/>${textSvg(x+18,y+28,title,'svg-label')}${textSvg(x+18,y+60,value,'svg-value')}`;}
  function chain(items){return items.map((item,i)=>box(40,15+i*100,500,78,item[0],item[1])+(i<items.length-1?`<path d="M290 ${93+i*100}v20" stroke="#74d9ed" marker-end="url(#arrow-tip)"/>`:'')).join('');}
  function projection(s,w){
    const points=[w.state.slice(0,3),s.ecef_m],minX=Math.min(0,...points.map(p=>p[0])),maxX=Math.max(0,...points.map(p=>p[0])),minZ=Math.min(0,...points.map(p=>p[2])),maxZ=Math.max(0,...points.map(p=>p[2]));
    const span=Math.max(maxX-minX,maxZ-minZ,1),X=x=>150+240*(x-minX)/span,Y=z=>285-240*(z-minZ)/span;
    return svgFrame('Satellite–receiver geometry · ECEF X–Z projection',`<path d="M50 ${Y(0)}H535M${X(0)} 305V30" stroke="#46677e"/>${textSvg(493,318,'X [km]')}${textSvg(15,30,'Z [km]')}<path d="M${X(points[0][0])} ${Y(points[0][2])}L${X(points[1][0])} ${Y(points[1][2])}" stroke="${C[s.system]}" stroke-width="3"/>${points.map((p,i)=>`<circle cx="${X(p[0])}" cy="${Y(p[2])}" r="7" fill="${i?C[s.system]:'#fff'}"/>${textSvg(Math.min(X(p[0])+12,405),Y(p[2])-12,i?s.sat:'Receiver')}`).join('')}${textSvg(300,25,'Full 3D range = '+f(s.range_m/1000,3)+' km')}${textSvg(300,50,'ΔY = '+f((s.ecef_m[1]-points[0][1])/1000,3)+' km')}`,`The line uses actual ECEF coordinates. Y is omitted from this projection; the displayed range includes all three components.`);
  }

  function math(){
    if(!solution?.ok) return;
    const r=solution,w=r.iterations[+el('iteration').value||0],s=w.rows.find(x=>x.sat===selectedSat)||w.rows[0];
    const visuals={
      '01':svgFrame('One observed code range',chain([['OBSERVATION',s.sat+' · '+s.code],['PSEUDORANGE',f(s.pseudorange_m,3)+' m'],['CODE TIME DIFFERENCE',f(s.pseudorange_m/299792458*1000,6)+' ms']]),'The measured code time includes receiver/satellite clock offsets and propagation effects; it is not the geometric travel time.'),
      '02':svgFrame('NAV → propagation → reception-frame ECEF',chain([['BROADCAST RECORD',s.sat+' · '+s.nav_time_system],['CONSTELLATION ENGINE',names[s.system]+' orbit propagation'],['SATELLITE ECEF [km]',s.ecef_m.map(v=>f(v/1000,1)).join(' / ')]]),'The navigation message supplies the broadcast state model used to calculate satellite coordinates at signal transmit time.'),
      '03':projection(s,w),
      '04':svgFrame('Measured range → modeled range',chain([['MEASURED CODE',f(s.pseudorange_m)+' m'],['APPLIED CORRECTION',f(s.corrected_m-s.pseudorange_m)+' m'],['CORRECTED CODE',f(s.corrected_m)+' m']]),'The active correction switches determine which modeled physical terms enter the corrected pseudorange.'),
      '05':svgFrame('The starting point for linearization',chain([['INITIAL RECEIVER ECEF [km]',r.initial.slice(0,3).map(v=>f(v/1000,2)).join(' / ')],['CURRENT ITERATION',String(w.iteration)],['POSITION UPDATE NORM',f(w.correction_m,6)+' m']]),'The approximate receiver coordinate is the expansion point for the nonlinear pseudorange equations.'),
      '08':svgFrame('One row of the observation vector',chain([['CORRECTED PSEUDORANGE',f(s.corrected_m)+' m'],['RANGE + RECEIVER CLOCK',f(s.corrected_m-s.misclosure_m)+' m'],['OBSERVED − COMPUTED',f(s.misclosure_m,6)+' m']]),'This pre-fit misclosure drives the next state correction.'),
      '09':svgFrame('Solve → update → relinearize',chain([['SYSTEM DIMENSIONS',w.H.length+' observations × '+w.H[0].length+' states'],['SVD / LEAST SQUARES','Rank '+w.rank+' · condition '+f(w.condition,2)],['POSITION CORRECTION [m]',w.delta.slice(0,3).map(v=>f(v,5)).join(' / ')]]),'The state update includes coordinates and receiver clock states.'),
      '12':svgFrame('Geometry amplifies range uncertainty',chain([['LOS → GEOMETRY MATRIX',r.count+' satellites · '+r.unknowns.length+' states'],['Q = (HᵀH)⁻¹','PDOP '+f(r.dop.PDOP)+' / HDOP '+f(r.dop.HDOP)],['LOCAL VERTICAL GEOMETRY','VDOP '+f(r.dop.VDOP)]]),'DOP is dimensionless and becomes a position-domain uncertainty only after a range covariance model is supplied.')
    };
    for(const [n,html] of Object.entries(visuals)){const target=el('lesson-viz-'+n); if(target) target.innerHTML=html;}
    for(const [n,id] of [['06','linearization'],['07','h-heat'],['10','convergence'],['11','geodetic-viz']]){
      const panel=el('lesson-viz-'+n), source=el(id); if(panel&&source){panel.innerHTML='<div class="viz-eyebrow">'+{'06':'Nonlinear range and its tangent','07':'The actual geometry matrix','10':'Convergence of the state correction','11':'Geodetic normal and receiver position'}[n]+'</div>';panel.append(source);}
    }
    lessonNavigation(el('steps'));
  }

  function contributionRows(r,key){
    if(!r?.ok) return [];
    const analysis=r.error_analysis?.satellites||[];
    return r.satellites.map(s=>{
      const d=analysis.find(x=>x.sat===s.sat)||{};
      let value=null;
      if(key==='clock') value=s.clock_m;
      else if(key==='ionosphere') value=s.iono_m;
      else if(key==='troposphere') value=s.tropo_m;
      else if(key==='bias') value=s.bias_m;
      else if(key==='relativity') value=(s.clock?.relativity_s||0)*299792458;
      else if(key==='rotation') value=d.earth_rotation_range_m;
      return {sat:s.sat,system:s.system,elevation:s.el_deg,value};
    }).filter(x=>Number.isFinite(x.value));
  }

  function errorNumericalPanel(id,s,d,r){
    if(!s) return '<p class="unavailable">Select a valid observation epoch and satellite to see numerical substitution.</p>';
    const on=r.corrections||{}, pair=(name,val,unit='')=>`<div><dt>${name}</dt><dd>${val}${unit}</dd></div>`;
    const value=v=>Number.isFinite(v)?f(v,6):'Unavailable';
    let fields=[];
    const clock=s.clock||{};
    if(id==='clock'){const gpsLike=!['R','S'].includes(s.system);fields=[['Clock reference epoch',s.nav_epoch+' '+s.nav_time_system],[gpsLike?'a₀ / clock bias':'Broadcast clock offset',Number.isFinite(clock.af0)?exp(clock.af0)+' s':'Not applicable'],[gpsLike?'a₁ / clock drift':'Broadcast clock rate',Number.isFinite(clock.af1)?exp(clock.af1)+' s/s':'Not applicable'],['a₂ / clock drift rate',gpsLike&&Number.isFinite(clock.af2)?exp(clock.af2)+' s/s²':'Not applicable to state-vector broadcasts'],['t − toc',value(clock.dt_s)+' s'],['Clock polynomial value',Number.isFinite(clock.polynomial_s)?exp(clock.polynomial_s)+' s':'Unavailable'],['Equivalent range term',value(d?.polynomial_clock_m)+' m']];}
    else if(id==='relativity')fields=[['Selected satellite',s.sat],['Periodic relativistic clock term',Number.isFinite(clock.relativity_s)?exp(clock.relativity_s)+' s':'Unavailable'],['Equivalent range term',value(d?.relativity_m)+' m'],['Model switch',on.relativity?'Enabled':'Disabled']];
    else if(id==='rotation')fields=[['Geometric signal flight time',value(d?.geometric_flight_s*1000)+' ms'],['Earth-rotation range difference',value(d?.earth_rotation_range_m)+' m'],['Model switch',on.rotation?'Enabled':'Disabled'],['Reference-frame convention','Reception-frame ECEF']];
    else if(id==='ionosphere'){
      const x=s.ionosphere;
      fields=[['Model status',x?.source||(on.ionosphere?'Model output unavailable':'Correction disabled')],['Satellite elevation',value(s.el_deg)+'°'],['Satellite azimuth',value(s.az_deg)+'°'],['Pierce-point latitude',x?value(x.phi)+' semicircles':'Unavailable'],['Pierce-point longitude',x?value(x.lam)+' semicircles':'Unavailable'],['Slant mapping function',x?value(x.mapping):'Unavailable'],['Code delay',x?value(x.metres)+' m':'Unavailable']];
    }else if(id==='troposphere'){
      const x=s.troposphere;
      fields=[['Model status',on.troposphere?'Enabled':'Disabled'],['Satellite elevation',value(s.el_deg)+'°'],['Receiver height',x?value(x.height_m)+' m':'Unavailable'],['Modeled pressure',x?value(x.pressure_hpa)+' hPa':'Unavailable'],['Zenith hydrostatic delay',x?value(x.zenith_dry_m)+' m':'Unavailable'],['Zenith wet delay',x?value(x.zenith_wet_m)+' m':'Unavailable'],['Black–Eisner mapping',x?value(x.mapping):'Unavailable'],['Slant delay',x?value(x.metres)+' m':'Unavailable']];
    }else if(id==='bias')fields=[['Signal',s.code],['Constellation',names[s.system]||s.system],['Applied group-delay range term',value(s.bias_m)+' m'],['Model switch',on.bias?'Enabled':'Disabled']];
    else if(id==='orbit')fields=[['Satellite state','Broadcast navigation'],['Precise reference orbit','Not provided'],['Actual orbit error','Unavailable'],['Reason','Cannot infer δrₛ without an independent reference trajectory']];
    else if(id==='noise')fields=[['Post-fit pseudorange residual',value(s.residual_m)+' m'],['Multipath-only component','Unavailable'],['Receiver-noise-only component','Unavailable'],['Interpretation','Residual combines unmodeled physical effects']];
    else if(id==='uere')fields=[['Independent range covariance R','Not provided'],['Post-fit residual RMS',value(r.residual_rms_m)+' m'],['Conditional ENU uncertainties',r.error_analysis?.position_sigma_enu_m?.map(v=>value(v)+' m').join(' · ')||'Unavailable'],['Degrees of freedom',r.error_analysis?.degrees_of_freedom??'Unavailable'],['Caution','Conditional covariance does not measure true absolute accuracy']];
    return `<article class="academic-panel error-numerical-panel"><span class="section-label">Selected RINEX epoch · ${esc(s.sat)}</span><h3>Numerical Parameters and Model Interpretation</h3><dl class="error-parameter-grid">${fields.map(([name,val])=>pair(esc(name),esc(val))).join('')}</dl><p>The displayed quantities come from the current solution or its broadcast model. Disabled corrections are not interpreted as physically zero errors.</p></article>`;
  }

  function renderErrorDetail(){
    const host=el('error-detail'); if(!host) return;
    if(window.Plotly) host.querySelectorAll('.js-plotly-plot').forEach(node=>Plotly.purge(node));
    const topic=errorTopics.find(x=>x[0]===selectedError)||errorTopics[0];
    const [id,title,ref,definition,stepId,key]=topic;
    const r=epochCases?.[+el('case')?.value]||solution;
    const s=r?.ok ? (r.satellites.find(x=>x.sat===selectedSat)||r.satellites[0]) : null;
    const d=r?.ok ? r.error_analysis?.satellites?.find(row=>row.sat===s?.sat) : null;
    const summary=window.SPP_ERROR_SUMMARY;
    const idx=summary?.keys?.indexOf(key) ?? -1;
    const delta=idx>=0?summary.deltas?.[idx]:null;
    const magnitude=idx>=0?summary.magnitude?.terms?.[key]:null;
    const alternative=idx>=0?summary.alternatives?.[idx]:null;
    const on=toggleable.has(id) ? Boolean(el('toggle-'+id)?.checked) : null;
    const [formulaTitle,formulaText,formulaExplanation]=ERROR_EQUATIONS[id];
    const categoryColor=window.VGL_ERROR_COLORS[id]||'#85dced';
    // The contributions endpoint evaluates the term even when its switch is OFF.
    // Never draw a flat zero series to imply that a disabled physical effect vanishes.
    const modeledRows=magnitude?.satellites?.length ? magnitude.satellites.map(item=>{
      const match=r?.satellites?.find(row=>row.sat===item.sat);
      return {sat:item.sat,system:match?.system||item.sat[0],elevation:match?.el_deg,value:item.metres};
    }).filter(item=>Number.isFinite(item.value)) : [];
    const rows=modeledRows.length?modeledRows:((toggleable.has(id)&&!on)?[]:contributionRows(r,key));
    const selectedRow=rows.find(x=>x.sat===s?.sat);
    const switchBlock=toggleable.has(id)?`<label class="detail-switch"><span><strong>${on?'Correction enabled':'Correction disabled'}</strong><small>Toggle this model without leaving the academic explanation.</small></span><input type="checkbox" id="detail-toggle" ${on?'checked':''}><i></i></label>`:'';
    host.innerHTML=`<div class="error-detail-header" style="--error-color:${categoryColor}"><div><span class="section-label">GNSS error model · ${ref}</span><h2>${title}</h2><p>${definition}</p></div>${switchBlock}</div>
      <article class="error-equation-panel" style="--error-color:${categoryColor}"><span class="section-label">Textbook observation model</span><h3>${formulaTitle}</h3><div class="equation">${formulaText}</div><p>${formulaExplanation}</p></article>
      <div class="error-detail-metrics">
        <article><span>${on===false?'Modeled satellite range term':'Selected-satellite range term'}</span><strong>${Number.isFinite(selectedRow?.value)?f(selectedRow.value,4)+' m':'Unavailable'}</strong><small>${s?.sat||'No satellite selected'}</small></article>
        <article><span>Epoch-wide modeled RMS</span><strong>${Number.isFinite(magnitude?.rms_m)?f(magnitude.rms_m,4)+' m':'Unavailable'}</strong><small>Across contributing satellites</small></article>
        <article><span>Receiver 3D response</span><strong>${delta?f(Math.hypot(...delta),4)+' m':'Unavailable'}</strong><small>Alternative minus current solution</small></article>
        <article><span>Alternative residual RMS</span><strong>${alternative?.ok?f(alternative.residual_rms_m,4)+' m':'Unavailable'}</strong><small>After re-solving the receiver state</small></article>
      </div>
      <div class="error-insight-strip"><strong>Interpretation</strong><p>${toggleable.has(id)?`The model is currently <b>${on?'ON':'OFF'}</b>. Compare a complete re-solved position with this single correction toggled; the effects of individual switches are conditional and must not be added.`:'This quantity is an academic diagnostic. The current dataset does not identify its independent value, so unavailable measurements are not replaced with estimates.'}</p></div>
      <div class="error-detail-grid error-visual-grid"><article class="academic-panel error-chart" style="--panel-accent:${categoryColor}"><span class="section-label">Range domain</span><h3>Per-satellite modeled range term</h3><p>Satellite colors match the orbit and skyplot dashboards. When a model is OFF, the chart shows its independently evaluated candidate term where available, not an applied correction.</p><div id="error-contribution-plot" class="plot"></div></article><article class="academic-panel error-chart" style="--panel-accent:#bba5ff"><span class="section-label">Position domain</span><h3>Receiver-state response to this model</h3><p>East, North and Up differences between the alternative re-solved solution and the current receiver solution; this is not a statistical uncertainty.</p><div id="error-position-response" class="plot"></div></article></div>
      <div class="error-math-heading"><div class="section-label">Mathematical derivation</div><h3>Physical Model and Numerical Calculation</h3><p>Review the source equations and this epoch's numerical quantities before interpreting the satellite table.</p></div>
      <div id="error-math-clone" class="error-math-clone"></div>
      <div class="table-shell" id="error-contribution-table"></div>`;
    const dt=el('detail-toggle'); if(dt) dt.onchange=()=>setSidebarToggle(id,dt.checked);
    if(rows.length){
      plot('error-contribution-plot',Array.from(new Set(rows.map(x=>x.system))).map(sys=>{const rr=rows.filter(x=>x.system===sys);return {type:'bar',x:rr.map(x=>x.sat),y:rr.map(x=>x.value),name:names[sys]||sys,marker:{color:C[sys]}};}),{yaxis:{title:'Modeled contribution [m]'},xaxis:{title:'Satellite'}});
      el('error-contribution-table').innerHTML=table(['Satellite','Elevation [°]','Contribution [m]'],rows.map(x=>[satelliteLabel(x.sat),f(x.elevation,2),f(x.value,6)]));
    }else{
      el('error-contribution-plot').innerHTML='<p class="unavailable">The selected model cannot be independently evaluated for this epoch. '+esc(magnitude?.error||'The required reference measurements or modeled inputs are unavailable.')+'</p>';
      el('error-contribution-table').innerHTML='';
    }
    if(delta){
      plot('error-position-response',[{type:'bar',orientation:'h',x:[delta[0],delta[1],delta[2]],y:['East','North','Up'],marker:{color:['#4bd9f7','#bba6ff','#ffc46f']},text:delta.map(x=>f(x,3)+' m'),textposition:'auto',hovertemplate:'%{y}: %{x:.6f} m<extra></extra>'}],{showlegend:false,margin:{l:72,r:38,t:18,b:68},xaxis:{title:'Alternative − current [m]',zeroline:true,zerolinecolor:'#d3e9f4',gridcolor:'#284a62'},yaxis:{autorange:'reversed'}});
    }else el('error-position-response').innerHTML='<p class="unavailable">A position response is available only when both the current and alternative SPP solutions converge. '+esc(alternative?.error||'An independently measurable response is unavailable for this model and dataset.')+' No position shift has been invented.</p>';

    const cloneHost=el('error-math-clone');
    if(stepId){
      const source=el('corrections')?.querySelector(`.step[data-step="${stepId}"]`);
      if(source){const clone=source.cloneNode(true);clone.hidden=false;clone.classList.add('active');clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));cloneHost.append(clone);}
    }else if(id==='bias'){
      cloneHost.innerHTML='<article class="academic-panel"><span class="section-label">Observation-model term</span><h3>Broadcast Signal Group Delay</h3><div class="equation">P<sub>corrected</sub> = P<sub>raw</sub> + cδt<sub>sv</sub> − I − T − B</div><p>B represents the supported broadcast signal group-delay correction (for example TGD/BGD according to constellation and signal). It is a hardware-delay term, not the satellite clock polynomial itself.</p></article>';
    }else if(id==='orbit'){
      cloneHost.innerHTML='<article class="academic-panel"><span class="section-label">First-order line-of-sight projection</span><h3>Broadcast Orbit Error</h3><div class="equation">δρ ≈ uᵀ δr<sub>s</sub></div><p>Only the component of satellite-position error along the receiver line of sight changes the modeled range to first order. A precise reference orbit is required to evaluate the actual ephemeris error; one is not loaded in this laboratory dataset.</p></article>';
    }else if(id==='noise'){
      cloneHost.innerHTML='<article class="academic-panel"><span class="section-label">Unmodeled/stochastic effects</span><h3>Multipath, Receiver Noise and Interference</h3><div class="equation">v = P<sub>observed</sub> − P<sub>modeled</sub></div><p>Post-fit residuals contain a mixture of remaining measurement noise, multipath, unmodeled propagation effects, orbit/model error and receiver effects. A standalone residual cannot uniquely separate these components.</p></article>';
    }else if(id==='uere'){
      cloneHost.innerHTML='<article class="academic-panel"><span class="section-label">Error propagation</span><h3>Range Covariance to Position Covariance</h3><div class="equation">C<sub>x</sub> = (HᵀR⁻¹H)⁻¹</div><p>For equal independent range variance σ², the geometry term reduces to Q = (HᵀH)⁻¹ and DOP factors describe the corresponding amplification. A physically justified R is required for weighted least squares.</p></article>';
    }
    cloneHost.insertAdjacentHTML('beforeend',errorNumericalPanel(id,s,d,r));
    const comparison=el('case-comparison-panel'); if(comparison) comparison.hidden=id!=='uere';
    syncErrorSwitches();
    resize(); setTimeout(resize,100);
  }

  function errors(){ renderErrorDetail(); }
  function refreshSectionNavigator(){ refreshLayout(); }
  function selectChapter(){ showView('overview'); }

  return {init,results,math,errors,resize,selectLesson,selectChapter,refreshLayout,refreshSectionNavigator,syncErrorSwitches,openError,updateErrorDetail:renderErrorDetail};
})();
