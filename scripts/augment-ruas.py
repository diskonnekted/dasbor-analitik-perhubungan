"""Augmentasi pju_ruas.geojson dengan derived field:
   - kelas_jalan (dari nomor_ruas)
   - kecamatan (point-in-polygon dari peta_kecamatan.geojson)
   - panjang_geo_km (haversine dari polyline OSRM)
   - kondisi (Rusak Berat/Sedang/Ringan/Baik, default Baik, ditimpa dari data laporan jika ada)
"""
import json
import os
import sys
import math
import re
from collections import defaultdict, Counter

PUB = r"I:\perhubungan\public"
RUAS = os.path.join(PUB, "pju_ruas.geojson")
KEC  = os.path.join(PUB, "peta_kecamatan.geojson")
OUT  = os.path.join(PUB, "pju_ruas.geojson")
LAPORAN = os.path.join(PUB, "pju_choropleth.json")  # placeholder, tidak dipakai
LAPORAN_FALLBACK = os.path.join(r"I:\perhubungan\src\data\laporan-fallback.js")

def derive_kelas(nomor):
    if not nomor: return None
    m = re.match(r'^([IVX]+)', str(nomor), re.IGNORECASE)
    return m.group(1).upper() if m else None

def haversine_km(lon1, lat1, lon2, lat2):
    R = 6371.0
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon/2)**2)
    return 2 * R * math.asin(math.sqrt(a))

def line_length_km(coords):
    total = 0.0
    for i in range(1, len(coords)):
        lon1, lat1 = coords[i-1]
        lon2, lat2 = coords[i]
        total += haversine_km(lon1, lat1, lon2, lat2)
    return total

# Load kecamatan
print('Loading kecamatan...')
with open(KEC, 'r', encoding='utf-8') as f:
    kec = json.load(f)
print(f'  {len(kec["features"])} kecamatan')

# Pre-compute bbox polygon for each kecamatan
kec_polys = []
for f in kec['features']:
    p = f['properties']
    name = p.get('Kecamatan') or p.get('NAME') or p.get('name') or '?'
    gtype = f['geometry']['type']
    coords = f['geometry']['coordinates']
    # Normalize to list of rings (each ring: list of [lon,lat])
    if gtype == 'Polygon':
        rings = coords
    elif gtype == 'MultiPolygon':
        rings = [r for poly in coords for r in poly]
    else:
        continue
    kec_polys.append({'name': name, 'rings': rings})

def point_in_ring(lon, lat, ring):
    """Ray casting"""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside

def point_in_polys(lon, lat, polys):
    for p in polys:
        # Outer ring only
        if point_in_ring(lon, lat, p['rings'][0]):
            return p['name']
    return None

# Load ruas
print('Loading ruas...')
with open(RUAS, 'r', encoding='utf-8') as f:
    ruas = json.load(f)
print(f'  {len(ruas["features"])} ruas')

# Augment
kelas_count = Counter()
kec_count = Counter()
unmatched_kec = 0
geolen_total = 0.0
geolen_n = 0
geom_pts_total = 0

# Pre-load laporan fallback (jika ada) untuk kondisi
laporan_by_ruas = defaultdict(list)
try:
    # File laporan-fallback.js adalah module JS, kita parse teksnya
    with open(LAPORAN_FALLBACK, 'r', encoding='utf-8') as f:
        txt = f.read()
    # Cari id_ruas dan tingkat
    import re as _re
    pairs = _re.findall(r'id_ruas["\']?\s*:\s*(\d+).*?tingkat["\']?\s*:\s*["\'](\w+)["\']', txt, _re.DOTALL)
    for ir, tg in pairs:
        try:
            laporan_by_ruas[int(ir)].append(tg.lower())
        except ValueError:
            pass
    print(f'  Loaded {sum(len(v) for v in laporan_by_ruas.values())} laporan sample')
except Exception as e:
    print('  Laporan sample skipped:', e)

def derive_kondisi(tingkat_list):
    if not tingkat_list: return 'Baik'
    if 'berat' in tingkat_list: return 'Rusak Berat'
    if 'sedang' in tingkat_list: return 'Rusak Sedang'
    if 'ringan' in tingkat_list: return 'Rusak Ringan'
    return 'Baik'

for i, feat in enumerate(ruas['features']):
    p = feat['properties']
    coords = feat['geometry']['coordinates']
    geom_pts_total += len(coords)

    # kelas
    kls = derive_kelas(p.get('nomor_ruas'))
    if kls: p['kelas_jalan'] = kls
    kelas_count[kls or 'Lain'] += 1

    # panjang dari geometri (lebih akurat dari PU kalau polyline OSRM)
    glen = line_length_km(coords)
    p['panjang_geo_km'] = round(glen, 3)
    geolen_total += glen
    geolen_n += 1

    # kecamatan (point-in-polygon dari titik tengah)
    mid = coords[len(coords)//2]
    kn = point_in_polys(mid[0], mid[1], kec_polys)
    if kn:
        p['kecamatan'] = kn
        kec_count[kn] += 1
    else:
        p['kecamatan'] = None
        unmatched_kec += 1

    # kondisi (dari laporan sample, jika ada)
    rid = p.get('id')
    if rid in laporan_by_ruas:
        p['kondisi'] = derive_kondisi(laporan_by_ruas[rid])
    else:
        p['kondisi'] = 'Baik'

    if (i+1) % 50 == 0:
        print(f'  processed {i+1}/{len(ruas["features"])}')

# Summary
print('\n=== HASIL ===')
print('Total ruas:', len(ruas['features']))
print('Kelas:')
for k, c in kelas_count.most_common():
    print(f'  {k}: {c}')
print(f'Kecamatan matched: {sum(kec_count.values())}/{len(ruas["features"])} ({unmatched_kec} unmatched)')
print('Top 5 kecamatan:')
for k, c in kec_count.most_common(5):
    print(f'  {k}: {c}')
print(f'Total panjang_geo: {geolen_total:.2f} km (avg {geolen_total/geolen_n:.2f})')
print(f'Total polyline pts: {geom_pts_total}')

# Save
print('\nSaving augmented geojson...')
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(ruas, f, ensure_ascii=False)
print(f'  Saved: {OUT}')
print(f'  Size: {os.path.getsize(OUT):,} bytes')