/* Primary teaching sequence: user-supplied undergraduate lecture. */
window.FE_LESSONS=[
  {
    "title": "Understanding the GNSS Signal",
    "stage": 0,
    "definition": "A GPS L1 C/A signal is a radio wave carrying a ranging code and navigation data at 1575.42 MHz.",
    "change": "The antenna input remains a weak, analog, noise-like signal. Clean sinusoidal examples explain frequency and modulation; they are not complete received GPS waveforms.",
    "example": "At 290 K in a 2 MHz bandwidth, thermal noise power N = kTB is approximately -111 dBm. The example GPS signal is -130 dBm, approximately 19 dB below that integrated noise power.",
    "equation": "fL1 = 1575.42 MHz; wavelength = c/f; Bmain = 2 Rc = 2.046 MHz; N = kTB",
    "ref": "User-supplied lecture, Section 01; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Complete GNSS Front-End Architecture",
    "stage": 0,
    "definition": "A GNSS front end prepares received radio signals for digital processing.",
    "change": "Reception, RF filtering, amplification, mixing and IF conditioning operate on an analog signal. The transition to digital numbers occurs only in the ADC. The front end prepares samples for acquisition and tracking; it does not calculate receiver position.",
    "example": "Reference parameters: RF 1575.42 MHz; local oscillator 1527.68 MHz; analog IF 47.74 MHz; sampling frequency 38.192 MHz; digital IF 9.548 MHz; ADC resolution four bits.",
    "equation": "fRF = 1575.42 MHz; fLO = 1527.68 MHz; fIF = 47.74 MHz; fs = 38.192 MHz",
    "ref": "User-supplied lecture, Section 02; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "GNSS Receiving Antenna",
    "stage": 0,
    "definition": "A receiving antenna converts arriving radio waves into a small electrical voltage.",
    "change": "The antenna produces a weak analog voltage. Its frequency content includes the received L1 band and noise; the signal is not decoded or separated by satellite.",
    "example": "For a received power of -130 dBm, a 30 dB active-antenna LNA produces -100 dBm. An 8 dB cable loss then reduces the signal power to -108 dBm.",
    "equation": "Pafter LNA = -130 + 30 = -100 dBm; Pafter cable = -100 - 8 = -108 dBm",
    "ref": "User-supplied lecture, Section 03; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "RF Bandpass Filter",
    "stage": 1,
    "definition": "An RF bandpass filter passes a selected frequency band and weakens frequencies outside it.",
    "change": "Out-of-band energy is attenuated. The waveform remains analog, and its center frequency remains 1575.42 MHz. The RF filter does not separate individual GPS satellites. The reference RF filter is centered at 1575.42 MHz with an approximately 50 MHz 3-dB bandwidth.",
    "example": "The symmetric 50 MHz RF passband has approximate 3-dB edges at 1550.42 MHz and 1600.42 MHz. A separate 1.5 dB insertion-loss example reduces -130 dBm to -131.5 dBm. The C/A main-lobe width remains 2.046 MHz.",
    "equation": "B3dB = 50 MHz; flower = 1550.42 MHz; fupper = 1600.42 MHz",
    "ref": "User-supplied lecture, Section 04; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Amplification and Noise Figure",
    "stage": 2,
    "definition": "Amplification increases the amplitude or power of an electrical signal.",
    "change": "The analog voltage increases in magnitude. The carrier center remains 1575.42 MHz, and the input signal-to-noise ratio does not improve through ideal gain alone.",
    "example": "The lecture amplifier example has -110 dBm input and 20 dB gain, giving -90 dBm output. An input SNR of 10 dB and output SNR of 7 dB correspond to a noise figure of 3 dB. Friis noise factors and gains must be expressed in linear units.",
    "equation": "GdB = Pout,dBm - Pin,dBm; SNR = Psignal/Pnoise; NFdB = SNRin,dB - SNRout,dB",
    "ref": "User-supplied lecture, Section 05; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Mixer and Local Oscillator",
    "stage": 3,
    "definition": "A mixer combines RF and local-oscillator signals to produce sum and difference frequencies.",
    "change": "The analog mixer produces the desired component at 47.74 MHz and an unwanted sum-frequency component at 3103.10 MHz. The next IF filter selects the desired band.",
    "example": "1575.42 - 1527.68 = 47.74 MHz; 1575.42 + 1527.68 = 3103.10 MHz. The image frequency is 1527.68 - 47.74 = 1479.94 MHz. Dividing the synthesized local oscillator by 40 gives 38.192 MHz sampling.",
    "equation": "fdifference = |fRF - fLO|; fsum = fRF + fLO; fs = fLO/40",
    "ref": "User-supplied lecture, Section 06; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Intermediate-Frequency Filtering and Amplification",
    "stage": 4,
    "definition": "IF conditioning filters and amplifies the intermediate-frequency signal before digitization.",
    "change": "The first IF filter passes an approximately 18 MHz band. The IF amplifier then provides approximately 50 dB gain. The final filter reduces the analog bandwidth to approximately 6 MHz. The center frequency remains 47.74 MHz.",
    "example": "For the same 2.046 MHz comparison bandwidth, Q = 1575.42/2.046 is approximately 770 at RF and Q = 47.74/2.046 is approximately 23.33 at IF. The actual reference final IF passband is approximately 6 MHz.",
    "equation": "Q = fcenter/BW; BIF,first = 18 MHz; GIF = 50 dB; BIF,final = 6 MHz",
    "ref": "User-supplied lecture, Section 07; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Analog-to-Digital Converter",
    "stage": 5,
    "definition": "An analog-to-digital converter (ADC) converts a continuous analog voltage into numerical samples.",
    "change": "The ADC samples the conditioned analog IF and quantizes each measurement to one of 16 levels. Intentional bandpass sampling places the desired IF at 9.548 MHz in the sampled spectrum.",
    "example": "The sampling interval is 1/(38.192 million) = approximately 26.18 ns. The Nyquist frequency is 19.096 MHz. The analog IF appears at |47.74 - 38.192| = 9.548 MHz. A four-bit ADC provides 2^4 = 16 quantization levels.",
    "equation": "fs = 1/Ts; fN = fs/2; fdigital = |fIF - fs|; L = 2^N",
    "ref": "User-supplied lecture, Section 08; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Resulting Digital GNSS Signal",
    "stage": 6,
    "definition": "The digital GNSS output is a sequence of numbers representing the received intermediate-frequency voltage.",
    "change": "The time-domain waveform, 16-level histogram and frequency spectrum describe the same four-bit digital IF sample sequence. A noise-like waveform is compatible with valid GPS information. The reference output uses four-bit samples at 38.192 million samples per second, with a digital IF of 9.548 MHz.",
    "example": "One thousand samples span 1000/(38.192 million) = approximately 26.2 microseconds. The histogram contains one count per sample: its 16 bin counts must sum to the displayed sample count.",
    "equation": "fs = 38.192 MHz; fdigital = 9.548 MHz; N = 4 bits/sample; T = sample count/fs",
    "ref": "User-supplied lecture, Section 09; supplied GNSS front-end presentation and textbook chapter."
  },
  {
    "title": "Complete Front-End Signal Transformation",
    "stage": 6,
    "definition": "Signal transformation is the sequence of changes applied between antenna reception and digital output.",
    "change": "The received analog L1 signal has become a noise-like sequence of digital IF samples. Satellite identification and navigation-message processing belong to subsequent digital receiver stages.",
    "example": "The final sequence is antenna, RF filter, RF amplifier, mixer, first IF filter, IF amplifier, final IF filter, ADC sampling and ADC quantization. The digital output retains the desired ranging and navigation modulation.",
    "equation": "Analog reception and conditioning -> ADC sampling -> ADC quantization -> digital IF",
    "ref": "User-supplied lecture, Section 10; supplied GNSS front-end presentation and textbook chapter."
  }
];
