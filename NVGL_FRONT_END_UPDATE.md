## Front End web and mobile optimization

The lesson shell now defers the chart library and recorded-signal engine until needed. Initial local JS/CSS decreased from 5.06 MB to 0.48 MB raw. Figures are viewport-driven, old lesson charts are purged, and rapid control updates are coalesced. Definitions remain available through a collapsed catalogue and working inline links. The mobile reading bar is static, while topic navigation remains sticky. Experiment links target their actual controls. See PERFORMANCE_OPTIMIZATION.md for measurement scope and verification.

## One discoverable interactive experiment per topic

All ten Front End topics now have an Interactive Visual Explanation panel naming the concept, a Change instruction, an Observe instruction, and a Start Experiment link that opens and focuses the actual control. The reading toolbar also links directly to the experiment.

Activities: carrier phase; selected GPS/noise; RHCP/LHCP; RF bandwidth; amplifier gain; LO downconversion; first/final IF filtering; sampling aliasing; ADC clipping; raw-I/Q phase preservation. RF bandwidth options recalculate the FIR output from the same input while preserving the 50 MHz reference path.

Verified every activity link, keyboard focus and resulting visual change in the production build, plus 320/390 px navigation. All 41 numerical and application tests pass.

## Interactive Front End and common footer revision

- Replaced the left lesson sidebar with unnumbered, sticky horizontal topics, including keyboard selection and horizontal scroll controls.
- Moved the received GPS I/Q laboratory into Receiver Architecture; the Electromagnetic Spectrum lesson now uses only conceptual waves, code modulation and frequency diagrams with a phase control.
- Added an interactive IEEE/ITU-convention RHCP/LHCP laboratory with direction, phase, animation and ideal antenna-coupling controls. Added gain sensitivity and LO-frequency experiments; existing sampling/aliasing, ADC-gain and raw-I/Q phase controls remain.
- Replaced RF/IF filter comparisons with common settled Hann-window records, a shared numerical power reference, actual FIR response overlays and first/final IF selection. Final IF filtering compares amplifier output to final-filter output, excluding the 50 dB gain from the filtering effect.
- Canonical quotation immediately precedes the same footer in all 15 HTML entries. The six affiliation logos link to the requested URAAN, Planning Commission, HEC, NCGSA, IST and GNSS Research Lab URLs.
- Browser checked all ten interactive topics, desktop/mobile widths, keyboard navigation and all eight canonical page footers. Numerical tests include polarization handedness/coupling and filter response/comparison invariants.

## Front End scope boundary

The Front End lessons end at conditioned digital samples, raw I/Q representation and file-source formats. Acquisition/tracking/PNT explanations, downstream glossary entries and the navigation-solution progression are excluded from the chapter. The architecture overview now covers RF selection, amplification, downconversion/IF and ADC output only. Recorded Doppler/code-delay views illustrate source observations; they do not estimate delay or Doppler by search or correlation. The Doppler visual shows phase change 2*pi*D*t directly, without a despreading step. The independent Acquisition dashboard remains in the laboratory-wide navigation.

## GPS L1 C/A received-signal laboratory

- Renamed the Satellite Orbits module to GNSS Constellations in landing/navigation/page headings and route verification labels. Existing /orbits URLs and orbital calculations remain intact.
- Added three introductory Front End receiver views: all observed GPS L1 C/A channels, one selected satellite I/Q contribution, and measured Doppler/code delay. Only complete GPS C/A observations at the selected epoch are selectable.
- These views reuse FRONT_END_PATH.received and RECEIVER_MODEL code/Doppler helpers. They add no independent signal generator or scientific-data download. The selected satellite, epoch, noise setting and mixture/individual choice continue into the receiver chain.
- Added keyboard-operable tabs, GPS/epoch/noise controls, explicit analog-envelope labeling and a direct route from the received signal to antenna reception.

## Concept-led Front End revision

