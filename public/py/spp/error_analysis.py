"""Dataset-derived diagnostics for the supplied Chapter 7 error discussion.

Residual-based covariance is conditional on a correct equal-weight model, not
an independent measurement of UERE or a certified position confidence bound.
"""
import numpy as np
from .least_squares import enu_rotation


def analyze_errors(rows, state, Q, observations):
    H = np.array([r['H'] for r in rows])
    residual = np.array([r['residual_m'] for r in rows])
    K = Q @ H.T
    dof = len(rows) - H.shape[1]
    variance = float(residual @ residual / dof) if dof > 0 else None
    result = dict(degrees_of_freedom=dof, K=K.tolist(),
                  fitted_range_sigma_m=variance**.5 if variance is not None else None,
                  covariance_enu_m2=None, ellipse_1sigma_m=None,
                  reference='Supplied Chapter 7, §§7.2–7.3; printed pp. 301–333')
    if variance is not None:
        R = enu_rotation(state[:3])
        covariance = R @ Q[:3,:3] @ R.T * variance
        eigenvalues, eigenvectors = np.linalg.eigh(covariance[:2,:2])
        result.update(covariance_enu_m2=covariance.tolist(),
                      position_sigma_enu_m=np.sqrt(np.maximum(0,np.diag(covariance))).tolist(),
                      ellipse_1sigma_m=dict(axes=np.sqrt(np.maximum(0,eigenvalues)).tolist(),
                                           vectors=eigenvectors.tolist()),
                      conditional_drms_m=float(np.sqrt(np.trace(covariance[:2,:2]))))
    per_sat=[]
    for row in rows:
        raw_xyz=np.array(row['transmit_ecef_m'])
        raw_range=float(np.linalg.norm(raw_xyz-state[:3]))
        # GPS dual-code diagnostic only: no inference of unsupported signals.
        obs=observations.get(row['sat'],{})
        second=next((c for c in ('C2X','C2W','C2P','C2C') if 1e6<obs.get(c,0)<1e8),None)
        dual=None
        if row['system']=='G' and second:
            f1,f2=1575.42e6,1227.60e6
            p1,p2=row['pseudorange_m'],obs[second]
            gamma=(f1/f2)**2
            dual=dict(code1=row['code'],code2=second,P1_m=p1,P2_m=p2,f1_hz=f1,f2_hz=f2,
                      gamma=gamma,apparent_L1_iono_m=(p2-p1)/(gamma-1),
                      ionosphere_free_code_m=(gamma*p1-p2)/(gamma-1),
                      applied=False, note='Code-difference diagnostic: includes differential hardware bias, multipath and noise. Not applied to this single-frequency solution.')
        per_sat.append(dict(sat=row['sat'],earth_rotation_range_m=row['range_m']-raw_range,
                            geometric_flight_s=row['range_m']/299792458.,
                            polynomial_clock_m=row['clock']['polynomial_s']*299792458.,
                            relativity_m=row['clock']['relativity_s']*299792458.,
                            dual_frequency=dual))
    result['satellites']=per_sat
    result['unavailable']={
        'ephemeris_error':'Unavailable: no independent precise orbit or true satellite state.',
        'multipath':'Not directly separable from this dataset.',
        'receiver_noise':'Not directly separable from this dataset.',
        'residual_hardware_bias':'Unavailable: broadcast TGD/BGD is applied where supported; other code biases are not calibrated.',
        'independent_UERE':'Unavailable: fitted residual variance is not independent UERE.'}
    return result
