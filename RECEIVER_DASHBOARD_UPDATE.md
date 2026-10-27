# GNSS Signal Simulation — Receiver-Side Dashboard Update

## What's changed

- The vertical stage list is now a horizontally scrollable lesson slider with previous/next controls.
- Lesson 08 adds every RINEX-observed satellite/signal at each epoch, an
  RF-band-filtered composite receiver I/Q trace, full channel inventory and
  one-click individual satellite/signal isolation. The previous individual
  receiver lessons follow as lessons 09–12.
- The satellite/PRN, epoch, signal and component selection stays visible above the charts on desktop.
- Focus mode removes the introductory banner; PRN and NAV charts appear before the long supporting tables.
- Original lessons 8–10 (Correlation, Acquisition and Tracking) were replaced with:
  - 08 — Received Signal: reconstructed complex I/Q, time series and constellation, optional modeled thermal noise.
  - 09 — Doppler & Code Delay: delayed PRN versus receiver-local code, and Doppler-induced I/Q rotation.
  - 10 — Navigation at Receiver: estimated receive-time symbol timeline and matched decoded RINEX NAV parameters.
- 11 — Receiver Observables retains the actual RINEX code, carrier-phase, Doppler and C/N0 measurements.
- Lessons 1–7 still explain generation, while lessons 8–11 explain the receiver perspective.

## Scientific implementation

`public/signal_receiver_model.js` uses the GPS-SDR-SIM signal construction principle
(satellite-specific ranging code + navigation signs + carrier phase/frequency),
adapted for browser plots and the bundled multi-constellation RINEX dataset.
See <https://github.com/Yuta811x/gnss-sdr-sim> (MIT license; GPS/QZSS reference).

At the selected RINEX observation epoch:

- Pseudorange C gives apparent propagation delay P/c and its residue modulo
  the code period in chips. It is **not** a precise geometric light-time
  because it contains receiver/satellite clocks and propagation biases.
- Doppler D [Hz] rotates the downconverted complex carrier phase and, to
  first order, scales the received code chipping rate by D/f_carrier.
- Carrier-phase L provides only the initial **fractional** cycle because the
  integer ambiguity cannot be recovered from the field alone.
- C/N0 S determines illustrative noise strength at the numerical sample rate.
- Decoded NAV parameters from the nearest selected RINEX navigation record
  now reproduce **GPS L1 C/A LNAV word layout, TOW and parity** using the
  GNSS-SDR-SIM algorithms; GPS SF4 page 18 uses GPSA/GPSB/GPUT corrections
  where present. GPS SF5 and other signal families remain illustrative.
  This is a retrospective re-encoding, not the actual transmitted bits.

RINEX OBS/NAV **does not contain IQ recordings or the original raw NAV bits**.
For measured rather than reconstructed IQ, import raw SDR files or live RF
capture and the relevant clock synchronization. This dashboard correctly
labels synthetic receiver plots and distinguishes the actual RINEX observables.

## Deploy

The package remains a frontend-only Vite + React app; all RINEX files are
bundled in `public/data` and scientific processing runs in-browser.

```bash
npm ci
npm run build
```

Deploy the resulting `dist/` to static hosting, or connect this source to
Vercel with the existing `vercel.json` configuration.

Check the scientific receiver model with:

```bash
node receiver_model.test.cjs
node gnss_replay.test.cjs
node gnss_epoch_scene.test.cjs
node gnss_scene_iq.test.cjs
```

See `GNSS_SIGNAL_REPLAY_VERIFICATION.md` for sample-level RINEX checks and the
NAV/OBS time offset. The Front End, Acquisition and Tracking banners now share
chapter-specific inline SVG diagrams and responsive layout corrections.
