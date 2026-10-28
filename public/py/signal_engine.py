"""RINEX-driven metadata and decoded broadcast parameters for GNSS Signal Simulation.

This module deliberately separates what is present in RINEX from what must be
reconstructed from a signal ICD. RINEX OBS supplies tracked satellite IDs,
observation codes and measurements. RINEX NAV supplies decoded broadcast
parameters, not the original transmitted message bitstream.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from math import isfinite
from pathlib import Path
from typing import Any

from gnss_orbit import ObservationDataset, NavigationDataset, SYSTEM_NAMES, SYSTEM_COLORS

C_LIGHT = 299792458.0

# Only physical signals represented by the loaded RINEX OBS header are exposed
# by the dashboard. Measurement letters C/L/D/S are grouped under one signal.
SIGNALS: dict[str, list[dict[str, Any]]] = {
    "G": [
        dict(id="G-1C", rinex="1C", name="L1 C/A", band="L1", fc_mhz=1575.42,
             code="C/A Gold code", code_rate=1.023e6, code_length=1023, period_ms=1.0,
             components=["C/A data"], default_component="C/A data", nav="LNAV", nav_rate="50 bit/s",
             modulation="BPSK(1)", access="CDMA", prn_mode="gps-ca",
             icd="IS-GPS-200N", icd_section="§3.2.1.3, §3.3.2.3, Table 3-Ia"),
        dict(id="G-2X", rinex="2X", name="L2C (CM + CL)", band="L2", fc_mhz=1227.60,
             code="L2 CM / L2 CL", code_rate=0.5115e6, code_length=10230, period_ms=20.0,
             components=["CM data", "CL pilot", "CM/CL TDM"], default_component="CM data", nav="CNAV", nav_rate="25 bit/s → 50 symbol/s",
             modulation="BPSK with CM/CL time division", access="CDMA", prn_mode="gps-l2c",
             icd="IS-GPS-200N", icd_section="§3.2.1.4, §3.3.2.4, Table 3-IIa"),
    ],
    "R": [
        dict(id="R-1C", rinex="1C", name="L1OF standard accuracy", band="G1", fc_mhz=None,
             code="511-chip standard ranging code", code_rate=0.511e6, code_length=511, period_ms=1.0,
             components=["Standard code + data"], default_component="Standard code + data", nav="GLONASS navigation message", nav_rate="50 bit/s",
             modulation="BPSK", access="FDMA", prn_mode="glo-ca",
             icd="GLONASS ICD Edition 5.1", icd_section="§3.2.1, §3.3.2.1"),
        dict(id="R-2C", rinex="2C", name="L2OF standard accuracy", band="G2", fc_mhz=None,
             code="511-chip standard ranging code", code_rate=0.511e6, code_length=511, period_ms=1.0,
             components=["Standard code + data"], default_component="Standard code + data", nav="GLONASS navigation message", nav_rate="50 bit/s",
             modulation="BPSK", access="FDMA", prn_mode="glo-ca",
             icd="GLONASS ICD Edition 5.1", icd_section="§3.2.1, §3.3.2.1"),
    ],
    "E": [
        dict(id="E-1X", rinex="1X", name="E1 B+C", band="E1", fc_mhz=1575.42,
             code="E1-B / E1-C memory primary codes", code_rate=1.023e6, code_length=4092, period_ms=4.0,
             components=["E1-B data", "E1-C pilot", "B+C composite"], default_component="E1-B data", nav="I/NAV", nav_rate="125 bit/s → 250 symbol/s",
             modulation="CBOC(6,1,1/11)", access="CDMA", prn_mode="gal-e1",
             icd="Galileo OS SIS ICD v2.2", icd_section="§3.2.1, §3.4, Annex C (C7/C8)"),
        dict(id="E-7X", rinex="7X", name="E5b I+Q", band="E5b", fc_mhz=1207.14,
             code="E5b-I / E5b-Q primary codes", code_rate=10.23e6, code_length=10230, period_ms=1.0,
             components=["E5b-I data", "E5b-Q pilot", "I+Q composite"], default_component="E5b-I data", nav="I/NAV", nav_rate="125 bit/s → 250 symbol/s",
             modulation="E5 AltBOC(15,10) composite context", access="CDMA", prn_mode="gal-e5b",
             icd="Galileo OS SIS ICD v2.2", icd_section="§3.2.2, §3.4.1, Annex C (C5/C6)"),
    ],
    "J": [
        dict(id="J-1C", rinex="1C", name="L1 C/A", band="L1", fc_mhz=1575.42,
             code="QZSS C/A code", code_rate=1.023e6, code_length=1023, period_ms=1.0,
             components=["C/A data"], default_component="C/A data", nav="LNAV", nav_rate="50 bit/s",
             modulation="BPSK(1)", access="CDMA", prn_mode="qzss-ca",
             icd="IS-QZSS-PNT-006", icd_section="§3.2.2, Table 3.2.2-1"),
        dict(id="J-2X", rinex="2X", name="L2C (CM + CL)", band="L2", fc_mhz=1227.60,
             code="QZSS L2 CM / CL", code_rate=0.5115e6, code_length=10230, period_ms=20.0,
             components=["CM data", "CL pilot", "CM/CL TDM"], default_component="CM data", nav="CNAV", nav_rate="25 bit/s → 50 symbol/s",
             modulation="BPSK with CM/CL time division", access="CDMA", prn_mode="qzss-l2c",
             icd="IS-QZSS-PNT-006", icd_section="§3.2.4, Table 3.2.4-1"),
    ],
    "S": [
        dict(id="S-1C", rinex="1C", name="L1 C/A augmentation", band="L1", fc_mhz=1575.42,
             code="SBAS C/A assignment", code_rate=1.023e6, code_length=1023, period_ms=1.0,
             components=["C/A + SBAS data"], default_component="C/A + SBAS data", nav="SBAS message", nav_rate="250 information bit/s",
             modulation="BPSK(1)", access="CDMA", prn_mode="sbas-ca",
             icd="IS-GPS-200N code assignment + SBAS SIS", icd_section="IS-GPS-200N §6.3.6.1, Table 6-I"),
    ],
    "C": [
        dict(id="C-1I", rinex="1I", name="B1I", band="B1", fc_mhz=1561.098,
             code="B1I truncated Gold code", code_rate=2.046e6, code_length=2046, period_ms=1.0,
             components=["B1I data"], default_component="B1I data", nav="D1 / D2", nav_rate="50 bit/s D1; 500 bit/s D2",
             modulation="BPSK(2) on I component (B1 QPSK composite)", access="CDMA", prn_mode="bds-b1i",
             icd="BDS SIS ICD Open Service Signal v2.1", icd_section="§4.3, Figure 4-1, Table 4-2"),
        dict(id="C-7I", rinex="7I", name="B2I", band="B2", fc_mhz=1207.14,
             code="B2I truncated Gold code", code_rate=2.046e6, code_length=2046, period_ms=1.0,
             components=["B2I data"], default_component="B2I data", nav="D1 / D2", nav_rate="50 bit/s D1; 500 bit/s D2",
             modulation="BPSK(2) on I component (B2 QPSK composite)", access="CDMA", prn_mode="bds-b2i",
             icd="BDS SIS ICD Open Service Signal v2.1", icd_section="§4.3, Figure 4-1, Table 4-2"),
    ],
}

KEPLER_NAMES = [
    ("IODE / issue", "identifier"), ("Crs", "m"), ("Δn", "rad/s"), ("M0", "rad"),
    ("Cuc", "rad"), ("e", "dimensionless"), ("Cus", "rad"), ("√A", "√m"),
    ("Toe", "s of week"), ("Cic", "rad"), ("Ω0", "rad"), ("Cis", "rad"),
    ("i0", "rad"), ("Crc", "m"), ("ω", "rad"), ("Ω̇", "rad/s"),
    ("IDOT", "rad/s"), ("Codes/data source", "code"), ("Broadcast week", "week"), ("L2/data flag", "flag"),
    ("SV accuracy / SISA", "m"), ("SV health", "bit field"), ("Group delay 1", "s"), ("Group delay 2 / IODC", "s or id"),
    ("Transmission time", "s of week"), ("Fit / IODC", "flag/id"), ("Spare", ""), ("Spare", ""),
]


def _safe(v: float | None):
    if v is None: return None
    try:
        return v if isfinite(v) else None
    except TypeError:
        return None


class SignalEngine:
    def __init__(self, obs_path: str | Path, nav_path: str | Path):
        self.obs = ObservationDataset(obs_path)
        self.nav = NavigationDataset(nav_path)
        self.obs_path = Path(obs_path)
        self.nav_path = Path(nav_path)
        self.gps_utc_correction = None
        with self.nav_path.open(encoding="ascii", errors="replace") as nav_source:
            for line in nav_source:
                if "END OF HEADER" in line:
                    break
                if line.startswith("GPUT") and "TIME SYSTEM CORR" in line:
                    try:
                        self.gps_utc_correction = {
                            "a0": float(line[5:22]), "a1": float(line[22:38]),
                            "tot": int(line[38:45]), "week": int(line[45:50]),
                        }
                    except (ValueError, IndexError):
                        self.gps_utc_correction = None
        self.sats_by_system: dict[str, set[str]] = defaultdict(set)
        for ep in self.obs.epochs:
            for sat in ep.satellites:
                self.sats_by_system[sat[0]].add(sat)
        self.nav_counts = {sat: len(arr) for sat, arr in self.nav.by_sat.items()}

    def _signals_for_system(self, system: str):
        obs_types = set(self.obs.types.get(system, []))
        result = []
        for sig in SIGNALS.get(system, []):
            suffix = sig["rinex"]
            codes = [x for x in (f"C{suffix}", f"L{suffix}", f"D{suffix}", f"S{suffix}") if x in obs_types]
            if codes:
                d = dict(sig)
                d["observation_codes"] = codes
                d["wavelength_m"] = (C_LIGHT / (d["fc_mhz"] * 1e6)) if d.get("fc_mhz") else None
                result.append(d)
        return result

    def metadata(self):
        systems = []
        for system in sorted(self.sats_by_system):
            sigs = self._signals_for_system(system)
            if not sigs:
                continue
            sats = sorted(self.sats_by_system[system])
            systems.append({
                "id": system,
                "name": SYSTEM_NAMES.get(system, system),
                "color": SYSTEM_COLORS.get(system, "#63e6ff"),
                "observation_types": self.obs.types.get(system, []),
                "signals": sigs,
                "satellites": sats,
                "nav_satellites": [s for s in sats if s in self.nav.by_sat],
                "nav_record_counts": {s: self.nav_counts.get(s, 0) for s in sats},
            })
        return {
            "dataset": {
                "observation_file": self.obs_path.name,
                "navigation_file": self.nav_path.name,
                "epoch_count": len(self.obs.epochs),
                "epoch_times": [ep.dt_gps.isoformat() for ep in self.obs.epochs],
                "first_epoch": self.obs.epochs[0].dt_gps.isoformat(),
                "last_epoch": self.obs.epochs[-1].dt_gps.isoformat(),
                "time_system": self.obs.time_system,
                "leap_seconds": self.nav.leap_seconds,
            },
            "systems": systems,
            "system_names": SYSTEM_NAMES,
            "system_colors": SYSTEM_COLORS,
        }

    def epoch(self, index: int):
        index = max(0, min(index, len(self.obs.epochs) - 1))
        ep = self.obs.epochs[index]
        grouped: dict[str, list[str]] = defaultdict(list)
        for sat in ep.satellites:
            grouped[sat[0]].append(sat)
        return {
            "index": index,
            "epoch": ep.dt_gps.isoformat(),
            "flag": ep.flag,
            "satellite_count": len(ep.satellites),
            "systems": {k: sorted(v) for k, v in grouped.items()},
        }

    def scene(self, index: int):
        """All observed satellite/signal channels at one RINEX epoch.

        Satellites are taken exclusively from that observation epoch. Each
        channel gets its own code/pseudorange/phase/Doppler/CN0 and nearest
        broadcast NAV record; only the browser decides which RF group can be
        mixed coherently through a modeled common front end.
        """
        index = max(0, min(index, len(self.obs.epochs) - 1))
        ep = self.obs.epochs[index]
        channels = []
        for sat in sorted(ep.satellites):
            available = ep.observations.get(sat, {})
            for signal in self._signals_for_system(sat[0]):
                suffix = signal["rinex"]
                if not any(available.get(f"{prefix}{suffix}") is not None
                           for prefix in "CLDS"):
                    continue
                channels.append(self.selection(index, sat, signal["id"]))
        return {
            "index": index,
            "epoch": ep.dt_gps.isoformat(),
            "satellite_count": len(ep.satellites),
            "channel_count": len(channels),
            "channels": channels,
            "note": "Only satellites observed in the chosen RINEX epoch are included."
        }

    def _nav_fields(self, eph) -> list[dict[str, Any]]:
        fields = [
            {"name":"af0 / clock bias", "value":_safe(eph.clock[0]), "unit":"s"},
            {"name":"af1 / clock drift", "value":_safe(eph.clock[1]), "unit":"s/s"},
            {"name":"af2 / clock drift rate", "value":_safe(eph.clock[2]), "unit":"s/s²"},
        ]
        if eph.system in "RS":
            names = [
                ("X position","km"),("X velocity","km/s"),("X acceleration","km/s²"),("SV health","flag"),
                ("Y position","km"),("Y velocity","km/s"),("Y acceleration","km/s²"),("Frequency channel" if eph.system=="R" else "URA","integer" if eph.system=="R" else "m"),
                ("Z position","km"),("Z velocity","km/s"),("Z acceleration","km/s²"),("Age / IODN","days/id"),
            ]
            for i,(name,unit) in enumerate(names):
                if i < len(eph.values):
                    fields.append({"name":name,"value":_safe(eph.values[i]),"unit":unit})
            return fields
        names = list(KEPLER_NAMES)
        if eph.system == "E":
            names[0] = ("IODnav","identifier"); names[17] = ("Data sources","bit field"); names[20] = ("SISA","m"); names[22]=( "BGD E5a/E1","s"); names[23]=( "BGD E5b/E1","s")
        elif eph.system == "C":
            names[0] = ("AODE / ephemeris age","indicator"); names[22]=( "TGD1 B1/B3","s"); names[23]=( "TGD2 B2/B3","s")
        elif eph.system == "J":
            names[17] = ("Codes on L2","code")
        for i,v in enumerate(eph.values):
            if i >= len(names): break
            name,unit = names[i]
            if name == "Spare": continue
            fields.append({"name":name,"value":_safe(v),"unit":unit})
        return fields

    def selection(self, epoch_index: int, sat: str, signal_id: str):
        epoch_index = max(0, min(epoch_index, len(self.obs.epochs) - 1))
        ep = self.obs.epochs[epoch_index]
        if sat not in ep.observations:
            raise ValueError(f"{sat} is not observed at epoch {epoch_index}")
        system = sat[0]
        sig = next((x for x in self._signals_for_system(system) if x["id"] == signal_id), None)
        if not sig:
            raise ValueError(f"Signal {signal_id} is not represented for {sat[0]} in the RINEX header")
        suffix = sig["rinex"]
        obs = ep.observations.get(sat, {})
        measurements = {}
        for pfx,label,unit in [("C","Pseudorange","m"),("L","Carrier phase","cycles"),("D","Doppler","Hz"),("S","C/N₀","dB-Hz")]:
            code = f"{pfx}{suffix}"
            measurements[label] = {"code": code, "value": _safe(obs.get(code)), "unit": unit}
        eph = self.nav.select(sat, ep.dt_gps)
        nav = None
        carrier_mhz = sig.get("fc_mhz")
        glonass_k = None
        if eph is not None:
            fields = self._nav_fields(eph)
            if system == "R" and len(eph.values) > 7 and isfinite(eph.values[7]):
                glonass_k = int(round(eph.values[7]))
                if sig["band"] == "G1": carrier_mhz = 1602.0 + glonass_k * 0.5625
                elif sig["band"] == "G2": carrier_mhz = 1246.0 + glonass_k * 0.4375
            nav = {
                "record_epoch": eph.toc.isoformat(),
                "record_count": self.nav_counts.get(sat, 0),
                "fields": fields,
                "raw_bits_available": False,
                "note": "RINEX NAV stores decoded broadcast parameters. It does not preserve the original transmitted binary navigation-message bitstream.",
            }
            if system == "G":
                nav["gps_iono_utc"] = {
                    "alpha": self.nav.ionosphere.get("GPSA"),
                    "beta": self.nav.ionosphere.get("GPSB"),
                    "utc": getattr(self, "gps_utc_correction", None),
                    "leap_seconds": self.nav.leap_seconds,
                }
        prn_number = int(sat[1:])
        if system == "J": prn_number += 192
        elif system == "S": prn_number += 100
        nav_family = sig["nav"]
        nav_rate = sig["nav_rate"]
        if system == "C":
            nav_family = "D2" if prn_number <= 5 else "D1"
            nav_rate = "500 bit/s" if prn_number <= 5 else "50 bit/s"
        result_sig = dict(sig)
        result_sig["carrier_mhz"] = carrier_mhz
        result_sig["wavelength_m"] = (C_LIGHT/(carrier_mhz*1e6)) if carrier_mhz else None
        result_sig["nav_family_selected"] = nav_family
        result_sig["nav_rate_selected"] = nav_rate
        if glonass_k is not None: result_sig["fdma_channel"] = glonass_k
        return {
            "epoch_index": epoch_index,
            "epoch": ep.dt_gps.isoformat(),
            "satellite": sat,
            "system": system,
            "prn_number": prn_number,
            "signal": result_sig,
            "measurements": measurements,
            "navigation": nav,
        }
