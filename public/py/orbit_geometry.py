"""Instantaneous two-body geometry for teaching, derived from an inertial state."""
from math import acos, atan2, sqrt, pi


def elements_from_state(r, v, mu=3.986004418e14):
    dot = lambda a, b: sum(x*y for x, y in zip(a, b))
    cross = lambda a, b: [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
    norm = lambda a: sqrt(dot(a, a))
    radius = norm(r)
    h = cross(r, v)
    hn = norm(h)
    if not radius or not hn:
        return None
    normal = [x/hn for x in h]
    ev = [x/mu-y/radius for x, y in zip(cross(v, h), r)]
    e = norm(ev)
    energy = dot(v, v)/2-mu/radius
    if energy >= 0 or e >= 1:
        return None
    a = -mu/(2*energy)
    n = [-h[1], h[0], 0]
    nn = norm(n)
    node = [x/nn for x in n] if nn > hn*1e-10 else [1, 0, 0]
    p = [x/e for x in ev] if e > 1e-10 else node
    q = cross(normal, p)
    angle = lambda u, w: atan2(dot(cross(u, w), normal), dot(u, w)) % (2*pi)
    return dict(a=a, e=e, i=acos(max(-1, min(1, normal[2]))),
                Omega=atan2(node[1], node[0]) % (2*pi), omega=angle(node, p),
                nu=angle(p, r), p=p, q=q, normal=normal, node=node,
                circular=e <= 1e-10, equatorial=nn <= hn*1e-10)
