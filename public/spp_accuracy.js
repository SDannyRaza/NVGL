/* Reference-relative accuracy, empirical coverage and linked GIS overlays. */
window.AccuracyStudio = (() => {
  let centered = false,
    rings;
  const palette = ['#47d9ef', '#af9aff', '#ffbb69'];
  const definitions = [
    ['Epoch / t', 'An instant at which the receiver records observations. This laboratory labels epochs in GPS time; an epoch is a time tag, not a satellite.'],
    ['Pseudorange / P', 'A code-derived apparent distance in metres. It contains geometric range, receiver and satellite clock offsets, atmospheric delays, signal biases and measurement noise.'],
    ['Geometric range / ρ', 'The Euclidean distance from the receiver to a satellite at signal transmission, with both coordinates expressed in the same reception frame.'],
    ['ECEF / X, Y, Z', 'Earth-centred, Earth-fixed Cartesian coordinates in metres: Z follows the rotation axis, X intersects the equator at the reference meridian, and Y completes the right-handed frame.'],
    ['Clock bias / b = cδt', 'A receiver time offset δt expressed as a distance using the speed of light c. Satellite clock offsets are modeled separately; multi-GNSS solutions may require distinct constellation clock states.'],
    ['Ephemeris', 'Navigation parameters that describe a satellite orbit and its time evolution. A broadcast ephemeris is an orbit model; it does not provide an independent measurement of orbit error.'],
    ['Elevation / El', 'The angle above the receiver’s local horizon. An elevation mask excludes low-elevation signals, which often have longer atmospheric paths and greater obstruction.'],
    ['Linearization', 'A first-order approximation of the nonlinear pseudorange equations near the current receiver estimate. Iteration updates that estimate until the position change meets the stopping criterion.'],
    ['Geometry matrix / H', 'The Jacobian of the modeled observations with respect to the unknown receiver coordinates and clock states. Each row represents one satellite observation.'],
    ['Misclosure / ΔP', 'Observed minus computed pseudorange at the current linearization point. It drives the least-squares update and differs from the residual after fitting the final solution.'],
    ['Least-squares update / Δx', 'The change in the estimated state that minimizes the sum of squared misclosures for equal observation weights. Redundant observations allow residuals to be examined.'],
    ['Residual / v', 'The remaining observed-minus-modeled range after estimating the receiver state. Residuals contain combined effects and cannot by themselves identify multipath or receiver noise.'],
    ['ENU / E, N, U', 'A local right-handed frame at the fixed reference: East is tangent to the parallel, North is tangent to the meridian, and Up follows the ellipsoid normal. Position differences are rotated into this frame.'],
    ['Mean / μ', 'The arithmetic average of an error component over the successful epochs. A nonzero mean indicates an offset relative to the selected reference, which may itself be imperfect.'],
    ['Standard deviation / σ', 'Dispersion about the mean. This dashboard uses population normalization by N because it describes the loaded sequence. Temporal correlation limits inference about future independent measurements.'],
    ['RMSE', 'Root mean square error relative to the reference. For one component, RMSE² = μ² + σ². Horizontal RMSE combines East and North; 3D RMSE also includes Up.'],
    ['DRMS / 2DRMS', 'Here DRMS is horizontal root mean square distance to the reference; 2DRMS is twice that radius. In the mean-centred view the analogous radius uses horizontal standard deviations and describes repeatability.'],
    ['Empirical R95', 'The nearest-rank 95th percentile of the horizontal distances in the displayed sequence. Its centre is the reference or the sample mean, according to the selected view. It is observed coverage, not a confidence bound on a future solution.'],
    ['DOP / HDOP / VDOP / PDOP', 'Dimensionless dilution-of-precision factors derived from observation geometry. HDOP describes horizontal geometry, VDOP vertical geometry and PDOP three-dimensional geometry; they are not measured position errors.'],
    ['Covariance / Q', 'A matrix describing variances and cross-covariances under a specified stochastic model. The inverse normal matrix gives geometry; scaling it by an assumed or fitted range variance gives a conditional state covariance.'],
    ['Ionosphere / I', 'The dispersive ionized region that delays GNSS code propagation. The first-order code delay is proportional to total electron content along the ray and inversely proportional to signal frequency squared.'],
    ['Troposphere / T', 'The neutral atmosphere introduces a largely non-dispersive delay at GNSS frequencies. Hydrostatic (dry) and wet zenith delays are multiplied by an elevation-dependent mapping function.'],
    ['ZHD / ZWD / m(El)', 'Zenith hydrostatic delay, zenith wet delay and the dimensionless slant mapping factor. Zenith delays are in metres; T = (ZHD + ZWD) m(El) describes the modeled ray delay.'],
    ['Relativity / Δtᵣ', 'A periodic satellite-clock correction associated with orbital eccentricity. Earth-rotation compensation during signal flight is a distinct coordinate-frame operation.'],
    ['TGD / BGD', 'Broadcast group-delay parameters that account for specified signal-dependent hardware delays. Their signs and use depend on the constellation, signal and satellite-clock convention.'],
    ['UERE', 'User equivalent range error: a statistical description of remaining range uncertainty. Combining independent zero-mean component variances is appropriate; summing applied correction amplitudes is not an uncertainty budget.']
  ];
  const terms = {
    '01': [0, 1, 6],
    '02': [5, 3, 23],
    '03': [2, 3, 12],
    '04': [1, 4, 20, 21, 24],
    '05': [3, 4, 7],
    '06': [7, 8, 9],
    '07': [8, 4, 19],
    '08': [9, 11],
    '09': [10, 8, 19],
    '10': [7, 10, 11],
    '11': [3, 12, 13],
    '12': [18, 19, 25],
    C1: [4, 5],
    C2: [23, 24],
    C3: [20, 1],
    C4: [21, 22, 6]
  };

  function dl(ids) {
    return `<dl class="academic-terms">${ids.map(i=>`<div><dt>${definitions[i][0]}</dt><dd>${definitions[i][1]}</dd></div>`).join('')}</dl>`;
  }

  function teach() {
    document.querySelectorAll('.step[data-step]').forEach(el => {
      if (el.querySelector('.term-guide')) return;
      const box = document.createElement('details');
      box.className = 'term-guide';
      box.open = true;
      box.innerHTML = `<summary>Academic vocabulary · symbols and physical meaning</summary>${dl(terms[el.dataset.step]||[1,2])}`;
      el.append(box);
    });
  }

  function init() {
    const section = $('series-section');
    const toolbar = document.createElement('div');
    toolbar.className = 'accuracy-toolbar';
    toolbar.innerHTML = '<div><span class="section-label">Reference-relative accuracy and repeatability</span><h3>Statistical Assessment of the SPP Position Solution</h3><p>Separate systematic offset, solution dispersion and geometry-driven sensitivity before interpreting overall positioning accuracy.</p></div><div role="group" aria-label="Scatter origin"><button id="reference-view" class="active" aria-pressed="true">Reference-relative</button><button id="centered-view" aria-pressed="false">Mean-centred</button></div>';
    $('statistics').before(toolbar);
    const theory = document.createElement('div');
    theory.innerHTML = `<div class="accuracy-source"><strong>Accuracy mathematics</strong> · Definitions follow the supplied GNSS positioning-error text: mean error, dispersion, RMSE/DRMS, DOP and covariance are distinct quantities and should not be interpreted interchangeably.</div><div class="accuracy-theory">
      <article><span class="metric-name">Bias / mean error</span><h3>Mean component error</h3><div class="math">μ_E = (1/N) Σ Eₖ</div><p>The mean is the systematic offset of the epoch solutions relative to the selected reference along one local ENU axis.</p></article>
      <article><span class="metric-name">Precision / dispersion</span><h3>Standard deviation</h3><div class="math">σ_E = √[(1/N) Σ(Eₖ − μ_E)²]</div><p>Standard deviation describes the spread of repeated solutions about their mean; it does not include the mean offset from the reference.</p></article>
      <article><span class="metric-name">Accuracy</span><h3>Root mean square error</h3><div class="math">RMSE_E = √[(1/N) Σ Eₖ²]</div><p>RMSE combines bias and dispersion. For one component, RMSE² = μ² + σ² when the same normalization is used.</p></article>
      <article><span class="metric-name">Horizontal accuracy</span><h3>Horizontal RMSE / DRMS</h3><div class="math">RMSE_H = √(RMSE_E² + RMSE_N²)</div><p>Horizontal RMSE is reference-relative. For a zero-mean stochastic model, DRMS = √(σ_E² + σ_N²), which the textbook relates to HDOP and range uncertainty.</p></article>
      <article><span class="metric-name">Three-dimensional accuracy</span><h3>3D RMSE</h3><div class="math">RMSE_3D = √(RMSE_E² + RMSE_N² + RMSE_U²)</div><p>The three-dimensional statistic combines the local East, North and Up component errors into a single reference-relative magnitude.</p></article>
      <article><span class="metric-name">Geometry-driven uncertainty</span><h3>DOP and covariance</h3><div class="math">Q = (HᵀH)⁻¹</div><p>DOP is dimensionless geometry amplification. Under an assumed range-error variance σ², the state covariance is proportional to Q; DOP itself is not a position error in metres.</p></article>
      <article><span class="metric-name">Measurement fit</span><h3>Post-fit residual RMS</h3><div class="math">RMS_v = √[(1/n) Σ vᵢ²]</div><p>Residual RMS summarizes the remaining pseudorange misfit after estimating the receiver state. It describes observation fit, not reference-relative receiver-position accuracy.</p></article>
      <article><span class="metric-name">Horizontal precision</span><h3>2DRMS</h3><div class="math">2DRMS = 2√(σ_E² + σ_N²)</div><p>2DRMS is a horizontal dispersion radius based on East/North standard deviations. Its probability interpretation depends on the distribution and anisotropy of the errors.</p></article>
      <article><span class="metric-name">Probable horizontal error</span><h3>CEP approximation</h3><div class="math">CEP ≈ 0.59(σ_E + σ_N)</div><p>The supplied text presents this common zero-mean Gaussian approximation for circular error probable. It should not be treated as an exact confidence radius for arbitrary biased or non-Gaussian data.</p></article>
      <article><span class="metric-name">Observed session coverage</span><h3>Empirical R95</h3><div class="math">R95 = percentile₉₅(r_H)</div><p>This dashboard also reports the observed 95th percentile of horizontal distances for the loaded session. It is an empirical dataset statistic, not the same as a theoretical 95% confidence bound.</p></article>
    </div>`;
    const academicTheory=document.createElement('details');
    academicTheory.className='accuracy-methods';
    academicTheory.innerHTML='<summary><span><strong>Accuracy mathematics and statistical definitions</strong><small>Mean error · dispersion · RMSE · DRMS · covariance · residual RMS · CEP · R95</small></span></summary>';
    academicTheory.append(theory);toolbar.after(academicTheory);
    const numerical = document.createElement('details');
    numerical.className = 'accuracy-numerical';
    numerical.innerHTML = '<summary>Numerical statistics · means, standard deviations and RMSE</summary>';
    $('statistics').before(numerical);
    numerical.append($('statistics'));
    for (const [id, value] of [
        ['reference-view', false],
        ['centered-view', true]
      ]) $(id).onclick = () => {
      centered = value;
      ['reference-view', 'centered-view'].forEach((name, i) => {
        const on = Boolean(i) === centered;
        $(name).classList.toggle('active', on);
        $(name).setAttribute('aria-pressed', String(on));
      });
      renderSeries();
    };
    const grid = $('scatter').parentElement.parentElement;
    grid.classList.add('accuracy-main-grid');
    $('scatter').parentElement.classList.add('accuracy-chart');
    $('enu-time').parentElement.classList.add('accuracy-chart');
    $('scatter').parentElement.querySelector('h3').textContent = 'Horizontal Position Error Distribution';
    $('enu-time').parentElement.querySelector('h3').textContent = 'Epoch-Wise East, North and Up Position Errors';
    const caption = document.createElement('p');
    caption.id = 'scatter-caption';
    caption.className = 'chart-caption';
    $('scatter').after(caption);
    const summary = document.createElement('div');
    summary.id = 'accuracy-highlights';
    summary.className = 'accuracy-highlights';
    toolbar.after(summary);
    const charts = document.createElement('div');
    charts.className = 'grid accuracy-secondary';
    charts.innerHTML = '<article class="accuracy-chart"><span class="section-label">Bias versus dispersion</span><h3>Bias and Dispersion Contributions to RMSE</h3><div id="rmse-components" class="plot"></div><p class="chart-caption">Bar height is mean squared error (m²): bias² + variance. Labels give RMSE in metres.</p></article><article class="accuracy-chart"><span class="section-label">Observed coverage</span><h3>Empirical Horizontal Error Distribution</h3><div id="error-cdf" class="plot"></div><p class="chart-caption">The cumulative distribution shows the proportion of successful epochs inside each radius. Dashed guides locate the empirical 95th percentile.</p></article>';
    grid.after(charts);
    charts.after(numerical);
    const mapPanel = $('map').parentElement;
    mapPanel.classList.add('accuracy-chart');
    mapPanel.parentElement.classList.add('accuracy-map-grid');
    const note = document.createElement('div');
    note.id = 'map-statistics';
    note.className = 'map-statistics';
    $('map').before(note);
    const glossary = document.createElement('details');
    glossary.className = 'academic-glossary';
    glossary.innerHTML = '<summary>Academic reference · definitions of all positioning and accuracy terms</summary><label for="term-search">Find a term or symbol</label><input id="term-search" type="search" placeholder="Try RMSE, clock, covariance or ionosphere">' + dl(definitions.map((_, i) => i));
    section.append(glossary);
    $('term-search').oninput = e => glossary.querySelectorAll('dl>div').forEach(row => row.hidden = !row.textContent.toLowerCase().includes(e.target.value.toLowerCase()));
    const reference = document.createElement('p');
    reference.className = 'chart-caption';
    reference.innerHTML = 'Definitions and statistical conventions: <a href="https://gssc.esa.int/navipedia/index.php/Positioning_Error" target="_blank" rel="noopener">ESA Navipedia · Positioning Error</a>. The RINEX header is an approximate reference, so these results do not establish independently verified absolute accuracy. A 2DRMS circle is not automatically a 95% confidence region; the measured coverage is reported here.';
    section.append(reference);
  }

  function distribution(good, st) {
    if (!st) return null;
    const origin = centered ? [st.axis[0].mean, st.axis[1].mean] : [0, 0];
    const distances = good.map(r => Math.hypot(r.enu_error_m[0] - origin[0], r.enu_error_m[1] - origin[1])).sort((a, b) => a - b);
    const drms = centered ? Math.hypot(st.axis[0].std, st.axis[1].std) : st.horizontal;
    return {
      origin,
      distances,
      drms,
      two: 2 * drms,
      r95: distances[Math.ceil(.95 * distances.length) - 1],
      coverage: 100 * distances.filter(d => d <= 2 * drms + 1e-10).length / distances.length
    };
  }

  function chartLayout(extra = {}) {
    const small = innerWidth < 700;
    return {
      paper_bgcolor: '#102338',
      plot_bgcolor: '#0c1c2d',
      font: {
        family: 'Segoe UI',
        size: small ? 13 : 16,
        color: '#dcebf7'
      },
      margin: {
        l: small ? 55 : 78,
        r: 28,
        t: 28,
        b: 110
      },
      legend: {
        orientation: 'h',
        y: -.2,
        font: {
          size: small ? 11 : 13
        }
      },
      ...extra
    };
  }

  function render(good, st) {
    const d = distribution(good, st),
      origin = d?.origin || [0, 0];
    const series = good.length ? good : solution?.ok ? [solution] : [];
    const traces = [{
      x: series.map(r => r.enu_error_m[0] - origin[0]),
      y: series.map(r => r.enu_error_m[1] - origin[1]),
      customdata: series.map(r => r.epoch_index),
      name: 'Epoch solutions',
      mode: 'markers',
      marker: {
        size: 6,
        color: series.map(r => r.epoch_index),
        colorscale: [
          [0, '#4959b5'],
          [.5, '#528fee'],
          [1, '#60e3e1']
        ],
        opacity: .72
      },
      hovertemplate: 'Epoch %{customdata}<br>East %{x:.3f} m<br>North %{y:.3f} m<extra></extra>'
    }];
    if (d)
      for (const [r, name, color, dash] of [
          [d.two, '2DRMS', '#ffbf69', 'solid'],
          [d.r95, 'Empirical R95', '#af9aff', 'dash']
        ]) {
        const theta = Array.from({
          length: 181
        }, (_, i) => i * Math.PI / 90);
        traces.push({
          x: theta.map(t => r * Math.cos(t)),
          y: theta.map(t => r * Math.sin(t)),
          mode: 'lines',
          name: `${name} · ${f(r,2)} m`,
          line: {
            color,
            width: 3,
            dash
          },
          hoverinfo: 'skip'
        });
      }
    const point = (x, y, name, color, symbol) => traces.push({
      x: [x],
      y: [y],
      name,
      mode: 'markers',
      marker: {
        color,
        size: 13,
        symbol,
        line: {
          color: '#0c1c2d',
          width: 1
        }
      },
      hovertemplate: name + '<br>E %{x:.3f} m · N %{y:.3f} m<extra></extra>'
    });
    point(0, 0, centered && d ? 'Sample mean' : 'Approximate reference', '#ffffff', 'cross');
    if (st && !centered) point(st.axis[0].mean, st.axis[1].mean, 'Sample mean', '#ffbf69', 'star');
    if (solution?.ok) point(solution.enu_error_m[0] - origin[0], solution.enu_error_m[1] - origin[1], 'Selected epoch', '#ff79b4', 'diamond');
    const extent = Math.max(1, ...traces.flatMap(t => t.x.map(Math.abs)), ...traces.flatMap(t => t.y.map(Math.abs))) * 1.12;
    const axis = {
      range: [-extent, extent],
      gridcolor: '#294256',
      zerolinecolor: '#b4d1de',
      zerolinewidth: 1.5,
      showline: true,
      linecolor: '#648398',
      ticks: 'outside',
      constrain: 'domain'
    };
    plot('scatter', traces, chartLayout({
      xaxis: {
        ...axis,
        title: {
          text: 'East ' + (centered ? 'deviation' : 'error') + ' (m)'
        }
      },
      yaxis: {
        ...axis,
        title: {
          text: 'North ' + (centered ? 'deviation' : 'error') + ' (m)'
        },
        scaleanchor: 'x',
        scaleratio: 1
      }
    }));
    $('scatter-caption').textContent = d ? `${st.N.toLocaleString()} successful epochs · ${centered?'Mean-centred repeatability':'Offsets from the approximate reference'}. ${f(d.coverage,1)}% lie inside the 2DRMS circle. Equal axis scale preserves distances; blue to cyan indicates earlier to later epochs. Click an epoch to select it across the lab.` : 'Calculate the sequence to show dispersion circles and empirical coverage. One position cannot describe repeatability.';
    $('accuracy-highlights').innerHTML = d ? [
      ['Horizontal RMSE', f(st.horizontal, 2) + ' m', 'Includes the mean offset'],
      [centered ? '2DRMS · centred' : '2DRMS · reference', f(d.two, 2) + ' m', f(d.coverage, 1) + '% observed coverage'],
      ['Empirical R95', f(d.r95, 2) + ' m', centered ? 'Radius about the sample mean' : 'Radius about the reference'],
      ['Horizontal mean offset', f(Math.hypot(st.axis[0].mean, st.axis[1].mean), 2) + ' m', `${st.N.toLocaleString()} successful / ${st.N+st.failed} processed`]
    ].map(([a, b, c]) => `<article><span>${a}</span><strong>${b}</strong><small>${c}</small></article>`).join('') : '<p>Run the epoch sequence to populate RMSE, bias, repeatability and observed coverage.</p>';
    const labels = ['East', 'North', 'Up'];
    plot('rmse-components', st ? [{
      type: 'bar',
      x: labels,
      y: st.axis.map(a => a.mean * a.mean),
      name: 'Squared mean (bias²)',
      marker: {
        color: '#af9aff'
      },
      hovertemplate: '%{x}<br>Bias² %{y:.3f} m²<extra></extra>'
    }, {
      type: 'bar',
      x: labels,
      y: st.axis.map(a => a.std * a.std),
      name: 'Variance (σ²)',
      marker: {
        color: '#47d9ef'
      },
      text: st.axis.map(a => f(a.rmse, 2) + ' m'),
      textposition: 'outside',
      cliponaxis: false,
      hovertemplate: '%{x}<br>Variance %{y:.3f} m²<extra></extra>'
    }] : [], chartLayout({
      barmode: 'stack',
      yaxis: {
        title: 'Mean squared error (m²)',
        rangemode: 'tozero',
        gridcolor: '#294256'
      },
      xaxis: {
        title: 'Local component'
      },
      annotations: st ? [] : [{
        text: 'Calculate epochs to populate',
        showarrow: false,
        x: .5,
        y: .5,
        xref: 'paper',
        yref: 'paper'
      }]
    }));
    plot('error-cdf', d ? [{
      x: d.distances,
      y: d.distances.map((_, i) => 100 * (i + 1) / st.N),
      mode: 'lines',
      line: {
        color: '#47d9ef',
        width: 3,
        shape: 'hv'
      },
      fill: 'tozeroy',
      fillcolor: 'rgba(71,217,239,.09)',
      name: 'Observed horizontal coverage',
      hovertemplate: 'Radius %{x:.3f} m<br>Coverage %{y:.2f}%<extra></extra>'
    }] : [], chartLayout({
      showlegend: false,
      xaxis: {
        title: 'Horizontal radius (m)',
        rangemode: 'tozero',
        gridcolor: '#294256'
      },
      yaxis: {
        title: 'Epochs within radius (%)',
        range: [0, 102],
        gridcolor: '#294256'
      },
      shapes: d ? [{
        type: 'line',
        x0: 0,
        x1: d.r95,
        y0: 95,
        y1: 95,
        line: {
          color: '#af9aff',
          dash: 'dash'
        }
      }, {
        type: 'line',
        x0: d.r95,
        x1: d.r95,
        y0: 0,
        y1: 95,
        line: {
          color: '#af9aff',
          dash: 'dash'
        }
      }] : []
    }));
    $('map-statistics').textContent = d ? `${centered?'Mean':'Reference'}-centred circles · 2DRMS ${f(d.two,2)} m · R95 ${f(d.r95,2)} m · ${f(d.coverage,1)}% inside 2DRMS` : 'Map shows the selected epoch and approximate reference. Calculate epochs for accuracy overlays.';
  }

  function mapOverlay(good, st, meanPosition) {
    if (!map) return;
    if (!rings) rings = L.featureGroup().addTo(map);
    rings.clearLayers();
    const d = distribution(good, st);
    if (!d) return;
    const centre = centered ? meanPosition : meta.receiver_geodetic;
    if (!centre) return;
    const at = [centre.lat_deg, centre.lon_deg];
    for (const [radius, color, dash, label] of [
        [d.two, '#ffbf69', null, '2DRMS'],
        [d.r95, '#af9aff', '8 6', 'Empirical R95']
      ]) L.circle(at, {
      radius,
      color,
      weight: 3,
      dashArray: dash,
      fillOpacity: .035
    }).bindPopup(`${label}: ${f(radius,3)} m<br>${centered?'Sample-mean':'Approximate-reference'} centre<br>${label==='2DRMS'?f(d.coverage,1)+'% observed coverage':'Nearest-rank 95th percentile'}`).addTo(rings);
    if (meanPosition) L.polyline([
      [meta.receiver_geodetic.lat_deg, meta.receiver_geodetic.lon_deg],
      [meanPosition.lat_deg, meanPosition.lon_deg]
    ], {
      color: '#ff79b4',
      weight: 3,
      dashArray: '4 6'
    }).bindPopup('Reference-to-mean horizontal offset: ' + f(Math.hypot(st.axis[0].mean, st.axis[1].mean)) + ' m').addTo(rings);
  }

  function comparison(all) {
    if (!$('rmse-case-plot')) {
      const chart = document.createElement('div');
      chart.id = 'rmse-case-plot';
      chart.className = 'plot';
      $('comparison-rmse').append(chart);
    }
    plot('rmse-case-plot', [
      ['horizontal', 'Horizontal', '#47d9ef'],
      ['threeD', '3D', '#af9aff']
    ].map(([key, name, color]) => ({
      type: 'bar',
      x: all.map(s => 'Case ' + s.case),
      y: all.map(s => s[key] ?? null),
      name,
      marker: {
        color
      },
      text: all.map(s => s[key] == null ? 'Unavailable' : f(s[key], 1) + ' m'),
      textposition: 'auto',
      customdata: all.map(s => s.N || 0),
      hovertemplate: '%{x}<br>RMSE %{y:.3f} m<br>%{customdata} successful epochs<extra>' + name + '</extra>'
    })), chartLayout({
      barmode: 'group',
      yaxis: {
        title: 'Reference-relative RMSE (m)',
        rangemode: 'tozero',
        gridcolor: '#294256'
      }
    }));
  }

  function bounds() {
    return rings?.getLayers().length ? rings.getBounds() : null;
  }
  return {
    init,
    teach,
    render,
    mapOverlay,
    comparison,
    distribution,
    bounds
  };
})();
