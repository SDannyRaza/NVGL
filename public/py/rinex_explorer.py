"""RINEX 3.02 parsing and academic metadata for the browser-side VGL science engine.

This module contains no HTTP server. It is loaded inside Pyodide/WebAssembly in
the visitor's browser and reads only the RINEX files copied into the browser's
virtual filesystem.
"""
from __future__ import annotations

import re
from pathlib import Path

SYSTEMS = dict(G="GPS", R="GLONASS", E="Galileo", J="QZSS", C="BeiDou", S="SBAS")
HEADERS = {
    "RINEX VERSION / TYPE": "Identifies the format version, file purpose and satellite system. M means mixed systems.",
    "PGM / RUN BY / DATE": "Software, operator and conversion date used to create this text file; this is not the observation epoch.",
    "COMMENT": "Free text written by the converter or operator. It is metadata, not a satellite measurement.",
    "MARKER NAME": "Name of the survey station or measurement marker.",
    "MARKER NUMBER": "Identifier assigned to the measurement marker.",
    "MARKER TYPE": "Physical type of measurement site, such as a geodetic monument or a moving receiver.",
    "OBSERVER / AGENCY": "Person and organization responsible for the observations.",
    "REC # / TYPE / VERS": "Receiver serial number, model and firmware version.",
    "ANT # / TYPE": "Antenna serial number and model.",
    "APPROX POSITION XYZ": "Approximate receiver position in Earth-centered, Earth-fixed coordinates, in metres. This is not latitude, longitude and height.",
    "ANTENNA: DELTA H/E/N": "Antenna reference point offset from the marker: height, east and north, in metres.",
    "SYS / # / OBS TYPES": "The measurement-column key for one constellation. Read each satellite row using this exact observation-code order.",
    "TIME OF FIRST OBS": "Timestamp of the first observation, followed by the time-system identifier.",
    "TIME OF LAST OBS": "Timestamp of the last observation, followed by the time-system identifier.",
    "SYS / PHASE SHIFT": "Carrier-phase alignment correction in cycles for a system and signal. A blank entry does not supply a numeric correction.",
    "GLONASS SLOT / FRQ #": "Associates GLONASS satellite slots with FDMA frequency channels. A zero count here supplies no slot/channel pairs.",
    "GLONASS COD/PHS/BIS": "GLONASS code-to-phase alignment biases in metres for the listed observation codes.",
    "IONOSPHERIC CORR": "Broadcast ionosphere-model parameters. GPS/QZSS alpha and beta sets describe a delay model; Galileo uses a different model.",
    "TIME SYSTEM CORR": "Polynomial and reference epoch for conversion between the named GNSS time system and another time system.",
    "LEAP SECONDS": "Leap-second information recorded in this file. The first field is the GPS-minus-UTC offset in seconds for this session.",
    "END OF HEADER": "End of receiver/setup metadata. Observation epochs or broadcast navigation records begin on the next line.",
}

MEASURES = {
    "C": ("Pseudorange", "m", "Travel time of the ranging code multiplied by the speed of light. It includes clock offsets and propagation delays, so it is not a pure geometric distance."),
    "L": ("Carrier phase", "cycles", "Accumulated carrier-wave phase. Multiplying by the signal wavelength gives a distance-like measurement, with an unknown integer ambiguity."),
    "D": ("Doppler", "Hz", "Received carrier-frequency shift, related to range rate and clock drift. In RINEX, positive Doppler corresponds to an approaching satellite."),
    "S": ("Signal strength", "dB-Hz", "Carrier-to-noise-density ratio (C/N0) reported by this receiver. Larger values usually indicate stronger tracking, but do not guarantee an accurate range."),
}
SIGNALS = {
    "G1C": "GPS L1 C/A", "G2X": "GPS L2C, combined M+L",
    "R1C": "GLONASS G1 C/A", "R2C": "GLONASS G2 C/A",
    "E1X": "Galileo E1, combined B+C", "E7X": "Galileo E5b, combined I+Q",
    "J1C": "QZSS L1 C/A", "J2X": "QZSS L2C, combined M+L",
    "C1I": "BeiDou B1 in-phase (RINEX 3.02 code)", "C7I": "BeiDou B2 in-phase",
    "S1C": "SBAS L1 C/A",
}

# Navigation tuples: symbol, unit, explanation. Separate constellation layouts
# prevent a GLONASS state vector being mislabeled as a Keplerian orbit.
SPARE = ("Spare", "—", "Reserved field; do not interpret it as a physical parameter.")

