(() => {
  'use strict';
  const academicSummaries = {
    'card-orbits': 'Propagate broadcast ephemerides, visualize satellite trajectories and ground tracks, and evaluate sky geometry and dilution of precision.',
    'card-spp': 'Solve receiver coordinates from pseudorange measurements while investigating satellite geometry, propagation errors, and positioning accuracy.',
    'card-signals': 'Generate and inspect GNSS ranging codes, carrier modulation, Doppler effects, and the structure of received navigation signals.',
    'card-front': 'Trace a weak RF signal through antenna reception, filtering, amplification, frequency conversion, sampling, and quantization.',
    'card-acquisition': 'Detect satellite PRN codes and estimate coarse code delay and Doppler frequency through correlation-based searches.',
    'card-tracking': 'Investigate DLL and PLL/Costas feedback loops that continuously align receiver-generated code and carrier replicas.'
  };
  for (const [cardClass, summary] of Object.entries(academicSummaries)) {
    const card = document.querySelector(`.module-card.${cardClass}`);
    if (!card || card.querySelector('.card-summary')) continue;
    const paragraph = document.createElement('p');
    paragraph.className = 'card-summary';
    paragraph.id = `${cardClass}-summary`;
    paragraph.textContent = summary;
    card.querySelector('h3')?.insertAdjacentElement('afterend', paragraph);
    card.setAttribute('aria-describedby', paragraph.id);
  }
  const button = document.querySelector('.mobile-menu');
  const nav = document.querySelector('#site-nav');
  if (!button || !nav) return;
  const close = () => { nav.classList.remove('nav-open'); button.setAttribute('aria-expanded', 'false'); };
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const activate = (hash) => {
    links.forEach((link) => {
      const active = link.getAttribute('href') === hash;
      link.classList.toggle('nav-current', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('nav-open', open);
  });
  links.forEach(link => link.addEventListener('click', () => {
    activate(link.getAttribute('href'));
    close();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      close();
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) close();
  });
  if ('IntersectionObserver' in window) {
    const sections = ['top', 'modules', 'lab-story', 'footer']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (visible) activate('#' + visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }
})();
