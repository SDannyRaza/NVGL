/* Shared institutional presentation layer. Does not alter the scientific models. */
(() => {
  'use strict';
  const modules = [
    { path: '/rinex', key: 'rinex', label: 'RINEX Explorer' },
    { path: '/orbits', key: 'orbits', label: 'Satellite Orbits' },
    { path: '/spp', key: 'spp', label: 'Single Point Positioning' },
    { path: '/signals', key: 'signals', label: 'GNSS Signal Simulation' },
    { path: '/front-end', key: 'front', label: 'GNSS Front End' },
    { path: '/acquisition', key: 'acquisition', label: 'GNSS Acquisition' },
    { path: '/tracking', key: 'tracking', label: 'GNSS Tracking' }
  ];
  const aliases = {
    '/rinex_explorer.html': '/rinex', '/orbit_dashboard.html': '/orbits',
    '/spp-analyzer': '/spp', '/signals.html': '/signals',
    '/front_end.html': '/front-end', '/acquisition.html': '/acquisition',
    '/tracking.html': '/tracking'
  };
  const cleanPath = location.pathname.replace(/\/$/, '') || '/';
  const route = aliases[cleanPath] || cleanPath;
  const current = modules.find(item => item.path === route);
  if (!current) return;

  document.body.classList.add('lab-unified', `lab-theme-${current.key}`);
  document.title = `${current.label} | NCGSA Virtual GNSS Laboratory`;

  // Use one identical laboratory-wide strip, whatever the dashboard's own
  // page structure. Dashboard-local lesson tabs remain independently usable.
  const nav = document.createElement('nav');
  nav.className = 'lab-shared-nav lab-injected-nav';
  nav.setAttribute('aria-label', 'NCGSA Virtual GNSS Laboratory dashboard navigation');
  const home = document.createElement('a');
  home.href = '/';
  home.className = 'lab-home-link';
  home.textContent = '⌂  Laboratory Home';
  home.setAttribute('aria-label', 'NCGSA Virtual GNSS Laboratory landing page');
  nav.append(home);
  for (const module of modules) {
    const item = document.createElement('a');
    item.href = module.path;
    item.textContent = module.label;
    if (module.key === current.key) {
      item.className = 'active';
      item.setAttribute('aria-current', 'page');
    }
    nav.append(item);
  }
  const header = document.querySelector('header');
  if (header) header.insertAdjacentElement('afterend', nav);
  else document.body.prepend(nav);
  const brand = document.querySelector('header .brand strong');
  if (brand && /Virtual GNSS (Lab|Laboratory)/i.test(brand.textContent)) {
    brand.textContent = 'NCGSA Virtual GNSS Laboratory';
  }

  // RINEX, Orbit and SPP now share the same illustrated, scientific three-step
  // banner treatment as the receiver teaching chapters. Only presentation is
  // changed; the measured data and working controls remain untouched.
  const flowIcons = {
    file: '<path d="M8 3h10l5 5v21H8z M18 3v6h5 M12 15h7 M12 20h7 M12 25h5"/>',
    waves: '<path d="M3 17c4 0 4-10 8-10s4 20 8 20 4-10 8-10"/>',
    inspect: '<circle cx="13" cy="13" r="8"/><path d="m19 19 8 8 M10 13h6 M13 10v6"/>',
    globe: '<circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="5" ry="11"/><path d="M5 16h22 M7 10h18 M7 22h18"/>',
    orbit: '<ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-30 16 16)"/><circle cx="16" cy="16" r="5"/><circle cx="27" cy="8" r="2" fill="currentColor" stroke="none"/>',
    axes: '<path d="M5 27V5 M5 27h23 M5 27l13-15 M18 12h-6 M18 12v6"/>',
    satellite: '<rect x="12" y="12" width="8" height="8" rx="2"/><path d="M3 11l7 1v8l-7 1z M22 12l7-1v10l-7-1z M16 12V5"/>',
    sliders: '<path d="M6 5v22 M16 5v22 M26 5v22 M3 11h6 M13 20h6 M23 13h6"/>',
    target: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="2"/>'
  };
  const bannerFlows = {
    rinex: {
      selector: '.academic-banner .banner-diagram',
      titleSelector: '.academic-banner h1', titleHtml: 'RINEX <span>Explorer</span>',
      steps: [['file','RECORD','Observation files'],['waves','DECODE','RINEX fields'],['inspect','INSPECT','Epochs & ephemerides']],
      note: 'RINEX OBS + NAV  →  MEASUREMENT INTERPRETATION'
    },
    orbits: {
      selector: '.hero .hero-note.orbit-banner',
      titleSelector: '.hero h1', titleHtml: 'Satellite <span>Orbits</span>',
      steps: [['orbit','PROPAGATE','Broadcast elements'],['axes','TRANSFORM','ECI / ECEF / ENU'],['globe','ANALYZE','Tracks, skyplot, DOP']],
      note: 'BROADCAST EPHEMERIS  →  SATELLITE GEOMETRY'
    },
    spp: {
      selector: '.hero .hero-diagram',
      titleSelector: '.hero h1', titleHtml: 'Single Point <span>Positioning</span>',
      steps: [['satellite','MEASURE','Code pseudoranges'],['sliders','CORRECT','Clock & atmosphere'],['target','SOLVE','Least-squares position']],
      note: 'OBSERVATIONS  →  MODELED RANGES  →  POSITION'
    }
  };
  const banner = bannerFlows[current.key];
  if (banner) {
    const enhanceBanner = () => {
      const host = document.querySelector(banner.selector);
      if (!host || host.dataset.labFlowEnhanced === 'true') return false;
      host.dataset.labFlowEnhanced = 'true';
      const title = document.querySelector(banner.titleSelector);
      if (title) title.innerHTML = banner.titleHtml;
      host.innerHTML = `<div class="lab-banner-flow" role="img" aria-label="${banner.steps.map(step => step[1] + ': ' + step[2]).join('; ')}">
        <div class="lab-banner-flow-label">ACADEMIC WORKFLOW</div>
        <div class="lab-banner-flow-track">${banner.steps.map((step, index) => `
          <div class="lab-banner-step lab-banner-step-${index + 1}">
            <div class="lab-banner-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" aria-hidden="true">${flowIcons[step[0]]}</svg></div>
            <strong>${step[1]}</strong><small>${step[2]}</small>
          </div>${index < 2 ? '<span class="lab-banner-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div>
        <div class="lab-banner-flow-note">${banner.note}</div></div>`;
      return true;
    };
    if (!enhanceBanner() && current.key === 'spp') {
      // SPP constructs its interactive hero asynchronously after parsing.
      const sppHero = document.querySelector('.hero');
      if (sppHero) {
        const observer = new MutationObserver(() => {
          if (enhanceBanner()) observer.disconnect();
        });
        observer.observe(sppHero, { childList: true });
      }
    }
  }

  // The server supplies the exact landing-page footer to every dashboard.
  // Keep RINEX's functional inspection shortcuts without retaining its
  // second, differently styled institutional footer.
  const rinexFooter = current.key === 'rinex' ? document.querySelector('footer.institutional-footer:not(#footer)') : null;
  if (rinexFooter) {
    const shortcuts = rinexFooter.querySelector('.institutional-explore');
    if (shortcuts) {
      const resources = document.createElement('details');
      resources.className = 'lab-rinex-footer-resources';
      const summary = document.createElement('summary');
      summary.textContent = 'RINEX inspection shortcuts';
      resources.append(summary, shortcuts);
      rinexFooter.replaceWith(resources);
    } else rinexFooter.remove();
  }
  const firstHeader = document.querySelector('header');
  if (firstHeader && !document.getElementById('top')) firstHeader.id = 'top';
})();