NAV_MATH_HINTS = {
    "af0": "Mathematical role: receiver-side satellite clock correction begins with Δt_sv = af0 + af1·Δt + af2·Δt² before adding constellation-specific relativistic and group-delay terms.",
    "af1": "Mathematical role: af1 is the linear term in the broadcast clock model Δt_sv = af0 + af1·Δt + af2·Δt².",
    "af2": "Mathematical role: af2 is the quadratic drift term in the broadcast clock model.",
    "Δn": "Mathematical role: n = n0 + Δn, where n0 = √(μ/a³). This corrects the ideal Keplerian mean motion.",
    "M0": "Mathematical role: Mk = M0 + n·tk. It is the starting mean anomaly at the ephemeris reference epoch.",
    "√A": "Mathematical role: compute semi-major axis using a = (√A)², then n0 = √(μ/a³) and the orbit period T = 2π√(a³/μ).",
    "Toe": "Mathematical role: tk = t − Toe after week-crossover handling. Toe anchors the broadcast orbit solution in GNSS system time.",
    "e": "Mathematical role: Kepler’s equation is Mk = Ek − e·sin(Ek). After solving for Ek, the true anomaly follows from νk = atan2(√(1−e²)·sinEk, cosEk−e).",
    "ω": "Mathematical role: argument of latitude is φk = νk + ω.",
    "Cuc": "Mathematical role: latitude correction δuk = Cus·sin(2φk) + Cuc·cos(2φk).",
    "Cus": "Mathematical role: latitude correction δuk = Cus·sin(2φk) + Cuc·cos(2φk).",
    "Crc": "Mathematical role: radial correction δrk = Crs·sin(2φk) + Crc·cos(2φk).",
    "Crs": "Mathematical role: radial correction δrk = Crs·sin(2φk) + Crc·cos(2φk).",
    "Cic": "Mathematical role: inclination correction δik = Cis·sin(2φk) + Cic·cos(2φk).",
    "Cis": "Mathematical role: inclination correction δik = Cis·sin(2φk) + Cic·cos(2φk).",
    "i0": "Mathematical role: corrected inclination is ik = i0 + IDOT·tk + δik.",
    "IDOT": "Mathematical role: corrected inclination is ik = i0 + IDOT·tk + δik.",
    "Ω0": "Mathematical role: corrected node longitude is Ωk = Ω0 + (Ω̇ − Ωe)·tk − Ωe·Toe.",
    "Ω dot": "Mathematical role: corrected node longitude is Ωk = Ω0 + (Ω̇ − Ωe)·tk − Ωe·Toe.",
    "Week": "Mathematical role: the broadcast week and Toe determine tk across GNSS week boundaries.",
    "Clock bias": "Mathematical role: used directly in the satellite clock correction. For GLONASS and SBAS, the broadcast state vector is propagated separately from the clock model.",
    "X position": "Mathematical role: together with Y and Z state components, this forms the broadcast ECEF state propagated numerically for GLONASS/SBAS.",
    "Y position": "Mathematical role: together with X and Z state components, this forms the broadcast ECEF state propagated numerically for GLONASS/SBAS.",
    "Z position": "Mathematical role: together with X and Y state components, this forms the broadcast ECEF state propagated numerically for GLONASS/SBAS.",
}

