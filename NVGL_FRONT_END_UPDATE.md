# GPS L1 C/A front-end update

Updated in NVGL, 11 November 2026.

The chapter now contains one observation-context lesson and eight signal stages: antenna, RF filter, amplifier, mixer, analog IF, ADC, digital IF and raw I/Q. Academic headings use plain definitions and worked numerical examples. Every lesson includes the stage strip, a waveform and an FFT spectrum computed from the same modeled block, plus the transformation description.

The shared receiver model uses the selected GPS L1 C/A satellite and epoch from the bundled observations, including measured pseudorange-derived delay, Doppler, carrier phase and C/N0. Session context is shared with Signal Simulation. Only complete GPS channels are mixed; omitted observations are counted explicitly. The overview includes code delay, Doppler quadratures, reconstructed navigation timing and actual broadcast fields. Navigation bits are re-encoded teaching data, not recorded receiver bits. Analog plots show equivalent complex envelopes, not sampled GHz carriers. The finite filters, ideal amplifier and modeled four-bit ADC are teaching implementations rather than measured hardware responses.

Sources: supplied 6_GNSS_Front_End.pdf and gnss fundamentals.pdf (GNSS Antennas and Front Ends, including printed pp. 59 and 63). Corrected lecture slide 14 band labels using 1575.42 +/- 1.023 MHz, consistent with slide 15. Nyquist rate and frequency are distinguished, including band-pass and complex sampling qualifications. The amplifier example starts at -130 dBm.

The final section compares reference hardware, RTL-SDR capture and GNSS-SDR processing. It includes CU8 byte order, recording sizes, a current-block download with metadata, a streaming CU8-to-complex-float32 converter, verified command syntax, and an explicitly incomplete GNSS-SDR source configuration fragment. Unsigned CU8 is not passed as signed ibyte. The interactive phase sweep distinguishes ideal exact phase recovery from 8-bit quantization error and correctly limits the I-only collapse demonstration to one baseband projection; a sampled real IF can also preserve phase.

Implementation references inspected:
- https://github.com/osmocom/rtl-sdr/blob/master/src/rtl_sdr.c
- https://github.com/gnss-sdr/gnss-sdr/blob/main/src/algorithms/signal_source/adapters/file_signal_source.cc
- https://gnss-sdr.org/docs/sp-blocks/signal-source/
- https://gnss-sdr.org/docs/tutorials/understanding-data-types/

RINEX initialization streams assets with bounded concurrency and asynchronously indexes 2048-line batches. Viewer initialization avoids unrelated orbit/signal/SPP engines and defers NumPy and precomputed archives. Requests remain serialized for the Python interpreter. Native synchronous and asynchronous parsing previously produced matching records and representative views, with 90 event-loop yields on the bundled inputs. Network/WebAssembly cold-start latency has not been benchmarked and is not claimed eliminated.

Validation: all six Node test files pass, including same-epoch GPS path, eight finite stage outputs, deterministic serialized bytes, ideal gain, ADC range, FFT sign/frequency, 361 phase angles and streaming format conversion. Static routes, manifest and script syntax pass. Headless Edge exercised all nine lessons, plots, phase control, mixture selection and epoch changes without page errors; this browser check used a native Python fixture API in place of the WebAssembly transport. Mobile layout was inspected at 390 pixels. All 14 CSS files match the recorded SHA-256 baseline byte for byte. The original styles, font assets and theme files are unchanged.

Limitations: RTL-SDR and GNSS-SDR binaries and RF hardware were unavailable; actual capture/acquisition is unverified and labeled in the chapter. The 4096-pair downloadable block is a format demonstration, not a receiver qualification recording. The model I/Q output remains at 38.192 Mpairs/s and is explicitly distinguished from the separate 2.4 Msps RTL example.

Beginner support: each lesson includes stage-specific plain-language definitions, a symbol-and-unit table, a verbal reading of the equation and a step-by-step calculation. A complete expandable electronics and GNSS glossary is available in every lesson. Existing CSS and typography are reused.

Readability refinement: signal plots now precede learning details. Two essential definitions remain visible; additional definitions, symbol tables, worked calculations and source notes expand on demand. A searchable glossary includes result counts and an empty state. The compact stage path includes a jump selector; Previous/Next moves focus to the lesson heading, and the lesson menu collapses on small screens. Signal-view choice persists across lesson navigation. No stylesheet changes.
