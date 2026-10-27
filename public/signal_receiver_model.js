/*
 * Receiver-side, observation-constrained educational GNSS signal synthesis.
 * Architecture adapted to the browser from the channel-synthesis principles of
 * Yuta811x/gnss-sdr-sim (fork of osqzss/gps-sdr-sim), MIT licence:
 * https://github.com/Yuta811x/gnss-sdr-sim
 *
 * At every selected RINEX epoch we anchor code phase with measured pseudorange,
 * baseband carrier drift with measured Doppler, initial relative carrier phase
 * with fractional L cycles, and noise ratio with recorded C/N0.
 *
 * GPS L1 C/A navigation symbols are re-encoded from RINEX broadcast ephemeris
 * with the GNSS-SDR-SIM word layout, HOW, week and parity algorithms.
 * RINEX OBS/NAV CANNOT recover the original RF samples or bit-perfect live
 * broadcast, notably when an ephemeris record is from a different time.
 */
(function (root) {
  'use strict';
  const C = 299792458;
  const TWO_PI = 2 * Math.PI;
  const mod = (x, n) => ((x % n) + n) % n;
  const finite = x => x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x));
  const sampleValue = (obs, name) => finite(obs?.[name]?.value) ? Number(obs[name].value) : null;

  function symbolRate(navRate) {
    const value = String(navRate || '');
    const sym = value.match(/([\d.]+)\s*symbol\/s/i);
    if (sym) return Number(sym[1]);
    const bits = value.match(/([\d.]+)\s*bit\/s/i);
    if (bits) return Number(bits[1]);
    const informationBits = value.match(/([\d.]+)\s*information\s*bit\/s/i);
    return informationBits ? Number(informationBits[1]) : 50;
  }
  function hashString(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mix32(i) {
    i = Math.imul(i ^ i >>> 16, 0x7feb352d);
    i = Math.imul(i ^ i >>> 15, 0x846ca68b);
    return (i ^ i >>> 16) >>> 0;
  }
  function navModelBit(seed, symbolIndex) {
    // Parameter-derived, reproducible 0/1 symbol model; NOT recovered GPS LNAV bits.
    return mix32((seed ^ (Math.trunc(symbolIndex) >>> 0)) >>> 0) & 1;
  }
  function makeNoise(seed) {
    let x = seed || 1;
    const uniform = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) + 1) / 4294967297; };
    let next = null;
    return () => {
      if (next !== null) { const v = next; next = null; return v; }
      const r = Math.sqrt(-2 * Math.log(Math.max(uniform(), 1e-12)));
      const angle = TWO_PI * uniform();
      next = r * Math.sin(angle);
      return r * Math.cos(angle);
    };
  }
  function epochMillis(epochISO) {
    if (!epochISO) return NaN;
    const value = String(epochISO);
    // Python RINEX ISO strings are timezone-naive but represent a GNSS time
    // coordinate, not the browser machine's local civil timezone.
    return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z');
  }
  function epochCodePhase(epochISO, length, codeRate) {
    const ms = epochMillis(epochISO);
    if (!Number.isFinite(ms) || length <= 0 || codeRate <= 0) return 0;
    const periodMs = length / codeRate * 1000;
    // Use short time remainder instead of epochSeconds*1e6, which loses chips
    // to floating-point precision for large 2026 absolute timestamps.
    return mod(mod(ms, periodMs) / 1000 * codeRate, length);
  }

  function prepare(input) {
    const {selection, epoch, prn, component} = input || {};
    if (!selection || !prn?.bits?.length) return null;
    const signal = selection.signal || {};
    const codeRate = Number(signal.code_rate);
    const codeLength = prn.bits.length;
    if (!(codeRate > 0 && codeLength > 0)) return null;
    const obs = selection.measurements || {};
    const pseudorange = sampleValue(obs, 'Pseudorange');
    const doppler = sampleValue(obs, 'Doppler');
    const carrierCycles = sampleValue(obs, 'Carrier phase');
    const cn0 = sampleValue(obs, 'C/N₀');
    const carrierHz = Number(signal.carrier_mhz) * 1e6;
    const codeDoppler = doppler === null || !(carrierHz > 0) ? null : doppler * codeRate / carrierHz;
    const effectiveCodeRate = codeRate + (codeDoppler || 0);
    const period = codeLength / codeRate;
    const apparentDelaySec = pseudorange === null ? null : pseudorange / C;
    const delayChips = apparentDelaySec === null ? null : mod(apparentDelaySec * codeRate, codeLength);
    const receivePhase = epochCodePhase(epoch || selection.epoch, codeLength, codeRate);
    const receivedCodePhase = mod(receivePhase - (delayChips ?? 0), codeLength);
    const rxMilliseconds = epochMillis(epoch || selection.epoch);
    const rxSeconds = Number.isFinite(rxMilliseconds) ? rxMilliseconds / 1000 : 0;
    const txSeconds = rxSeconds - (apparentDelaySec || 0);
    const rate = symbolRate(signal.nav_rate_selected || signal.nav_rate);
    const symbolIndex = Math.floor(txSeconds * rate);
    const modelSeed = hashString(JSON.stringify({sat:selection.satellite,signal:signal.id,
      nav:selection.navigation?.fields || null,navEpoch:selection.navigation?.record_epoch || null}));
    const validNav = !!selection.navigation?.fields?.length;
    const lnav = root.GPS_LNAV_REPLAY?.create(selection.navigation,signal.id) || null;
    const navRecordSeconds = epochMillis(selection.navigation?.record_epoch)/1000;
    const navAgeSeconds = Number.isFinite(navRecordSeconds) ? Math.abs(rxSeconds - navRecordSeconds) : null;
    const pilot = /pilot|\bcl\b/i.test(String(component || '')) && !/data.*pilot|composite/i.test(String(component || ''));
    const sampleRate = Math.max(4 * codeRate, 2.046e6);
    const cNoLinear = cn0 === null ? null : Math.pow(10, cn0 / 10);
    const signalAmplitude = cNoLinear === null ? 0.065 : Math.sqrt(cNoLinear / sampleRate);
    const initialCarrierPhase = carrierCycles === null ? 0 : TWO_PI * mod(carrierCycles, 1);
    const seed = mix32(modelSeed ^ hashString(String(epoch || selection.epoch)) ^ (selection.prn_number || 0));

    return {
      epoch:epoch || selection.epoch, satellite:selection.satellite,
      signalName:signal.name || signal.id, component:component || signal.default_component,
      code:prn.bits, codeRate, codeLength, period, sampleRate, codeDoppler, effectiveCodeRate,
      pseudorange, doppler, carrierCycles, cn0,
      apparentDelaySec, delayChips, receivedCodePhase, receivePhase,
      receiveSeconds:rxSeconds, transmitSeconds:txSeconds,
      symbolRate:rate, symbolIndex, navModelSeed:modelSeed, validNav, lnav, navAgeSeconds,
      pilot, signalAmplitude, initialCarrierPhase, seed,
      navRecordEpoch:selection.navigation?.record_epoch || null,
      mode: lnav ? lnav.mode : 'RINEX OBS–anchored educational reconstruction; NAV symbols illustrative',
    };
  }
  function codeSign(m, tSeconds, delayOverride=null) {
    const delay = delayOverride===null ? (m.delayChips || 0) : delayOverride;
    const chip = Math.floor(mod(m.receivePhase + tSeconds * m.effectiveCodeRate - delay, m.codeLength));
    return m.code[chip] ? 1 : -1;
  }
  function navSign(m, tSeconds=0) {
    if (m.pilot) return 1;
    return navBitAt(m,m.transmitSeconds+tSeconds) ? 1 : -1;
  }
  function navBitAt(m, transmitSeconds) {
    if(m.lnav)return m.lnav.bitAt(transmitSeconds);
    return navModelBit(m.navModelSeed,Math.floor(transmitSeconds*m.symbolRate));
  }
  function synthesize(m, opts={}) {
    const n = Math.max(32,Math.min(opts.samples || 2048,8192));
    const f = opts.sampleRate || m.sampleRate;
    const includeNoise = opts.includeNoise !== false;
    const nextNoise = makeNoise(m.seed);
    const tUs=[], I=[], Q=[], cleanI=[], cleanQ=[];
    const amp = includeNoise ? m.signalAmplitude : 1;
    for(let i=0;i<n;i++){
      const t=i/f;
      const s=codeSign(m,t)*navSign(m,t);
      const angle=m.initialCarrierPhase + TWO_PI*(m.doppler || 0)*t;
      const i0=s*amp*Math.cos(angle),q0=s*amp*Math.sin(angle);
      tUs.push(t*1e6);
      I.push(i0+(includeNoise?nextNoise()*Math.SQRT1_2:0));
      Q.push(q0+(includeNoise?nextNoise()*Math.SQRT1_2:0));
      cleanI.push(i0);cleanQ.push(q0);
    }
    return {tUs,I,Q,cleanI,cleanQ,sampleRate:f,sampleCount:n};
  }
  function codeComparison(m,count=96) {
    const x=[],local=[],received=[];
    for(let j=0;j<count;j++){
      const t=j/m.codeRate;
      x.push(j);
      local.push(codeSign(m,t,0));
      received.push(codeSign(m,t));
    }
    return {x,local,received};
  }
  function dopplerWave(m, durationMs=4, points=620) {
    const ms=[],I=[],Q=[];
    for(let j=0;j<points;j++){
      const t=durationMs*1e-3*j/(points-1);
      const phase=m.initialCarrierPhase+TWO_PI*(m.doppler||0)*t;
      ms.push(t*1000);I.push(Math.cos(phase));Q.push(Math.sin(phase));
    }
    return {ms,I,Q};
  }
  function navigationTimeline(m, adjacent=7) {
    const indices=[],relativeMs=[],bits=[];
    for(let i=-adjacent;i<=adjacent;i++){
      const idx=m.symbolIndex+i;
      indices.push(idx);
      relativeMs.push((idx/m.symbolRate-m.transmitSeconds)*1000);
      bits.push(m.pilot ? 1 : navBitAt(m,idx/m.symbolRate) ? 1 : -1);
    }
    return {indices,relativeMs,bits,currentIndex:adjacent};
  }
  const api = {prepare,codeSign,navSign,navBitAt,synthesize,codeComparison,dopplerWave,navigationTimeline,symbolRate,navModelBit,epochCodePhase,epochMillis};
  root.RECEIVER_MODEL=api;
  if(typeof module==='object' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