KEPLER = [
    ("af0", "s", "Satellite clock bias at the clock reference epoch."),
    ("af1", "s/s", "Satellite clock drift: the linear clock correction coefficient."),
    ("af2", "s/s²", "Quadratic clock correction coefficient: bias = af0 + af1·dt + af2·dt², before other required corrections."),
    ("IODE", "identifier", "Issue of ephemeris data: identifies the broadcast orbit parameter set."),
    ("Crs", "m", "Sine harmonic correction to orbital radius."),
    ("Δn", "rad/s", "Correction to the mean orbital angular rate."),
    ("M0", "rad", "Mean anomaly at the orbit reference epoch; locates the satellite along its orbit."),
    ("Cuc", "rad", "Cosine harmonic correction to argument of latitude."),
    ("e", "dimensionless", "Orbital eccentricity, describing the ellipse's departure from a circle."),
    ("Cus", "rad", "Sine harmonic correction to argument of latitude."),
    ("√A", "√m", "Square root of orbital semi-major axis. Square this value to obtain A in metres."),
    ("Toe", "s of system week", "Orbit reference time; propagate the ephemeris from this time to the signal transmission time."),
    ("Cic", "rad", "Cosine harmonic correction to orbital inclination."),
    ("Ω0", "rad", "Longitude of the ascending node at the weekly reference epoch."),
    ("Cis", "rad", "Sine harmonic correction to orbital inclination."),
    ("i0", "rad", "Orbital inclination at the ephemeris reference time."),
    ("Crc", "m", "Cosine harmonic correction to orbital radius."),
    ("ω", "rad", "Argument of perigee: orientation of the ellipse within the orbital plane."),
    ("Ω dot", "rad/s", "Rate of change of the ascending-node longitude."),
    ("IDOT", "rad/s", "Rate of change of orbital inclination."),
    ("Codes on L2", "code", "Broadcast indicator describing the GPS L2 code configuration."),
    ("Week", "weeks", "Continuous week number associated with Toe. GPS/QZSS use GPS weeks; Galileo is aligned to GPS weeks in RINEX; BeiDou uses BDT weeks."),
    ("L2 P data flag", "flag", "GPS broadcast flag indicating the L2 P-code data configuration."),
    ("SV accuracy", "m", "Broadcast satellite accuracy estimate; it is not the receiver's measured position error."),
    ("SV health", "bit field", "Broadcast satellite health. Interpret bits using this constellation's definition; zero generally represents healthy status."),
    ("TGD", "s", "Broadcast group delay used to account for signal-dependent satellite hardware delay."),
    ("IODC", "identifier", "Issue of clock data: identifies the broadcast clock correction set."),
    ("Transmission time", "s of system week", "Time at which the navigation message was transmitted; different from Toe and the clock epoch."),
    ("Fit interval", "hours", "Interval over which the broadcast orbit fit applies; not the receiver sampling interval."),
    SPARE, SPARE,
]


def nav_layout(system):
    if system in "RS":
        result = [
            ("Clock bias (−τn)" if system == "R" else "Clock bias", "s", "Satellite clock offset at the reference epoch; GLONASS stores negative tau-n."),
            ("Relative frequency bias", "s/s", "Fractional satellite clock frequency offset; GLONASS gamma-n."),
            ("Message frame time" if system == "R" else "Transmission time", "s of UTC week" if system == "R" else "s of GPS week", "Time tag of the transmitted navigation message."),
        ]
        for axis in "XYZ":
            result.extend([(f"{axis} position", "km", f"Satellite Earth-fixed {axis} coordinate at the reference time. Multiply by 1000 to get metres."),
                           (f"{axis} velocity", "km/s", f"Rate of change of the satellite's Earth-fixed {axis} coordinate."),
                           (f"{axis} acceleration", "km/s²", f"Broadcast acceleration term along {axis}, used by this constellation's propagation model.")])
            result.append({"X": KEPLER[24], "Y": ("Frequency channel", "integer", "GLONASS FDMA channel number; determines the carrier frequency.") if system == "R" else ("URA", "m", "SBAS broadcast user range accuracy."), "Z": ("Age of information", "days", "Age of GLONASS operational information.") if system == "R" else ("IODN", "identifier", "SBAS issue of navigation data.")}[axis])
        return result
    result = KEPLER.copy()
    if system == "E":
        result[3] = ("IODnav", "identifier", "Issue number linking a Galileo navigation-data batch.")
        result[20] = ("Data sources", "bit field", "Identifies Galileo I/NAV or F/NAV signals and the clock/accuracy reference signal pair.")
        result[22] = SPARE
        result[23] = ("SISA", "m", "Galileo signal-in-space accuracy estimate; −1 indicates unknown accuracy.")
        result[25:27] = [("BGD E5a/E1", "s", "Galileo broadcast group delay between E5a and E1."), ("BGD E5b/E1", "s", "Galileo broadcast group delay between E5b and E1.")]
        result[28] = SPARE
    elif system == "C":
        result[3] = ("IODE / AODE", "indicator", "BeiDou ephemeris issue/age indicator; RINEX 3.02 labels this slot IODE.")
        result[20] = result[22] = SPARE
        result[25:27] = [("TGD1 B1/B3", "s", "BeiDou broadcast group delay between B1 and B3."), ("TGD2 B2/B3", "s", "BeiDou broadcast group delay between B2 and B3.")]
        result[28] = ("IODC / AODC", "indicator", "BeiDou clock data issue/age indicator in this field.")
    elif system == "J":
        result[20] = ("Codes on L2", "code", "Broadcast indicator describing the QZSS L2 code configuration.")
        result[22] = SPARE
        result[28] = ("Fit interval flag", "flag", "QZSS fit indicator: 0 means one hour; 1 means more than two hours in the RINEX 3.02 definition.")
    return result


