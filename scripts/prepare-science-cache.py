"""Regenerate the portable science bundle after changing bundled OBS/NAV data.
Run from the repository root: python scripts/prepare-science-cache.py
Only trusted, bundled data is serialized. Receiver algorithms remain unchanged.
"""
import gzip
import hashlib
import io
import json
import pickle
import sys
from pathlib import Path, PurePath

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "public/py"))
from gnss_orbit import OrbitEngine
from signal_engine import SignalEngine

class PortablePickler(pickle.Pickler):
    def reducer_override(self, obj):
        if isinstance(obj, PurePath):
            return (Path, ("/lab/data/" + obj.name,))
        return NotImplemented

def main():
    source = ROOT / "public/data"
    obs = source / "COM14___9600_260914_111044.26O"
    nav = source / "COM14___9600_260914_111044.26P"
    signals = SignalEngine(obs, nav)
    orbit = OrbitEngine(obs, nav)
    # Identical source datasets are shared rather than serialized twice.
    orbit.obs, orbit.nav = signals.obs, signals.nav
    buffer = io.BytesIO()
    PortablePickler(buffer, protocol=4).dump((orbit, signals))
    output = ROOT / "public/py/science-cache.pkl.gz"
    output.write_bytes(gzip.compress(buffer.getvalue(), compresslevel=6, mtime=0))
    # Git uses LF on Vercel and may check out CRLF on Windows. The parsers
    # treat both identically, so source checksums use canonical LF newlines.
    metadata = {"sources": {"/data/" + p.name: hashlib.sha256(p.read_bytes().replace(b"\r\n", b"\n")).hexdigest() for p in (obs, nav)},
                "bundle_bytes": output.stat().st_size,
                "bundle_sha256": hashlib.sha256(output.read_bytes()).hexdigest()}
    output.with_name("science-cache.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print("Prepared portable shared science cache:", output.stat().st_size, "bytes")

if __name__ == "__main__":
    main()
