# NCGSA Virtual GNSS Laboratory

Frontend-only deployment of the **NCGSA Virtual GNSS Laboratory** for GitHub and Vercel.

## Seven dashboards

1. **RINEX Explorer** — `/rinex/`
2. **Satellite Orbits** — `/orbits/`
3. **Single Point Positioning** — `/spp/`
4. **GNSS Signal Simulation** — `/signals/`
5. **GNSS Front End** — `/front-end/`
6. **GNSS Acquisition** — `/acquisition/`
7. **GNSS Tracking** — `/tracking/`

## Architecture

There is **no deployed backend** and no Vercel Function.

The application is static HTML/CSS/JavaScript. Scientific calculations used by RINEX Explorer, Satellite Orbits, SPP and Signal Simulation execute **inside the visitor's browser**:

`dashboard fetch() → api_browser.js → Web Worker → Pyodide/WebAssembly → bundled GNSS Python algorithms + RINEX data`

The browser downloads Pyodide/NumPy from the configured CDN on first scientific use. The VGL's Python source files are static client assets under `public/py/`; they are not a server process.

## Local verification

```bash
npm ci
npm run build
npm run verify
npm test
```

The build output is written to `dist/`.

To preview locally with any static server, for example:

```bash
python -m http.server 4173 --directory dist
```

Then open `http://localhost:4173/`.

## GitHub

Create an empty GitHub repository, then from this folder:

```bash
git init
git add .
git commit -m "Initial NCGSA Virtual GNSS Laboratory frontend"
git branch -M main
git remote add origin https://github.com/<YOUR-ORG>/<YOUR-REPOSITORY>.git
git push -u origin main
```

The included GitHub Actions workflow runs the static build, dashboard verification and tests on every push/PR.

## Vercel

1. Import the GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Build command: `npm run build`
4. Output directory: `dist`
5. No backend, serverless function, database or environment variable is required for the bundled laboratory.
6. Deploy.

`vercel.json` already contains the build/output configuration, trailing-slash behavior and cache headers for scientific/static assets.

## Academic references

Course/reference material used by the dashboards is bundled under `public/reference/`, including the supplied acquisition/tracking chapters, reference MATLAB code, front-end lecture, and the GNSS ICD library used by Signal Simulation.

## Data

The deployable package contains the RINEX observation/navigation dataset required by the browser science engine. The uploaded repository did not contain the earlier 1.8 GB raw-IF `.bin` recording, so it is not committed or deployed. The Acquisition dashboard in this repository is verified in its bundled frontend form. If raw-IF processing is added later, keep the large recording outside Git/Vercel and select it locally in the browser rather than deploying the 1.8 GB file.

## Notes

- Plotly and Leaflet are bundled locally.
- Pyodide is loaded from `cdn.jsdelivr.net` when a scientific dashboard first initializes.
- Optional TLE/SGP4 propagation is not bundled; the original RINEX broadcast-orbit models remain available.
