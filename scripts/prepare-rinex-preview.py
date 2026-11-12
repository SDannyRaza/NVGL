"""Generate exact annotated header payloads: python scripts/prepare-rinex-preview.py."""
import hashlib
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'public/py'))
from rinex_explorer import load_data

files = load_data(root / 'public/data')
headers = {key: item.view('header') for key, item in files.items()}
for key, item in files.items():
    # Retain every header row, even if a future file exceeds one 60-line page.
    headers[key]['rows'] = [item.annotate(i) for i in range(item.header_end)]
sources = {'/data/' + item.path.name: hashlib.sha256(item.path.read_bytes().replace(b'\r\n', b'\n')).hexdigest() for item in files.values()}
payload = json.dumps({'schema': 1, 'headers': headers}, separators=(',', ':'), ensure_ascii=True) + '\n'
target = root / 'public/rinex-preview.json'
target.write_text(payload, encoding='utf-8', newline='\n')
metadata = {'sources': sources, 'preview_sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
(root / 'public/rinex-preview-meta.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print('Prepared exact RINEX header previews:', target.stat().st_size, 'bytes')
