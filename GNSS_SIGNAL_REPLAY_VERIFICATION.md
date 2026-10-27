# GNSS Signal Simulation — Receiver-Epoch Replay Verification

## Scientific scope

The browser replay uses the RINEX observation epoch, measured code pseudorange,
carrier-phase cycles, Doppler and C/N₀ to generate a deterministic, noise-aware
complex baseband reconstruction. For GPS L1 C/A, the navigation symbols are now
re-encoded from the nearest RINEX NAV ephemeris using `eph2sbf`, `generateNavMsg`
and `computeChecksum` algorithms adapted from Yuta811x/gnss-sdr-sim (MIT).

The re-encoder supports GPS LNAV subframes 1–3, transmitted week/TOW and parity,
plus subframe 4 page 18 using GPSA/GPSB/GPUT RINEX-header corrections where
available. Subframe 5 remains the original simulator's placeholder. GPS L2C
CNAV, Galileo I/NAV, GLONASS and BeiDou navigation symbols remain *explicitly
illustrative*: GNSS-SDR-SIM does not provide these complete signal encoders.

RINEX OBS+NAV are NOT raw recorded IQ, and cannot reveal the actual captured
navigation bitstream, receiver RF transfer function, true noise realization,
calibrated C/N₀, multipath or oscillator phase noise. The waveform is therefore
an observation-constrained reconstruction, not a bit-exact receiver recording.
The displayed `NAV record offset` documents use of retrospective ephemeris.

## Checked with the bundled files

- OBS `COM14___9600_260914_111044.26O`
- NAV `COM14___9600_260914_111044.26P`
- First observation: 2026-09-14 11:12:24.005 GNSS time, GPS G03 L1 C/A
- Measured Doppler: −4325.112 Hz
- Apparent receiver code delay: 259.64135 C/A chips, modulo 1023
- Matched NAV record: 2026-09-14 11:59:44 (2839.995 seconds later)
- GPS LNAV re-encoded length: 5 × 10 words × 30 bits = 1500 bits / 30 seconds

The observation precedes its matched NAV record by about 47 minutes. This is a
*retrospective ephemeris reconstruction*, and should never be presented as an
exact over-the-air navigation-message recording.

## Complete epoch-wide receiver scene (new lesson 08)

The `/api/signals/scene?epoch=N` endpoint now returns *every* satellite and
available signal channel actually listed in RINEX OBS epoch N. The dashboard
provides a full inventory, selected-RF-band complex I/Q superposition, and an
**Isolate** button for each satellite/signal channel. Changing the epoch
recomputes that set: the RINEX file contains 3,070 epochs, with examples:

| Epoch index | Observed satellites | Tracked signal channels |
| --- | ---: | ---: |
| 0 | 30 | 46 |
| 2 | 31 | 46 |
| 16 | 29 | 44 |

The user chooses a common RF group (L1/E1, BeiDou B1, GLONASS G1/G2, L2,
E5b/B2). Physically different bands are *not* added together at the same
narrowband ADC input. Within each group, measured per-channel Doppler and
apparent code delay control phase/chip timing; relative powers are estimated
from recorded C/N₀ and a **single** common thermal-noise realization is
added to the summed I/Q. Up to eight strongest clean contributions are
plotted separately to preserve chart readability while *all* reconstructable
in-band signals are included in the summed waveform.

If required measurements, a code table or a GLONASS FDMA frequency channel are
missing, the channel remains listed in the epoch inventory, but is omitted
from synthesis rather than silently inventing a physically unverified value.
Galileo CBOC, E5 AltBOC and modernized L2C representations are teaching
approximations rather than complete chip-accurate RF modulation.

## Repeat validation

```bash
node gnss_replay.test.cjs
node gnss_epoch_scene.test.cjs
node gnss_scene_iq.test.cjs
npm run build
```

The Node integration test reads the real bundled RINEX OBS+NAV and checks
matching satellite/epoch, LNAV encoder availability, deterministic frame words,
measured Doppler, code-delay anchoring and finite IQ samples. The page assets
are static, suitable for Vite/Vercel/cPanel deployment, and do not require a
running native C executable in a browser.

## Attribution

- `https://github.com/Yuta811x/gnss-sdr-sim` — MIT licence, based on
  `osqzss/gps-sdr-sim`. The same word packing, HOW and parity logic are adapted
  in `public/gps_lnav_replay.js`.
- RINEX OBS/NAV are observational and decoded broadcast data formats; they are
  not recordings of instantaneous RF samples.
