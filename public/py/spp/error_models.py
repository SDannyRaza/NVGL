"""Broadcast clock, Klobuchar and standard-atmosphere Saastamoinen models.

References and limitations are documented in SPP_README.md.
All returned delays retain their physical sign; P_corrected=P+c*clock-I-T-bias.
"""
from datetime import timedelta
from math import sin, cos, sqrt, pi, exp, radians
from gnss_orbit import propagate, gps_week_sow, wrap_week

C = 299792458.0


def system_time(eph, gps):
    return gps - timedelta(seconds=14 if eph.system == 'C' else eph.leap_seconds if eph.system == 'R' else 0)


def clock(eph, gps, full=False):
    dt = (system_time(eph, gps)-eph.toc).total_seconds()
    a0, a1, a2 = eph.clock
    # RINEX stores -tau_n directly as the first GLONASS clock field.
    polynomial = a0+a1*dt if eph.system in 'RS' else a0+a1*wrap_week(dt)+a2*wrap_week(dt)**2
    relativity = 0.0
    inputs = None
    if full and eph.system not in 'RS':
        _, d = propagate(eph, gps, True)
        relativity = -2*sqrt(d['mu'])*d['e']*d['sqrtA']*sin(d['E'])/C**2
        inputs = {k:d[k] for k in ('mu','e','sqrtA','E')}
    return dict(af0=a0, af1=a1, af2=a2 if eph.system not in 'RS' else None,
                dt_s=dt, polynomial_s=polynomial, relativity_s=relativity,
                seconds=polynomial+relativity, metres=C*(polynomial+relativity),relativity_inputs=inputs)


def frequency(eph, code):
    if eph.system == 'R':
        return (1602+eph.values[7]*.5625)*1e6
    if eph.system == 'C':
        return 1561.098e6  # Dataset's RINEX 3.02 C1I denotes B1I.
    return 1575.42e6


def code_bias(eph):
    def field(index):
        if eph.available_fields is not None and index+3 not in eph.available_fields:
            raise ValueError('Broadcast signal group delay is missing; full correction unavailable')
        return eph.values[index]
    if eph.system in 'GJC':
        return C*field(22)
    if eph.system == 'E':
        # E1: F/NAV clock uses E5a/E1; I/NAV E5b/E1.
        source = int(eph.values[17])
        if source & 256:
            return C*field(22)
        if source & 512:
            return C*field(23)
        raise ValueError('Galileo clock reference signal is not declared in NAV data-source bits')
    return 0.0  # No broadcast single-frequency group-delay field for R/S.


def klobuchar(coeff, gps, lat, lon, az_deg, el_deg, freq):
    if not coeff or len(coeff) != 8:
        raise ValueError('GPSA/GPSB coefficients are missing; ionosphere case unavailable')
    alpha, beta = coeff[:4], coeff[4:]
    el, az = el_deg/180, radians(az_deg)
    psi = .0137/(el+.11)-.022
    phi = max(-.416, min(.416, lat/pi+psi*cos(az)))
    lam = lon/pi+psi*sin(az)/cos(phi*pi)
    geomag = phi+.064*cos((lam-1.617)*pi)
    local = (43200*lam+gps_week_sow(gps)[1]) % 86400
    amplitude = max(0, sum(alpha[i]*geomag**i for i in range(4)))
    period = max(72000, sum(beta[i]*geomag**i for i in range(4)))
    phase = 2*pi*(local-50400)/period
    mapping = 1+16*(.53-el)**3
    seconds = mapping*(5e-9+(amplitude*(1-phase**2/2+phase**4/24) if abs(phase)<1.57 else 0))*(1575.42e6/freq)**2
    return dict(alpha=alpha, beta=beta, psi=psi, phi=phi, lam=lam, geomag=geomag,
                local_time_s=local, amplitude_s=amplitude, period_s=period,
                phase_rad=phase, mapping=mapping, frequency_hz=freq, seconds=seconds, metres=C*seconds)


def saastamoinen(lat, height, elevation):
    if not -100 <= height <= 10000 or elevation <= 0:
        raise ValueError('Standard atmosphere requires height −100…10000 m and positive elevation')
    # Pressure, temperature and relative humidity are model assumptions, not observations.
    h = max(0, height)
    pressure = 1013.25*(1-2.2557e-5*h)**5.2568
    temperature = 288.15-.0065*h
    humidity = .5
    vapor = 6.108*humidity*exp((17.15*temperature-4684)/(temperature-38.45))
    dry = .0022768*pressure/(1-.00266*cos(2*lat)-.00028*h/1000)
    wet = .002277*(1255/temperature+.05)*vapor
    # Supplied Chapter 7, printed p.318: Black–Eisner obliquity factor.
    # This improves the horizon behaviour of the earlier cosecant mapping.
    mapping = 1.001/sqrt(.002001+sin(radians(elevation))**2)
    return dict(height_m=height, pressure_hpa=pressure, temperature_k=temperature,
                relative_humidity=humidity, zenith_dry_m=dry, zenith_wet_m=wet,
                zenith_m=dry+wet, mapping=mapping, metres=(dry+wet)*mapping,
                mapping_model='Black–Eisner (Chapter 7, printed p.318)',
                zenith_model='Saastamoinen, standard atmosphere')
