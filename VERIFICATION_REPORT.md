# NCGSA Virtual GNSS Laboratory — GitHub/Vercel Verification

## Deployment architecture

- **Frontend-only static deployment:** PASS
- **Vercel Functions / server backend:** NONE
- **React/Vite runtime dependency:** REMOVED
- **Build dependencies:** NONE
- **Scientific computation:** client-side Web Worker + Pyodide/WebAssembly
- **Bundled scientific inputs:** RINEX OBS/NAV + precomputed cache + Python numerical modules

## Dashboard verification

| # | Dashboard | Route | Static route/assets | Scientific/UI verification |
|---|---|---|---|---|
| 1 | RINEX Explorer | `/rinex/` | PASS | `/api/view` client-science dispatcher PASS |
| 2 | Satellite Orbits | `/orbits/` | PASS | `/api/orbit/meta` + `/api/orbit` PASS |
| 3 | Single Point Positioning | `/spp/` | PASS | metadata, epoch, contributions and series endpoints PASS |
| 4 | GNSS Signal Simulation | `/signals/` | PASS | metadata, epoch, selection and scene endpoints PASS; PRN ICD regression PASS |
| 5 | GNSS Front End | `/front-end/` | PASS | frontend scripts/assets PASS; academic reference repaired/bundled |
| 6 | GNSS Acquisition | `/acquisition/` | PASS | frontend scripts/assets PASS; acquisition chapter + MATLAB references bundled |
| 7 | GNSS Tracking | `/tracking/` | PASS | frontend scripts/assets PASS; tracking chapter + MATLAB references bundled |

## Automated checks completed

- `npm run build` — PASS
- `npm run verify` — PASS
  - seven dashboard route entries
  - local asset integrity
  - 13 browser-science manifest assets
  - 25 custom JavaScript files syntax-checked
- `npm test` — PASS: **5/5 suites**
  - RINEX epoch scene verification
  - GPS LNAV replay verification
  - multi-satellite I/Q verification
  - **108 ICD PRN checks** across GPS, Galileo, BeiDou, GLONASS, QZSS and SBAS
  - receiver model verification
- Browser-science dispatcher checks — PASS
  - RINEX view
  - orbit metadata/snapshot
  - Signal Simulation metadata/epoch/selection/scene
  - SPP metadata/epoch/contributions/series
- Static HTTP route checks — all seven returned HTTP 200 in the verification environment.

## Fixes made during verification

1. Converted deployment to a dependency-free static build (`scripts/build-static.mjs`).
2. Removed React/Vite runtime scaffolding and Windows `node_modules` artifacts.
3. Added GitHub Actions verification workflow.
4. Renamed the browser-only Python dispatcher to `science_dispatcher.py` and removed HTTP-server code from the client RINEX parser.
5. Bundled missing academic references for Front End, Acquisition, Tracking and GNSS ICDs.
6. Bundled Galileo electronic code tables used by the PRN generator.
7. Fixed a Signal Simulation cache-compatibility issue (`gps_utc_correction`) that caused GPS signal selection to fail with the existing precomputed cache.
8. Added an ICD PRN regression test to prevent stale code generation after constellation switching.

## Hosting note

The scientific dashboards download Pyodide/NumPy from the configured jsDelivr CDN on first scientific use. No server-side Python process is started on Vercel.

Automated pixel-level browser rendering was not claimed because the execution sandbox blocks browser navigation to local test hosts. Route, asset, script, scientific-dispatcher and unit verification were completed independently as listed above.
