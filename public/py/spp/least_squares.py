"""SVD least squares; explicit normal matrices are retained for teaching."""
import numpy as np
from math import sin, cos, sqrt
from gnss_orbit import ecef_to_geodetic


def enu_rotation(receiver):
    lat, lon, _ = ecef_to_geodetic(*receiver)
    return np.array([[-sin(lon),cos(lon),0],[-sin(lat)*cos(lon),-sin(lat)*sin(lon),cos(lat)],
                     [cos(lat)*cos(lon),cos(lat)*sin(lon),sin(lat)]])


def linear_step(H, v):
    H, v = np.asarray(H), np.asarray(v)
    delta, _, rank, singular = np.linalg.lstsq(H, v, rcond=None)
    if rank != H.shape[1]:
        raise ValueError(f'Geometry matrix is rank deficient: rank {rank}, {H.shape[1]} unknowns')
    condition = float(singular[0]/singular[-1])
    if condition > 1e8:
        raise ValueError(f'Geometry is ill-conditioned (condition number {condition:.3g})')
    _, s, vt = np.linalg.svd(H, full_matrices=False)
    Q = (vt.T*(1/s**2))@vt
    return delta, Q, dict(H=H.tolist(), v=v.tolist(), normal=(H.T@H).tolist(),
                         inverse=Q.tolist(), Htv=(H.T@v).tolist(), delta=delta.tolist(),
                         rank=int(rank), condition=condition)


def dops(Q, receiver):
    R = enu_rotation(receiver)
    local = R@Q[:3,:3]@R.T
    return dict(PDOP=sqrt(float(np.trace(Q[:3,:3]))), HDOP=sqrt(float(local[0,0]+local[1,1])),
                VDOP=sqrt(float(local[2,2])), GDOP=sqrt(float(np.trace(Q))),
                TDOP=sqrt(float(np.trace(Q[3:,3:]))),
                clock_DOP=[sqrt(float(x)) for x in np.diag(Q)[3:]], Q=Q.tolist(), Qenu=local.tolist())