def header_label(line):
    for label in HEADERS:
        if line.rstrip().endswith(label):
            return label, line.rfind(label)
    return line[60:].strip(), min(60, len(line))


def observation_info(system, code):
    name, unit, explanation = MEASURES.get(code[:1], ("Observation", "unknown", "Unrecognized observation type; consult the format specification."))
    signal = SIGNALS.get(system + code[1:], f"Band/tracking code {code[1:]} for {SYSTEMS.get(system, system)}")
    return f"{code} · {name}", unit, f"{explanation}\n\nSignal: {signal}. Code key: {code[:1]} = measurement type; {code[1:2]} = frequency band; {code[2:3]} = tracking attribute."


class RinexFile:
    def __init__(self, path):
        self.path = Path(path)
        self.lines = self.path.read_text(encoding="ascii", errors="replace").splitlines()
        if not self.lines or self.lines[0][:9].strip() != "3.02":
            raise ValueError(f"{self.path.name}: this teaching viewer supports RINEX 3.02.")
        self.obs = "OBSERVATION" in self.lines[0]
        self.header_end = next(i + 1 for i, line in enumerate(self.lines) if "END OF HEADER" in line)
        self.types = {}
        system = ""
        for line in self.lines[:self.header_end]:
            label, end = header_label(line)
            if label == "SYS / # / OBS TYPES":
                system = line[0].strip() or system
                self.types.setdefault(system, []).extend(re.findall(r"[CLDS][0-9][A-Z]", line[6:end]))
        self.context = {}
        self.records = []
        self.satellites = set()
        current, offset, epoch, event_remaining = "", 0, "", 0
        for i in range(self.header_end, len(self.lines)):
            line = self.lines[i]
            if self.obs:
                if line.startswith(">"):
                    epoch = line[2:29].strip()
                    self.records.append(i)
                    flag = int(line[31:32] or "0")
                    event_remaining = int(line[32:35]) if flag in (2, 3, 4, 5) else 0
                    self.context[i] = ("epoch", epoch, flag)
                elif event_remaining:
                    self.context[i] = ("event", epoch, 0)
                    event_remaining -= 1
                elif re.match(r"[GREJCS]\s*\d", line):
                    self.context[i] = (line[0], epoch, 0)
                    self.satellites.add(line[:3].replace(" ", "0"))
            else:
                if re.match(r"[GREJCS]\s*\d", line):
                    current, offset = line[0], 0
                    epoch = line[3:23].strip()
                    self.records.append(i)
                    self.satellites.add(line[:3].replace(" ", "0"))
                self.context[i] = (current, epoch, offset)
                offset += 1

    def annotate(self, index):
        line = self.lines[index]
        fields = []

        def add(start, end, title, unit, description, kind="meta"):
            end = min(end, len(line))
            if end <= start:
                return
            value = line[start:end]
            note = "\n\nThis field is blank: no value is supplied. A blank is not a measured zero." if not value.strip() else ""
            fields.append(dict(start=start, end=end, title=title, unit=unit, description=description + note, kind=kind, value=value.strip() or "(blank)", line=index + 1))

        if index < self.header_end:
            label, pos = header_label(line)
            explanation = HEADERS.get(label, "Header metadata; consult the RINEX specification for this record.")
            add(pos, len(line), label, "header label", explanation)
            if label == "SYS / # / OBS TYPES":
                system = line[0]
                add(0, 1, SYSTEMS.get(system, "System continuation"), "system", "Constellation whose measurement columns are defined on this line.", "sat")
                add(1, 6, "Number of observation types", "count", "Number of measurement columns expected for this satellite system.")
                for match in re.finditer(r"[CLDS][0-9][A-Z]", line[:pos]):
                    add(match.start(), match.end(), *observation_info(system, match.group()), match.group()[0])
            elif label in ("APPROX POSITION XYZ", "ANTENNA: DELTA H/E/N"):
                for j, name in enumerate(("ECEF X", "ECEF Y", "ECEF Z") if label.startswith("APPROX") else ("Antenna height", "Antenna east offset", "Antenna north offset")):
                    add(j * 14, (j + 1) * 14, name, "m", explanation, "orbit")
            elif label == "RINEX VERSION / TYPE":
                for start, end, title in [(0, 9, "RINEX version"), (20, 40, "File type"), (40, pos, "Satellite system")]:
                    add(start, end, title, "metadata", explanation)
            elif label in ("PGM / RUN BY / DATE", "REC # / TYPE / VERS", "OBSERVER / AGENCY", "ANT # / TYPE"):
                names = {"PGM / RUN BY / DATE": ["Converter software", "Run by", "File creation time"], "REC # / TYPE / VERS": ["Receiver serial number", "Receiver model", "Firmware version"], "OBSERVER / AGENCY": ["Observer", "Agency"], "ANT # / TYPE": ["Antenna serial number", "Antenna model"]}[label]
                for j, name in enumerate(names):
                    add(j * 20, pos if j == len(names) - 1 else (j + 1) * 20, name, "metadata", explanation)
            elif label in ("TIME OF FIRST OBS", "TIME OF LAST OBS"):
                for j, name in enumerate(["Year", "Month", "Day", "Hour", "Minute"]):
                    add(j * 6, (j + 1) * 6, name, "time", explanation, "time")
                add(30, 43, "Seconds", "s", explanation, "time")
                add(43, pos, "Time system", "time scale", "GPS timestamps are GPS time, not UTC. Use the session leap-second information when converting.", "time")
            elif label == "TIME SYSTEM CORR":
                for a, b, name, unit in [(0, 4, "Time-system pair", "code"), (5, 22, "A0 · time offset", "s"), (22, 38, "A1 · time drift", "s/s"), (38, 45, "Reference time", "s of week"), (45, 50, "Reference week", "weeks")]:
                    add(a, b, name, unit, explanation, "time")
            elif label == "IONOSPHERIC CORR":
                model = line[:4].strip()
                add(0, 4, "Ionospheric model · " + model, "code", explanation)
                for j in range(4):
                    gal = model == "GAL"
                    title = (f"Galileo ai{j}" if j < 3 else "Galileo region flags") if gal else f"{'Alpha' if model.endswith('A') else 'Beta'} coefficient {j}"
                    unit = ("model coefficient" if j < 3 else "flags") if gal else ("s" if j == 0 else f"s / semicircle^{j}")
                    add(5 + j * 12, 17 + j * 12, title, unit, explanation, "orbit")
            elif label == "GLONASS COD/PHS/BIS":
                for match in re.finditer(r"(C[12][CP])\s+([-\d.]+)", line[:pos]):
                    add(match.start(1), match.end(1), match[1], "observation code", explanation)
                    add(match.start(2), match.end(2), match[1] + " bias", "m", explanation, "C")
            else:
                add(0, pos, label + " · value", "s" if label == "LEAP SECONDS" else "metadata", explanation)
        elif self.obs:
            system, epoch, flag = self.context.get(index, ("unknown", "", 0))
            if system == "epoch":
                add(0, 1, "Epoch marker >", "record marker", "Begins a group of observations made at the same receiver timestamp.", "time")
                for a, b, name in [(2, 6, "Year"), (7, 9, "Month"), (10, 12, "Day"), (13, 15, "Hour"), (16, 18, "Minute"), (19, 29, "Seconds")]:
                    add(a, b, name, "GPS time", "Receiver observation epoch in the time system declared by the header.", "time")
                add(31, 32, "Epoch flag", "flag", "0 = ordinary observations; 1 = power failure since previous epoch; 2–5 = special events/header records; 6 = cycle-slip records.", "flag")
                add(32, 35, "Following record count", "count", "For flags 0/1 this is the number of satellite observation rows. For event flags it counts the event records.", "sat")
                add(41, 56, "Receiver clock offset", "s", "Optional receiver clock offset; interpretation also depends on RCV CLOCK OFFS APPL in the header.", "time")
            elif system in SYSTEMS:
                add(0, 3, "Satellite · " + line[:3].replace(" ", "0"), "identifier", f"{SYSTEMS[system]} satellite identifier. The letter identifies the constellation and the digits identify the satellite within it.", "sat")
                for j, code in enumerate(self.types.get(system, [])):
                    start = 3 + 16 * j
                    add(start, start + 14, *observation_info(system, code), code[0])
                    lli = line[start + 14:start + 15].strip()
                    lli_text = "Carrier-phase bit mask: bit 0 = loss of lock / possible cycle slip; bit 1 = half-cycle ambiguity; bit 2 = Galileo MBOC tracking indicator. Blank or 0 means no flag recorded."
                    if code[0] != "L":
                        lli_text = "LLI is defined for carrier-phase observations; do not interpret this slot as a range or Doppler quality code."
                    elif lli.isdigit() and int(lli):
                        lli_text += "\nSet flags: " + ", ".join(t for bit, t in [(1, "possible cycle slip"), (2, "half-cycle ambiguity"), (4, "MBOC tracking")] if int(lli) & bit) + "."
                    add(start + 14, start + 15, code + " · loss-of-lock indicator", "bit mask", lli_text, "flag")
                    add(start + 15, start + 16, code + " · signal-strength indicator", "0–9", "Compact strength indicator: 1 is weakest and 9 strongest; blank/0 means unknown. It is separate from the S observation in dB-Hz.", "flag")
            else:
                add(0, len(line), "Event or unrecognized record", "raw text", "Preserved as written. This record is not decoded as ordinary satellite measurements.")
        else:
            system, epoch, offset = self.context[index]
            if system not in SYSTEMS:
                add(0, len(line), "Unrecognized navigation record", "raw text", "No supported satellite record could be identified.")
            else:
                if offset == 0:
                    add(0, 3, "Satellite · " + line[:3].replace(" ", "0"), "identifier", f"Broadcast navigation record for {SYSTEMS[system]}. {'Four-line state-vector' if system in 'RS' else 'Eight-line orbital-parameter'} record.", "sat")
                    scale = {"R": "UTC", "C": "BDT", "E": "Galileo system time"}.get(system, "GPS time")
                    for a, b, name in [(4, 8, "Year"), (9, 11, "Month"), (12, 14, "Day"), (15, 17, "Hour"), (18, 20, "Minute"), (21, 23, "Seconds")]:
                        add(a, b, "Clock epoch · " + name, scale, "Reference time for the broadcast satellite clock parameters (Toc).", "time")
                layout = nav_layout(system)
                first = 0 if offset == 0 else 3 + (offset - 1) * 4
                for j in range(3 if offset == 0 else 4):
                    field = first + j
                    start = (23 if offset == 0 else 4) + j * 19
                    if field < len(layout):
                        title, unit, description = layout[field]
                        extra = NAV_MATH_HINTS.get(title, "")
                        if extra:
                            description = description + "\n\n" + extra
                        if system not in "RS":
                            description += "\n\nOrbit-solution chain: a=(√A)² → n=n0+Δn → Mk → Ek → νk → φk → harmonic corrections → (x,y,z)_ECEF. The Orbit Dashboard shows the full worked solution and ECI/ECEF geometry."
                        else:
                            description += "\n\nState-vector chain: the navigation file supplies position, velocity and acceleration in ECEF. The dashboard propagates this state numerically and then derives azimuth, elevation, ground track and DOP."
                        add(start, start + 19, title, unit, description, "time" if field < 3 else "orbit")
        fields.sort(key=lambda f: f["start"])
        context = self.context.get(index)
        return dict(number=index + 1, raw=line, fields=fields, context=(f"{SYSTEMS.get(context[0], context[0])} · {context[1]}" if context else "Header · receiver and file metadata"))

    def view(self, section="header", record=0, start=0, query=""):
        record = max(0, min(record, len(self.records) - 1))
        if section == "header":
            indices = list(range(self.header_end))
        elif section == "record" and self.records:
            first = self.records[record]
            end = self.records[record + 1] if record + 1 < len(self.records) else len(self.lines)
            indices = list(range(first, end))
        else:
            indices = list(range(len(self.lines)))
        if query:
            indices = [i for i in indices if query.casefold() in self.lines[i].casefold()]
        total = len(indices)
        start = max(0, min(start, max(0, total - 1)))
        return dict(name=self.path.name, observation=self.obs, line_count=len(self.lines), record_count=len(self.records), satellite_count=len(self.satellites), systems=sorted({s[0] for s in self.satellites}), types=self.types, record=record, start=start, total=total, rows=[self.annotate(i) for i in indices[start:start + 60]])


def load_data(folder):
    result = {}
    for path in sorted(Path(folder).iterdir()):
        if not path.is_file():
            continue
        with path.open(encoding="ascii", errors="replace") as stream:
            first = stream.readline()
        if "RINEX VERSION / TYPE" in first:
            key = "obs" if "OBSERVATION" in first else "nav"
            result.setdefault(key, RinexFile(path))
    if set(result) != {"obs", "nav"}:
        raise ValueError("The data folder must contain an observation and a navigation RINEX 3.02 file.")
    return result


