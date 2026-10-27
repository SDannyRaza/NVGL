'use strict';
const $ = id => document.getElementById(id),
  C = GNSS_COLORS,
  names = GNSS_NAMES;
const esc = x => String(x ?? 'Unavailable').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));
const f = (x, d = 3) => Number.isFinite(x) ? x.toLocaleString('en-US', {
  maximumFractionDigits: d,
  minimumFractionDigits: d
}) : 'Unavailable';
const exp = x => Number.isFinite(x) ? x.toExponential(8) : 'Unavailable';
const vec = (v, d = 3) => '[' + (v || []).map(x => f(x, d)).join(', ') + ']';
const solutionColors = {
  cloud: '#60bce5',
  current: '#f59fca',
  mean: '#f5e4af',
  reference: '#ffffff'
};
const caseColors = ['#c8d4df', '#f5a9c8', '#e1bcff', '#f0d899', '#aabbbb'];
let meta, solution, otherSolution, mode = 'gps',
  selectedSat = '',
  revision = 0,
  seriesToken = 0,
  comparisonToken = 0;
let epochCases = [],
  seriesCache = new Map(),
  map, mapLayer;
const analyzer = true; // Unified SPP page always includes correction/error analysis.
const stateKey = () => [mode, $('case').value, $('mask').value].join(':');
const why = text => `<details><summary>Why does this calculation matter?</summary><p>${text}</p></details>`;
const eq = text => `<div class="equation">${text}</div>`;
const sub = text => `<div class="substitution">${esc(text)}</div>`;

