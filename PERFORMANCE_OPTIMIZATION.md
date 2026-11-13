## Feature-preservation verification

The optimization retains all ten interactive concepts, full Plotly chart tools and PNG export, responsive sizing, satellite/epoch/noise controls, inline definitions and symbols, glossary search, CU8/metadata downloads and the conversion script. Added regression coverage ensures scrolling back to an unchanged chart preserves its zoom, updates made offscreen appear on return, and in-flight rendering is cleaned up on topic changes. Source selectors are guarded until the observed scene is ready.

Browser verification exported a PNG, preserved a user-selected axis range after scrolling, opened collapsed definitions through term links, selected G08 at epoch 2, downloaded an 8,192-byte CU8 block with matching metadata, and fetched the converter. No browser errors occurred. Source numerical models and RINEX parsing were not changed by these loading optimizations.

## Front End: progressive runtime and mobile reading

Measured from the local production build after this revision:

| Initial local JS/CSS | Previous | Current |
| --- | ---: | ---: |
| Raw file bytes | 5,056,946 | 480,465 |
| Reduction | | 90.5% |

The current initial local assets have an independently gzip-compressed estimate of 144,689 bytes. These are asset-size measurements, not a live Vercel speed score; HTML, fonts and later on-demand scientific assets are not included.

- Plotly (4,558,696 raw bytes) is no longer a prerequisite for the lesson shell. A viewport chart scheduler loads its versioned URL once, draws nearby figures, coalesces input changes, and purges old lesson charts. Chart download failures expose a retry action without blocking the lesson.
- The unused receiver_lessons.js entry was removed from the two Front End pages. Other dashboards still load their existing dependencies.
- WebAssembly and the compact scientific cache start only when a recorded-signal view or data-dependent experiment needs them. Conceptual SVG activities and the initial phase illustration remain usable first.
- Source-data failure is isolated from concept content and offers an explicit retry. Numerical signal-generation algorithms and RINEX parsers are unchanged.
- Topic navigation remains sticky; the mobile reading toolbar is static and uses larger links. Definitions are a closed, accessible catalogue that still opens through point-of-use term links.
- Start Experiment now scrolls to the control group, not the beginning of a long card. At 390x900, the sampling-rate selector was verified at y=168 px after the jump.
- Fixed figure heights preserve layout while figures load. The local build excludes the user-ignored Front End PDFs from deployment output; originals remain in public/reference/front_end locally.

Validation: browser checks confirmed no initial Plotly request or scientific worker; one on-demand Plotly request; functional plots through all ten topics; mobile control visibility; no JavaScript errors. Four scheduler tests cover deferred loading, latest-data coalescing, stale-node cleanup and failed-download retry.

# Web performance optimization

Changes are local until committed, pushed and deployed. No theme, CSS or font changes.

## Loading

Scientific pages formerly fetched raw RINEX files and an 8.73 MB combined cache, initializing positioning code and NumPy for unrelated routes. Worker loading now follows manifest groups:

- RINEX Explorer: parser and raw OBS/NAV only; asynchronous indexing once per worker.
- Orbits, Signals and Front End: portable shared science cache and standard-library Python modules. No raw RINEX transfer or NumPy.
- SPP: positioning modules and NumPy on demand, reusing the shared datasets.
- Acquisition and Tracking: existing JavaScript models; no worker startup without an API request.

The shared bundle uses the original parsers and observations. Orbit and signal engines share identical dataset objects instead of storing duplicate copies. Scientific algorithms are unchanged. Pickles are trusted application assets, never user uploads.

Old raw data plus combined cache: 20,139,645 bytes. New science-route modules plus cache: approximately 2,897,962 bytes, 85.6% smaller. These are application asset sizes, not total wire transfer or page weight. Plotly, WebAssembly, fonts and CDN compression are excluded. RINEX Explorer still needs raw text for inspection.

## Responsiveness and caching

- Concurrent identical GETs share one calculation. Successful responses use an LRU-style cache capped at 64 entries and an estimated 8 MiB of JSON text. This is not a bound on total browser heap. Errors are retried.
- Downloads remain bounded to four per group and stream into the worker filesystem.
- Failed initialization can retry without permanently rejecting the request queue.
- Front End reuses spectra and purges replaced Plotly graphs to release listeners and resources.
- External scripts defer where no inline script requires synchronous loading. Orbit and RINEX inline execution order remains unchanged.
- Scientific pages preconnect to the runtime CDN.

## Release maintenance

The build versions local script, stylesheet and scientific-asset URLs by content. Worker and manifest requests revalidate through explicit cache headers. Existing vendor/data cache settings remain. The old combined archive and Python bytecode are excluded from dist.

After changing source OBS/NAV data, run:

```sh
python scripts/prepare-science-cache.py
python scripts/prepare-rinex-preview.py
npm run build
```

Commit science-cache.pkl.gz and science-cache.json with the source changes. The build checks source and bundle SHA-256 values and rejects stale data. Vercel builds require Node, not Python.

## Validation and limits

- Nine automated tests pass, including GNSS regression tests, GET deduplication and retry, route-specific loading, deferred NumPy, once-only RINEX indexing and cache equivalence to source computations.
- All seven built routes passed headless Edge checks using real WebAssembly API requests, with no JavaScript page errors.
- One first Front End runtime trial became ready in 10.94 seconds. Initial scientific loading fetched the compact bundle without raw RINEX or NumPy. A subsequent SPP solve in that worker succeeded.
- A sequential browser-context check observed signals 8.80 s, orbits 3.42 s, RINEX 2.60 s, SPP 5.58 s, acquisition 1.46 s, tracking 1.15 s and Front End 2.79 s. These local-server smoke-test timings share browser/CDN caches. They are not controlled internet benchmarks or before/after speed comparisons.
- Routes, manifest, syntax and production build pass; all 14 original CSS files match their recorded hashes.

First-time runtime/CDN downloads, device speed, scientific calculations, map tiles and connection quality still affect latency. Production Vercel deployment, mobile-network performance and Core Web Vitals have not been measured.

Primary references: [script loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script), [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching), [Pyodide package loading](https://pyodide.org/en/stable/usage/loading-packages.html).

## Immediate RINEX header path

The RINEX page now fetches a 62,768-byte JSON preview containing the original parser's full OBS/NAV header annotations, file statistics and field definitions. Header filtering and pagination use those exact rows. Non-ASCII searches and detailed views fall back to the original Python API. The helper captures native fetch and never re-enters the API wrapper.

After the first header renders, an idle callback warms the existing worker once. Requests for records bypass the preview, share the worker's serialized initialization and annotate detailed rows on demand. Background initialization does not replace header content or show a blocking overlay. Header availability and full engine readiness have separate status messages. Background failures leave both headers available and expose a retry action. A missing or malformed preview falls back to normal worker parsing.

The build validates normalized source checksums and the preview checksum, then versions the preview URL inside its helper before fingerprinting the helper URL in HTML. Regenerate and commit both rinex-preview.json and rinex-preview-meta.json after source-data changes. The production build needs no Python.

First local headless-browser trial: annotated header available at 1.695 seconds from navigation; worker creation at 1.808 seconds. This confirms the header is independent of WebAssembly readiness; it is not a production-network guarantee. Browser checks also cover a record opened during warm-up and a delayed preview that must not overwrite the newer record selection. Automated tests cover exact parser equivalence, header search, missing/malformed previews, background failure, and one shared initialization/index pass.
