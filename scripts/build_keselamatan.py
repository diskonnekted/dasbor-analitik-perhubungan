# build_keselamatan.py — Extract pengaduan, riwayat, perlengkapan from onlinkid_rambu.sql
import json, re, sys

SQL = r"I:\perhubungan\public\onlinkid_rambu.sql"

def splitv(r):
    """Split raw CSV value string by commas respecting quotes; strip SQL string quotes."""
    vs, v, in_q = [], '', False
    for c in r:
        if c == '"': in_q = not in_q
        elif c == ',' and not in_q:
            vs.append(v); v = ''
        else: v += c
    vs.append(v)
    # Clean each value: unquote SQL strings ('abc' -> abc), keep NULL as ''
    out = []
    for raw in vs:
        s = raw.strip()
        if s == 'NULL':
            out.append('')
        elif len(s) >= 2 and s.startswith("'") and s.endswith("'"):
            out.append(s[1:-1])
        else:
            out.append(s)
    return out

def parse_inserts(fname, table):
    rows = []
    with open(fname, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find INSERT line
    in_insert = False
    current_values = []
    for line in lines:
        if f"INSERT INTO `{table}`" in line and "VALUES" in line:
            in_insert = True
            # Get values part after VALUES
            val_part = line.split("VALUES", 1)
            if len(val_part) > 1 and val_part[1].strip():
                current_values.append(val_part[1].strip())
            continue
        if in_insert:
            line_s = line.strip()
            if line_s.endswith(';'):
                line_s = line_s[:-1].strip()
                if line_s:
                    current_values.append(line_s)
                # Parse all (value) tuples on this line
                import re
                tuples = re.findall(r"\(([^)]+)\)", ''.join(current_values))
                for t in tuples:
                    vs = splitv(t)
                    rows.append(vs)
                in_insert = False
                current_values = []
            elif line_s.startswith('('):
                current_values.append(line_s)
    return rows

print("=== Parsing onlinkid_rambu.sql ===")

# 1. PENGADUAN
cols_pengaduan = ['id_pengaduan','nama','perlengkapan','nik','wa','isilaporan',
                  'lampiran','status','lokasi','id_perlengkapan','foto','tgl_pengaduan','jenis']
pengaduan = parse_inserts(SQL, 'pengaduan')
pengaduan_obj = []
for r in pengaduan:
    pengaduan_obj.append({
        'id_pengaduan': int(r[0]) if r[0].isdigit() else 0,
        'nama': r[1],
        'perlengkapan': r[2],
        'nik': r[3],
        'wa': r[4],
        'isilaporan': r[5],
        'lampiran': r[6],
        'status': int(r[7]) if r[7].isdigit() else 0,
        'lokasi': r[8],
        'id_perlengkapan': int(r[9]) if r[9].isdigit() else 0,
        'foto': r[10],
        'tgl_pengaduan': r[11],
        'jenis': int(r[12]) if r[12].isdigit() else 0
    })
print(f"Pengaduan: {len(pengaduan_obj)} records")

# 2. RIWAYAT
cols_riwayat = ['id_riwayat','id_perlengkapan','jenis_pemeliharaan','tgl_pemeliharaan',
                'detail','keterangan','dilakukan_oleh','status']
riwayat = parse_inserts(SQL, 'riwayat')
riwayat_obj = []
for r in riwayat:
    riwayat_obj.append({
        'id_riwayat': int(r[0]) if r[0].isdigit() else 0,
        'id_perlengkapan': int(r[1]) if r[1].isdigit() else 0,
        'jenis_pemeliharaan': r[2],
        'tgl_pemeliharaan': r[3],
        'detail': r[4],
        'keterangan': r[5],
        'dilakukan_oleh': r[6],
        'status': int(r[7]) if r[7].isdigit() else 0
    })
print(f"Riwayat: {len(riwayat_obj)} records")

# 3. JENIS PERLENGKAPAN (already in perlengkapan.js, but keep here for reference)
jenis_perlengkapan = parse_inserts(SQL, 'jenis_perlengkapan')
jenis_obj = []
for r in jenis_perlengkapan:
    if len(r) >= 6:
        jenis_obj.append({
            'id': int(r[0]) if r[0].isdigit() else 0,
            'nama': r[1],
            'icon': r[2],
            'gambar': r[3],
            'sub': r[4],
            'keterangan': r[5]
        })
print(f"Jenis Perlengkapan: {len(jenis_obj)} records")

# 4. PERLENGKAPAN JALAN
perlengkapan = parse_inserts(SQL, 'perlengkapan_jalan')
perlengkapan_obj = []
for r in perlengkapan:
    if len(r) < 20:
        continue
    def to_float(v):
        try:
            return float(v)
        except:
            return 0.0
    perlengkapan_obj.append({
        'id': int(r[0]) if r[0].isdigit() else 0,
        'id_jenis': int(r[1]) if r[1].isdigit() else 0,
        'nama': r[2],
        'id_ruasjalan': int(r[3]) if r[3].isdigit() else 0,
        'status': r[4],
        'kondisi': r[5],
        'lokasi': r[6],
        'coordinate_lat': to_float(r[7]),
        'coordinate_lng': to_float(r[8]),
        'posisi': r[9],
        'keterangan': r[10],
        'gambar': r[11],
        'foto': r[12],
        'tgl_insert': r[14] if len(r) > 14 else '',
        'tipe_jalan': r[15] if len(r) > 15 else ''
    })
print(f"Perlengkapan Jalan: {len(perlengkapan_obj)} records")

# Save to JSON
with open(r"I:\perhubungan\public\pengaduan.json", "w", encoding="utf-8") as f:
    json.dump(pengaduan_obj, f, ensure_ascii=False, indent=2)
print("Wrote public/pengaduan.json")

with open(r"I:\perhubungan\public\riwayat.json", "w", encoding="utf-8") as f:
    json.dump(riwayat_obj, f, ensure_ascii=False, indent=2)
print("Wrote public/riwayat.json")

with open(r"I:\perhubungan\public\jenis_perlengkapan.json", "w", encoding="utf-8") as f:
    json.dump(jenis_obj, f, ensure_ascii=False, indent=2)
print("Wrote public/jenis_perlengkapan.json")

with open(r"I:\perhubungan\public\perlengkapan_jalan.json", "w", encoding="utf-8") as f:
    json.dump(perlengkapan_obj, f, ensure_ascii=False, indent=2)
print("Wrote public/perlengkapan_jalan.json")

print("Done.")