function table(headers, rows, attrs = []) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr ${attrs[i]||''}>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function matrix(a, labels, attrs = []) {
  return `<div class="matrix">${table(labels||a[0].map((_,i)=>i+1),a.map(r=>r.map(x=>f(x,6))),attrs)}</div>`;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function academicCard(tag, title, formula, body){
  return `<article class="definition-card"><span class="tag">${tag}</span><h3>${title}</h3><div class="equation">${formula}</div><p>${body}</p></article>`;
}

function satelliteLabel(s) {
  return `<span class="dot" style="background:${C[s[0]]}"></span>${esc(s)}`;
}
const layout = {
  paper_bgcolor: '#08111d',
  plot_bgcolor: '#0c1929',
  font: {
    family: 'Segoe UI',
    size: 16,
    color: '#d9e8f5'
  },
  margin: {
    t: 45,
    b: 65,
    l: 70,
    r: 25
  },
  legend: {
    orientation: 'h',
    y: -.2
  },
  showlegend: true
};

function plot(id, traces, extra = {}) {
  if (!$(id)) return;
  if (!window.Plotly) {
    $(id).textContent = 'Plot library unavailable. Numerical tables remain available.';
    return;
  }
  Plotly.react(id, traces, {
    ...layout,
    ...extra
  }, {
    responsive: true,
    displaylogo: false,
    scrollZoom: true
  });
}
async function api(path, params = {}) {
  const r = await fetch(path + '?' + new URLSearchParams(params));
  const j = await r.json();
  if (!r.ok) throw Error(j.error || `Request failed (${r.status})`);
  return j;
}

function query(extra = {}) {
  return {
    epoch: $('epoch').value,
    mode,
    case: $('case').value,
    mask: $('mask').value,
    ...extra
  };
}

function fail(text) {
  $('status').textContent = text;
  $('status').className = 'warn';
}

function modelNote() {
  CorrectionLab.note();
}
async function refresh() {
  const token = ++revision;
  if(!analyzer) epochCases=[];  // preset comparisons belong to the current epoch and mode only
  CorrectionLab.invalidate();
  seriesToken++;
  comparisonToken++;
  $('stop-series').hidden = true;
  $('run-series').disabled = false;
  $('stop-comparison').hidden = true;
  $('compare-series').disabled = false;
  $('comparison-progress').textContent = '';
  $('comparison-rmse').innerHTML = '';
  $('status').className = '';
  $('status').textContent = 'Solving the selected measured epoch…';
  modelNote();
  $('first').disabled = $('previous').disabled = +$('epoch').value === 0;
  $('last').disabled = $('next').disabled = +$('epoch').value === meta.epoch_count - 1;
  try {
    const data = await api('/api/spp/epoch', query());
    if (token !== revision) return;
    solution = data;
    window.sppSolution = data;
    renderSolution();
    renderSeries();
    CorrectionLab.update();
    const other = await api('/api/spp/epoch', query({
      mode: mode === 'gps' ? 'multi' : 'gps'
    }));
    if (token !== revision) return;
    otherSolution = other;
    renderDop();
    if (analyzer) {
      $('comparison').innerHTML = '<p>Re-solving all five cases…</p>';
      epochCases = [];
      for (let i = 0; i < 5; i++) {
        const s = await api('/api/spp/epoch', query({
          case: i
        }));
        if (token !== revision) return;
        epochCases.push(s);
      }
      renderComparison();
      renderCorrections();
    }
  } catch (e) {
    if (token === revision) fail(e.message);
  }
}

function purgePlots(id) {
  if (window.Plotly) $(id).querySelectorAll('.js-plotly-plot').forEach(el => Plotly.purge(el));
}

function renderSolution() {
  purgePlots('results');
  const r = solution;
  const systems = r.systems || [];
  $('legend').innerHTML = systems.map(s =>
    `<span><span class="dot" style="background:${C[s]}"></span>${names[s]}</span>`).join('');
  const exclusions = table(['Satellite', 'Exclusion / diagnostic'], (r.rejected || []).map(x => [satelliteLabel(x.sat),
    esc(x.reason)
  ]));
  $('math').hidden = !r.ok;
  if (!r.ok) {
    $('results').innerHTML =
      `<div class="failure">${esc(r.error)}</div><details open><summary>Satellite validation</summary>${exclusions}</details>`;
    fail(r.error);
    SPPStudio.results();
    return;
  }
  $('status').textContent =
    `Converged · ${r.epoch_gps} GPS · ${r.count} satellites · ${r.unknowns.length} unknowns · ${r.iterations.length} iterations`;
  const deck = `<div class="definition-deck">` + [
    academicCard('Observation model','Pseudorange observation equation','P^s = ρ^s + c(δt_r − δt^s) + I^s + T^s + ε^s','<strong>P</strong> is the measured code pseudorange. The receiver solution estimates the user position and clock state while modeled satellite-clock, ionospheric and tropospheric terms are introduced according to the selected case.'),
    academicCard('Unknown state','Receiver-state vector','x = [X_r, Y_r, Z_r, cδt_r]^T','Single-constellation SPP solves for three receiver coordinates and one receiver-clock parameter. Multi-constellation mode expands the state with one clock term for each active GNSS system.'),
    academicCard('Estimation','Linearized least-squares update','Δx = (H^T H)^{-1} H^T v','The design matrix <strong>H</strong> maps geometry into the solution space, while <strong>v</strong> is the observed-minus-computed misclosure vector. The receiver state is updated iteratively until the correction is sufficiently small.'),
    academicCard('Geometry quality','Dilution of precision','Q = (H^T H)^{-1}','The covariance-shape matrix connects satellite geometry to expected solution sensitivity. <strong>PDOP</strong>, <strong>HDOP</strong> and <strong>VDOP</strong> describe how range uncertainty is amplified by the current constellation geometry.')
  ].join('') + `</div>`;
  $('results').innerHTML =
    `<section><div class="section-source"><b>Academic source flow</b> Formula sequence aligned to the provided GNSS positioning PDFs</div>${deck}<div class="reference-ribbon"><strong>${mode==='gps'?'GPS-only Single Point Positioning':'Multi-Constellation Single Point Positioning'}</strong><p>This selected-epoch solution reconstructs the textbook SPP chain: measured pseudorange → satellite broadcast position → geometric range → linearized observation equation → least-squares state update → final receiver coordinates, DOP and residual diagnostics.</p></div><div id="solution-summary"><div class="section-label">${mode==='gps'?'GPS-only':'Multi-constellation'} · selected epoch solution</div><h2>${mode==='gps'?'Receiver solution from GPS pseudoranges':'Receiver solution from multi-GNSS pseudoranges'}</h2><div class="definition-strip"><article><span>What is being solved?</span><strong>Receiver coordinates and clock state</strong><p>The solver estimates the receiver position in the Earth-Centred, Earth-Fixed frame and converts the converged solution to latitude, longitude and ellipsoidal height.</p></article><article><span>What do the residuals mean?</span><strong>Range fit after estimation</strong><p>Post-fit residuals indicate how well the modeled pseudoranges agree with the observations after the least-squares update. They are not, by themselves, the position RMSE.</p></article><article><span>How is accuracy summarized?</span><strong>Geometry plus reference-relative ENU</strong><p>DOP describes geometric sensitivity, while the ENU quantities below express the difference between the converged receiver solution and the fixed reference used in this laboratory dataset.</p></article></div><div class="metrics">${[['ECEF X [m]',r.ecef_m[0]],['ECEF Y [m]',r.ecef_m[1]],['ECEF Z [m]',r.ecef_m[2]],['Latitude [°]',r.geodetic.lat_deg],['Longitude [°]',r.geodetic.lon_deg],['Ellipsoidal height [m]',r.geodetic.height_m],['Residual RMS [m]',r.residual_rms_m],...['GDOP','PDOP','HDOP','VDOP','TDOP'].map(k=>[k,r.dop[k]])].map(([k,v])=>metric(k,f(v,k.includes('[°]')?8:3))).join('')}</div>${table(['Receiver clock state','Bias [m]','Bias [s]'],systems.map(s=>[satelliteLabel(s)+' '+names[s],f(r.clocks[s].metres),exp(r.clocks[s].seconds)]))}<p>Reference-relative ENU [m]: <strong>${vec(r.enu_error_m)}</strong>. Residual RMS measures pseudorange fit; it is not position RMSE.</p></div><div class="grid"><div><h3>Satellite geometry in the ECEF frame <small>Line-of-sight geometry at the selected epoch</small></h3><div id="geometry" class="plot tall"></div></div><div><h3>Receiver skyplot at the selected epoch <small>Selected satellite is outlined for continuity with the mathematics panel</small></h3><div id="skyplot" class="plot tall"></div></div></div><div class="grid"><div><h3>Constellation participation and redundancy <small>Number of contributing satellites by GNSS system</small></h3><div id="contribution" class="plot"></div></div><div><h3>Post-fit pseudorange residuals <small>Observation-minus-model residuals after convergence</small></h3><div id="residuals" class="plot"></div></div></div><h3>Observation and satellite-state table</h3><p>Select a satellite row to inspect its H-matrix row, skyplot point and linked orbit workflow.</p>${table(['PRN','Signal','Pseudorange [m]','Phase [cycles]','C/N₀ [dB-Hz]','Xₛ [m]','Yₛ [m]','Zₛ [m]','Elevation [°]'],r.satellites.map(s=>[satelliteLabel(s.sat),s.code,f(s.pseudorange_m),f(s.phase_cycles),f(s.cn0_dbhz,1),...s.ecef_m.map(x=>f(x)),f(s.el_deg,2)]),r.satellites.map(s=>`data-sat="${s.sat}"`))}<details><summary>Satellite validation · ${(r.rejected||[]).length} excluded</summary>${exclusions}</details>${why('Receiver and satellite coordinates must share a common reference frame. For single-system SPP, at least four well-distributed satellites are required to solve three coordinates and one clock parameter. In multi-GNSS SPP, additional constellation clock states must also be observable.')}</section>`;
  $('iteration').innerHTML = r.iterations.map((w, i) =>
    `<option value="${i}">Iteration ${i} · Δr ${f(w.correction_m,6)} m${i===r.iterations.length-1?' · converged':''}</option>`
    ).join('');
  $('satellite').innerHTML = r.satellites.map(s => `<option>${s.sat}</option>`).join('');
  if (!r.satellites.some(s => s.sat === selectedSat)) selectedSat = r.satellites[0].sat;
  $('satellite').value = selectedSat;
  renderMath();
  renderGeometry();
  plot('contribution', systems.map(s => ({
    type: 'bar',
    x: [names[s]],
    y: [r.satellites.filter(x => x.system === s).length],
    name: names[s],
    marker: {
      color: C[s]
    }
  })), {
    yaxis: {
      title: 'Satellites used',
      dtick: 1
    }
  });
  plot('residuals', systems.map(s => {
    const rows = r.satellites.filter(x => x.system === s);
    return {
      type: 'bar',
      x: rows.map(x => x.sat),
      y: rows.map(x => x.residual_m),
      name: names[s],
      marker: {
        color: C[s]
      }
    };
  }), {
    yaxis: {
      title: 'Post-fit residual [m]'
    }
  });
  SPPStudio.results();
}

function chooseSat(s) {
  selectedSat = s;
  $('satellite').value = s;
  renderMath();
  renderGeometry();
  if (analyzer) renderCorrections();
  document.querySelectorAll('[data-sat]').forEach(el => el.classList.toggle('selected', el.dataset.sat === s));
}
document.addEventListener('click', e => {
  const row = e.target.closest('[data-sat]');
  if (row) chooseSat(row.dataset.sat);
});

function renderGeometry() {
  if (!solution.ok) return;
  const r = solution,
    rx = r.ecef_m.map(x => x / 1000);
  const traces = [];
  for (const sys of r.systems) {
    const rows = r.satellites.filter(s => s.system === sys);
    const x = [],
      y = [],
      z = [];
    for (const s of rows) {
      x.push(rx[0], s.ecef_m[0] / 1000, null);
      y.push(rx[1], s.ecef_m[1] / 1000, null);
      z.push(rx[2], s.ecef_m[2] / 1000, null);
    }
    traces.push({
      type: 'scatter3d',
      mode: 'lines',
      x,
      y,
      z,
      name: names[sys] + ' LOS',
      legendgroup: sys,
      line: {
        color: C[sys],
        width: 2
      },
      hoverinfo: 'skip'
    });
    traces.push({
      type: 'scatter3d',
      mode: 'markers+text',
      x: rows.map(s => s.ecef_m[0] / 1000),
      y: rows.map(s => s.ecef_m[1] / 1000),
      z: rows.map(s => s.ecef_m[2] / 1000),
      text: rows.map(s => s.sat),
      customdata: rows.map(s => s.sat),
      name: names[sys],
      legendgroup: sys,
      showlegend: false,
      marker: {
        color: C[sys],
        size: rows.map(s => s.sat === selectedSat ? 7 : 4)
      }
    });
  }
  traces.push({
    type: 'scatter3d',
    x: [rx[0]],
    y: [rx[1]],
    z: [rx[2]],
    mode: 'markers+text',
    text: ['Receiver'],
    name: 'Receiver',
    marker: {
      color: '#fff',
      size: 5
    }
  });
  for (let i = 0; i < 3; i++) {
    const p = [0, 0, 0];
    p[i] = 7000;
    traces.push({
      type: 'scatter3d',
      mode: 'lines+text',
      x: [0, p[0]],
      y: [0, p[1]],
      z: [0, p[2]],
      text: ['', 'XYZ' [i]],
      name: 'ECEF ' + 'XYZ' [i],
      line: {
        color: '#93a7b5',
        width: 3
      }
    });
  }
  plot('geometry', traces, {
    scene: {
      aspectmode: 'data',
      xaxis: {
        title: 'ECEF X [km]'
      },
      yaxis: {
        title: 'ECEF Y [km]'
      },
      zaxis: {
        title: 'ECEF Z [km]'
      }
    },
    margin: {
      t: 0,
      b: 70,
      l: 0,
      r: 0
    }
  });
  plot('skyplot', r.systems.map(sys => {
    const rows = r.satellites.filter(s => s.system === sys);
    return {
      type: 'scatterpolar',
      mode: 'markers+text',
      r: rows.map(s => 90 - s.el_deg),
      theta: rows.map(s => s.az_deg),
      text: rows.map(s => s.sat),
      textposition: 'top center',
      customdata: rows.map(s => s.sat),
      name: names[sys],
      marker: {
        color: C[sys],
        size: rows.map(s => s.sat === selectedSat ? 15 : 9),
        line: {
          color: '#fff',
          width: 1
        }
      }
    };
  }), {
    polar: {
      bgcolor: '#0c1929',
      radialaxis: {
        range: [0, 90],
        tickvals: [0, 30, 60, 90],
        ticktext: ['90°', '60°', '30°', '0°']
      },
      angularaxis: {
        direction: 'clockwise',
        rotation: 90,
        tickvals: [0, 90, 180, 270],
        ticktext: ['N', 'E', 'S', 'W']
      }
    }
  });
  for (const id of ['geometry', 'skyplot']) {
    const el = $(id);
    if (el.removeAllListeners) el.removeAllListeners('plotly_click');
    if (el.on) el.on('plotly_click', ev => {
      const sat = ev.points[0].customdata;
      if (sat) chooseSat(sat);
    });
  }
}

function step(n, title, formula, definitions, values, meaning, extra = '') {
  return `<article class="step" data-step="${n}"><div class="lesson-heading"><span class="step-number">${n}</span><div><div class="section-label">The mathematical solution</div><h3>${title}</h3></div></div><div class="formula-board"><span class="board-label">Equation</span>${eq(formula)}</div><div class="lesson-body"><div class="lesson-visual" id="lesson-viz-${n}"></div><div class="lesson-reading"><h4>Understand the variables</h4><p class="definition">${definitions}</p><h4>Substitute the values from this epoch</h4>${sub(values)}</div></div><div class="lesson-extra">${extra}</div>${why(meaning)}</article>`;
}

function renderMath() {
  if (!solution?.ok) return;
  purgePlots('steps');
  const r = solution,
    w = r.iterations[+$('iteration').value || 0],
    s = w.rows.find(x => x.sat === selectedSat) || w.rows[0],
    i = w.rows.indexOf(s),
    b = w.state[3 + r.systems.indexOf(s.system)],
    dv = s.ecef_m.map((x, j) => x - w.state[j]);
  $('orbit-link').href = '/orbits?' + new URLSearchParams({
    epoch: r.epoch_index,
    sat: s.sat
  });
  const correctionModel = +r.case === 0 ? 'Pᵢ = ρᵢ + bₛ' : 'Pᵢ = ρᵢ + bₛ − cδtₛᵥ + Iᵢ + Tᵢ + Bᵢ';
  $('steps').innerHTML =
    step('01', 'Select an observation epoch', 'P = c (tᵣ − tₜ)',
      'P: measured code pseudorange [m]; c = 299,792,458 m/s. Time tags and satellite positions must refer to the same signal transmission.',
      `Epoch = ${r.epoch_gps} GPS\nReceiver = ${meta.obs_file}\n${s.sat} / ${s.code}: P = ${f(s.pseudorange_m)} m\nCarrier phase = ${f(s.phase_cycles)} cycles; C/N₀ = ${f(s.cn0_dbhz,1)} dB-Hz\nUsed satellites = ${r.satellites.map(x=>x.sat).join(', ')}`,
      'Pseudorange includes receiver/satellite clock offsets and propagation delays, so it differs from the geometric distance.'
      ) +
    step('02', 'Satellite position from the navigation message', 'rₛ(tₜ) = broadcast_orbit(NAV, tₜ) → R₃(ωₑτ) rₛ',
      'Transmit time is obtained from the measured pseudorange and satellite clock. Earth rotates during flight; the Earth rotation switch controls reception-frame compensation.',
      `${s.sat}: NAV Toc = ${s.nav_epoch} ${s.nav_time_system}; Toe = ${f(s.toe_s)} s\nTransmit GPS = ${s.transmit_gps}\nTransmit ECEF = ${vec(s.transmit_ecef_m)} m\nReception-frame ECEF = ${vec(s.ecef_m)} m`,
      'Keplerian GNSS ephemerides, GLONASS integrated state vectors and SBAS state polynomials use different propagation equations. The linked orbit dashboard exposes those models.'
      ) +
    step('03', 'Geometric range', 'ρᵢ = √[(Xᵢ − Xᵣ)² + (Yᵢ − Yᵣ)² + (Zᵢ − Zᵣ)²]',
      'rₛ: satellite ECEF; rᵣ: current receiver ECEF. Both in metres in the reception frame.',
      `Receiver = ${vec(w.state.slice(0,3))}\nSatellite = ${vec(s.ecef_m)}\nΔX, ΔY, ΔZ = ${vec(dv)}\nρ = √(${dv.map(x=>f(x)+'²').join(' + ')}) = ${f(s.range_m)} m`,
      'Geometric range is the full three-dimensional distance between the satellite and receiver. The diagram projects their coordinates onto the X–Z plane; the calculation includes all three components.') +
    step('04', 'Pseudorange observation model', correctionModel,
      'bₛ = c·δtᵣ for this constellation [m]. I and T are positive propagation delays; B is the broadcast code delay. Corrections are applied with their physical signs.',
      `Pcorrected = P + cδtsv − I − T − B\n${f(s.corrected_m)} = ${f(s.pseudorange_m)} + ${f(s.clock_m)} − ${f(s.iono_m)} − ${f(s.tropo_m)} − ${f(s.bias_m)}\nComputed ρ + b = ${f(s.range_m)} + ${f(b)} = ${f(s.range_m+b)} m`,
      'Case 0 intentionally turns satellite clock, ionosphere, troposphere, multipath and measurement-noise corrections off in the observation equation. Other cases reveal the effect of selected modeled terms.'
      ) +
    step('05', 'Initial receiver estimate', 'x₀ = [X₀, Y₀, Z₀, b₁, …, bₖ]ᵀ',
      'Coordinates come from APPROX POSITION XYZ. Clock states start at zero as an estimation initialization, not as measured corrections.',
      `Initial state = ${vec(r.initial)} m\nCurrent linearization state x${w.iteration} = ${vec(w.state)} m`,
      'The nonlinear equation requires a point about which its first derivative can be evaluated. A terrestrial initial position also enables elevation screening.'
      ) +
    step('06', 'Linearize about the current position',
      'f(x₀ + Δx) ≈ f(x₀) + HΔx &nbsp; → &nbsp; v = Pcorrected − f(x₀)',
      'H contains partial derivatives of modeled range with respect to receiver position and clock states. Atmospheric and Earth-rotation terms are recomputed each iteration; their very small derivatives are omitted in H.',
      `v(${s.sat}) = ${f(s.corrected_m)} − (${f(s.range_m)} + ${f(b)}) = ${f(s.misclosure_m)} m\nH row = ${vec(w.H[i],8)}`,
      'Geometric range is nonlinear. A tangent approximates that function locally, then the expansion point moves toward the solution.',
      '<div id="linearization" class="plot"></div>') +
    step('07', 'Design / geometry matrix H', 'Hᵢ = [−ΔXᵢ/ρᵢ, −ΔYᵢ/ρᵢ, −ΔZᵢ/ρᵢ, 1(systemᵢ = s₁), …]',
      'The first three columns are negative line-of-sight components. Clock columns contain one for the satellite’s system and zero otherwise. Click a row to select its satellite.',
      `${s.sat}: ${vec(dv.map(x=>-x/s.range_m),8)}\nRank = ${w.rank} / ${r.unknowns.length}; condition number = ${f(w.condition,2)}`,
      'Full column rank means the position and clock states can be distinguished by the measurements.', table(['PRN',
        ...r.unknowns
      ], w.H.map((row, j) => [satelliteLabel(w.rows[j].sat), ...row.map(x => f(x, 7))]), w.rows.map(x =>
        `data-sat="${x.sat}" class="${x.sat===selectedSat?'selected':''}"`)) + '<div id="h-heat" class="plot"></div>') +
    step('08', 'Observed-minus-computed vector', 'vᵢ = Pcorrected,ᵢ − ρᵢ⁰ − bₛ⁰',
      'v is a pre-fit misclosure at the selected iteration. At initialization b = 0; subsequent iterations must subtract the accumulated receiver clock.',
      `v = ${vec(w.v)} m`, 'Misclosures drive the next state update. They are distinct from final post-fit residuals.',
      table(['PRN', 'Measured P [m]', 'Corrected P [m]', 'Range [m]', 'Pcorrected − ρ − b [m]'], w.rows.map(x => [
        satelliteLabel(x.sat), f(x.pseudorange_m), f(x.corrected_m), f(x.range_m), f(x.misclosure_m)
      ]))) +
    step('09', 'Least-squares update', 'Δx = (HᵀH)⁻¹ Hᵀv &nbsp; → &nbsp; xₖ₊₁ = xₖ + Δx',
      'The normal-equation expression is displayed for teaching. Computation uses SVD least squares rather than explicitly multiplying an inverse.',
      `Hᵀv = ${vec(w.Htv,6)}\nΔx = ${vec(w.delta,6)} m\nxupdated = ${vec(w.updated,6)} m`,
      'Least squares finds the state update that minimizes the sum of squared linearized misclosures.',
      `<h3>HᵀH</h3>${matrix(w.normal,r.unknowns)}<h3>(HᵀH)⁻¹</h3>${matrix(w.inverse,r.unknowns)}<div class="flow">H and v → SVD → rank check → Δx → update position and clocks → recompute ranges → repeat</div>`
      ) +
    step('10', 'Iteration and convergence', 'max |Δxⱼ| &lt; 10⁻⁴ m',
      'The criterion applies to all coordinate and clock-in-metres corrections. Maximum 15 iterations; a non-converged result is not reported as a solution.',
      `Selected iteration: ${w.iteration}\n3D position correction = ${f(w.correction_m,8)} m\nClock corrections = ${vec(w.delta.slice(3),8)} m\nFinal receiver = ${vec(r.ecef_m)} m\nFinal residual RMS = ${f(r.residual_rms_m)} m`,
      'SPP is nonlinear because geometric range depends on the unknown receiver coordinates. Least squares is applied iteratively until the correction becomes sufficiently small.',
      table(['Iteration', 'ΔX [m]', 'ΔY [m]', 'ΔZ [m]', 'Clock updates [m]', '3D Δ [m]', 'Pre-fit RMS [m]'], r
        .iterations.map(x => [x.iteration, ...x.delta.slice(0, 3).map(v => f(v, 6)), vec(x.delta.slice(3), 6), f(x
          .correction_m, 8), f(x.rms_m)])) + '<div id="convergence" class="plot"></div>') +
    step('11', 'ECEF to geodetic and the local ENU frame',
      'λ = atan2(Y,X); &nbsp; X = (Nφ + h) cosφ cosλ; &nbsp; eENU = R(φ,λ)(x − xref)',
      'Nφ = a / √(1 − e² sin²φ), with WGS84 a = 6378137 m and inverse flattening 298.257223563. φ and h are solved iteratively using the existing coordinate engine.',
      `Latitude = ${f(r.geodetic.lat_deg,9)}°\nLongitude = ${f(r.geodetic.lon_deg,9)}°\nEllipsoidal height = ${f(r.geodetic.height_m)} m\nFixed-reference ENU error = ${vec(r.enu_error_m)} m\nSelected LOS ENU = ${vec(s.enu_m)} m\nAz = atan2(E,N) = ${f(s.az_deg)}°; El = atan2(U,√(E²+N²)) = ${f(s.el_deg)}°`,
      'Geodetic latitude is defined by the ellipsoid normal, not by the geocentric radius. The ENU frame makes coordinate differences locally interpretable.',
      '<div class="grid"><div id="geodetic-viz" class="plot"></div><div id="enu-viz" class="plot"></div></div>') +
    step('12', 'Connect geometry to dilution of precision',
      'Q = (HᵀH)⁻¹; &nbsp; PDOP = √(Qxx + Qyy + Qzz); &nbsp; QENU = R Qxyz Rᵀ',
      'HDOP = √(QEE + QNN); VDOP = √QUU. TDOP here is √(sum of all clock variances); GDOP² = PDOP² + TDOP². Multi-GNSS clock-state count changes this convention.',
      `Final PDOP = ${f(r.dop.PDOP)}; HDOP = ${f(r.dop.HDOP)}; VDOP = ${f(r.dop.VDOP)}\nGDOP = ${f(r.dop.GDOP)}; TDOP = ${f(r.dop.TDOP)}\nClock DOP values = ${vec(r.dop.clock_DOP)}`,
      'DOP describes amplification of equal, independent range noise through geometry. It does not measure atmospheric bias or guarantee accuracy. Compare position DOP across modes; total GDOP includes a different number of clock states.',
      `<h3>Final Q (converged geometry)</h3>${matrix(r.dop.Q,r.unknowns)}<h3>Final QENU</h3>${matrix(r.dop.Qenu,['E','N','U'])}`
      );
  const dx = w.delta[0],
    span = Math.max(100, Math.abs(dx) * 1.5),
    xs = Array.from({
      length: 81
    }, (_, j) => (j / 80 - .5) * 2 * span),
    base = s.range_m;
  plot('linearization', [{
    x: xs,
    y: xs.map(x => Math.hypot(dv[0] - x, dv[1], dv[2]) - base),
    name: 'Nonlinear range change',
    line: {
      color: '#b8cfe0'
    }
  }, {
    x: xs,
    y: xs.map(x => w.H[i][0] * x),
    name: 'Tangent Hₓ ΔX',
    line: {
      color: '#f5a9c8',
      dash: 'dash'
    }
  }], {
    xaxis: {
      title: 'Trial receiver ΔX [m] (Y,Z fixed)'
    },
    yaxis: {
      title: 'Range change [m]'
    }
  });
  plot('h-heat', [{
    type: 'heatmap',
    z: w.H,
    x: r.unknowns,
    y: w.rows.map(x => x.sat),
    zmin: -1,
    zmax: 1,
    colorscale: [
      [0, '#f4a9c9'],
      [.5, '#172b41'],
      [1, '#d8e9ef']
    ],
    colorbar: {
      title: '∂P / ∂state'
    },
    name: 'H coefficients'
  }], {
    yaxis: {
      autorange: 'reversed',
      showticklabels: false
    },
    annotations: w.rows.map(x => ({
      x: -.04,
      xref: 'paper',
      y: x.sat,
      yref: 'y',
      text: x.sat,
      showarrow: false,
      font: {
        color: C[x.system]
      }
    }))
  });
  plot('convergence', [{
    x: r.iterations.map(x => x.iteration),
    y: r.iterations.map(x => Math.max(1e-12, x.correction_m)),
    name: '3D position correction',
    mode: 'lines+markers',
    line: {
      color: '#f5a9c8'
    }
  }, {
    x: r.iterations.map(x => x.iteration),
    y: r.iterations.map(x => Math.max(1e-12, Math.hypot(...x.delta.slice(3)))),
    name: 'Clock correction norm',
    mode: 'lines+markers',
    line: {
      color: '#d7dfeb'
    }
  }], {
    xaxis: {
      title: 'Iteration',
      dtick: 1
    },
    yaxis: {
      title: 'Correction [m] · log scale',
      type: 'log'
    }
  });
  framePlots(s);
  SPPStudio.math();
  AccuracyStudio.teach();
}

function rotation(lat, lon) {
  const p = lat * Math.PI / 180,
    l = lon * Math.PI / 180;
  return [
    [-Math.sin(l), Math.cos(l), 0],
    [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
    [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
  ];
}

function framePlots(s) {
  const g = solution.geodetic,
    p = Math.hypot(solution.ecef_m[0], solution.ecef_m[1]) / 1000,
    z = solution.ecef_m[2] / 1000,
    phi = g.lat_deg * Math.PI / 180;
  const theta = Array.from({
    length: 181
  }, (_, i) => i * Math.PI * 2 / 180);
  plot('geodetic-viz', [{
    x: theta.map(t => 6378.137 * Math.cos(t)),
    y: theta.map(t => 6356.752314 * Math.sin(t)),
    name: 'WGS84 meridian',
    line: {
      color: '#8da6b7'
    }
  }, {
    x: [0, p],
    y: [0, z],
    name: 'Geocentric radius',
    line: {
      color: '#f5a9c8'
    }
  }, {
    x: [p, p + 1800 * Math.cos(phi)],
    y: [z, z + 1800 * Math.sin(phi)],
    name: 'Geodetic normal (direction)',
    line: {
      color: '#fff'
    }
  }, {
    x: [p],
    y: [z],
    text: ['Receiver'],
    mode: 'markers+text',
    name: 'Receiver',
    marker: {
      color: '#f5e4af',
      size: 8
    }
  }], {
    xaxis: {
      title: '√(X² + Y²) [km]'
    },
    yaxis: {
      title: 'ECEF Z [km]',
      scaleanchor: 'x'
    },
    title: 'Meridian section · ellipsoid and normal'
  });
  const e = s.enu_m.map(x => x / 1000),
    traces = [];
  for (let i = 0; i < 3; i++) {
    const a = [0, 0, 0];
    a[i] = Math.max(...e.map(Math.abs)) * .5;
    traces.push({
      type: 'scatter3d',
      mode: 'lines+text',
      x: [0, a[0]],
      y: [0, a[1]],
      z: [0, a[2]],
      text: ['', 'ENU' [i]],
      name: 'ENU' [i] + ' axis',
      line: {
        color: ['#f5a9c8', '#d7dfeb', '#f5e4af'][i]
      }
    });
  }
  traces.push({
    type: 'scatter3d',
    mode: 'lines+markers',
    x: [0, e[0]],
    y: [0, e[1]],
    z: [0, e[2]],
    name: s.sat + ' LOS',
    line: {
      color: C[s.system]
    }
  }, {
    type: 'scatter3d',
    mode: 'lines',
    x: [0, e[0], e[0]],
    y: [0, e[1], e[1]],
    z: [0, 0, e[2]],
    name: 'Horizontal projection / Up',
    line: {
      color: '#aaa',
      dash: 'dash'
    }
  });
  plot('enu-viz', traces, {
    scene: {
      aspectmode: 'data',
      xaxis: {
        title: 'East [km]'
      },
      yaxis: {
        title: 'North [km]'
      },
      zaxis: {
        title: 'Up [km]'
      }
    },
    title: `Az ${f(s.az_deg,1)}° · El ${f(s.el_deg,1)}°`,
    margin: {
      t: 40,
      b: 70,
      l: 0,
      r: 0
    }
  });
}

function renderDop() {
  const rows = [solution, otherSolution].filter(Boolean);
  $('dop-comparison').innerHTML = table(['Mode', 'Satellites', 'States', 'GDOP', 'PDOP', 'HDOP', 'VDOP', 'TDOP'], rows
      .map(r => r.ok ? [r.mode, r.count, r.unknowns.length, ...['GDOP', 'PDOP', 'HDOP', 'VDOP', 'TDOP'].map(k => f(r
        .dop[k]))] : [r.mode, esc(r.error), '—', '—', '—', '—', '—', '—'])) +
    '<p class="plot-note">Multi-GNSS GDOP/TDOP include all clock states. PDOP, HDOP and VDOP describe the comparable position block.</p>';
  plot('dop-plot', rows.filter(r => r.ok).map(r => ({
    type: 'bar',
    name: r.mode === 'gps' ? 'GPS-only solution' : 'Multi-GNSS solution',
    x: ['PDOP', 'HDOP', 'VDOP'],
    y: ['PDOP', 'HDOP', 'VDOP'].map(k => r.dop[k]),
    marker: {
      color: r.mode === 'gps' ? '#f5a9c8' : '#c3d1dd'
    }
  })), {
    yaxis: {
      title: 'DOP (dimensionless)'
    },
    barmode: 'group'
  });
}

function renderComparison() {
  $('comparison').innerHTML = table(['Case', 'Lat [°]', 'Lon [°]', 'Height [m]', 'Horizontal error [m]', 'Up error [m]',
    '3D error [m]', 'Residual RMS [m]', 'Status'
  ], epochCases.map((r, i) => r.ok ? [i + ' · ' + esc(r.case_name), f(r.geodetic.lat_deg, 8), f(r.geodetic.lon_deg,
    8), f(r.geodetic.height_m), f(r.horizontal_error_m), f(r.enu_error_m[2]), f(r.error_3d_m), f(r
    .residual_rms_m), 'Converged'] : [i + ' · ' + esc(r.case_name), '—', '—', '—', '—', '—', '—', '—', esc(r
    .error)]));
  plot('compare-plot', epochCases.filter(r => r.ok).map(r => ({
    type: 'scatter',
    mode: 'markers+text',
    name: 'Case ' + r.case,
    x: [r.enu_error_m[0]],
    y: [r.enu_error_m[1]],
    text: ['Case ' + r.case],
    textposition: 'top center',
    marker: {
      color: caseColors[r.case],
      size: 12
    },
    hovertemplate: 'E %{x:.3f} m<br>N %{y:.3f} m<extra>%{fullData.name}</extra>'
  })), {
    xaxis: {
      title: 'East error [m]'
    },
    yaxis: {
      title: 'North error [m]',
      scaleanchor: 'x'
    }
  });
}

function renderCorrections() {
  purgePlots('corrections');
  const r = epochCases[+$('case').value] || solution;
  if (!r?.ok) {
    $('corrections').innerHTML = '<p>Correction details unavailable for this case.</p>';
    AccuracyStudio.teach();
    SPPStudio.errors();
    return;
  }
  const s = r.satellites.find(x => x.sat === selectedSat) || r.satellites[0],
    cl = s.clock,
    ion = s.ionosphere,
    trop = s.troposphere;
  $('corrections').innerHTML =
    `<h2>Correction mathematics · ${esc(r.case_name)}</h2>${eq('Pcorrected = Praw + cδtₛᵥ − I − T − B')}${table(['Satellite','Elevation [°]','Raw P [m]','Clock [m]','Ionosphere [m]','Troposphere [m]','Code delay B [m]','Corrected P [m]'],r.satellites.map(x=>[satelliteLabel(x.sat),f(x.el_deg),f(x.pseudorange_m),f(x.clock_m),f(x.iono_m),f(x.tropo_m),f(x.bias_m),f(x.corrected_m)]),r.satellites.map(x=>`data-sat="${x.sat}"`))}<p>Zeros in disabled cases mean “OFF”, not a measured zero delay. Clock signs are retained. Error-budget bars show signed modeled terms and post-fit residuals; they are not independent error variances.</p><div id="budget" class="plot"></div><p>Multipath and receiver noise: <strong>Not directly separable from this dataset.</strong> Residuals also include orbit/model error and receiver effects.</p>` +
    step('C1', `Satellite clock · ${s.sat}`, 'δtₛᵥ = af₀ + af₁(t − Toc) + af₂(t − Toc)² + Δtᵣₑₗ',
      'For GLONASS and SBAS the model is linear; the third RINEX clock field is not af2. The first GLONASS RINEX field stores −τn. The Relativity switch independently adds the periodic term for Keplerian systems.',
      `Toc = ${s.nav_epoch} ${s.nav_time_system}\naf0 = ${exp(cl.af0)} s\naf1 = ${exp(cl.af1)} s/s\naf2 = ${exp(cl.af2)} s/s²\nt − Toc = ${f(cl.dt_s,6)} s\nPolynomial = ${exp(cl.polynomial_s)} s\nRelativity = ${exp(cl.relativity_s)} s\nδtsv = ${exp(cl.seconds)} s; cδtsv = ${f(cl.metres)} m\nApplied to this case = ${f(s.clock_m)} m`,
      'A clock error of one microsecond corresponds to about 300 m of range. This is why omitting satellite clocks strongly distorts the basic solution.'
      ) +
    step('C2', 'Relativistic satellite clock term', 'Δtᵣₑₗ = −2 √μ e √A sin(E) / c²',
      'The varying gravitational potential and velocity along an eccentric Keplerian orbit change the satellite clock rate. GLONASS broadcast clock handling already includes its relativity convention.',
      `Selected satellite ${s.sat}\nApplied Δtrel = ${exp(cl.relativity_s)} s = ${f(cl.relativity_s*299792458,6)} m\nApplied only when the Relativity switch is ON; applicable to Keplerian ephemerides.`,
      'This orbit-dependent term is separate from the polynomial clock and from signal group delays.') +
    step('C3', 'Broadcast ionospheric delay',
      'ψ = 0.0137/(El/π + 0.11) − 0.022; &nbsp; I = c F [5 ns + A(1 − x²/2 + x⁴/24)]',
      'Klobuchar uses semicircles for latitude/longitude/elevation and radians for trigonometric evaluation. For |x| ≥ 1.57 only the 5 ns baseline remains. Delay is scaled by (1575.42 MHz / f)².',
      ion ?
      `Model = ${ion.source}\nAz = ${f(s.az_deg)}°; El = ${f(s.el_deg)}°\nα = ${ion.alpha.map(exp).join(', ')}\nβ = ${ion.beta.map(exp).join(', ')}\nψ = ${f(ion.psi,9)}; pierce point φ = ${f(ion.phi,9)}, λ = ${f(ion.lam,9)} semicircles\nGeomagnetic φ = ${f(ion.geomag,9)}\nLocal time = ${f(ion.local_time_s)} s; amplitude A = ${exp(ion.amplitude_s)} s\nPeriod = ${f(ion.period_s)} s; phase x = ${f(ion.phase_rad,9)} rad\nMapping F = ${f(ion.mapping,9)}; frequency = ${f(ion.frequency_hz,0)} Hz\nI/c = ${exp(ion.seconds)} s; I = ${f(ion.metres,6)} m` :
      'OFF. Enable the Ionosphere switch to calculate this correction.',
      'Code travels more slowly through the ionosphere. The broadcast model predicts a delay, not a directly measured ionospheric truth.',
      eq('φᵢ = clamp(φᵣ/π + ψ cosAz, −0.416, 0.416); λᵢ = λᵣ/π + ψ sinAz/cos(πφᵢ)') + eq(
        'φₘ = φᵢ + 0.064 cos[π(λᵢ − 1.617)]; tlocal = (43200 λᵢ + GPS seconds-of-week) mod 86400') + eq(
        'A = max(0, Σ αⱼ φₘʲ); Per = max(72000, Σ βⱼ φₘʲ); x = 2π(tlocal − 50400)/Per; F = 1 + 16(0.53 − El/π)³')) +
    step('C4', 'Tropospheric delay · Saastamoinen', 'T = (ZHD + ZWD) · m(El); m(El) = 1.001 / √(0.002001 + sin²El)',
      'Standard-atmosphere pressure and temperature are modeled from height; relative humidity is assumed 50%. Black-Eisner mapping is used, with a minimum selectable mask of 5°.',
      trop ?
      `Height = ${f(trop.height_m)} m; El = ${f(s.el_deg)}°\nModeled pressure = ${f(trop.pressure_hpa)} hPa; temperature = ${f(trop.temperature_k)} K\nModeled relative humidity = ${f(trop.relative_humidity*100,0)}%\nZenith dry = ${f(trop.zenith_dry_m,6)} m; wet = ${f(trop.zenith_wet_m,6)} m\nZenith total = ${f(trop.zenith_m,6)} m\nMapping = ${f(trop.mapping,6)}\nSlant delay = ${f(trop.metres,6)} m` :
      'OFF. Enable the Troposphere switch to calculate this correction.',
      'Low-elevation signals traverse a longer atmospheric path. The mapping follows Chapter 7, printed p.318; the zenith delays use the stated standard atmosphere.',
      eq('p = 1013.25(1 − 2.2557×10⁻⁵h)<sup>5.2568</sup>; Tₖ = 288.15 − 0.0065h') + eq(
        'ZHD = 0.0022768p / (1 − 0.00266 cos2φ − 0.00028h/1000)') + eq(
        'e = 6.108 RH exp[(17.15Tₖ − 4684)/(Tₖ − 38.45)]; ZWD = 0.002277(1255/Tₖ + 0.05)e'));
  plot('budget', [
    ['clock_m', 'Satellite clock', '#f5a9c8'],
    ['iono_m', 'Ionosphere', '#d8c6f0'],
    ['tropo_m', 'Troposphere', '#f5e4af'],
    ['residual_m', 'Residual / unmodeled', '#b7c8d6']
  ].map(([key, name, color]) => ({
    type: 'bar',
    x: r.satellites.map(s => s.sat),
    y: r.satellites.map(s => s[key]),
    name,
    marker: {
      color
    }
  })), {
    barmode: 'group',
    yaxis: {
      title: 'Signed contribution [m]'
    }
  });
  AccuracyStudio.teach();
  SPPStudio.errors();
}

function stats(rows) {
  const good = rows.filter(r => r.ok),
    N = good.length;
  if (!N) return null;
  const axis = [0, 1, 2].map(i => {
    const a = good.map(r => r.enu_error_m[i]),
      mean = a.reduce((x, y) => x + y, 0) / N;
    return {
      mean,
      std: Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / N),
      rmse: Math.sqrt(a.reduce((x, y) => x + y * y, 0) / N),
      max: Math.max(...a.map(Math.abs))
    };
  });
  return {
    N,
    failed: rows.length - N,
    axis,
    horizontal: Math.hypot(axis[0].rmse, axis[1].rmse),
    threeD: Math.hypot(...axis.map(a => a.rmse)),
    max3D: Math.max(...good.map(r => r.error_3d_m))
  };
}

function renderSeries() {
  const cached = seriesCache.get(stateKey()),
    rows = cached?.rows || [],
    good = rows.filter(r => r.ok),
    st = stats(rows);
  $('series-status').textContent = cached ?
    `${rows.length} / ${meta.epoch_count} epochs processed; ${good.length} successful; ${rows.length-good.length} unavailable${rows.length<meta.epoch_count?' · partial dataset':''}.` :
    'Calculate all epochs to obtain position RMSE and dispersion. Only the selected epoch is displayed below.';
  const caveat=$('accuracy-model-caveat');
  if(caveat) caveat.textContent=solution?.corrections?.clock ? 'Reference caveat: ENU and RMSE values use the approximate position in the RINEX header, not an independently surveyed ground-truth coordinate. Corrected pseudorange models remain estimates.' : 'Teaching-case caveat: satellite clock correction is disabled, but the real pseudorange observations still contain the physical satellite-clock effects. Large position errors are expected and must not be interpreted as corrected receiver accuracy.';
  $('statistics').innerHTML = st ? table(['Local axis', 'Mean error [m]', 'Population σ [m]', 'RMSE [m]',
      'Max |error| [m]'
    ], st.axis.map((a, i) => ['ENU' [i], f(a.mean), f(a.std), f(a.rmse), f(a.max)])) +
    `<div class="metrics">${metric('Horizontal RMSE [m]',f(st.horizontal))}${metric('Vertical RMSE [m]',f(st.axis[2].rmse))}${metric('3D RMSE [m]',f(st.threeD))}${metric('Maximum 3D error [m]',f(st.max3D))}</div>` :
    '';
  AccuracyStudio.render(good, st);
  const series = rows.length ? rows : solution?.ok ? [solution] : [];
  plot('enu-time', [0, 1, 2].map((i) => ({
    x: series.map(r => r.epoch_gps),
    y: series.map(r => r.ok ? r.enu_error_m[i] : null),
    connectgaps: false,
    name: ['East', 'North', 'Up'][i],
    mode: series.length > 1 ? 'lines' : 'markers',
    line: {
      color: ['#47d9ef', '#af9aff', '#ffbb69'][i], width: 2
    }
  })), {
    paper_bgcolor: '#102338', plot_bgcolor: '#0c1c2d', hovermode: 'x unified',
    margin: {l:65,r:25,t:28,b:100},
    xaxis: {
      gridcolor: '#294256',
      title: 'Observation epoch [GPS]'
    },
    yaxis: {
      title: 'Reference-relative error [m]', gridcolor: '#294256', zerolinecolor: '#9cb9cb'
    }
  });
  if (!$('quality-time')) {
    const section=document.createElement('div');section.id='quality-diagnostics';section.className='quality-diagnostics';
    section.innerHTML=`<div class="section-label">Time-dependent accuracy and observation quality</div>
      <h3>Epoch-by-Epoch Positioning Diagnostics</h3>
      <p>Interpret receiver-position error separately from geometric strength and the residual quality of the pseudorange fit. The shared epoch axis connects all three plots.</p>
      <div class="quality-chart-grid">
        <article class="accuracy-chart"><span class="section-label">Receiver position domain</span><h3>Three-Dimensional Position Error</h3><p>Distance from the selected fixed receiver reference, not a model-only accuracy prediction.</p><div id="quality-time" class="plot"></div></article>
        <article class="accuracy-chart"><span class="section-label">Satellite geometry domain</span><h3>PDOP and Number of Satellites</h3><p>PDOP is dimensionless and describes geometric sensitivity. Satellite count uses the secondary axis.</p><div id="geometry-time" class="plot"></div></article>
      </div>
      <article class="accuracy-chart quality-residual-chart"><span class="section-label">Observation residual domain</span><h3>Post-Fit Pseudorange Residual RMS</h3><p>The RMS of the code residuals remaining after the current model and clock states are fitted. This is not receiver-position RMSE.</p><div id="fit-time" class="plot"></div></article>`;
    $('enu-time').parentElement.parentElement.after(section);
  }
  const times=series.map(r=>r.epoch_gps);
  const grid='#294256';
  const modePlot=series.length>1?'lines':'markers';
  plot('quality-time',[{
    x:times,y:series.map(r=>r.ok?r.error_3d_m:null),connectgaps:false,name:'3D error',mode:modePlot,
    line:{color:'#f595ae',width:2.5},marker:{color:'#f595ae',size:7},fill:series.length>1?'tozeroy':'none',fillcolor:'rgba(245,149,174,.10)',
    hovertemplate:'%{x}<br>3D error %{y:.3f} m<extra></extra>'
  }],{showlegend:false,paper_bgcolor:'#102338',plot_bgcolor:'#0c1c2d',margin:{l:66,r:18,t:18,b:72},xaxis:{title:'Observation epoch [GPS]',gridcolor:grid},yaxis:{title:'3D position error [m]',gridcolor:grid,zerolinecolor:'#98acbe'}});
  plot('geometry-time',[
    {x:times,y:series.map(r=>r.ok?r.dop.PDOP:null),name:'PDOP',connectgaps:false,mode:modePlot,line:{color:'#8ac6ff',width:2.5},marker:{color:'#8ac6ff',size:7}},
    {x:times,y:series.map(r=>r.ok?r.count:null),name:'Satellites used',connectgaps:false,mode:modePlot,yaxis:'y2',line:{color:'#79d9ad',width:2},marker:{color:'#79d9ad',size:7}}
  ],{paper_bgcolor:'#102338',plot_bgcolor:'#0c1c2d',margin:{l:58,r:58,t:18,b:90},legend:{orientation:'h',y:-.25},xaxis:{title:'Observation epoch [GPS]',gridcolor:grid},yaxis:{title:'PDOP [1]',gridcolor:grid},yaxis2:{title:'Count',overlaying:'y',side:'right',rangemode:'tozero',dtick:1,showgrid:false}});
  plot('fit-time',[{
    x:times,y:series.map(r=>r.ok?r.residual_rms_m:null),connectgaps:false,name:'Post-fit residual RMS',mode:modePlot,
    line:{color:'#cde3f0',width:2},marker:{color:'#cde3f0',size:7},hovertemplate:'%{x}<br>Residual RMS %{y:.3f} m<extra></extra>'
  }],{showlegend:false,paper_bgcolor:'#102338',plot_bgcolor:'#0c1c2d',margin:{l:68,r:22,t:18,b:72},xaxis:{title:'Observation epoch [GPS]',gridcolor:grid},yaxis:{title:'Residual RMS [m]',gridcolor:grid,zerolinecolor:'#89a7bf'}});
  renderMap(good, st);
  const el = $('scatter');
  if (el.removeAllListeners) el.removeAllListeners('plotly_click');
  if (el.on) el.on('plotly_click', ev => {
    const idx = ev.points[0].customdata;
    if (Number.isInteger(idx)) {
      $('epoch').value = idx;
      refresh();
    }
  });
}

let mapRevision = 0, mapFitKey = '';
function renderMap(good, st) {
  const mapToken = ++mapRevision;
  if (!window.L) {
    $('map-note').textContent = 'GIS library unavailable. Computed geodetic coordinates remain in the tables.';
    return;
  }
  if (!map) {
    map = L.map('map', {
      preferCanvas: true
    }).setView([meta.receiver_geodetic.lat_deg, meta.receiver_geodetic.lon_deg], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '© OpenStreetMap contributors'
    }).on('tileerror', () => {
      $('map-note').textContent =
        'Basemap tiles unavailable. Computed receiver overlays remain accurate; check internet access.';
    }).addTo(map);
    mapLayer = L.featureGroup().addTo(map);
    const legend = L.control({
      position: 'bottomright'
    });
    legend.onAdd = () => {
      const el = L.DomUtil.create('div', 'map-legend');
      el.innerHTML = Object.entries(solutionColors).map(([k, v]) =>
        `<div><span class="dot" style="background:${v}"></span>${{cloud:'Epoch solutions',current:'Current epoch',mean:'Mean solution',reference:'Approximate reference'}[k]}</div>`
        ).join('') + '<div style="color:#ffbf69">◯ 2DRMS circle</div><div style="color:#af9aff">◯ Empirical R95</div>';
      return el;
    };
    legend.addTo(map);
  }
  mapLayer.clearLayers();
  AccuracyStudio.mapOverlay(good, st, null);
  const marker = (g, color, text, radius = 5) => L.circleMarker([g.lat_deg, g.lon_deg], {
    color,
    fillColor: color,
    fillOpacity: .8,
    radius,
    weight: 2
  }).bindPopup(text).addTo(mapLayer);
  good.forEach(r => marker(r.geodetic, solutionColors.cloud,
    `Epoch ${r.epoch_index}<br>${esc(r.epoch_gps)} GPS<br>${f(r.geodetic.lat_deg,8)}°, ${f(r.geodetic.lon_deg,8)}°<br>Height ${f(r.geodetic.height_m)} m<br>ENU ${vec(r.enu_error_m)} m<br>Horizontal error ${f(Math.hypot(...r.enu_error_m.slice(0,2)))} m<br>Click to select this epoch`,
    3).on('click',()=>{ $('epoch').value=r.epoch_index; refresh(); }));
  marker(meta.receiver_geodetic, solutionColors.reference, 'RINEX approximate reference<br>' + vec(meta
    .receiver_ecef_m) + ' m', 7);
  if (solution?.ok) marker(solution.geodetic, solutionColors.current, 'Current SPP solution<br>' + esc(solution
    .epoch_gps) + ' GPS<br>' + f(solution.geodetic.lat_deg, 8) + '°, ' + f(solution.geodetic.lon_deg, 8) + '°', 8);
  if (st) {
    const xyz = [0, 1, 2].map(i => good.reduce((sum, r) => sum + r.ecef_m[i], 0) / good.length);
    api('/api/spp/coordinates', {x:xyz[0],y:xyz[1],z:xyz[2]}).then(g => {
      if (mapToken !== mapRevision) return;
      AccuracyStudio.mapOverlay(good, st, g);
      marker(g, solutionColors.mean, 'Mean ECEF converted to geodetic<br>' + f(g.lat_deg, 8) + '°, ' + f(g.lon_deg, 8) + '°', 7);
    }).catch(e => {
      if (mapToken === mapRevision) $('map-note').textContent='Mean map position unavailable: '+e.message;
    });
  }
  map.invalidateSize();
  const fitKey = stateKey() + ':' + (st ? (seriesCache.get(stateKey())?.rows.length === meta.epoch_count ? 'complete' : 'partial') : 'epoch');
  if(mapFitKey !== fitKey){mapFitKey=fitKey;home();}
}
function home() {
  if (map && mapLayer.getLayers().length) map.fitBounds(AccuracyStudio.bounds()?mapLayer.getBounds().extend(AccuracyStudio.bounds()):mapLayer.getBounds(), {
    padding: [35, 35],
    maxZoom: 20
  });
}
async function runSeries() {
  const token = ++seriesToken,
    key = stateKey(),
    params = query();
  $('run-series').disabled = true;
  $('stop-series').hidden = false;
  const cached = seriesCache.get(key) || {
    rows: []
  };
  seriesCache.set(key, cached);
  try {
    for (let start = cached.rows.length; start < meta.epoch_count; start += 50) {
      const r = await api('/api/spp/series', {
        ...params,
        start,
        stop: Math.min(start + 50, meta.epoch_count)
      });
      if (token !== seriesToken) return;
      cached.rows.push(...r.results);
      renderSeries();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } catch (e) {
    if (token === seriesToken) $('series-status').textContent = 'Calculation stopped: ' + e.message;
  } finally {
    if (token === seriesToken) {
      $('run-series').disabled = false;
      $('stop-series').hidden = true;
    }
  }
}
async function compareAll() {
  const token = ++comparisonToken,
    params = query();
  $('compare-series').disabled = true;
  $('stop-comparison').hidden = false;
  const all = [];
  try {
    for (let c = 0; c < 5; c++) {
      const key = [mode, c, $('mask').value].join(':'),
        cached = seriesCache.get(key) || {
          rows: []
        };
      seriesCache.set(key, cached);
      for (let start = cached.rows.length; start < meta.epoch_count; start += 50) {
        const r = await api('/api/spp/series', {
          ...params,
          case: c,
          start,
          stop: Math.min(start + 50, meta.epoch_count)
        });
        if (token !== comparisonToken) return;
        cached.rows.push(...r.results);
        $('comparison-progress').textContent = `Case ${c}: ${cached.rows.length} / ${meta.epoch_count} epochs`;
        if (key === stateKey()) renderSeries();
      }
      all.push({
        case: c,
        ...stats(cached.rows)
      });
      $('comparison-rmse').innerHTML = table(['Case', 'Successful epochs', 'Unavailable', 'E RMSE [m]', 'N RMSE [m]',
        'U RMSE [m]', 'Horizontal RMSE [m]', '3D RMSE [m]'
      ], all.map(s => [s.case, s.N ?? 0, s.failed ?? meta.epoch_count, ...[0, 1, 2].map(i => f(s.axis?.[i].rmse)),
        f(s.horizontal), f(s.threeD)
      ]));
      AccuracyStudio.comparison(all);
    }
    if (token === comparisonToken) $('comparison-progress').textContent =
      'All five cases calculated. Each RMSE uses that case’s successful epochs; compare coverage before attributing changes solely to corrections.';
  } catch (e) {
    if (token === comparisonToken) $('comparison-progress').textContent = e.message;
  } finally {
    if (token === comparisonToken) {
      $('compare-series').disabled = false;
      $('stop-comparison').hidden = true;
    }
  }
}
async function init() {
  try {
    meta = await api('/api/spp/meta');
    if ($('spp-tab')) $('spp-tab').classList.add('active');
    if ($('analyzer')) $('analyzer').hidden = false;
    $('files').textContent = `OBS ${meta.obs_file} + NAV ${meta.nav_file} · ${meta.epoch_count} observation epochs`;
    $('reference-note').textContent = meta.reference_label + '. Reference ECEF ' + vec(meta.receiver_ecef_m) + ' m.';
    $('epoch').innerHTML = meta.epochs.map((e, i) =>
      `<option value="${i}">${i+1} / ${meta.epoch_count} · ${esc(e)}</option>`).join('');
    $('case').innerHTML = meta.cases.map((s, i) => `<option value="${i}">Case ${i} · ${esc(s)}</option>`).join('');
    const q = new URLSearchParams(location.search);
    if (q.get('mode') === 'multi') mode = 'multi';
    if (q.has('epoch')) $('epoch').value = Math.max(0, Math.min(meta.epoch_count - 1, Number(q.get('epoch')) || 0));
    if (q.has('case')) $('case').value = Math.max(0, Math.min(4, Number(q.get('case')) || 0));
    for (const m of ['gps', 'multi']) {
      $(m + '-mode').classList.toggle('active', m === mode);
      $(m + '-mode').onclick = () => {
        mode = m;
        for (const v of ['gps', 'multi']) $(v + '-mode').classList.toggle('active', v === mode);
        refresh();
      };
    }
    for (const id of ['epoch', 'mask', 'case']) $(id).onchange = refresh;
    for (const [id, fn] of [
        ['first', () => 0],
        ['previous', () => Math.max(0, +$('epoch').value - 1)],
        ['next', () => Math.min(meta.epoch_count - 1, +$('epoch').value + 1)],
        ['last', () => meta.epoch_count - 1]
      ]) $(id).onclick = () => {
      $('epoch').value = fn();
      refresh();
    };
    $('iteration').onchange = renderMath;
    $('satellite').onchange = () => chooseSat($('satellite').value);
    $('run-series').onclick = runSeries;
    $('stop-series').onclick = () => {
      seriesToken++;
      $('stop-series').hidden = true;
      $('run-series').disabled = false;
      $('series-status').textContent += ' Paused; calculate again to resume.';
    };
    $('compare-series').onclick = compareAll;
    $('stop-comparison').onclick = () => {
      comparisonToken++;
      $('stop-comparison').hidden = true;
      $('compare-series').disabled = false;
      $('comparison-progress').textContent += ' Paused.';
    };
    $('map-home').onclick = home;
    $('export').onclick = () => {
      const blob = new Blob([JSON.stringify({
          metadata: meta,
          solution,
          cases: epochCases,
          epoch_series: seriesCache.get(stateKey())?.rows || []
        }, null, 2)], {
          type: 'application/json'
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `spp-${mode}-epoch-${$('epoch').value}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    SPPStudio.init();
    AccuracyStudio.init();
    CorrectionLab.init();
    await refresh();
  } catch (e) {
    fail('Unable to load SPP: ' + e.message);
  }
}
init();
