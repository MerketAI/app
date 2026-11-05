"""Checks every id in CONCEPT_ICONS actually resolves on the Iconify API."""
import io
import re
import json
import urllib.request
import urllib.error

src = io.open(
    'src/modules/assets/icon-catalogue.ts', encoding='utf-8'
).read()

block = src[src.index('export const CONCEPT_ICONS'):src.index('export const INDUSTRY_CONCEPTS')]
pairs = re.findall(r"^\s*([a-z_0-9]+):\s*'([^']+)'", block, re.M)
print('concepts found:', len(pairs))

# Iconify lets us ask about many icons at once, per prefix.
by_prefix = {}
for concept, icon in pairs:
    prefix, name = icon.split(':', 1)
    by_prefix.setdefault(prefix, []).append((concept, name))

bad = []
for prefix, entries in sorted(by_prefix.items()):
    names = sorted({n for _, n in entries})
    url = 'https://api.iconify.design/%s.json?icons=%s' % (prefix, ','.join(names))
    req = urllib.request.Request(url, headers={'User-Agent': 'jasper-asset-verify/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except Exception as e:  # noqa: BLE001
        # A failed request must not read as a pass.
        print('  %-14s REQUEST FAILED %s' % (prefix, e))
        bad.extend((c, '%s:%s (unverified)' % (prefix, n)) for c, n in entries)
        continue

    returned = set(data.get('icons', {}).keys()) | set(data.get('aliases', {}).keys())
    missing = [n for n in names if n not in returned]
    print('  %-14s %2d requested, %2d resolved' % (prefix, len(names), len(returned)))
    for concept, name in entries:
        if name in missing:
            bad.append((concept, '%s:%s' % (prefix, name)))

print()
if bad:
    print('BROKEN (%d):' % len(bad))
    for concept, icon in bad:
        print('  %-18s %s' % (concept, icon))
else:
    print('All icon ids resolve.')
