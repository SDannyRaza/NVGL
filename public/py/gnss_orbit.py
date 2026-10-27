"""GNSS orbit and geometry utilities for the Virtual GNSS Lab.

The primary propagators use the broadcast ephemerides contained in RINEX NAV:
- GPS/Galileo/QZSS/BeiDou: broadcast Keplerian ephemeris equations.
- GLONASS: numerical integration of the broadcast ECEF state vector with J2,
  Earth-rotation and broadcast luni-solar acceleration terms.
- SBAS: broadcast ECEF position/velocity/acceleration polynomial.

SGP4 is intentionally separate: it propagates TLE mean elements, not RINEX
broadcast ephemerides. The web app exposes SGP4 as an optional comparison tool.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from math import atan2, cos, degrees, floor, pi, radians, sin, sqrt
from pathlib import Path
from typing import Iterable
from orbit_geometry import elements_from_state

GPS_EPOCH = datetime(1980, 1, 6, tzinfo=timezone.utc)
BDT_EPOCH = datetime(2006, 1, 1, tzinfo=timezone.utc)
WEEK = 604800.0
WGS84_A = 6378137.0
WGS84_F = 1.0 / 298.257223563
WGS84_E2 = WGS84_F * (2.0 - WGS84_F)
OMEGA_E = 7.2921151467e-5

SYSTEM_NAMES = {"G": "GPS", "R": "GLONASS", "E": "Galileo", "J": "QZSS", "C": "BeiDou", "S": "SBAS"}
SYSTEM_COLORS = {"G": "#55a8ff", "R": "#ff7e7e", "E": "#48d6c7", "J": "#dc8bff", "C": "#ffc45b", "S": "#9b9fff"}


def rinex_float(text: str) -> float:
    text = text.strip().replace("D", "E").replace("d", "E")
    return float(text) if text else float("nan")


def norm_angle(x: float) -> float:
    return (x + pi) % (2.0 * pi) - pi


def wrap_week(dt: float) -> float:
    while dt > WEEK / 2:
        dt -= WEEK
    while dt < -WEEK / 2:
        dt += WEEK
    return dt


def gps_week_sow(dt_gps: datetime) -> tuple[int, float]:
    """GPS week/SOW from a datetime whose displayed fields are GPS system time."""
    # A naive system-time label is treated as if it were in the GPS epoch scale.
    delta = dt_gps.replace(tzinfo=timezone.utc) - GPS_EPOCH
    week = floor(delta.total_seconds() / WEEK)
    return int(week), delta.total_seconds() - week * WEEK


def bdt_week_sow_from_gps(dt_gps: datetime) -> tuple[int, float]:
    """BeiDou week/SOW corresponding to a GPS-system-time epoch.

    BDT = GPST - 14 s for the modern epochs represented by this teaching data.
    """
    dt_bdt = dt_gps.replace(tzinfo=timezone.utc) - timedelta(seconds=14)
    delta = dt_bdt - BDT_EPOCH
    week = floor(delta.total_seconds() / WEEK)
    return int(week), delta.total_seconds() - week * WEEK


def gps_to_utc(dt_gps: datetime, leap_seconds: int) -> datetime:
    return dt_gps.replace(tzinfo=timezone.utc) - timedelta(seconds=leap_seconds)


def datetime_from_fields(text: str) -> datetime:
    parts = text.split()
    if len(parts) < 6:
        raise ValueError(text)
    y, mo, d, h, mi = map(int, parts[:5])
    sec = float(parts[5])
    whole = int(sec)
    micro = int(round((sec - whole) * 1_000_000))
    if micro >= 1_000_000:
        whole += 1
        micro -= 1_000_000
    return datetime(y, mo, d, h, mi, whole, microsecond=micro, tzinfo=timezone.utc)


def gmst_angle(dt_utc: datetime) -> float:
    """IAU-style GMST angle adequate for visualization and ECEF/ECI teaching."""
    dt_utc = dt_utc.astimezone(timezone.utc)
    y, m = dt_utc.year, dt_utc.month
    D = dt_utc.day + (dt_utc.hour + (dt_utc.minute + (dt_utc.second + dt_utc.microsecond / 1e6) / 60.0) / 60.0) / 24.0
    if m <= 2:
        y -= 1
        m += 12
    A = floor(y / 100)
    B = 2 - A + floor(A / 4)
    jd = floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + D + B - 1524.5
    T = (jd - 2451545.0) / 36525.0
    deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T ** 3) / 38710000.0
    return radians(deg % 360.0)


def ecef_to_eci(xyz: tuple[float, float, float], dt_utc: datetime) -> tuple[float, float, float]:
    th = gmst_angle(dt_utc)
    c, s = cos(th), sin(th)
    x, y, z = xyz
    return c * x - s * y, s * x + c * y, z


def eci_to_ecef(xyz: tuple[float, float, float], dt_utc: datetime) -> tuple[float, float, float]:
    th = gmst_angle(dt_utc)
    c, s = cos(th), sin(th)
    x, y, z = xyz
    return c * x + s * y, -s * x + c * y, z


def ecef_to_geodetic(x: float, y: float, z: float) -> tuple[float, float, float]:
    lon = atan2(y, x)
    p = sqrt(x * x + y * y)
    lat = atan2(z, p * (1 - WGS84_E2))
    for _ in range(8):
        N = WGS84_A / sqrt(1 - WGS84_E2 * sin(lat) ** 2)
        h = p / max(cos(lat), 1e-15) - N
        new_lat = atan2(z, p * (1 - WGS84_E2 * N / (N + h)))
        if abs(new_lat - lat) < 1e-13:
            lat = new_lat
            break
        lat = new_lat
    N = WGS84_A / sqrt(1 - WGS84_E2 * sin(lat) ** 2)
    h = p / max(cos(lat), 1e-15) - N
    return lat, lon, h


def az_el(receiver: tuple[float, float, float], satellite: tuple[float, float, float]) -> tuple[float, float, float, tuple[float, float, float]]:
    lat, lon, _ = ecef_to_geodetic(*receiver)
    dx, dy, dz = (satellite[i] - receiver[i] for i in range(3))
    sl, cl, sb, cb = sin(lon), cos(lon), sin(lat), cos(lat)
    e = -sl * dx + cl * dy
    n = -sb * cl * dx - sb * sl * dy + cb * dz
    u = cb * cl * dx + cb * sl * dy + sb * dz
    rho = sqrt(e * e + n * n + u * u)
    az = atan2(e, n)
    if az < 0:
        az += 2 * pi
    el = atan2(u, sqrt(e * e + n * n))
    return degrees(az), degrees(el), rho, (e, n, u)


@dataclass
class ObsEpoch:
    dt_gps: datetime
    satellites: list[str]
    observations: dict = field(default_factory=dict)
    flag: int = 0


class ObservationDataset:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        lines = self.path.read_text(encoding="ascii", errors="replace").splitlines()
        self.receiver_ecef = (0.0, 0.0, 0.0)
        self.time_system = "GPS"
        self.types = {}
        current_system = None
        header_end = 0
        for i, line in enumerate(lines):
            if line.rstrip().endswith("SYS / # / OBS TYPES"):
                current_system = line[0] if line[0].strip() else current_system
                self.types.setdefault(current_system, []).extend(line[7:60].split())
            if line.rstrip().endswith("APPROX POSITION XYZ"):
                self.receiver_ecef = tuple(rinex_float(line[j:j+14]) for j in (0, 14, 28))
            elif line.rstrip().endswith("TIME OF FIRST OBS"):
                self.time_system = line[48:51].strip() or "GPS"
            elif "END OF HEADER" in line:
                header_end = i + 1
                break
        self.epochs: list[ObsEpoch] = []
        i = header_end
        while i < len(lines):
            line = lines[i]
            if not line.startswith(">"):
                i += 1
                continue
            parts = line[1:35].split()
            if len(parts) < 8:
                i += 1
                continue
            y, mo, d, h, mi = map(int, parts[:5]); sec = float(parts[5]); flag = int(parts[6]); nsat = int(parts[7])
            whole = int(sec); micro = int(round((sec - whole) * 1e6))
            if micro >= 1_000_000: whole += 1; micro -= 1_000_000
            dt = datetime(y, mo, d, h, mi, whole, microsecond=micro, tzinfo=timezone.utc)
            sats: list[str] = []
            observations = {}
            if flag in (0, 1):
                for row in lines[i+1:i+1+nsat]:
                    if len(row) >= 3 and row[0] in SYSTEM_NAMES and row[1:3].strip().isdigit():
                        sat = row[:3].replace(" ", "0")
                        sats.append(sat)
                        observations[sat] = {}
                        for j, code in enumerate(self.types.get(row[0], [])):
                            value = row[3+16*j:17+16*j].strip()
                            if value:
                                try:
                                    observations[sat][code] = rinex_float(value)
                                except ValueError:
                                    pass
            self.epochs.append(ObsEpoch(dt, sats, observations, flag))
            i += 1 + max(nsat, 0)
        if not self.epochs:
            raise ValueError("No ordinary observation epochs were found.")


@dataclass
class Ephemeris:
    sat: str
    system: str
    toc: datetime
    clock: tuple[float, float, float]
    values: list[float]
    leap_seconds: int = 18
    available_fields: frozenset[int] | None = None

    @property
    def toe(self) -> float:
        return self.values[8] if self.system not in "RS" else float("nan")

    @property
    def week(self) -> int:
        return int(round(self.values[18])) if self.system not in "RS" else -1


class NavigationDataset:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        lines = self.path.read_text(encoding="ascii", errors="replace").splitlines()
        self.leap_seconds = 18
        self.ionosphere = {}
        header_end = 0
        for i, line in enumerate(lines):
            if line.rstrip().endswith("IONOSPHERIC CORR"):
                fields = [line[5+12*j:17+12*j] for j in range(4)]
                if all(f.strip() for f in fields):
                    self.ionosphere[line[:4].strip()] = [rinex_float(f) for f in fields]
            if line.rstrip().endswith("LEAP SECONDS"):
                try: self.leap_seconds = int(line[:6])
                except ValueError: pass
            if "END OF HEADER" in line:
                header_end = i + 1; break
        self.by_sat: dict[str, list[Ephemeris]] = {}
        i = header_end
        while i < len(lines):
            line = lines[i]
            if len(line) < 3 or line[0] not in SYSTEM_NAMES or not line[1:3].strip().isdigit():
                i += 1; continue
            sys = line[0]; sat = line[:3].replace(" ", "0")
            try:
                y = int(line[4:8]); mo = int(line[9:11]); d = int(line[12:14]); h = int(line[15:17]); mi = int(line[18:20]); sec = int(float(line[21:23]))
                toc = datetime(y, mo, d, h, mi, sec, tzinfo=timezone.utc)
                clock = tuple(rinex_float(line[23 + 19*j:42 + 19*j]) for j in range(3))
            except Exception:
                i += 1; continue
            ncont = 3 if sys in "RS" else 7
            vals: list[float] = []
            raw_fields = [line[23+19*j:42+19*j] for j in range(3)]
            for cont in lines[i+1:i+1+ncont]:
                raw_fields.extend(cont[4+19*j:23+19*j] for j in range(4))
                vals.extend(rinex_float(cont[4+19*j:23+19*j]) for j in range(4))
            eph = Ephemeris(sat, sys, toc, clock, vals, self.leap_seconds,
                            frozenset(j for j,f in enumerate(raw_fields) if f.strip()))
            self.by_sat.setdefault(sat, []).append(eph)
            i += 1 + ncont
        for arr in self.by_sat.values(): arr.sort(key=lambda e: e.toc)

    def select(self, sat: str, dt_gps: datetime) -> Ephemeris | None:
        arr = self.by_sat.get(sat, [])
        if not arr: return None
        sys = sat[0]
        if sys == "R":
            target = gps_to_utc(dt_gps, self.leap_seconds)
            return min(arr, key=lambda e: abs((e.toc - target).total_seconds()))
        # Toc fields for G/E/J/C/S are represented in their system time. For
        # selection over this short dataset, closest civil labels are adequate.
        return min(arr, key=lambda e: abs((e.toc - dt_gps).total_seconds()))


def _system_week_sow(system: str, dt_gps: datetime) -> tuple[int, float]:
    return bdt_week_sow_from_gps(dt_gps) if system == "C" else gps_week_sow(dt_gps)


def propagate_kepler(eph: Ephemeris, dt_gps: datetime, details: bool = False):
    v = eph.values
    if len(v) < 24:
        raise ValueError("Incomplete Keplerian ephemeris")
    IODE, Crs, dn, M0 = v[0:4]
    Cuc, ecc, Cus, sqrtA = v[4:8]
    Toe, Cic, Omega0, Cis = v[8:12]
    i0, Crc, omega, OmegaDot = v[12:16]
    IDOT = v[16]
    week_brdc = int(round(v[18]))
    mu = 3.986005e14 if eph.system in "GJ" else 3.986004418e14
    omega_e = 7.2921151467e-5 if eph.system != "C" else 7.2921150e-5
    week, sow = _system_week_sow(eph.system, dt_gps)
    # Broadcast weeks in this data are continuous. Retain week offset so that a
    # Toe near a week boundary is handled correctly.
    tk = (week - week_brdc) * WEEK + sow - Toe
    tk = wrap_week(tk)
    A = sqrtA * sqrtA
    n0 = sqrt(mu / (A ** 3))
    n = n0 + dn
    M = M0 + n * tk
    E = M
    iterations = 0
    for iterations in range(1, 21):
        En = M + ecc * sin(E)
        if abs(En - E) < 1e-13:
            E = En; break
        E = En
    nu = atan2(sqrt(max(0.0, 1.0 - ecc * ecc)) * sin(E), cos(E) - ecc)
    phi = nu + omega
    du = Cus * sin(2 * phi) + Cuc * cos(2 * phi)
    dr = Crs * sin(2 * phi) + Crc * cos(2 * phi)
    di = Cis * sin(2 * phi) + Cic * cos(2 * phi)
    u = phi + du
    r = A * (1.0 - ecc * cos(E)) + dr
    inc = i0 + IDOT * tk + di
    xop = r * cos(u); yop = r * sin(u)
    Omega = Omega0 + (OmegaDot - omega_e) * tk - omega_e * Toe
    cO, sO, ci, si = cos(Omega), sin(Omega), cos(inc), sin(inc)
    x = xop * cO - yop * ci * sO
    y = xop * sO + yop * ci * cO
    z = yop * si

    # BeiDou GEO satellites require an additional 5-degree frame rotation.
    # PRNs C01-C05 are the classical BDS-2 GEO slots. Apply the ICD transform.
    prn = int(eph.sat[1:])
    if eph.system == "C" and 1 <= prn <= 5:
        inc5 = radians(-5.0)
        th = omega_e * (sow - Toe)
        ct, st, c5, s5 = cos(th), sin(th), cos(inc5), sin(inc5)
        xg, yg, zg = x, y, z
        x = xg * ct + yg * st * c5 + zg * st * s5
        y = -xg * st + yg * ct * c5 + zg * ct * s5
        z = -yg * s5 + zg * c5
    xyz = (x, y, z)
    if not details:
        return xyz
    return xyz, {
        "mu": mu, "omega_e": omega_e, "A": A, "sqrtA": sqrtA, "e": ecc, "dn": dn,
        "n0": n0, "n": n, "week": week, "broadcast_week": week_brdc, "sow": sow,
        "Toe": Toe, "tk": tk, "M0": M0, "M": M, "E": E, "iterations": iterations,
        "nu": nu, "omega": omega, "phi": phi, "du": du, "dr": dr, "di": di,
        "u": u, "r": r, "i0": i0, "IDOT": IDOT, "i": inc, "Omega0": Omega0,
        "OmegaDot": OmegaDot, "Omega": Omega, "Cuc": Cuc, "Cus": Cus, "Crc": Crc,
        "Crs": Crs, "Cic": Cic, "Cis": Cis, "xp": xop, "yp": yop,
        "x": x, "y": y, "z": z, "IODE": IODE,
    }


def _glo_accel(state: tuple[float, float, float, float, float, float], ext: tuple[float, float, float]):
    x, y, z, vx, vy, vz = state
    mu = 3.9860044e14; ae = 6378136.0; J2 = 1.08262575e-3; w = 7.292115e-5
    r2 = x*x + y*y + z*z; r = sqrt(r2); r3 = r2*r; r5 = r3*r2
    z2r2 = z*z/r2
    k = 1.5 * J2 * mu * ae*ae / r5
    ax = -mu*x/r3 + k*x*(5*z2r2 - 1) + w*w*x + 2*w*vy + ext[0]
    ay = -mu*y/r3 + k*y*(5*z2r2 - 1) + w*w*y - 2*w*vx + ext[1]
    az = -mu*z/r3 + k*z*(5*z2r2 - 3) + ext[2]
    return vx, vy, vz, ax, ay, az


def _rk4_step(state, h, ext):
    k1 = _glo_accel(state, ext)
    s2 = tuple(state[i] + 0.5*h*k1[i] for i in range(6)); k2 = _glo_accel(s2, ext)
    s3 = tuple(state[i] + 0.5*h*k2[i] for i in range(6)); k3 = _glo_accel(s3, ext)
    s4 = tuple(state[i] + h*k3[i] for i in range(6)); k4 = _glo_accel(s4, ext)
    return tuple(state[i] + h*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i])/6.0 for i in range(6))


def propagate_glonass(eph: Ephemeris, dt_gps: datetime):
    v = eph.values
    if len(v) < 12: raise ValueError("Incomplete GLONASS state vector")
    state = (v[0]*1000, v[4]*1000, v[8]*1000, v[1]*1000, v[5]*1000, v[9]*1000)
    ext = (v[2]*1000, v[6]*1000, v[10]*1000)
    dt = (gps_to_utc(dt_gps, eph.leap_seconds) - eph.toc).total_seconds()
    # Integrate in <=60 s steps, adequate for an educational dashboard and the
    # short GLONASS broadcast fit interval.
    remaining = dt
    while abs(remaining) > 1e-9:
        h = max(-60.0, min(60.0, remaining))
        state = _rk4_step(state, h, ext)
        remaining -= h
    return state[:3]


def propagate_sbas(eph: Ephemeris, dt_gps: datetime):
    v = eph.values
    if len(v) < 12: raise ValueError("Incomplete SBAS state vector")
    # SBAS RINEX state vectors are ECEF km, km/s, km/s^2.
    dt = (dt_gps - eph.toc).total_seconds()
    return tuple((v[k]*1000) + (v[k+1]*1000)*dt + 0.5*(v[k+2]*1000)*dt*dt for k in (0,4,8))


def propagate(eph: Ephemeris, dt_gps: datetime, details: bool = False):
    if eph.system == "R":
        xyz = propagate_glonass(eph, dt_gps)
        return (xyz, {}) if details else xyz
    if eph.system == "S":
        xyz = propagate_sbas(eph, dt_gps)
        return (xyz, {}) if details else xyz
    return propagate_kepler(eph, dt_gps, details)


def invert_matrix(a: list[list[float]]) -> list[list[float]] | None:
    n = len(a)
    aug = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-14: return None
        aug[col], aug[pivot] = aug[pivot], aug[col]
        p = aug[col][col]
        aug[col] = [x/p for x in aug[col]]
        for r in range(n):
            if r == col: continue
            f = aug[r][col]
            aug[r] = [aug[r][c] - f*aug[col][c] for c in range(2*n)]
    return [row[n:] for row in aug]




def orbital_period_seconds(eph: Ephemeris) -> float:
    """Return an approximate full-orbit period for visualization."""
    try:
        if eph.system not in "RS":
            sqrtA = eph.values[7]
            A = sqrtA * sqrtA
            mu = 3.986005e14 if eph.system in "GJ" else 3.986004418e14
            T = 2.0 * pi * sqrt(A ** 3 / mu)
            return float(max(3600.0, min(86400.0, T)))
        if eph.system == "R":
            x, y, z = (eph.values[0] * 1000.0, eph.values[4] * 1000.0, eph.values[8] * 1000.0)
            vx, vy, vz = (eph.values[1] * 1000.0, eph.values[5] * 1000.0, eph.values[9] * 1000.0)
            r = sqrt(x*x + y*y + z*z)
            v2 = vx*vx + vy*vy + vz*vz
            mu = 3.9860044e14
            inv_a = 2.0 / max(r, 1.0) - v2 / mu
            a = 1.0 / inv_a if inv_a > 1e-12 else 25510000.0
            T = 2.0 * pi * sqrt(a ** 3 / mu)
            return float(max(3600.0, min(86400.0, T)))
        # SBAS / GEO-like states: show one sidereal-day class revolution / track.
        return 86164.0
    except Exception:
        return 43200.0


def dop_details(receiver: tuple[float,float,float], satellites: Iterable[tuple[float,float,float]]):
    sats = list(satellites)
    if len(sats) < 4:
        return None
    H = []
    for s in sats:
        dx,dy,dz = s[0]-receiver[0],s[1]-receiver[1],s[2]-receiver[2]
        rho = sqrt(dx*dx+dy*dy+dz*dz)
        H.append([-dx/rho,-dy/rho,-dz/rho,1.0])
    N = [[sum(row[i]*row[j] for row in H) for j in range(4)] for i in range(4)]
    Q = invert_matrix(N)
    if Q is None:
        return None
    pdop = sqrt(max(0,Q[0][0]+Q[1][1]+Q[2][2])); tdop=sqrt(max(0,Q[3][3])); gdop=sqrt(pdop*pdop+tdop*tdop)
    lat,lon,_=ecef_to_geodetic(*receiver); sl,cl,sb,cb=sin(lon),cos(lon),sin(lat),cos(lat)
    R=[[-sl,cl,0],[-sb*cl,-sb*sl,cb],[cb*cl,cb*sl,sb]]
    Q3=[row[:3] for row in Q[:3]]
    T=[[sum(R[i][k]*Q3[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    Qenu=[[sum(T[i][k]*R[j][k] for k in range(3)) for j in range(3)] for i in range(3)]
    hdop=sqrt(max(0,Qenu[0][0]+Qenu[1][1])); vdop=sqrt(max(0,Qenu[2][2]))
    return {"GDOP":gdop,"PDOP":pdop,"HDOP":hdop,"VDOP":vdop,"TDOP":tdop,"count":len(sats),"H":H,"Q":Q,"Qenu":Qenu}

def dop_metrics(receiver: tuple[float,float,float], satellites: Iterable[tuple[float,float,float]]):
    detail = dop_details(receiver, satellites)
    if detail is None:
        return None
    return {k: detail[k] for k in ('GDOP','PDOP','HDOP','VDOP','TDOP','count')}


class OrbitEngine:
    def __init__(self, obs_path: str | Path, nav_path: str | Path):
        self.obs = ObservationDataset(obs_path)
        self.nav = NavigationDataset(nav_path)
        self.receiver = self.obs.receiver_ecef
        self.lat, self.lon, self.height = ecef_to_geodetic(*self.receiver)

    def metadata(self):
        return {
            "epoch_count": len(self.obs.epochs),
            "first_epoch": self.obs.epochs[0].dt_gps.isoformat(),
            "last_epoch": self.obs.epochs[-1].dt_gps.isoformat(),
            "receiver_ecef_m": self.receiver,
            "receiver_geodetic": {"lat_deg": degrees(self.lat), "lon_deg": degrees(self.lon), "height_m": self.height},
            "leap_seconds": self.nav.leap_seconds,
            "systems": sorted({s[0] for e in self.obs.epochs for s in e.satellites}),
            "system_names": SYSTEM_NAMES,
            "system_colors": SYSTEM_COLORS,
        }

    
    def snapshot(self, epoch_index: int = 0, mask_deg: float = 10.0, span_hours: float = 6.0, selected_sat: str = ""):
        epoch_index = max(0, min(epoch_index, len(self.obs.epochs)-1))
        ep = self.obs.epochs[epoch_index]
        utc = gps_to_utc(ep.dt_gps, self.nav.leap_seconds)
        rows=[]
        for sat in ep.satellites:
            eph=self.nav.select(sat, ep.dt_gps)
            if not eph:
                rows.append({"sat":sat,"system":sat[0],"name":SYSTEM_NAMES.get(sat[0],sat[0]),"status":"No matching NAV record"})
                continue
            try:
                xyz=propagate(eph, ep.dt_gps)
                az,el,rng,enu=az_el(self.receiver,xyz)
                eci=ecef_to_eci(xyz,utc)
                sub_lat, sub_lon, sub_h = ecef_to_geodetic(*xyz)
                rows.append({
                    "sat":sat,"system":sat[0],"name":SYSTEM_NAMES.get(sat[0],sat[0]),"status":"ok",
                    "ecef_m":xyz,"eci_m":eci,"az_deg":az,"el_deg":el,"range_m":rng,"visible":el>=mask_deg,
                    "nav_epoch":eph.toc.isoformat(),"toe_s":None if eph.system in 'RS' else eph.toe,
                    "enu_m":enu,"subsat_lat_deg":degrees(sub_lat),"subsat_lon_deg":degrees(sub_lon),"subsat_height_m":sub_h,
                    "orbit_period_s":orbital_period_seconds(eph),
                })
            except Exception as exc:
                rows.append({"sat":sat,"system":sat[0],"name":SYSTEM_NAMES.get(sat[0],sat[0]),"status":str(exc)})
        ok=[r for r in rows if r.get("status")=="ok"]
        visible=[r for r in ok if r["visible"]]
        dops=dop_metrics(self.receiver,[tuple(r["ecef_m"]) for r in visible])
        dop_detail=dop_details(self.receiver,[tuple(r["ecef_m"]) for r in visible])

        tracked = visible if visible else ok
        tracks=[]
        max_track_hours=float(span_hours)
        for r in tracked:
            sat=r["sat"]
            eph=self.nav.select(sat,ep.dt_gps)
            if not eph:
                continue
            period_s=max(orbital_period_seconds(eph), span_hours*3600.0)
            if eph.system == 'S':
                period_s=max(period_s, 86164.0)
            samples=max(181, int(period_s/240.0))
            samples=min(samples, 721)
            half=period_s/2.0
            pts_ecef=[]; pts_eci=[]; pts_ground=[]
            for j in range(samples):
                dt=ep.dt_gps+timedelta(seconds=-half + (2*half)*j/(samples-1))
                try:
                    p=propagate(eph,dt)
                    u=gps_to_utc(dt,self.nav.leap_seconds)
                    pts_ecef.append(p)
                    pts_eci.append(ecef_to_eci(p,u))
                    glat, glon, gh = ecef_to_geodetic(*p)
                    pts_ground.append((degrees(glon), degrees(glat), gh))
                except Exception:
                    pass
            max_track_hours=max(max_track_hours, period_s/3600.0)
            tracks.append({
                "sat":sat,"system":sat[0],"ecef_m":pts_ecef,"eci_m":pts_eci,
                "ground_lonlat_deg":pts_ground,"orbit_period_s":period_s,
            })

        if not selected_sat or selected_sat not in [r["sat"] for r in ok]:
            kepler=[r["sat"] for r in visible if r["system"] not in "RS"] or [r["sat"] for r in ok if r["system"] not in "RS"]
            selected_sat=kepler[0] if kepler else (ok[0]["sat"] if ok else "")
        math=None
        if selected_sat:
            eph=self.nav.select(selected_sat,ep.dt_gps)
            if eph and eph.system not in "RS":
                xyz,detail=propagate(eph,ep.dt_gps,True)
                az,el,rng,enu=az_el(self.receiver,xyz)
                eci=ecef_to_eci(xyz,utc)
                los = [c/rng for c in (xyz[0]-self.receiver[0], xyz[1]-self.receiver[1], xyz[2]-self.receiver[2])] if rng else [0.0,0.0,0.0]
                detail.update({
                    "sat":selected_sat,"system":eph.system,"name":SYSTEM_NAMES[eph.system],
                    "epoch_gps":ep.dt_gps.isoformat(),"epoch_utc":utc.isoformat(),
                    "az_deg":az,"el_deg":el,"range_m":rng,"enu_m":enu,
                    "receiver_lat_deg":degrees(self.lat),"receiver_lon_deg":degrees(self.lon),"receiver_height_m":self.height,
                    "ecef_xyz_m":xyz,"eci_xyz_m":eci,"gmst_rad":gmst_angle(utc),"los_unit":los,
                    "orbit_period_s":orbital_period_seconds(eph),"dop_detail":dop_detail,
                })
                math=detail
        geometry = None
        if selected_sat:
            selected = next((row for row in ok if row['sat'] == selected_sat), None)
            eph = self.nav.select(selected_sat, ep.dt_gps)
            if selected and eph:
                delta = timedelta(seconds=0.5)
                before = ecef_to_eci(propagate(eph, ep.dt_gps-delta), utc-delta)
                after = ecef_to_eci(propagate(eph, ep.dt_gps+delta), utc+delta)
                geometry = elements_from_state(selected['eci_m'], [b-a for a,b in zip(before,after)])
        return {
            "geometry":geometry,"gmst_rad":gmst_angle(utc),
            "epoch_index":epoch_index,"epoch_gps":ep.dt_gps.isoformat(),"epoch_utc":utc.isoformat(),
            "mask_deg":mask_deg,"span_hours":span_hours,"track_hours":max_track_hours,
            "tracked_count":len(ep.satellites),"propagated_count":len(ok),"visible_count":len(visible),
            "receiver":{"ecef_m":self.receiver,"lat_deg":degrees(self.lat),"lon_deg":degrees(self.lon),"height_m":self.height},
            "satellites":rows,"tracks":tracks,"dop":dops,"math":math,"selected_sat":selected_sat,
        }
