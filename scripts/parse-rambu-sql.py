"""Parse public/rambu.sql menjadi JSON siap-pakai untuk frontend:
- public/perlengkapan_jenis.json (master jenis)
- public/perlengkapan_jalan.geojson (titik dengan referensi id_jenis + id_ruasjalan)
- public/ruas_jalan_db.json (master ruas DB onlinkid)
"""
import json
import os
import re
from collections import Counter

PUB = r"I:\perhubungan\public"
SQL = os.path.join(PUB, "rambu.sql")

with open(SQL, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Util: ekstrak VALUES dari sebuah INSERT statement ---
VALUES_RE = re.compile(r"INSERT INTO `(?P<t>[^`]+)`\s*\((?P<cols>[^)]+)\)\s*VALUES\s*(?P<vals>.*?);\s*\n", re.DOTALL)

def parse_inserts(text, table):
    """Return list of row dicts untuk table tertentu."""
    rows = []
    # pola spesifik
    pattern = re.compile(
        rf"INSERT INTO `{re.escape(table)}`\s*\(([^)]+)\)\s*VALUES\s*(.*?);\s*\n",
        re.DOTALL
    )
    for m in pattern.finditer(text):
        cols_raw = m.group(1)
        vals_raw = m.group(2)
        cols = [c.strip().strip('`') for c in cols_raw.split(',')]
        # Pecah row tuples (dipisah ),( dengan koma di dalam string dll)
        rows_block = split_tuples(vals_raw)
        for tup in rows_block:
            row = parse_tuple(tup)
            if len(row) == len(cols):
                rows.append(dict(zip(cols, row)))
            else:
                # fallback: kalau jumlah tidak sama, skip & log
                pass
    return rows

def split_tuples(block):
    """Pisah string 'VALUES' jadi list of tuples. Menghormati quoted strings & escapes."""
    out = []
    buf = []
    depth = 0
    in_str = False
    str_char = None
    i = 0
    while i < len(block):
        ch = block[i]
        if in_str:
            buf.append(ch)
            if ch == '\\' and i + 1 < len(block):
                buf.append(block[i+1]); i += 2; continue
            if ch == str_char:
                in_str = False
            i += 1
            continue
        if ch in ("'", '"'):
            in_str = True; str_char = ch; buf.append(ch); i += 1; continue
        if ch == '(':
            if depth == 0:
                buf = []
            else:
                buf.append(ch)
            depth += 1
            i += 1; continue
        if ch == ')':
            depth -= 1
            if depth == 0:
                out.append(''.join(buf).strip())
            else:
                buf.append(ch)
            i += 1; continue
        buf.append(ch)
        i += 1
    return [o for o in out if o]

def parse_tuple(tup):
    """Parse satu tuple '(a,b,'c d',NULL,1.5)' jadi list."""
    out = []
    buf = []
    in_str = False
    str_char = None
    i = 0
    while i < len(tup):
        ch = tup[i]
        if in_str:
            buf.append(ch)
            if ch == '\\' and i + 1 < len(tup):
                buf.append(tup[i+1]); i += 2; continue
            if ch == str_char:
                in_str = False
            i += 1; continue
        if ch in ("'", '"'):
            in_str = True; str_char = ch; buf.append(ch); i += 1; continue
        if ch == ',':
            out.append(decode_token(''.join(buf)))
            buf = []
            i += 1; continue
        buf.append(ch)
        i += 1
    if buf:
        out.append(decode_token(''.join(buf)))
    return out

def decode_token(tok):
    s = tok.strip()
    if s.upper() == 'NULL':
        return None
    if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
        return s[1:-1].replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
    try:
        if '.' in s:
            return float(s)
        return int(s)
    except ValueError:
        return s

# Parse tabel target
print('Parsing jenis_perlengkapan...')
jenis = parse_inserts(src, 'jenis_perlengkapan')
print(f'  {len(jenis)} rows')

print('Parsing perlengkapan_jalan...')
perkap = parse_inserts(src, 'perlengkapan_jalan')
print(f'  {len(perkap)} rows')

print('Parsing ruas_jalan...')
ruas_db = parse_inserts(src, 'ruas_jalan')
print(f'  {len(ruas_db)} rows')

print('Parsing gambar_rambu...')
gambar_rambu = parse_inserts(src, 'gambar_rambu')
# Map id_gambar -> gambar_rambu (ikon asli rambu)
rambu_icon_map = {r['id_gambar']: r.get('gambar_rambu') for r in gambar_rambu if r.get('id_gambar') is not None}
print(f'  {len(gambar_rambu)} rows, {len(rambu_icon_map)} resolvable icons')

# Statistik
print('\n=== SAMPLE JENIS ===')
for r in jenis[:5]:
    print(' ', r)

print('\n=== SAMPLE PERKAP (5 baris) ===')
for r in perkap[:5]:
    print(' ', r)

# Hitung distribusi id_jenis
jenis_count = Counter()
kondisi_count = Counter()
ruas_unik = set()
koordinat_valid = 0
koordinat_invalid = 0
for r in perkap:
    if 'id_jenis' in r: jenis_count[r['id_jenis']] += 1
    if 'kondisi' in r: kondisi_count[r['kondisi']] += 1
    if 'id_ruasjalan' in r and r['id_ruasjalan'] is not None: ruas_unik.add(r['id_ruasjalan'])
    lat = r.get('coordinate_lat'); lng = r.get('coordinate_lng')
    try:
        if lat is not None and lng is not None and float(lat) != 0 and float(lng) != 0:
            koordinat_valid += 1
        else:
            koordinat_invalid += 1
    except (TypeError, ValueError):
        koordinat_invalid += 1

print('\n=== DISTRIBUSI id_jenis ===')
for k, c in sorted(jenis_count.items(), key=lambda x: -x[1]):
    nama = next((j.get('nama') for j in jenis if j.get('id') == k), '?')
    print(f'  {k}: {c}  ({nama})')

print('\n=== DISTRIBUSI kondisi ===')
for k, c in kondisi_count.most_common():
    print(f'  {k}: {c}')

print(f'\n=== KOORDINAT ===')
print(f'  valid: {koordinat_valid}')
print(f'  invalid (0,0 atau null): {koordinat_invalid}')
print(f'  ruas unik: {len(ruas_unik)}')

# Bangun GeoJSON untuk perkap
features = []
for r in perkap:
    lat = r.get('coordinate_lat')
    lng = r.get('coordinate_lng')
    try:
        lat_f = float(lat) if lat is not None else None
        lng_f = float(lng) if lng is not None else None
    except (TypeError, ValueError):
        lat_f = lng_f = None
    if lat_f is None or lng_f is None or lat_f == 0 or lng_f == 0:
        continue
    props = {
        'id': r.get('id'),
        'id_jenis': r.get('id_jenis'),
        'jenis': next((j.get('nama') for j in jenis if j.get('id') == r.get('id_jenis')), None),
        'icon': next((j.get('icon') for j in jenis if j.get('id') == r.get('id_jenis')), None),
        'nama': r.get('nama'),
        'id_ruasjalan': r.get('id_ruasjalan'),
        'status': r.get('status'),
        'kondisi': r.get('kondisi'),
        'lokasi': r.get('lokasi'),
        'posisi': r.get('posisi'),
        'keterangan': r.get('keterangan'),
        'tgl_insert': str(r.get('tgl_insert')) if r.get('tgl_insert') is not None else None,
        'th_anggaran': r.get('th_anggaran'),
        'sdana': r.get('sdana'),
        'gambar': r.get('gambar'),
        'foto': r.get('foto'),
        'id_gambar': r.get('id_gambar'),
        'gambar_rambu': rambu_icon_map.get(r.get('id_gambar')) if r.get('id_gambar') is not None else None,
    }
    features.append({
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': [lng_f, lat_f]},
        'properties': props
    })

geo = {
    'type': 'FeatureCollection',
    'name': 'perlengkapan_jalan',
    'features': features,
    'metadata': {
        'source': 'onlinkid_rambu.perlengkapan_jalan',
        'total_db_rows': len(perkap),
        'total_with_geom': len(features),
        'tanggal_dump': '2025-09-02'
    }
}

# Simpan
out_geo = os.path.join(PUB, 'perlengkapan_jalan.geojson')
with open(out_geo, 'w', encoding='utf-8') as f:
    json.dump(geo, f, ensure_ascii=False, indent=None)
print(f'\nSaved: {out_geo}  ({os.path.getsize(out_geo):,} bytes, {len(features)} features)')

out_jenis = os.path.join(PUB, 'perlengkapan_jenis.json')
with open(out_jenis, 'w', encoding='utf-8') as f:
    json.dump(jenis, f, ensure_ascii=False, indent=2)
print(f'Saved: {out_jenis}  ({os.path.getsize(out_jenis):,} bytes, {len(jenis)} rows)')

out_ruas = os.path.join(PUB, 'ruas_jalan_db.json')
with open(out_ruas, 'w', encoding='utf-8') as f:
    json.dump(ruas_db, f, ensure_ascii=False, indent=2)
print(f'Saved: {out_ruas}  ({os.path.getsize(out_ruas):,} bytes, {len(ruas_db)} rows)')