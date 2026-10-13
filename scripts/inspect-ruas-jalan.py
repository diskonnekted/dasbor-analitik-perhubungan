import json, sys, collections, statistics

GEOJSON = r"I:\perhubungan\public\pju_ruas.geojson"
CHORO   = r"I:\perhubungan\public\pju_choropleth.json"
REPORT  = r"I:\perhubungan\public\pju_choropleth.err"

with open(GEOJSON, 'r', encoding='utf-8') as f:
    g = json.load(f)

feats = g.get('features', [])
print('=== RINGKASAN RUAS ===')
print('Total features:', len(feats))

# Sampling 1 feature untuk schema
print('\n=== SAMPLE FEATURE (feature 0) ===')
print(json.dumps(feats[0], indent=2, ensure_ascii=False)[:1500])

# Properti ringkasan
keys = collections.Counter()
classes = collections.Counter()
nomor_count = 0
nama_count = 0
panjang = []
lebar = []
kondisi = collections.Counter()
kecamatan = collections.Counter()
geom_types = collections.Counter()
missing_panjang = 0
zero_len = 0

for f in feats:
    p = f.get('properties', {}) or {}
    for k in p.keys():
        keys[k] += 1
    if p.get('nomor_ruas'):
        nomor_count += 1
    if p.get('nama_ruas'):
        nama_count += 1
    if p.get('kelas_jalan'):
        classes[p['kelas_jalan']] += 1
    elif p.get('kelas'):
        classes[p['kelas']] += 1
    if p.get('kondisi'):
        kondisi[p['kondisi']] += 1
    if p.get('kecamatan'):
        kecamatan[p['kecamatan']] += 1
    if p.get('panjang_km') is not None:
        try:
            v = float(p['panjang_km'])
            panjang.append(v)
            if v == 0: zero_len += 1
        except (TypeError, ValueError):
            missing_panjang += 1
    else:
        missing_panjang += 1
    if p.get('lebar_m') is not None:
        try:
            lebar.append(float(p['lebar_m']))
        except (TypeError, ValueError):
            pass
    gtype = f.get('geometry', {}).get('type', '?')
    geom_types[gtype] += 1

print('\n=== PROPERTY KEYS (count) ===')
for k, c in keys.most_common(20):
    print(f'  {k}: {c}')

print('\n=== KELAS ===')
for k, c in classes.most_common():
    print(f'  {k}: {c}')

print('\n=== KONDISI ===')
for k, c in kondisi.most_common():
    print(f'  {k}: {c}')

print('\n=== KECAMATAN ===')
print('  unique:', len(kecamatan))

print('\n=== GEOMETRY TYPES ===')
for k, c in geom_types.most_common():
    print(f'  {k}: {c}')

print('\n=== PANJANG (km) ===')
if panjang:
    print(f'  n={len(panjang)}  total={sum(panjang):.2f}  min={min(panjang):.2f}  max={max(panjang):.2f}  avg={statistics.mean(panjang):.2f}')
    print(f'  zero/near-zero: {zero_len}')
    print(f'  missing: {missing_panjang}')
else:
    print('  TIDAK ADA data panjang_km')

if lebar:
    print(f'\n=== LEBAR (m) ===')
    print(f'  n={len(lebar)}  min={min(lebar):.1f}  max={max(lebar):.1f}  avg={statistics.mean(lebar):.1f}')

# Cek nomor_ruas null
print('\n=== NOMOR RUAS ===')
print(f'  punya nomor: {nomor_count}  tanpa nomor: {len(feats) - nomor_count}')
print(f'  punya nama: {nama_count}  tanpa nama: {len(feats) - nama_count}')

# Cek panjang geometri
print('\n=== GEOMETRY DETAIL (5 sample) ===')
for i, f in enumerate(feats[:5]):
    g = f.get('geometry', {})
    coords = g.get('coordinates', [])
    print(f'  #{i} type={g.get("type")}  coords={len(coords)}  pts={sum(len(c) if isinstance(c, list) and c and isinstance(c[0], list) else 1 for c in coords) if g.get("type")=="MultiLineString" else len(coords)}')

# CHORO
print('\n=== CHOROPLETH ===')
try:
    with open(CHORO, 'r', encoding='utf-8') as f:
        choro = json.load(f)
    print('  type:', type(choro).__name__)
    if isinstance(choro, dict):
        print('  keys:', len(choro))
        first_key = next(iter(choro))
        print(f'  sample [{first_key}]:')
        print('   ', json.dumps(choro[first_key], ensure_ascii=False))
        total = sum(d.get('jumlah_ruas', 0) for d in choro.values() if isinstance(d, dict))
        totkm = sum(d.get('total_panjang_km', 0) for d in choro.values() if isinstance(d, dict))
        print(f'  sum jumlah_ruas: {total}')
        print(f'  sum total_panjang_km: {totkm:.2f}')
except Exception as e:
    print('  ERR', e)

# ERR
print('\n=== .err ===')
try:
    with open(REPORT, 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()
    print(f'  {len(lines)} lines')
    for l in lines[:10]:
        print('   ', l)
except FileNotFoundError:
    print('  (tidak ada file err)')