/* Independent correction experiments; every impact is a new nonlinear solve. */
window.CorrectionLab = (() => {
  const keys = ['clock', 'ionosphere', 'troposphere', 'relativity', 'bias', 'rotation'];
  const titles = ['Satellite clock', 'Ionosphere', 'Troposphere', 'Relativity', 'Signal group delay', 'Earth rotation'];
  const descriptions = ['Broadcast clock polynomial in the range equation', 'Frequency-scaled broadcast Klobuchar delay', 'Saastamoinen zenith delay and Black–Eisner mapping', 'Periodic eccentric-orbit satellite clock term', 'Broadcast TGD/BGD where supported', 'Satellite coordinates rotated during signal travel'];
  const presets = [32, 33, 35, 39, 63];
  let summaryToken = 0;
  let chartValues = null;

  function focusCharts() {
    if (!chartValues) return;
    const hide = $('summary-focus').checked;
    for (const [id, values] of Object.entries(chartValues)) {
      Plotly.restyle(id, {y:values.map(row=>row.map((v,i)=>hide&&i===0?null:v))});
      Plotly.relayout(id, {'yaxis.autorange':true});
    }
  }

  function bits(id = +$('case').value) {
    return id < 5 ? presets[id] : id - 100;
  }

  function flags(id = +$('case').value) {
    const b = bits(id);
    return Object.fromEntries(keys.map((k, i) => [k, Boolean(b & (1 << i))]));
  }

  function setBits(b) {
    $('case').value = 100 + b;
    sync();
    refresh();
  }

  function init() {
    const select = $('case');
    for (let b = 0; b < 64; b++) select.add(new Option('Custom selection', 100 + b));
    const incoming = Number(new URLSearchParams(location.search).get('case'));
    if (incoming >= 100 && incoming <= 163 && Number.isInteger(incoming)) select.value = incoming;
    select.parentElement.hidden = true;
    const panel = document.createElement('section');
    panel.id = 'correction-switches';
    panel.innerHTML = '<div class="switch-heading"><div><span class="section-label">GNSS error-model configuration</span><h2>Correction Models Applied to the SPP Observation Equation</h2><p>Enable or omit any supported correction model. Every change re-solves the receiver position using the same RINEX observations.</p></div><div class="buttons"><button id="corrections-all">Enable all</button><button id="corrections-none">Disable all</button></div></div><div class="correction-switch-grid">' + keys.map((key, i) => `<label class="correction-switch"><input type="checkbox" role="switch" id="toggle-${key}" data-correction="${key}"><span class="switch-track" aria-hidden="true"></span><span><strong>${titles[i]}</strong><small>${descriptions[i]}</small></span><b id="toggle-state-${key}"></b></label>`).join('') + '</div><p class="switch-note">Orbit propagation and clock time-tag conversion stay active. True orbit error, multipath and receiver noise cannot be independently corrected from these files.</p>';
    document.querySelector('.session-controls').after(panel);
    const advanced=document.createElement('details');advanced.className='advanced-correction-controls';advanced.innerHTML='<summary>Detailed correction controls · each model can also be toggled from the sidebar</summary>';
    advanced.append(panel.querySelector('.correction-switch-grid'),panel.querySelector('.switch-note'));panel.querySelector('.switch-heading').after(advanced);
    keys.forEach((key, i) => $('toggle-' + key).onchange = e => setBits(e.target.checked ? bits() | (1 << i) : bits() & ~(1 << i)));
    $('corrections-all').onclick = () => setBits(63);
    $('corrections-none').onclick = () => setBits(0);
    const summary = document.createElement('section');
    summary.id = 'error-summary-page';
    summary.innerHTML = '<span class="section-label">GNSS measurement-error analysis / Chapter 7</span><h2>Modeled Error Contributions and Position Sensitivity</h2><p>The cards show the modeled correction magnitude and the conditional receiver displacement when one model is toggled. These are calculated responses, not independently measured residual error variances. Select a card or a sidebar error to inspect its full derivation.</p><div id="summary-status" role="status" aria-live="polite"></div><div id="summary-cards" class="summary-cards"></div><div class="grid"><article class="accuracy-chart"><span class="section-label">Position-domain analysis</span><h3>Receiver ENU Response to Individual Correction Models</h3><div id="summary-impact" class="plot"></div><p>Alternative minus current solution in fixed ENU coordinates (metres). Independent single-switch responses depend on all other active models and are not additive.</p></article><article class="accuracy-chart"><span class="section-label">Range-domain analysis</span><h3>Modeled Range-Term Magnitudes</h3><div id="summary-size" class="plot"></div><p>RMS of the modeled term across satellites, even when the model is switched OFF in the current solution. This is a correction magnitude, not a residual uncertainty or position RMSE.</p></article></div><details class="summary-interpretation"><summary>Scientific interpretation and limitations</summary><p>Correction magnitudes are signed modeled offsets, not a statistical error budget. The receiver clock can absorb common-mode range effects, so a large range correction may have a small position impact. A smaller offset from an approximate header coordinate is not proof of improved absolute accuracy. Each alternative is re-solved; unsuccessful comparisons remain unavailable.</p></details>';
    const focus = document.createElement('label');
    focus.className = 'summary-focus';
    focus.innerHTML = '<input id="summary-focus" type="checkbox"> Focus charts on smaller effects (hide satellite clock bars only)';
    const comparison = document.createElement('details');
    comparison.id='summary-comparison-details';comparison.className='summary-comparison-details';
    comparison.innerHTML='<summary><span>Open detailed range and position comparison plots<small>Two complementary models: corrections in metres and receiver-state response in ENU</small></span></summary><div class="summary-detail-content"></div>';
    const comparisonGrid=summary.querySelector(':scope > .grid');
    summary.querySelector('#summary-cards').after(comparison);
    comparison.querySelector('.summary-detail-content').append(focus,comparisonGrid);
    comparison.addEventListener('toggle',()=>{if(comparison.open){requestAnimationFrame(()=>{
      ['summary-impact','summary-size'].forEach(id=>{const node=$(id);if(node?.data) Plotly.Plots.resize(node);});
    });}});
    focus.querySelector('input').onchange = focusCharts;
    const unavailable = document.createElement('div');
    unavailable.className = 'summary-cards';
    unavailable.innerHTML = [
      ['True orbit error', 'No independent precise orbit is loaded; broadcast ephemeris error cannot be measured separately.'],
      ['Multipath', 'Reflected-signal effects are not separately identifiable from these code observations.'],
      ['Receiver noise', 'Post-fit residuals mix noise with other model errors; no calibrated noise-only correction is available.']
    ].map(([title, text]) => `<article><span class="section-label">Not independently available</span><h3>${title}</h3><p>${text}</p></article>`).join('');
    const unavailableDetail=document.createElement('details');unavailableDetail.className='unavailable-detail';
    unavailableDetail.innerHTML='<summary>Unresolved effects · precise orbit error, multipath and receiver noise</summary>';
    unavailableDetail.append(unavailable);summary.append(unavailableDetail);
    const analyzerHost=$('analyzer');
    const intro=analyzerHost.querySelector(':scope > p');
    if(intro) intro.after(summary); else analyzerHost.prepend(summary);
    sync();
    if(window.SPPStudio?.refreshLayout) SPPStudio.refreshLayout();
  }

  function sync() {
    const f = flags();
    keys.forEach(key => {
      const input = $('toggle-' + key);
      if (input) {
        input.checked = f[key];
        $('toggle-state-' + key).textContent = f[key] ? 'ON' : 'OFF';
        input.closest('label').classList.toggle('enabled', f[key]);
      }
    });
    if(window.SPPStudio?.syncErrorSwitches) SPPStudio.syncErrorSwitches();
  }

  function note() {
    sync();
    const f = flags();
    $('model-note').innerHTML = '<strong>Independent correction selection</strong><br>' + keys.map((k, i) => `${titles[i]}: <b>${f[k]?'ON':'OFF'}</b>`).join(' · ') + '<br>All solutions propagate the orbit at signal transmit time; clock time-tag conversion remains active independently of the range corrections. Earth rotation can be omitted explicitly for this experiment. Equal-weight code least squares estimates one receiver clock per included constellation.<br>GPS/QZSS broadcast Klobuchar is used where supported; other constellations use the explicitly approximate frequency-scaled GPS model. Troposphere uses standard-atmosphere Saastamoinen, 50% modeled relative humidity and Black–Eisner mapping. Uncalibrated hardware biases, precise orbit error, multipath and noise remain unresolved.';
  }
  async function summary() {
    const token = ++summaryToken,
      request = query(),
      base = solution,
      b = bits(),
      startingRevision = revision;
    if (!$('summary-status')) return;
    $('summary-cards').innerHTML = '';
    purgePlots('error-summary-page');
    $('summary-impact').innerHTML = '';
    $('summary-size').innerHTML = '';
    $('summary-status').textContent = 'Re-solving six independent switch experiments…';
    try {
      const [alternatives, magnitude] = await Promise.all([
        Promise.all(keys.map((_, i) => api('/api/spp/epoch', {
          ...request,
          case: 100 + (b ^ (1 << i))
        }))),
        api('/api/spp/contributions', request)
      ]);
      if (token !== summaryToken || revision !== startingRevision) return;
      const deltas = alternatives.map(r => base?.ok && r.ok ? r.enu_error_m.map((x, i) => x - base.enu_error_m[i]) : null);
      $('summary-status').textContent = `Epoch ${Number(request.epoch)+1} · ${request.mode==='gps'?'GPS':'Multi-GNSS'} · ${request.mask}° mask · ${base.ok?'Current selection converged':base.error}`;
      $('summary-cards').innerHTML = keys.map((key, i) => {
        const on = Boolean(b & (1 << i)),
          d = deltas[i],
          r = alternatives[i],
          m = magnitude.terms?.[key];
        const tone=window.VGL_ERROR_COLORS?.[key]||'#7edbf0';
        return `<article class="summary-error-card" style="--error-color:${tone}" role="button" tabindex="0" aria-label="Inspect ${titles[i]} contribution and mathematics" data-open-error="${key}"><div class="summary-card-top"><span>${on?'MODEL ON':'MODEL OFF'}</span><span class="summary-card-arrow" aria-hidden="true">↗</span></div><h3>${titles[i]}</h3><strong>${d?f(Math.hypot(...d),3):'Unavailable'}${d?'<small> m · 3D shift</small>':''}</strong><p>Receiver-position change when this model is toggled</p><dl><dt>Modeled range-term RMS</dt><dd>${Number.isFinite(m?.rms_m)?f(m.rms_m)+' m':'Unavailable'}</dd></dl><dl><dt>Alternative residual RMS</dt><dd>${r.ok?f(r.residual_rms_m)+' m':'Unavailable'}</dd></dl>${m?.error?`<p class="warn">${esc(m.error)}</p>`:''}<p class="card-open-hint">Inspect equation, satellite plot and ENU response →</p></article>`;
      }).join('');
      plot('summary-impact', [
        ['East', '#47d9ef'],
        ['North', '#af9aff'],
        ['Up', '#ffbb69']
      ].map(([name, color], j) => ({
        type: 'bar',
        name,
        x: titles,
        y: deltas.map(d => d ? d[j] : null),
        marker: {
          color
        },
        hovertemplate: '%{x}<br>' + name + ' shift %{y:.3f} m<extra></extra>'
      })), {
        barmode: 'group',
        xaxis: {
          tickangle: -25,
          automargin: true
        },
        yaxis: {
          title: 'Alternative − current (m)',
          zeroline: true
        },
        margin: {
          l: 80,
          r: 25,
          t: 25,
          b: 150
        }
      });
      plot('summary-size', [{
        type: 'bar',
        x: titles,
        y: keys.map(k => magnitude.terms?.[k]?.rms_m ?? null),
        marker: {
          color: keys.map(k=>window.VGL_ERROR_COLORS?.[k]||'#9bd4ea')
        },
        hovertemplate: '%{x}<br>Range-term RMS %{y:.3f} m<extra></extra>'
      }], {
        showlegend: false,
        xaxis: {
          tickangle: -25,
          automargin: true
        },
        yaxis: {
          title: 'Modeled range RMS (m)',
          rangemode: 'tozero'
        },
        margin: {
          l: 80,
          r: 25,
          t: 25,
          b: 150
        }
      });
      chartValues = {
        'summary-impact':[0,1,2].map(j=>deltas.map(d=>d?d[j]:null)),
        'summary-size':[keys.map(k=>magnitude.terms?.[k]?.rms_m??null)]
      };
      window.SPP_ERROR_SUMMARY = {keys:[...keys],titles:[...titles],deltas,alternatives,magnitude,bits:b};
      focusCharts();
      if(window.SPPStudio?.updateErrorDetail) SPPStudio.updateErrorDetail();
      SPPStudio.resize();
    } catch (e) {
      if (token === summaryToken) $('summary-status').textContent = 'Summary unavailable: ' + e.message;
    }
  }

  function update() {
    summary();
  }

  function invalidate() {
    summaryToken++;
    chartValues = null;
    if ($('summary-status')) $('summary-status').textContent = 'Updating the correction experiment…';
  }
  return {
    init,
    sync,
    flags,
    note,
    update,
    invalidate
  };
})();
