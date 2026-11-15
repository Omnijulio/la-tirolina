"""Verify every file listed in the delivery snapshot without external packages."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'MANIFEST.json').read_text(encoding='utf-8'))
failures=[]
for entry in manifest['files']:
    file=ROOT/entry['path']
    if not file.is_file():
        failures.append(entry['path']+' (missing)')
        continue
    content=file.read_bytes()
    if len(content)!=entry['bytes'] or hashlib.sha256(content).hexdigest()!=entry['sha256']:
        failures.append(entry['path']+' (changed)')
if failures:
    raise SystemExit('Snapshot differs:\n'+'\n'.join(failures))
print('Snapshot integrity: PASS ('+str(len(manifest['files']))+' files)')