- Ten display sections now distinguish electromagnetic spectrum, receiver architecture, antenna reception, RF filtering, amplification/noise, downconversion, IF conditioning, sampling/aliasing/quantization, digital samples, and raw I/Q/software processing.
- The mixer, local oscillator and first IF filter are one downconversion group. The shared model exposes the first-filtered 47.74 MHz analog output, which is also the IF-conditioning input. The original reference stage array and 61-slide lecture are retained.
- Original SVG explanations cover the electromagnetic spectrum, satellite-to-PNT receiver chain, downconversion, and intentional bandpass aliasing versus spectral overlap. The sampling experiment checks the full 6 MHz passband at four rates.
- The electrical primer is taught once in amplification. Other sections link to it. Original lecture details are collapsed references, the searchable full glossary is in the final section, and repeated ADC display plots are consolidated in digital samples.
- Landing branding uses one-line Virtual GNSS Lab. The existing quotation is an unattributed laboratory motto in the approach banner; no unsupported personal attribution is asserted. The footer has a visible https://gnss.ncgsa.org.pk research link and consistent contact/affiliation layout across all routes.
- Validation: all ten sections exercised against the actual browser scientific engine; first-IF continuity, alias-rate interactions, final phase visualization, desktop/mobile width and shared footer checked. Numerical tests cover first IF filtering and full-band aliasing.

# GNSS Front End: academic lecture alignment

The primary Front End chapter follows the user-supplied undergraduate lecture, retained in docs/front_end_lecture.txt. All ten section titles, 61 slide topics and 57 displayed equations are represented. The chapter uses a consistent teaching sequence: definition, physical explanation, worked example, time-domain representation, frequency-domain representation and section glossary. Detailed lecture topics expand individually. Native MathML renders the source equations without a remote mathematics runtime.

The main sequence is: Understanding the GNSS Signal; Complete GNSS Front-End Architecture; GNSS Receiving Antenna; RF Bandpass Filter; Amplification and Noise Figure; Mixer and Local Oscillator; Intermediate-Frequency Filtering and Amplification; Analog-to-Digital Converter; Resulting Digital GNSS Signal; Complete Front-End Signal Transformation. Navigation, section headings and plots share a section accent color.

Theoretical references inspected: the pasted lecture; 6_GNSS_Front_End.pdf, including its mixing and sampling examples; and the scanned textbook chapter GNSS Antennas and Front Ends supplied as Desktop/gnss front end.pdf. The latter is byte-identical to the previously supplied gnss fundamentals.pdf. Textbook printed pp. 56, 58 and 63 were visually inspected for noise-factor, filtering and digitization context. No additional PDF uploads are introduced.

Key distinctions preserved:

- GPS L1 C/A carrier: 1575.42 MHz; chip rate: 1.023 million chips/s; C/A main-lobe null-to-null width: 2.046 MHz.
- Reference RF filter: approximately 50 MHz 3-dB bandwidth, with approximate edges at 1550.42 and 1600.42 MHz. This is distinct from the C/A main-lobe width.
- Reference local oscillator: 1527.68 MHz; desired analog IF: 47.74 MHz; unwanted mixer sum: 3103.10 MHz; RF image: 1479.94 MHz.
- IF conditioning: approximately 18 MHz first filter, 50 dB IF amplifier, approximately 6 MHz final filter.
- ADC: 38.192 million samples/s, approximately 26.18 ns interval, 19.096 MHz Nyquist frequency, four bits and 16 quantization levels. Intentional bandpass sampling places the desired IF at 9.548 MHz.

The signal remains analog through antenna reception, RF filtering, RF amplification, mixing and IF conditioning. Primary plots before the ADC show analog voltage/envelope illustrations and relative spectra, without raw-I/Q file outputs, ADC codes or histograms. A numerical calculation grid at four times the reference ADC rate represents the analog waveform and its filter operations; it is not a physical ADC at the antenna. The reference ADC explicitly samples that conditioned IF at one in four grid positions, then quantizes it. Idealized sinusoidal teaching examples are labeled separately from the observation-anchored noise-dominated GPS illustrations.

The ADC and digital-output sections display time domain, a 16-level histogram and spectrum from one shared sample sequence. The gain slider updates that same sequence in all three plots; histogram counts total 4,096. The initial time window shows 1,000 samples, approximately 26.2 microseconds. Sampling points and quantization bins are separate figures.

