"""Epoch solutions using the existing loaded OBS/NAV and constellation propagators."""
from datetime import timedelta
from math import sin, cos, degrees, isfinite
from functools import lru_cache
import numpy as np
from gnss_orbit import propagate, az_el, ecef_to_geodetic, OMEGA_E, SYSTEM_NAMES
from .error_models import C, system_time, clock, code_bias, klobuchar, saastamoinen, frequency
from .least_squares import linear_step, enu_rotation, dops
from .error_analysis import analyze_errors

CASE_NAMES = ['Geometric / simplified SPP', '+ Satellite clock', '+ Ionosphere', '+ Troposphere',
              'Fully corrected broadcast SPP (implemented models)']
CORRECTION_KEYS = ('clock', 'ionosphere', 'troposphere', 'relativity', 'bias', 'rotation')
PRESET_BITS = (32, 33, 35, 39, 63)


def correction_flags(case):
    """Legacy cases 0..4; custom model identifiers 100..163 encode six switches."""
    if not isinstance(case, int) or not (0 <= case < 5 or 100 <= case <= 163):
        raise ValueError('Invalid correction model')
    bits = PRESET_BITS[case] if case < 5 else case - 100
    return {key: bool(bits & (1 << i)) for i, key in enumerate(CORRECTION_KEYS)}


SIGNALS = {'G':['C1C','C1W','C1P'], 'J':['C1C'], 'E':['C1X','C1C','C1B'],
           'C':['C1I','C2I'], 'R':['C1C','C1P'], 'S':['C1C']}


