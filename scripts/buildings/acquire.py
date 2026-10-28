"""Pinned official Overture extractor; raw files are never overwritten."""
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

RELEASE = '2026-10-21.0'
BBOX = '103.60,1.15,104.10,1.50'
RAW = Path(f'tmp/phase7c1/raw/overture-{RELEASE}.geojsonseq')
EXPECTED_SHA = 'f578855d9484ed6b35419dff24b4fb837a725cd2951056266d007c2b6b1ad88e'


def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def acquire():
    RAW.parent.mkdir(parents=True, exist_ok=True)
    if RAW.exists():
        if sha(RAW) != EXPECTED_SHA:
            raise ValueError('Raw extraction differs from reviewed bytes; preserve and review it, do not overwrite.')
        print('Pinned local extract already present; no network request.')
        return
    part = RAW.with_suffix('.geojsonseq.partial')
    if part.exists():
        raise ValueError('Incomplete prior download exists. Inspect it before a new acquisition.')
    command = [sys.executable, '-m', 'overturemaps', 'download', '--bbox=' + BBOX, '--release', RELEASE,
               '--type', 'building', '-f', 'geojsonseq', '-o', str(part), '--connect_timeout', '20', '--request_timeout', '60']
    subprocess.run(command, check=True, timeout=600)
    # Parser exhausts the stream before a completed filename/receipt is published.
    count = 0
    with part.open(encoding='utf8') as f:
        for line in f:
            item = json.loads(line)
            if item.get('type') != 'Feature' or not item.get('id'):
                raise ValueError('Invalid extracted feature')
            count += 1
    digest = sha(part)
    if digest != EXPECTED_SHA:
        raise ValueError('Extract bytes differ from reviewed snapshot (including possible row order). Partial file preserved for review.')
    part.rename(RAW)
    receipt = {'release': RELEASE, 'bbox': BBOX, 'featureType': 'building', 'count': count,
               'accessedDate': datetime.now(timezone.utc).date().isoformat(), 'sha256': digest,
               'source': f's3://overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type=building/',
               'extractor': 'overturemaps 1.0.2; STAC bbox filtering; anonymous public S3'}
    RAW.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf8')


if __name__ == '__main__': acquire()