Underlying data remains the selected GPS L1 C/A satellite and epoch from the bundled observations. Missing measurements are counted and excluded. Plots are teaching reconstructions, not RF recordings or calibrated hardware transfer/noise-figure measurements. Numerical FIR response curves approximate conditioning; the separately labeled RF design-response figure illustrates the reference 3-dB passband. Amplifier examples and Friis calculations follow the supplied lecture; ideal-gain waveform models do not claim measured component noise factors.

The earlier raw-I/Q, RTL-SDR and GNSS-SDR material remains in a collapsed supplementary laboratory after the final lecture section. It explicitly follows the reference real digital-IF output and does not imply a raw-I/Q file immediately after RF filtering.

Validation: 20 automated tests pass, including all 61 source slide titles, ten section titles, 57 well-formed MathML equations, reference frequency/bandwidth terminology, finite analog/digital outputs, correct sampling positions, quantizer range, FFT sign/frequency and deterministic supplementary I/Q. All ten sections passed a browser check with real WebAssembly context, including gain-dependent plots, histogram totals, source equations, keyboard navigation and mobile sizing. Static routes, JavaScript syntax and production build pass. The landing page content, scripts, CSS and built entry point match the committed baseline.

Shared received-signal handoff: Signal Simulation Modules 08 and 09 and Front End now use gps_l1_received.js for identical GPS L1 C/A modulation, measured code delay/Doppler/carrier phase/CN0 and epoch-seeded receiver noise. Module 08 offers a GPS-only reference band while retaining other RF-group options; incomplete observations are excluded explicitly. Module 09 uses the same received-envelope calculation. Context persists across pages: satellite, epoch, individual/composite source and noise setting. Returning to Signal Simulation restores the selected GPS observation instead of resetting epoch zero. Front End links return directly to Modules 08-11.

Every Front End section displays entering and leaving waveforms and spectra, with equal vertical comparison scales and explicit analog/digital and carrier/IF labels. The computational time origin is preserved across filtering and sampling. Introductory/antenna sections identify unchanged reference inputs; the summary compares received RF with final digital IF. No separate source signal or noise realization is generated by the Front End path. Both pages describe observation-anchored reconstructions rather than captured RF files.

Validation: 21 automated tests pass, including exact source-sample handoff. A real-browser transfer of G08 at epoch index 2 reproduced all 4,000 plotted Module 09 input values and time coordinates in Front End. Module 08 GPS composite matched exactly as well. All ten section comparisons retained that satellite/epoch, had matching input/output vertical scales, and passed mobile/no-page-error checks. Landing HTML, JavaScript and CSS remain unchanged.

Electrical prerequisites: each lecture section now includes an accessible Electrical Fundamentals panel before the worked examples. It defines power, voltage, current, resistance, ordinary gain/loss ratios, dB, dBm, dBW, scientific notation, and units without assuming electronics knowledge. Relevant topics also explain 10-log power ratios versus 20-log voltage ratios under equal impedances, negative power levels, 3-dB filter bandwidth, SNR, noise factor/noise figure, thermal-noise symbols, and RF/IF/LO/LNA/ADC/AGC abbreviations. Clearer definitions are merged into the searchable glossary. The original ten-section/61-topic lecture structure is retained.

A separate worked-example calculator starts from -130 dBm, adds 30 dB LNA gain and subtracts 8 dB cable loss, producing -108 dBm. It displays each stage, watts, the net power ratio and the equal-impedance voltage ratio. Calculator input errors produce an explicit message. The calculator does not modify the observation-anchored received-signal plots. Definitions and notation were checked against NIST SP 811 Chapter 8 and NIST TN 1850 Appendix B, linked in the primer. Existing theme, fonts and CSS are reused.

Concise section definitions: all ten primary section definitions now use a short sentence of at most 25 words. Each section begins with eight essential concept definitions, followed by additional terms selected from its lecture topics and shared signal context. Every named term in the supplied section glossaries resolves to the shared concise definition catalogue. Relevant technical terms link at first use to their definitions, with a Return to reading control; acronym matching does not mistake the ordinary word if for IF. Formula topics link to a local symbol-and-unit guide. The searchable glossary uses canonical terms and short definitions rather than duplicate long entries. Dedicated tests check source-term coverage, concise wording, escaping, acronym handling, all section guides and preserved reference specifications. Browser checks cover all ten sections, definition navigation, return focus, symbols, keyboard access and mobile table readability; no page errors were observed.
