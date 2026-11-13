/* Concise terminology shared by section definitions, point-of-use links and glossaries. */
(function(root){
'use strict';
const definitions={

 "Electromagnetic Spectrum": {
  "definition": "The complete range of electromagnetic waves, ordered by frequency or wavelength.",
  "aliases": []
 },
 "Microwaves": {
  "definition": "Radio waves with relatively short wavelengths; GNSS L-band signals lie in this region.",
  "aliases": [
   "microwave region"
  ]
 },
 "L-Band": {
  "definition": "The radio-frequency region from 1 to 2 GHz, containing the GPS L1 carrier.",
  "aliases": [
   "L-band"
  ]
 },
 "Wavelength": {
  "definition": "The distance between equivalent points in consecutive wave cycles, such as adjacent peaks.",
  "aliases": []
 },
 "Downconversion": {
  "definition": "Moving a received signal to a lower carrier frequency while preserving its modulation.",
  "aliases": [
   "down-conversion"
  ]
 },
 "Anti-Alias Filter": {
  "definition": "An analog filter that limits unwanted frequency content before sampling so it does not overlap the desired sampled band.",
  "aliases": [
   "anti-alias filtering",
   "anti-alias filter"
  ]
 }
,
 "GNSS": {
  "definition": "Global Navigation Satellite System: a general term for satellite-based positioning and timing systems.",
  "aliases": []
 },
 "GPS": {
  "definition": "Global Positioning System: the satellite navigation system operated by the United States.",
  "aliases": []
 },
 "Front End": {
  "definition": "The receiver circuitry that filters, amplifies, and digitizes incoming radio signals.",
  "aliases": [
   "GNSS front end",
   "receiver front end",
   "front-end"
  ]
 },
 "Radio Signal": {
  "definition": "An electromagnetic wave that carries information through space.",
  "aliases": [
   "radio wave",
   "electromagnetic wave",
   "electromagnetic waves"
  ]
 },
 "Electric Field": {
  "definition": "The part of an electromagnetic wave that exerts force on electric charges.",
  "aliases": []
 },
 "Voltage": {
  "definition": "An electrical potential difference, measured in volts (V).",
  "aliases": []
 },
 "Current": {
  "definition": "The flow of electric charge, measured in amperes (A).",
  "aliases": []
 },
 "Resistance": {
  "definition": "Opposition to electric current, measured in ohms.",
  "aliases": []
 },
 "Impedance": {
  "definition": "A circuit property that describes its opposition to a changing current.",
  "aliases": []
 },
 "Power": {
  "definition": "Electrical energy transferred per second, measured in watts (W).",
  "aliases": [
   "electrical power"
  ]
 },
 "Amplitude": {
  "definition": "The size of a waveform; voltage amplitude is measured in volts.",
  "aliases": []
 },
 "Waveform": {
  "definition": "A graph showing how a signal changes with time.",
  "aliases": [
   "waveforms"
  ]
 },
 "Cycle": {
  "definition": "One complete repetition of a repeating waveform.",
  "aliases": [
   "cycles"
  ]
 },
 "Frequency": {
  "definition": "The number of complete waveform cycles per second.",
  "aliases": []
 },
 "Hertz": {
  "definition": "The unit of frequency: one cycle per second.",
  "aliases": [
   "Hz"
  ]
 },
 "Megahertz": {
  "definition": "One million cycles per second.",
  "aliases": [
   "MHz"
  ]
 },
 "Watt": {
  "definition": "The unit of power: one joule of energy transferred per second.",
  "aliases": [
   "Watt (W)",
   "watts"
  ]
 },
 "Milliwatt": {
  "definition": "One thousandth of a watt: 1 mW = 0.001 W.",
  "aliases": [
   "Milliwatt (mW)",
   "mW"
  ]
 },
 "Time Interval": {
  "definition": "The elapsed time between two events.",
  "aliases": [
   "time intervals"
  ]
 },
 "Nanosecond": {
  "definition": "One billionth of a second.",
  "aliases": [
   "ns"
  ]
 },
 "Microsecond": {
  "definition": "One millionth of a second.",
  "aliases": [
   "microseconds"
  ]
 },
 "Carrier": {
  "definition": "The radio oscillation whose changes carry the ranging code and navigation data.",
  "aliases": [
   "carrier frequency"
  ]
 },
 "L1": {
  "definition": "The GPS radio-frequency band centered at 1575.42 MHz.",
  "aliases": []
 },
 "C/A Code": {
  "definition": "The coarse/acquisition ranging code used by the GPS L1 signal in this chapter.",
  "aliases": [
   "C/A"
  ]
 },
 "PRN Code": {
  "definition": "A known, repeatable chip pattern used to identify a satellite signal.",
  "aliases": [
   "PRN",
   "pseudorandom code",
   "PRN ranging code"
  ]
 },
 "Ranging Code": {
  "definition": "A known sequence used to compare transmitted and received signal timing.",
  "aliases": []
 },
 "Chip": {
  "definition": "One element of a ranging-code sequence.",
  "aliases": [
   "chips"
  ]
 },
 "Chip Rate": {
  "definition": "The number of ranging-code chips transmitted per second.",
  "aliases": []
 },
 "Bit": {
  "definition": "A binary digit with the value 0 or 1.",
  "aliases": [
   "bits"
  ]
 },
 "Navigation Data": {
  "definition": "Broadcast information about satellite orbits, clocks, and signal status.",
  "aliases": [
   "navigation message"
  ]
 },
 "Clock": {
  "definition": "A device or reference that establishes time or measures time intervals.",
  "aliases": [
   "receiver clock",
   "reference clock"
  ]
 },
 "Modulation": {
  "definition": "Changing a carrier property to carry information.",
  "aliases": []
 },
 "Phase": {
  "definition": "The position of a repeating waveform within one cycle.",
  "aliases": []
 },
 "BPSK": {
  "definition": "Binary phase-shift keying: modulation using carrier phases separated by 180 degrees.",
  "aliases": [
   "binary phase-shift keying"
  ]
 },
 "Sinusoid": {
  "definition": "A smooth repeating waveform described by a sine or cosine function.",
  "aliases": [
   "sinusoidal",
   "sinusoidal waveform"
  ]
 },
 "Time Domain": {
  "definition": "A representation of signal amplitude as a function of time.",
  "aliases": [
   "time-domain representation",
   "time-domain plot",
   "time-domain waveform"
  ]
 },
 "Frequency Domain": {
  "definition": "A representation of signal power or amplitude as a function of frequency.",
  "aliases": [
   "frequency-domain representation"
  ]
 },
 "Frequency Spectrum": {
  "definition": "A graph showing the distribution of signal content across frequencies.",
  "aliases": [
   "spectrum",
   "spectra",
   "spectral content"
  ]
 },
 "Bandwidth": {
  "definition": "The width of a specified frequency interval.",
  "aliases": [
   "analog bandwidth"
  ]
 },
 "Main Lobe": {
  "definition": "The central part of a spectrum between its first zeros.",
  "aliases": [
   "central main lobe"
  ]
 },
 "Side Lobe": {
  "definition": "A weaker part of a spectrum outside its main lobe.",
  "aliases": [
   "side lobes",
   "side-lobe spectrum"
  ]
 },
 "Spectral Null": {
  "definition": "A frequency at which the ideal signal spectrum becomes zero.",
  "aliases": [
   "first nulls",
   "first zeros",
   "spectral zeros",
   "nulls"
  ]
 },
 "Null-to-Null Bandwidth": {
  "definition": "The frequency separation between the first zeros on either side of the main lobe.",
  "aliases": [
   "main-lobe null-to-null bandwidth"
  ]
 },
 "Noise": {
  "definition": "Unwanted random electrical variation added to the received signal.",
  "aliases": []
 },
 "Thermal Noise": {
  "definition": "Random electrical variation associated with the temperature of receiver components.",
  "aliases": []
 },
 "Noise Floor": {
  "definition": "The background noise level shown in a spectrum.",
  "aliases": []
 },
 "Noise-Like Signal": {
  "definition": "A waveform whose visible variation is dominated by noise.",
  "aliases": [
   "noise-like",
   "noise-dominated"
  ]
 },
 "Interference": {
  "definition": "Unwanted signal energy from another source.",
  "aliases": []
 },
 "Composite Signal": {
  "definition": "The combined signal formed by several received contributions.",
  "aliases": [
   "composite",
   "combined signal"
  ]
 },
 "Analog Signal": {
  "definition": "An electrical signal that varies continuously with time.",
  "aliases": [
   "analog voltage",
   "analog waveform",
   "analog"
  ]
 },
 "Digital Signal": {
  "definition": "A signal represented by numerical values at separate time instants.",
  "aliases": [
   "digital representation"
  ]
 },
 "Receiver": {
  "definition": "A device that receives and processes transmitted signals.",
  "aliases": [
   "receiving circuitry"
  ]
 },
 "RF": {
  "definition": "Radio frequency; the GPS L1 RF carrier in this chapter is 1575.42 MHz.",
  "aliases": [
   "Radio Frequency (RF)",
   "radio frequency"
  ]
 },
 "IF": {
  "definition": "Intermediate frequency: a carrier used inside the receiver after frequency translation.",
  "aliases": [
   "Intermediate Frequency",
   "analog IF"
  ]
 },
 "Reception": {
  "definition": "Converting an arriving radio wave into an electrical signal.",
  "aliases": []
 },
 "Filtering": {
  "definition": "Passing selected frequencies while reducing unwanted frequencies.",
  "aliases": [
   "filter"
  ]
 },
 "Amplification": {
  "definition": "Increasing the magnitude or power of a signal.",
  "aliases": [
   "amplifier"
  ]
 },
 "Digitization": {
  "definition": "Converting an analog signal into numerical samples.",
  "aliases": [
   "digitizes",
   "digitized"
  ]
 },
 "Frequency Translation": {
  "definition": "Changing the carrier frequency while retaining its modulation.",
  "aliases": [
   "frequency conversion",
   "frequency-converted"
  ]
 },
 "Digital Processing": {
  "definition": "Calculations performed on digital signal values.",
  "aliases": [
   "digital signal processing"
  ]
 },
 "Acquisition": {
  "definition": "Searching for a satellite signal by testing code delays and frequency offsets.",
  "aliases": []
 },
 "Tracking": {
  "definition": "Continuously adjusting receiver references to follow an acquired satellite signal.",
  "aliases": []
 },
 "Receiving Antenna": {
  "definition": "A component that converts arriving radio waves into an electrical voltage.",
  "aliases": [
   "GNSS Antenna",
   "receiving antennas"
  ]
 },
 "Polarization": {
  "definition": "The orientation and rotation of a radio wave's electric field.",
  "aliases": []
 },
 "RHCP": {
  "definition": "Circular polarization whose electric-field vector rotates clockwise when viewed in the direction of wave propagation.",
  "aliases": [
   "right-hand circular polarization",
   "right-hand circularly polarized"
  ]
 },
 "LHCP": {
  "definition": "Circular polarization whose electric-field vector rotates counterclockwise when viewed in the direction of wave propagation.",
  "aliases": ["left-hand circular polarization", "left-hand circularly polarized"]
 },
 "Antenna Gain": {
  "definition": "The direction-dependent strength of an antenna response.",
  "aliases": [
   "antenna gains"
  ]
 },
 "Radiation Pattern": {
  "definition": "A description of how antenna response changes with direction.",
  "aliases": [
   "radiation patterns"
  ]
 },
 "Elevation": {
  "definition": "The angle of a satellite above the local horizon.",
  "aliases": [
   "elevation angle"
  ]
 },
 "Horizon": {
  "definition": "The plane separating the visible sky from directions below the observer.",
  "aliases": []
 },
 "Reflection": {
  "definition": "The return of part of a radio wave from a surface.",
  "aliases": [
   "reflected signals"
  ]
 },
 "Active Antenna": {
  "definition": "An antenna containing an amplifier.",
  "aliases": [
   "active antennas"
  ]
 },
 "Passive Antenna": {
  "definition": "An antenna without an internal powered amplifier.",
  "aliases": []
 },
 "LNA": {
  "definition": "Low-noise amplifier: an amplifier designed to add little extra noise.",
  "aliases": [
   "Low-Noise Amplifier",
   "low-noise amplification"
  ]
 },
 "Multi-Constellation": {
  "definition": "Reception of signals from more than one satellite navigation system.",
  "aliases": [
   "multi-constellation reception"
  ]
 },
 "Multi-Band": {
  "definition": "Reception in more than one radio-frequency band.",
  "aliases": [
   "multi-band reception"
  ]
 },
 "Multi-Channel": {
  "definition": "Independent digital processing of several satellite signals.",
  "aliases": [
   "multi-channel tracking"
  ]
 },
 "Cable Loss": {
  "definition": "A reduction in signal power along a cable.",
  "aliases": []
 },
 "Bandpass Filter": {
  "definition": "A filter that passes one selected frequency interval.",
  "aliases": [
   "RF bandpass filter",
   "IF bandpass filter",
   "band-pass filter"
  ]
 },
 "Passband": {
  "definition": "The frequency interval a filter is designed to pass.",
  "aliases": [
   "passband response"
  ]
 },
 "Stopband": {
  "definition": "The frequency interval a filter is designed to attenuate.",
  "aliases": []
 },
 "Center Frequency": {
  "definition": "The middle frequency of a specified band.",
  "aliases": [
   "central frequency",
   "frequency center"
  ]
 },
 "3-dB Bandwidth": {
  "definition": "The interval between filter frequencies where power response is about half its peak value.",
  "aliases": [
   "3-dB passband",
   "3-dB frequencies"
  ]
 },
 "Insertion Loss": {
  "definition": "The reduction of wanted signal power introduced by a component.",
  "aliases": []
 },
 "Selectivity": {
  "definition": "The ability of a filter to pass wanted frequencies and reduce nearby unwanted frequencies.",
  "aliases": []
 },
 "Attenuation": {
  "definition": "A reduction in signal power or amplitude.",
  "aliases": [
   "attenuate",
   "attenuated",
   "attenuating"
  ]
 },
 "Ratio": {
  "definition": "One quantity divided by another quantity of the same type.",
  "aliases": [
   "ratios"
  ]
 },
 "Gain": {
  "definition": "The output-to-input ratio of a specified signal quantity.",
  "aliases": [
   "gains"
  ]
 },
 "Power Gain": {
  "definition": "Output power divided by input power.",
  "aliases": [
   "linear power gain"
  ]
 },
 "Voltage Gain": {
  "definition": "Output voltage divided by input voltage.",
  "aliases": []
 },
 "dB": {
  "definition": "The decibel expresses a power ratio; +10 dB means a ratio of ten.",
  "aliases": [
   "Decibel",
   "decibels"
  ]
 },
 "dBm": {
  "definition": "A power level relative to 1 milliwatt; 0 dBm equals 0.001 W.",
  "aliases": []
 },
 "dBW": {
  "definition": "A power level relative to 1 watt; 0 dBW equals 1 W.",
  "aliases": []
 },
 "Logarithm": {
  "definition": "The exponent required to obtain a number from a stated base.",
  "aliases": []
 },
 "Logarithmic Scale": {
  "definition": "A scale on which equal steps represent equal multiplying factors.",
  "aliases": [
   "logarithmic"
  ]
 },
 "Linear Ratio": {
  "definition": "An ordinary ratio expressed without conversion to decibels.",
  "aliases": [
   "linear units",
   "linear gain",
   "linear noise factors"
  ]
 },
 "SNR": {
  "definition": "Signal-to-noise ratio: signal power divided by noise power in the same bandwidth.",
  "aliases": [
   "signal-to-noise ratio"
  ]
 },
 "Noise Figure": {
  "definition": "The reduction in signal-to-noise ratio caused by a component.",
  "aliases": [
   "NF"
  ]
 },
 "Noise Factor": {
  "definition": "Input SNR divided by output SNR, using ordinary ratios.",
  "aliases": []
 },
 "Friis Equation": {
  "definition": "The equation that combines noise contributions from successive receiver components.",
  "aliases": [
   "Friis"
  ]
 },
 "Cascade": {
  "definition": "Components connected so that one output feeds the next input.",
  "aliases": [
   "cascaded components",
   "cascaded receiver noise"
  ]
 },
 "RMS Voltage": {
  "definition": "The effective voltage used to calculate average power in a resistor.",
  "aliases": [
   "RMS",
   "root-mean-square voltage"
  ]
 },
 "Mixer": {
  "definition": "A component that multiplies an RF signal by a local-oscillator signal.",
  "aliases": []
 },
 "Local Oscillator": {
  "definition": "A receiver-generated periodic signal used for frequency translation.",
  "aliases": [
   "LO"
  ]
 },
 "Difference Frequency": {
  "definition": "The absolute difference between the RF and local-oscillator frequencies.",
  "aliases": [
   "difference-frequency component"
  ]
 },
 "Sum Frequency": {
  "definition": "The sum of the RF and local-oscillator frequencies.",
  "aliases": [
   "sum-frequency component",
   "sum-frequency"
  ]
 },
 "Mixing Product": {
  "definition": "A frequency component produced by mixing.",
  "aliases": [
   "mixing components",
   "mixing products",
   "mixer products"
  ]
 },
 "Image Frequency": {
  "definition": "An unwanted RF frequency that produces the same IF magnitude as the desired signal.",
  "aliases": [
   "RF image"
  ]
 },
 "Frequency Synthesizer": {
  "definition": "A circuit that generates frequencies from a reference clock.",
  "aliases": []
 },
 "Frequency Divider": {
  "definition": "A circuit that produces a frequency equal to its input frequency divided by a number.",
  "aliases": [
   "divider"
  ]
 },
 "IF Filter": {
  "definition": "A bandpass filter operating at intermediate frequency.",
  "aliases": [
   "first IF filter",
   "final IF filter"
  ]
 },
 "IF Amplifier": {
  "definition": "An amplifier operating at intermediate frequency.",
  "aliases": []
 },
 "IF Conditioning": {
  "definition": "Filtering and amplification applied to the intermediate-frequency signal.",
  "aliases": []
 },
 "Quality Factor": {
  "definition": "Filter center frequency divided by its bandwidth.",
  "aliases": [
   "Q factor"
  ]
 },
 "ADC": {
  "definition": "Analog-to-digital converter: a circuit that samples and quantizes an analog voltage.",
  "aliases": [
   "Analog-to-Digital Converter",
   "analog-to-digital conversion"
  ]
 },
 "Sampling": {
  "definition": "Measuring the amplitude of a signal at selected time instants.",
  "aliases": [
   "sampled"
  ]
 },
 "Sampling Frequency": {
  "definition": "The number of samples taken per second.",
  "aliases": [
   "sample rate",
   "sampling rate"
  ]
 },
 "Sampling Interval": {
  "definition": "The time between consecutive samples.",
  "aliases": []
 },
 "Nyquist Frequency": {
  "definition": "Half the sampling frequency.",
  "aliases": [
   "Nyquist limit"
  ]
 },
 "Nyquist Rate": {
  "definition": "For a real low-pass signal extending from zero to B Hz, the minimum ideal rate is 2B samples per second.",
  "aliases": []
 },
 "Aliasing": {
  "definition": "Different analog frequencies producing the same sampled-frequency representation.",
  "aliases": []
 },
 "Bandpass Sampling": {
  "definition": "Sampling a filtered high-frequency band so that it appears at a lower digital frequency.",
  "aliases": [
   "intentional aliasing",
   "intentional bandpass sampling"
  ]
 },
 "Quantization": {
  "definition": "Assigning a measured amplitude to one of a finite number of levels.",
  "aliases": [
   "quantizes",
   "quantized"
  ]
 },
 "Bit Depth": {
  "definition": "The number of bits used to encode one sample amplitude.",
  "aliases": [
   "ADC resolution",
   "four-bit resolution",
   "4-bit resolution"
  ]
 },
 "Quantization Bin": {
  "definition": "An input-amplitude interval assigned to one digital code.",
  "aliases": [
   "quantization bins"
  ]
 },
 "Quantization Level": {
  "definition": "One numerical amplitude value available at the ADC output.",
  "aliases": [
   "quantization levels",
   "digital levels",
   "amplitude levels"
  ]
 },
 "Clipping": {
  "definition": "Limiting sample amplitudes because the input exceeds the ADC range.",
  "aliases": [
   "saturation",
   "clipped"
  ]
 },
 "AGC": {
  "definition": "Automatic gain control: adjustment of amplification to fit the ADC input range.",
  "aliases": [
   "Automatic Gain Control"
  ]
 },
 "Input Range": {
  "definition": "The voltage interval that the ADC can represent.",
  "aliases": [
   "ADC range",
   "ADC input range"
  ]
 },
 "Digital IF": {
  "definition": "The sampled representation of an intermediate-frequency signal.",
  "aliases": [
   "digital intermediate frequency"
  ]
 },
 "Digital Sample": {
  "definition": "One numerical amplitude measurement at a specified time.",
  "aliases": [
   "digital samples",
   "sample values"
  ]
 },
 "Histogram": {
  "definition": "A graph showing how many samples fall into each amplitude level.",
  "aliases": [
   "histogram counts"
  ]
 },
 "Sample Count": {
  "definition": "The number of recorded digital measurements.",
  "aliases": []
 },
 "Frequency Bin": {
  "definition": "One frequency interval in the computed spectrum.",
  "aliases": [
   "frequency bins"
  ]
 },
 "PSD": {
  "definition": "Power spectral density: signal power per unit frequency bandwidth.",
  "aliases": [
   "Power Spectral Density"
  ]
 },
 "FFT": {
  "definition": "Fast Fourier transform: a calculation that converts a sample block into frequency components.",
  "aliases": [
   "Fourier transform"
  ]
 },
 "Epoch": {
  "definition": "The observation time shared by the selected receiver measurements.",
  "aliases": [
   "observation epoch"
  ]
 },
 "RINEX": {
  "definition": "A text format for receiver observations and broadcast navigation records.",
  "aliases": [
   "RINEX observations",
   "RINEX NAV"
  ]
 },
 "Observation": {
  "definition": "A measurement made by a receiver at a specified time.",
  "aliases": [
   "observations",
   "observable"
  ]
 },
 "Doppler": {
  "definition": "A change in received frequency caused mainly by relative motion.",
  "aliases": [
   "Doppler shift",
   "observed Doppler"
  ]
 },
 "Code Delay": {
  "definition": "The time offset between a received ranging code and a local code reference.",
  "aliases": [
   "code offset"
  ]
 },
 "Pseudorange": {
  "definition": "A distance-like timing measurement that includes clock and propagation effects.",
  "aliases": [
   "apparent range"
  ]
 },
 "Carrier Phase": {
  "definition": "The position of the received carrier cycle relative to a receiver reference.",
  "aliases": []
 },
 "C/N0": {
  "definition": "Carrier power divided by noise power per unit bandwidth.",
  "aliases": [
   "C/N\u2080",
   "carrier-to-noise-density"
  ]
 },
 "Relative Amplitude": {
  "definition": "An amplitude expressed on a comparison scale rather than as a measured voltage.",
  "aliases": [
   "relative units",
   "normalized amplitude"
  ]
 },
 "Reconstructed Signal": {
  "definition": "A model signal generated from observations rather than recorded RF voltages.",
  "aliases": [
   "observation-anchored reconstruction",
   "reconstructions",
   "reconstruction"
  ]
 },
 "Voltage Envelope": {
  "definition": "A slowly varying representation of modulation without every RF carrier oscillation.",
  "aliases": [
   "voltage-envelope",
   "envelope"
  ]
 },
 "Processing Delay": {
  "definition": "The time a receiver component takes to pass a signal.",
  "aliases": [
   "filter processing delay",
   "group delay"
  ]
 },
 "I/Q": {
  "definition": "In-phase and quadrature: two amplitudes measured against references 90 degrees apart.",
  "aliases": [
   "quadrature"
  ]
 },
 "Complex Sample": {
  "definition": "A pair of real values written as I + jQ.",
  "aliases": [
   "complex baseband",
   "complex samples"
  ]
 },
 "Digital Downconversion": {
  "definition": "Removing a nominal digital carrier by multiplication and filtering.",
  "aliases": [
   "quadrature conversion"
  ]
 },
 "Raw I/Q": {
  "definition": "Unprocessed I and Q amplitudes stored or streamed before satellite decoding.",
  "aliases": [
   "raw-I/Q",
   "raw I/Q files",
   "raw I/Q recording"
  ]
 },
 "Byte": {
  "definition": "A group of eight bits.",
  "aliases": [
   "bytes"
  ]
 },
 "CU8": {
  "definition": "A format storing each complex sample as an unsigned I byte followed by an unsigned Q byte.",
  "aliases": []
 },
 "Interleaved": {
  "definition": "Stored in an alternating order, such as I0, Q0, I1, Q1.",
  "aliases": []
 },
 "Unsigned": {
  "definition": "Encoded using nonnegative integer values only.",
  "aliases": []
 },
 "Signed": {
  "definition": "Encoded using values that may be positive or negative.",
  "aliases": []
 },
 "Float32": {
  "definition": "A four-byte numerical format for an approximate real value.",
  "aliases": [
   "float32",
   "32-bit floating point"
  ]
 },
 "Little-Endian": {
  "definition": "Byte ordering in which the least significant byte is stored first.",
  "aliases": [
   "little-endian"
  ]
 },
 "SDR": {
  "definition": "Software-defined radio: a receiver that performs radio-signal processing in software.",
  "aliases": [
   "software receiver",
   "software receivers"
  ]
 },
 "RTL-SDR": {
  "definition": "A radio device and associated software that can provide streams of received I/Q samples.",
  "aliases": []
 },
 "GNSS-SDR": {
  "definition": "Software that accepts recorded GNSS sample streams; this chapter covers its input sample formats.",
  "aliases": []
 },
 "atan2": {
  "definition": "A function that calculates phase from I and Q while selecting the correct quadrant.",
  "aliases": []
 },
 "Correlation": {
  "definition": "A measure of similarity between a received signal and a local reference.",
  "aliases": [
   "correlator"
  ]
 },
 "LNAV": {
  "definition": "The legacy GPS navigation message carried by the L1 C/A signal.",
  "aliases": []
 },
 "PVT": {
  "definition": "Position, velocity, and time estimated by the navigation processor.",
  "aliases": []
 }
};

Object.assign(definitions,{
 'Energy':{definition:'The capacity to do work or transfer heat.',aliases:[]},
 'Joule':{definition:'The unit of energy; one watt transfers one joule each second.',aliases:[]},
 'Kelvin':{definition:'The unit of absolute temperature, measured from absolute zero.',aliases:[]},
 'Metre':{definition:'The standard unit of length.',aliases:['meter']},
 'Second':{definition:'The standard unit of time.',aliases:['seconds']},
 'Volt':{definition:'The unit of electrical potential difference.',aliases:['volts']},
 'Ampere':{definition:'The unit of electric current.',aliases:['amperes']},
 'Ohm':{definition:'The unit of electrical resistance.',aliases:['ohms']},
 'Scientific Notation':{definition:'Writing a number as a coefficient multiplied by a power of ten.',aliases:[]},
 'Radian':{definition:'An angle unit for which one complete turn is two pi radians.',aliases:['radians']},
 'Degree':{definition:'An angle unit equal to one 360th of a complete turn.',aliases:['degrees']}
});
Object.assign(definitions,{
 'Input':{definition:'The signal entering a component.',aliases:['input signal']},
 'Output':{definition:'The signal leaving a component.',aliases:['output signal']},
 'Circuit':{definition:'An arrangement of connected electrical components.',aliases:['circuitry','receiver circuitry']},
 'Component':{definition:'One functional part of an electrical circuit.',aliases:['components']},
 'Transmitter':{definition:'A device that sends a radio signal.',aliases:[]},
 'Load':{definition:'The circuit or component receiving electrical power.',aliases:['resistive load']},
 'Electric Charge':{definition:'A property of matter that produces electrical forces.',aliases:[]},
 'Boltzmann Constant':{definition:'The constant relating thermal energy to absolute temperature.',aliases:[]}
});
Object.assign(definitions,{
 'Carrier Frequency':{definition:'The oscillation frequency of the radio carrier.',aliases:[]},
 'Code Period':{definition:'The time taken for one complete ranging-code sequence to repeat.',aliases:['C/A period']},
 'Modulo':{definition:'The remainder after division by a specified interval.',aliases:[]},
 'Noise Density':{definition:'Noise power per unit frequency bandwidth, commonly expressed in W/Hz.',aliases:['noise power per unit bandwidth']},
 'dB-Hz':{definition:'The unit for carrier power divided by noise power density, referenced to 1 Hz.',aliases:[]}
});
definitions['C/N0'].definition='Carrier power divided by noise power per unit bandwidth, expressed in dB-Hz.';
definitions['Digital Sample'].aliases.push('sample','samples','numerical samples');
definitions['Time Domain'].aliases.push('time-domain');definitions['Frequency Domain'].aliases.push('frequency-domain');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=value=>String(value).trim().toLowerCase().replace(/[\u2010-\u2014]/g,'-');
const aliases=new Map();
for(const [key,item] of Object.entries(definitions))for(const alias of [key,...item.aliases])aliases.set(fold(alias),{key,alias,exact:/^[A-Z]{1,4}$/.test(alias)||['Hz','MHz','mW','dB','dBm','dBW'].includes(alias)});
const regexSpecial=new Set([46,42,43,63,94,36,123,125,40,41,124,91,93,92]);
const escapeRegex=value=>Array.from(value,c=>regexSpecial.has(c.charCodeAt(0))?String.fromCharCode(92)+c:c).join('');
const matcher=new RegExp('(?<![A-Za-z0-9])('+[...aliases.values()].map(item=>item.alias).sort((a,b)=>b.length-a.length).map(escapeRegex).join('|')+')(?![A-Za-z0-9])','giu');
// Curated learning vocabulary. Do not seed every lesson with a global term list.
const primary=[
 ['Electromagnetic Spectrum','Microwaves','L-Band','Frequency','Wavelength','Carrier','C/A Code','Navigation Data'],
 ['Front End','RF','Analog Signal','Carrier','C/A Code','Doppler','Code Delay','Pseudorange'],
 ['Receiving Antenna','Polarization','RHCP','LHCP','Antenna Gain','Radiation Pattern','Active Antenna','LNA','Cable Loss'],
 ['Bandpass Filter','Passband','Stopband','Bandwidth','3-dB Bandwidth','Insertion Loss','Selectivity','Attenuation'],
 ['Gain','Power Gain','dB','dBm','dBW','SNR','Noise Figure','Noise Factor'],
 ['Downconversion','Mixer','Local Oscillator','IF Filter','IF','Frequency Translation','Difference Frequency','Sum Frequency'],
 ['IF Conditioning','IF Amplifier','Anti-Alias Filter','Bandwidth','Center Frequency','Quality Factor','Gain','Analog Signal'],
 ['ADC','Sampling','Sampling Frequency','Nyquist Frequency','Nyquist Rate','Aliasing','Bandpass Sampling','Quantization','Bit Depth'],
 ['Digital IF','Digital Sample','Time Domain','Frequency Domain','Histogram','Sample Count','AGC','Clipping'],
 ['Raw I/Q','I/Q','Complex Sample','Byte','CU8','Interleaved','RTL-SDR','GNSS-SDR']
];
const supporting=[
 ['GNSS','GPS','Radio Signal','RF','Hertz','Megahertz','L1','PRN Code','Ranging Code','Chip','Chip Rate','Bit','Modulation','BPSK','Sinusoid','Bandwidth','Main Lobe','Spectral Null','Null-to-Null Bandwidth','Thermal Noise'],
 ['Receiving Antenna','Reception','Filtering','Amplification','Downconversion','IF','IF Filter','ADC','Clock','Digitization','PRN Code','Chip','Chip Rate','Code Period','Carrier Phase','Hertz','Nanosecond'],
 ['Reception','Electric Field','Voltage','Analog Signal','RF','Passive Antenna','Elevation','Horizon','Reflection','dBm','dB'],
 ['Filtering','Center Frequency','RF','Interference','Decibel','dB','dBm','Gain','Main Lobe','Null-to-Null Bandwidth'],
 ['Power','Voltage','Voltage Gain','Amplification','Noise','Thermal Noise','Bandwidth','Noise Density','C/N0','Friis Equation','Cascade','RMS Voltage','Impedance'],
 ['RF','Carrier','Modulation','Mixing Product','Image Frequency','Frequency Synthesizer','Frequency Divider','Analog Signal','Bandpass Filter','Passband','Bandwidth'],
 ['IF','IF Filter','Filtering','Passband','Stopband','Attenuation','dB','Amplification','Voltage','Input Range'],
 ['Sampling Interval','Time Interval','Nanosecond','Microsecond','Quantization Level','Quantization Bin','Input Range','Digital Sample','IF','Digital IF','Frequency Spectrum'],
 ['Sampling Frequency','Bit Depth','Quantization Level','Quantization Bin','Input Range','Frequency Spectrum','Frequency Bin','PSD','FFT','Noise-Like Signal','Relative Amplitude'],
 ['Digital Downconversion','Unsigned','Signed','Float32','Little-Endian','SDR','atan2','Carrier Phase','Phase','Digital IF','Sampling Frequency','Sample Count','LNAV','Byte','Microsecond']
];
function lookup(term){return definitions[term]?term:aliases.get(fold(term))?.key||null;}
function matched(value){matcher.lastIndex=0;const found=[];let match;while((match=matcher.exec(String(value)))){const item=aliases.get(fold(match[0]));if(item&&(!item.exact||match[0]===item.alias))found.push({key:item.key,start:match.index,end:matcher.lastIndex,label:match[0]});}return found;}
function sectionKeys(index){
 if(!primary[index])throw new RangeError('Unknown Front End section');
 const set=new Set(primary[index]);
 for(const term of supporting[index]){const key=lookup(term);if(key)set.add(key);}
 const dependencies={
  'dB':['Ratio','Logarithm','Logarithmic Scale'], 'dBm':['dB','Milliwatt','Power'], 'dBW':['dB','Watt','Power'],
  'Power':['Watt'], 'Voltage':['Amplitude'], 'Milliwatt':['Watt'],
  'Phase':['Cycle'], 'Carrier Phase':['Phase'], 'Radian':['Degree'],
  'Carrier':['Modulation'], 'PRN Code':['Chip','Ranging Code'], 'C/A Code':['Chip','Ranging Code'],
  'Sampling':['Amplitude','Time Interval'], 'Sampling Frequency':['Hertz'], 'Quantization':['Quantization Level','Digital Sample'],
  'Bit Depth':['Bit','Quantization Level'], 'SNR':['Power','Noise','Ratio'], 'Noise Figure':['SNR','dB'],
  'Noise Factor':['SNR','Linear Ratio'], 'Friis Equation':['Noise Factor','Power Gain','Cascade'],
  '3-dB Bandwidth':['dB','Passband','Bandwidth'], 'Quality Factor':['Center Frequency','Bandwidth','Ratio'],
  'RMS Voltage':['Voltage','Resistance','Power'], 'C/N0':['Power','Noise Density','dB-Hz'], 'dB-Hz':['dB','Hertz'],
  'Noise Density':['Noise','Bandwidth'], 'Thermal Noise':['Noise','Kelvin','Boltzmann Constant'],
  'Complex Sample':['I/Q'], 'I/Q':['Phase'], 'Wavelength':['Cycle'],
  'Nyquist Rate':['Bandwidth'], 'Bandpass Sampling':['Aliasing','Nyquist Frequency'],
  'Anti-Alias Filter':['Filtering','Aliasing']
 };
 // Include only prerequisite concepts needed to understand this section's terms.
 // Missing named units remain plain text rather than generating broken links.
 for(const key of set)for(const term of dependencies[key]||[]){const needed=lookup(term);if(needed)set.add(needed);}
 return [...set];
}

let active=0,available=new Set(sectionKeys(0)),seen=new Set(),returnTarget=null;
const id=key=>'fe-concept-'+Object.keys(definitions).indexOf(key);
function setSection(index){active=index;available=new Set(sectionKeys(index));seen=new Set();returnTarget=null;}
function text(value){let output='',last=0;const s=String(value);for(const item of matched(s)){
 output+=esc(s.slice(last,item.start));
 if(available.has(item.key)&&!seen.has(item.key)){seen.add(item.key);output+='<a class="fe-term" href="#'+id(item.key)+'" data-concept="'+esc(item.key)+'" title="'+esc(definitions[item.key].definition)+'">'+esc(item.label)+'</a>';}
 else output+=esc(item.label);
 last=item.end;
}return output+esc(s.slice(last));}
function html(value){const template=document.createElement('template');template.innerHTML=value;const walk=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT),nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);for(const node of nodes){if(node.parentElement?.closest('a,button,math,code,pre,script,style,textarea'))continue;const marked=text(node.textContent);if(marked.includes('data-concept=')){const span=document.createElement('span');span.innerHTML=marked;node.replaceWith(...span.childNodes);}}return template.innerHTML;}
function rows(keys){return keys.map(key=>'<div id="'+id(key)+'" class="fe-concept-entry"><dt tabindex="-1">'+esc(key)+'</dt><dd>'+esc(definitions[key].definition)+'<button type="button" class="fe-definition-back" data-definition-back hidden>Return to reading</button></dd></div>').join('');}
function render(index){const essentials=primary[index],more=sectionKeys(index).filter(key=>!essentials.includes(key));return '<section class="fe-definitions" aria-labelledby="fe-definitions-title"><div class="fe-definition-heading"><span class="eyebrow">ESSENTIAL DEFINITIONS</span><h3 id="fe-definitions-title">Concepts Used in This Section</h3><p>Each term has a short definition. Select an underlined term in the lecture to read its definition.</p></div><dl>'+rows(essentials)+'</dl></section><details class="fe-worked" id="fe-additional-definitions"><summary>Supporting Terms for This Section ('+more.length+')</summary><div class="fe-worked-body"><div class="fe-definitions"><dl>'+rows(more)+'</dl></div></div></details>';}
const symbolSets=[
 [['fL1','GPS L1 carrier frequency','Hz or MHz'],['f','Frequency in the wavelength formula','Hz'],['c','Speed of light, approximately 3 x 10^8','m/s'],['lambda','Wavelength: distance traveled in one cycle','m'],['Rc','C/A code chip rate','chips/s'],['BW or B','Frequency interval or noise bandwidth','Hz'],['Pr','Received signal power','W; a stated level may use dBm or dBW'],['N','Integrated thermal-noise power','W'],['k','Boltzmann constant, 1.380649 x 10^-23','J/K'],['T','Absolute temperature','K']],
 [['fRF','Incoming radio carrier frequency','MHz'],['fLO','Local-oscillator frequency','MHz'],['fIF','Analog intermediate frequency','MHz'],['fs','ADC sampling frequency','million samples/s when written in MHz'],['N','ADC bit depth','bits per amplitude sample']],
 [['Pin, Pout','Input and output power levels','dBm in the worked power budget'],['GdB','Amplifier power gain','dB'],['L','Positive cable loss subtracted from the input level','dB']],
 [['fc','Filter center frequency','MHz'],['BW3dB','Frequency separation of the two 3-dB points','MHz'],['flower, fupper','Lower and upper passband-edge frequencies','MHz'],['Pin, Pout','Input and output power levels','dBm'],['IL','Positive insertion loss','dB']],
 [['Pin, Pout','Input and output physical power','W or mW, using matching units'],['Pin,dBm; Pout,dBm','The same powers written as levels','dBm'],['GdB','Power gain in decibels','dB'],['G; G1, G2','Linear power gain of a component or numbered stage','dimensionless ratio'],['F; F1, F2, F3','Linear noise factor of a component or numbered stage','dimensionless ratio'],['NF','Noise figure','dB'],['SNRin, SNRout','Input and output signal-to-noise ratios','dimensionless ratios; label explicitly when expressed in dB']],
 [['fRF','Wanted RF carrier frequency','MHz'],['fLO','Local-oscillator frequency','MHz'],['fIF or fdifference','Desired difference-frequency magnitude','MHz'],['fsum','Unwanted sum-frequency component','MHz'],['fimage','RF frequency that produces the same IF magnitude','MHz'],['fs','ADC sampling frequency obtained by dividing fLO by 40','million samples/s when written in MHz']],
 [['fc or fcenter','Filter center frequency','MHz'],['BW','Filter bandwidth','MHz'],['Q','Center frequency divided by bandwidth','dimensionless ratio'],['GIF','IF-amplifier power gain','dB when stated as 50 dB']],
 [['fs','Sampling frequency','samples/s'],['Ts','Time between consecutive samples','s; often shown in ns'],['fN','Nyquist frequency, equal to fs/2','Hz'],['fIF','Analog intermediate frequency before sampling','MHz'],['fdigital','Desired IF frequency in the sampled representation','MHz'],['N','ADC bit depth','bits per amplitude sample'],['L','Number of available amplitude levels, equal to 2^N','count of levels'],['n','Index identifying one sample in a sequence','integer count']],
 [['fs','Sampling frequency','samples/s'],['fdigital','Digital IF center frequency','MHz'],['N','ADC bit depth','bits per amplitude sample'],['T','Duration occupied by a stated number of samples','s or microseconds'],['Sample count','Number of values represented by the histogram','samples'],['PSD','Power per unit frequency bandwidth','W/Hz for a calibrated spectrum']],
 [['fRF, fLO, fIF','RF, local-oscillator and analog IF frequencies','MHz'],['fs','Sampling frequency of the reference real ADC output','samples/s'],['N','Bit depth of the reference ADC','bits per amplitude sample'],['I, Q','In-phase and quadrature amplitude values in the supplementary laboratory','matching amplitude units'],['j','Imaginary unit, satisfying j squared = -1','no physical unit'],['phi','Carrier phase angle','radians or degrees; 2 pi radians = 360 degrees'],['T','Recording duration in the supplementary file-size example','s'],['Complex sample rate','Rate of I/Q pairs in a complex recording','pairs/s; each CU8 pair uses 2 bytes']]
];
function mathHelp(index){return '<details class="fe-worked" id="fe-section-symbols"><summary>Symbols and Units for This Section</summary><div class="fe-worked-body"><p>Read each symbol with the meaning and unit shown below. Power levels, power ratios, voltage ratios, and sample counts are different quantities.</p><div class="fe-table-wrap"><table><thead><tr><th>Symbol</th><th>Meaning</th><th>Unit</th></tr></thead><tbody>'+symbolSets[index].map(([symbol,meaning,unit])=>'<tr><td data-label="Symbol">'+esc(symbol)+'</td><td data-label="Meaning">'+esc(meaning)+'</td><td data-label="Unit">'+esc(unit)+'</td></tr>').join('')+'</tbody></table></div><button type="button" class="fe-definition-back" data-definition-back hidden>Return to reading</button></div></details>';}
const bound=new WeakSet();
function bind(){const main=document.getElementById('front-end-main');if(!main||bound.has(main))return;bound.add(main);main.addEventListener('click',event=>{
 const back=event.target.closest?.('[data-definition-back]');if(back){back.hidden=true;if(returnTarget?.isConnected){returnTarget.focus({preventScroll:true});returnTarget.scrollIntoView({block:'center'});}return;}
 const symbolLink=event.target.closest?.('[data-symbol-reference]');if(symbolLink){event.preventDefault();returnTarget=symbolLink;const panel=document.getElementById('fe-section-symbols');panel.open=true;panel.querySelector('[data-definition-back]').hidden=false;panel.querySelector('summary').focus({preventScroll:true});panel.scrollIntoView({block:'center'});return;}
 const link=event.target.closest?.('a[data-concept]');if(!link)return;const target=document.getElementById(id(link.dataset.concept));if(!target)return;
 event.preventDefault();returnTarget=link;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 main.querySelectorAll('.fe-concept-entry.is-selected').forEach(node=>{node.classList.remove('is-selected');node.querySelector('[data-definition-back]').hidden=true;});
 target.classList.add('is-selected');target.querySelector('[data-definition-back]').hidden=false;target.querySelector('dt').focus({preventScroll:true});target.scrollIntoView({block:'center'});
});}
const excludedTerms=new Set(['Acquisition','Tracking','PVT','Correlation','Multi-Channel']);
const glossary=Object.fromEntries(Object.entries(definitions).filter(([key])=>!excludedTerms.has(key)).flatMap(([key,item])=>[[key,item.definition],...item.aliases.filter(alias=>/^[A-Z][A-Z/0-9]+$/.test(alias)).map(alias=>[alias,item.definition])]));
root.FE_CONCEPTS={definitions,lookup,sectionKeys,setSection,text,html,render,mathHelp,bind,glossary,symbolSets,primary,excludedTerms};
})(window);