class SPPEngine:
    def __init__(self, orbit):
        self.orbit = orbit
        self.obs, self.nav = orbit.obs, orbit.nav
        self.reference = np.array(orbit.receiver)

    def metadata(self):
        return dict(**self.orbit.metadata(), cases=CASE_NAMES, obs_file=self.obs.path.name,
                    nav_file=self.nav.path.name, epochs=[e.dt_gps.isoformat().replace('+00:00','') for e in self.obs.epochs],
                    reference_label='RINEX APPROX POSITION XYZ — approximate reference, not surveyed truth',
                    ionosphere=self.nav.ionosphere, time_system=self.obs.time_system)

    @lru_cache(maxsize=128)
    def candidates(self, index, mode, mask):
        epoch = self.obs.epochs[index]
        rows, rejected = [], []
        for sat, measurements in epoch.observations.items():
            if mode == 'gps' and sat[0] != 'G':
                continue
            try:
                code = next((c for c in SIGNALS.get(sat[0],[]) if isfinite(measurements.get(c,0)) and 1e6<measurements.get(c,0)<1e8),None)
                if code is None:
                    raise ValueError('No supported, finite first-frequency pseudorange')
                p = measurements[code]
                tx0 = epoch.dt_gps-timedelta(seconds=p/C)
                # Select by the correct system time; reject old or unhealthy records.
                arr = self.nav.by_sat.get(sat, [])
                if not arr:
                    raise ValueError('No matching NAV ephemeris')
                eph = min(arr,key=lambda e:abs((system_time(e,tx0)-e.toc).total_seconds()))
                required = ([0,1]+[3+i for i in (0,1,2,3,4,5,6,8,9,10)]) if sat[0] in 'RS' else list(range(3))+[3+i for i in list(range(17))+[18,21]]
                if eph.available_fields is not None and not set(required)<=eph.available_fields:
                    raise ValueError('Required broadcast orbit, clock or health fields are missing')
                raw_values = [*eph.clock,*eph.values]
                if any(not isfinite(raw_values[j]) for j in required):
                    raise ValueError('Required broadcast fields are non-finite')
                if sat[0] not in 'RS' and not (eph.values[7]>0 and 0<=eph.values[5]<1):
                    raise ValueError('Invalid broadcast semimajor axis or eccentricity')
                if sat[0]=='R' and eph.available_fields is not None and 10 not in eph.available_fields:
                    raise ValueError('GLONASS frequency channel is unavailable')
                age = abs((system_time(eph,tx0)-eph.toc).total_seconds())
                limit = {'R':1800,'S':360,'E':14400,'C':3600}.get(sat[0],7200)
                if age>limit:
                    raise ValueError(f'Stale NAV ephemeris: {age:.0f} s exceeds {limit} s')
                health = eph.values[3] if sat[0] in 'RS' else eph.values[21]
                if not isfinite(health) or health != 0:
                    raise ValueError(f'NAV health flag {health}; conservatively excluded')
                if sat[0]=='C' and (int(sat[1:])<=5 or int(sat[1:])>=59):
                    raise ValueError('BeiDou GEO excluded: existing GEO propagator not validated for positioning')
                tx = tx0
                for _ in range(3):
                    tx = tx0-timedelta(seconds=clock(eph,tx,True)['seconds'])
                xyz = np.array(propagate(eph,tx))
                if not np.all(np.isfinite(xyz)):
                    raise ValueError('Satellite ECEF is not finite')
                az,el,_,_ = az_el(self.reference,xyz)
                if el<mask:
                    raise ValueError(f'Elevation {el:.2f}° below {mask:g}° mask')
                rows.append(dict(sat=sat,system=sat[0],code=code,pseudorange_m=p,
                                 phase_cycles=measurements.get('L'+code[1:]),cn0_dbhz=measurements.get('S'+code[1:]),
                                 eph=eph,xyz=xyz,tx=tx,clock=clock(eph,tx),full_clock=clock(eph,tx,True)))
            except (ValueError,IndexError,ArithmeticError) as exc:
                rejected.append(dict(sat=sat,reason=str(exc)))
        return rows,rejected

    def evaluate(self, candidates, state, systems, case):
        flags = correction_flags(case)
        lat,lon,height = ecef_to_geodetic(*state[:3])
        rows,H,v = [],[],[]
        for row in candidates:
            eph = row['eph']
            prefix = 'QZS' if eph.system == 'J' and all(k in self.nav.ionosphere for k in ('QZSA','QZSB')) else 'GPS'
            coeff = self.nav.ionosphere.get(prefix+'A',[])+self.nav.ionosphere.get(prefix+'B',[])
            # Travel time uses geometric distance, not receiver-clock-biased pseudorange.
            xyz = row['xyz']
            tau = float(np.linalg.norm(xyz-state[:3]))/C
            for _ in range(2):
                th = OMEGA_E*tau if flags['rotation'] else 0.0
                x,y,z = row['xyz']
                xyz = np.array([cos(th)*x+sin(th)*y,-sin(th)*x+cos(th)*y,z])
                tau = float(np.linalg.norm(xyz-state[:3]))/C
            az,el,rho,enu = az_el(state[:3],xyz)
            if el<=0 or not isfinite(rho):
                raise ValueError(f'{row["sat"]}: invalid/below-horizon geometry at current iterate')
            clk = dict(row['full_clock'] if flags['relativity'] else row['clock'])
            clk['seconds'] = (clk['polynomial_s'] if flags['clock'] else 0.) + clk['relativity_s']
            clk['metres'] = clk['seconds'] * C
            ion = klobuchar(coeff,row['tx'],lat,lon,az,el,frequency(eph,row['code'])) if flags['ionosphere'] else None
            if ion is not None:
                ion['source'] = prefix+' broadcast Klobuchar'+(' (cross-constellation approximation)' if eph.system not in 'GJ' else '')
            trop = saastamoinen(lat,height,el) if flags['troposphere'] else None
            bias = code_bias(eph) if flags['bias'] else 0.0
            clock_m = clk['metres']
            ion_m,trop_m = ion['metres'] if ion else 0.,trop['metres'] if trop else 0.
            corrected = row['pseudorange_m']+clock_m-ion_m-trop_m-bias
            b = state[3+systems.index(row['system'])]
            h = ((state[:3]-xyz)/rho).tolist()+[float(s==row['system']) for s in systems]
            residual = corrected-rho-b
            H.append(h); v.append(residual)
            rows.append(dict(sat=row['sat'],system=row['system'],code=row['code'],pseudorange_m=row['pseudorange_m'],
                             phase_cycles=row['phase_cycles'],cn0_dbhz=row['cn0_dbhz'],ecef_m=xyz.tolist(),
                             transmit_ecef_m=row['xyz'].tolist(),transmit_gps=row['tx'].isoformat(),
                             nav_epoch=eph.toc.isoformat().replace('+00:00',''),
                             nav_time_system={'R':'UTC','C':'BDT','E':'GST'}.get(eph.system,'GPS'),
                             toe_s=eph.toe if eph.system not in 'RS' else None,
                             az_deg=az,el_deg=el,enu_m=enu,range_m=rho,clock=clk,clock_m=clock_m,
                             ionosphere=ion,troposphere=trop,iono_m=ion_m,tropo_m=trop_m,bias_m=bias,
                             corrected_m=corrected,misclosure_m=residual,residual_m=residual,H=h))
        return rows,H,v

    @lru_cache(maxsize=96)
    def solve(self,index=0,mode='gps',case=0,mask=10.):
        flags = correction_flags(case)
        if mode not in ('gps','multi') or not 0<=index<len(self.obs.epochs) or not isfinite(mask) or not 5<=mask<=45:
            raise ValueError('Invalid epoch, mode, case or elevation mask (5…45°)')
        result = dict(epoch_index=index,epoch_gps=self.obs.epochs[index].dt_gps.isoformat().replace('+00:00',''),mode=mode,case=case,case_name=CASE_NAMES[case] if case < 5 else 'Custom correction selection', corrections=flags)
        try:
            if self.obs.time_system!='GPS':
                raise ValueError('This solver currently requires OBS timestamps declared in GPS time')
            if self.obs.epochs[index].flag not in (0,1):
                raise ValueError('RINEX event epoch is not an ordinary observation epoch')
            if not np.all(np.isfinite(self.reference)) or not 6e6<np.linalg.norm(self.reference)<7e6:
                raise ValueError('A valid terrestrial APPROX POSITION XYZ is required for initialization')
            candidates,rejected = self.candidates(index,mode,mask)
            systems = sorted({r['system'] for r in candidates},key=lambda s:'GRECJS'.index(s))
            n = 3+len(systems)
            result.update(rejected=rejected,systems=systems,unknowns=['X','Y','Z']+['c·dt'+SYSTEM_NAMES[s] for s in systems])
            if len(candidates)<n or not systems:
                raise ValueError(f'SPP cannot be solved: {len(candidates)} valid pseudoranges for {n} unknowns ({len(systems)} clock states)')
            state = np.r_[self.reference,np.zeros(len(systems))]
            initial = state.copy(); iterations=[]
            for k in range(15):
                rows,H,v = self.evaluate(candidates,state,systems,case)
                delta,Q,work = linear_step(H,v)
                updated = state+delta
                work.update(iteration=k,state=state.tolist(),updated=updated.tolist(),rows=rows,
                            rms_m=float(np.sqrt(np.mean(np.array(v)**2))),correction_m=float(np.linalg.norm(delta[:3])))
                iterations.append(work); state=updated
                if np.max(np.abs(delta))<1e-4:
                    break
            else:
                raise ValueError('Least squares did not converge within 15 iterations')
            rows,H,v = self.evaluate(candidates,state,systems,case)
            _,Q,_ = linear_step(H,v)
            if any(r['el_deg']<mask for r in rows):
                raise ValueError('A satellite crossed the elevation mask during solution; choose a different mask')
            lat,lon,height = ecef_to_geodetic(*state[:3])
            enu = enu_rotation(self.reference)@(state[:3]-self.reference)
            analysis = analyze_errors(rows,state,Q,self.obs.epochs[index].observations)
            result.update(ok=True,initial=initial.tolist(),ecef_m=state[:3].tolist(),
                          geodetic=dict(lat_deg=degrees(lat),lon_deg=degrees(lon),height_m=height),
                          clocks={s:dict(metres=float(state[3+i]),seconds=float(state[3+i]/C)) for i,s in enumerate(systems)},
                          satellites=rows,count=len(rows),iterations=iterations,dop=dops(Q,state[:3]),
                          residual_rms_m=float(np.sqrt(np.mean(np.array(v)**2))),enu_error_m=enu.tolist(),
                          horizontal_error_m=float(np.linalg.norm(enu[:2])),error_3d_m=float(np.linalg.norm(enu)),converged=True,
                          error_analysis=analysis)
        except (ValueError,ArithmeticError,np.linalg.LinAlgError) as exc:
            result.update(ok=False,error=str(exc))
        return result

    def contributions(self,index=0,mode='gps',case=0,mask=10.):
        """Term magnitudes at the current solution, including disabled terms."""
        current = self.solve(index,mode,case,mask)
        if not current['ok']:
            return dict(ok=False,error=current['error'],terms={})
        candidates,_ = self.candidates(index,mode,mask)
        systems = current['systems']
        state = np.array(current['ecef_m']+[current['clocks'][s]['metres'] for s in systems])
        terms = {}
        for i,key in enumerate(CORRECTION_KEYS):
            try:
                # Isolate terms at one fixed state; rotation is part of the common frame.
                rows,_,_ = self.evaluate(candidates,state,systems,100+(32 | (1<<i)))
                if key == 'rotation':
                    values = [r['range_m']-float(np.linalg.norm(np.array(r['transmit_ecef_m'])-state[:3])) for r in rows]
                else:
                    field = {'clock':'clock_m','relativity':'clock_m','ionosphere':'iono_m','troposphere':'tropo_m','bias':'bias_m'}[key]
                    values = [r[field] for r in rows]
                terms[key] = dict(rms_m=float(np.sqrt(np.mean(np.square(values)))),
                                  satellites=[dict(sat=r['sat'],metres=v) for r,v in zip(rows,values)])
            except (ValueError,ArithmeticError) as exc:
                terms[key] = dict(rms_m=None,error=str(exc))
        return dict(ok=True,terms=terms)

    def series(self,start,stop,mode,case,mask):
        if not 0<=start<stop<=len(self.obs.epochs) or stop-start>100:
            raise ValueError('Request 1…100 epochs per batch within dataset bounds')
        results=[]
        for i in range(start,stop):
            r = self.solve(i,mode,case,mask)
            results.append({k:v for k,v in r.items() if k not in ('iterations','satellites','error_analysis')})
        return dict(results=results)
