"""Browser-only dispatcher for the original NCGSA GNSS computation engines.

This module runs in Pyodide (WebAssembly), not on Vercel or a remote server.
It uses the exact original local Python algorithms and bundled RINEX files.
"""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/lab')
sys.path.insert(0, str(ROOT))

_runtime = None


def _initialize():
    global _runtime
    if _runtime is None:
        from spp import SPPEngine
        cache_path = ROOT / 'precomputed.pkl.gz'
        if cache_path.exists():
            # Preparsed versions of the *same* source observations and NAV
            # records: computations still use the original algorithms.
            import gzip
            import pickle
            with gzip.open(cache_path, 'rb') as stream:
                files, orbit, signals = pickle.load(stream)
        else:
            from rinex_explorer import load_data
            from gnss_orbit import OrbitEngine
            from signal_engine import SignalEngine
            files = load_data(ROOT / 'data')
            orbit = OrbitEngine(files['obs'].path, files['nav'].path)
            signals = SignalEngine(files['obs'].path, files['nav'].path)
        spp = SPPEngine(orbit)
        _runtime = (files, orbit, signals, spp)
    return _runtime


def _result(payload, status=200):
    return json.dumps(
        {'status': status, 'data': payload},
        allow_nan=False,
        separators=(',', ':')
    )


def handle_request(method, route, query_text='{}', body_text='{}'):
    """Return a JSON envelope with the original API's payload and status."""
    try:
        query = json.loads(query_text or '{}')
        body = json.loads(body_text or '{}')
        files, orbit, signals, spp = _initialize()
        if method == 'GET' and route == '/api/view':
            target = files[query.get('file', 'obs')]
            data = target.view(
                query.get('section', 'header'),
                int(query.get('record', 0)),
                int(query.get('start', 0)),
                query.get('query', '')
            )
        elif method == 'GET' and route == '/api/orbit/meta':
            data = orbit.metadata()
        elif method == 'GET' and route == '/api/orbit':
            data = orbit.snapshot(
                int(query.get('epoch', 0)),
                float(query.get('mask', 10.0)),
                float(query.get('span', 6.0)),
                query.get('sat', '')
            )
        elif method == 'GET' and route == '/api/signals/meta':
            data = signals.metadata()
        elif method == 'GET' and route == '/api/signals/epoch':
            data = signals.epoch(int(query.get('index', 0)))
        elif method == 'GET' and route == '/api/signals/selection':
            data = signals.selection(
                int(query.get('epoch', 0)),
                query['sat'],
                query['signal']
            )
        elif method == 'GET' and route == '/api/signals/scene':
            data = signals.scene(int(query.get('epoch', 0)))
        elif method == 'GET' and route == '/api/spp/meta':
            data = spp.metadata()
        elif method == 'GET' and route == '/api/spp/coordinates':
            from gnss_orbit import ecef_to_geodetic
            xyz = [float(query[key]) for key in ('x', 'y', 'z')]
            if not all(math.isfinite(x) for x in xyz):
                raise ValueError('ECEF position must be finite')
            if not 1e3 < math.sqrt(sum(x*x for x in xyz)) < 1e9:
                raise ValueError('Invalid ECEF magnitude')
            lat, lon, h = ecef_to_geodetic(*xyz)
            data = {'lat_deg': math.degrees(lat), 'lon_deg': math.degrees(lon), 'height_m': h}
        elif method == 'GET' and route.startswith('/api/spp/'):
            mode = query.get('mode', 'gps')
            case = int(query.get('case', 0))
            mask = float(query.get('mask', 10))
            if route == '/api/spp/epoch':
                data = spp.solve(int(query.get('epoch', 0)), mode, case, mask)
            elif route == '/api/spp/contributions':
                data = spp.contributions(int(query.get('epoch', 0)), mode, case, mask)
            elif route == '/api/spp/series':
                data = spp.series(int(query.get('start', 0)), int(query.get('stop', 1)), mode, case, mask)
            else:
                return _result({'error': 'Unknown SPP endpoint'}, 404)
        elif method == 'GET' and route == '/api/sgp4/status':
            # The local server reports this as optional unless sgp4 is installed.
            data = {
                'available': False,
                'note': 'Optional TLE-based SGP4 propagation is not bundled with the browser engine.'
            }
        elif method == 'POST' and route == '/api/sgp4':
            return _result({
                'error': 'Optional TLE SGP4 propagation is not bundled in this build.',
                'note': 'All original RINEX broadcast orbit models remain available.'
            }, 503)
        else:
            return _result({'error': 'Unknown GNSS API endpoint'}, 404)
        return _result(data)
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        return _result({'error': str(exc)}, 400)
    except Exception as exc:
        return _result({'error': str(exc)}, 500)
