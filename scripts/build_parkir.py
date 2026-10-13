"""
Build enriched parking dataset for the Perparkiran page.

Sources:
  - D:\\xampp\\htdocs\\siap\\PARKIR.sql   (master data 2021: 12 juru_parkir, 8 titik_jukir, 11 titik_parkir)

Output:
  - public/parkir_analysis.json

Enrichment:
  - Resolve id_kecamatan -> nama kecamatan (BPS Kab. Banjarnegara).
  - Join juru_parkir -> titik_jukir -> titik_parkir (lokasi + setoran + no_spt).
  - Compute aggregate stats (jk, domisili, verifikasi, rentang umur).
"""
import re, json, os

SRC = r'D:\xampp\htdocs\siap\PARKIR.sql'
OUT = r'I:\perhubungan\public\parkir_analysis.json'


def norm_media(p):
    """Normalise relative media path from DB -> web path (BASE_URL prefix)."""
    if not p:
        return None
    p = p.strip()
    if p in ('NULL', ''):
        return None
    # './media/...' -> 'media/...' (frontend prefixes BASE_URL)
    return p.replace('\\', '/').lstrip('./')

# BPS kode kecamatan Kab. Banjarnegara (7-digit no trailing index)
KEC = {
    '3304010': 'Susukan',
    '3304020': 'Purwareja Klampok',
    '3304030': 'Mandiraja',
    '3304040': 'Purwanegara',
    '3304050': 'Bawang',
    '3304060': 'Banjarnegara',
    '3304061': 'Pagedongan',
    '3304070': 'Sigaluh',
    '3304080': 'Madukara',
    '3304090': 'Banjarmangu',
    '3304100': 'Wanadadi',
    '3304110': 'Rakit',
    '3304120': 'Punggelan',
    '3304130': 'Karangkobar',
    '3304140': 'Pagentan',
    '3304150': 'Pejawaran',
    '3304160': 'Batur',
    '3304170': 'Wanayasa',
    '3304180': 'Kalibening',
    '3304181': 'Pandanarum',
}

s = open(SRC, encoding='utf-8', errors='replace').read()


def parse_table(table):
    """Return (columns, list-of-value-lists) for a table's INSERT statements."""
    cols_all = []
    rows_all = []
    pat = re.compile(r'INSERT INTO `' + table + r'` \((.*?)\) VALUES\n(.*?);', re.DOTALL)
    for m in pat.finditer(s):
        cols = [c.strip().strip('`') for c in m.group(1).split(',')]
        body = m.group(2)
        # each row: (...),\n ... ; last row ends ');'
        for r in re.findall(r'\((.*?)\)(?:,|\s*;|$)', body):
            rows_all.append(splitv(r))
        cols_all = cols
    return cols_all, rows_all


def splitv(r):
    parts, cur, inq = [], '', False
    for ch in r:
        if ch == "'":
            inq = not inq
            continue
        if ch == ',' and not inq:
            parts.append(cur.strip())
            cur = ''
        else:
            cur += ch
    parts.append(cur.strip())
    # normalise NULL
    return [None if p == 'NULL' else p for p in parts]


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# 1. juru_parkir
jcols, jrows = parse_table('juru_parkir')
jmap = {}
for r in jrows:
    d = dict(zip(jcols, r))
    idj = to_int(d.get('id_juru_parkir'))
    kec_code = (d.get('domisili_id_kecamatan') or '').strip()
    d_desa = (d.get('domisili_id_desa') or '').strip()
    rec = {
        'id_juru_parkir': idj,
        'no_juru_parkir': d.get('no_juru_parkir'),
        'nik': d.get('nik'),
        'nama': d.get('nama'),
        'tempat_lahir': d.get('tempat_lahir'),
        'tanggal_lahir': d.get('tanggal_lahir'),
        'jk': d.get('jk'),
        'agama': d.get('agama'),
        'domisili_kecamatan': KEC.get(kec_code, kec_code),
        'domisili_kecamatan_kode': kec_code,
        'domisili_desa': d_desa,
        'domisili_alamat': d.get('domisili_alamat'),
        'no_telp': d.get('no_telp'),
        'foto': norm_media(d.get('foto')),
        'foto_ktp': norm_media(d.get('foto_ktp')),
        'verifikasi': to_int(d.get('verifikasi')),
        'verifikasi_time': d.get('verifikasi_time'),
    }
    jmap[idj] = rec

# 2. titik_parkir
pcols, prows = parse_table('titik_parkir')
pmap = {}
for r in prows:
    d = dict(zip(pcols, r))
    pid = to_int(d.get('id_titik_parkir'))
    kec_code = (d.get('id_kecamatan') or '').strip()
    pmap[pid] = {
        'id_titik_parkir': pid,
        'nama_lokasi': d.get('nama_lokasi'),
        'jenis_fasilitas': d.get('jenis_fasilitas'),
        'panjang_lokasi': to_float(d.get('panjang_lokasi')),
        'lebar_lokasi': to_float(d.get('lebar_lokasi')),
        'luas_lokasi': to_float(d.get('luas_lokasi')),
        'srp_motor': to_int(d.get('srp_motor')) or 0,
        'srp_mobil': to_int(d.get('srp_mobil')) or 0,
        'kecamatan': KEC.get(kec_code, kec_code),
        'id_kecamatan': kec_code,
        'id_desa': d.get('id_desa'),
        'jenis_desa': d.get('jenis_desa'),
        'id_ruas_jalan': to_int(d.get('id_ruas_jalan')),
        'titik_lat': to_float(d.get('titik_lat')),
        'titik_lng': to_float(d.get('titik_lng')),
        'foto_lokasi': norm_media(d.get('foto_lokasi')),
    }

# 3. titik_jukir (relasi)
tjcols, tjrows = parse_table('titik_jukir')
jukir_enriched = []
for r in tjrows:
    d = dict(zip(tjcols, r))
    idj = to_int(d.get('id_juru_parkir'))
    pid = to_int(d.get('id_titik_parkir'))
    jp = jmap.get(idj, {})
    pt = pmap.get(pid, {})
    jukir_enriched.append({
        'id_titik_jukir': to_int(d.get('id_titik_jukir')),
        'tahun_pengelolaan': to_int(d.get('tahun_pengelolaan')),
        'id_titik_parkir': pid,
        'id_juru_parkir': idj,
        'qrcode': d.get('qrcode'),
        'no_spt': d.get('no_spt'),
        'tmt_spt_awal': d.get('tmt_spt_awal'),
        'tmt_spt_akhir': d.get('tmt_spt_akhir'),
        'setoran_perbulan': to_int(d.get('setoran_perbulan')) or 0,
        'actived': to_int(d.get('actived')),
        # join juru_parkir
        'no_juru_parkir': jp.get('no_juru_parkir'),
        'nama_jukir': jp.get('nama'),
        'nik': jp.get('nik'),
        'jk': jp.get('jk'),
        'tanggal_lahir': jp.get('tanggal_lahir'),
        'domisili_kecamatan': jp.get('domisili_kecamatan'),
        'domisili_desa': jp.get('domisili_desa'),
        'domisili_alamat': jp.get('domisili_alamat'),
        'verifikasi': jp.get('verifikasi'),
        'foto': jp.get('foto'),
        # join titik_parkir
        'nama_lokasi': pt.get('nama_lokasi'),
        'jenis_fasilitas': pt.get('jenis_fasilitas'),
        'kecamatan': pt.get('kecamatan'),
        'titik_lat': pt.get('titik_lat'),
        'titik_lng': pt.get('titik_lng'),
        'foto_lokasi': pt.get('foto_lokasi'),
    })

# Juru parkir master yang belum terhubung ke titik_jukir (belum ada SPT/penempatan)
linked_ids = {j['id_juru_parkir'] for j in jukir_enriched}
juru_unplaced = [rec for i, rec in jmap.items() if i not in linked_ids]

out = {
    'meta': {
        'sumber': 'Dinas Perhubungan Kabupaten Banjarnegara',
        'database': 'siap.PARKIR.sql (master 2021)',
        'generated_at': '2026-08-30',
    },
    'juru_parkir': [jp for jp in jmap.values()],
    'titik_parkir': [p for p in pmap.values()],
    'titik_jukir': jukir_enriched,
    'juru_unplaced': juru_unplaced,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# report
print('juru_parkir master:', len(jmap))
print('titik_parkir:', len(pmap))
print('titik_jukir (relasi):', len(jukir_enriched))
print('juru belum terhubung:', len(juru_unplaced))

# quick sanity: jk breakdown
from collections import Counter
jk = Counter(jp['jk'] for jp in jmap.values())
print('jk:', dict(jk))
ver = Counter(jp['verifikasi'] for jp in jmap.values())
print('verifikasi:', dict(ver))
st = sum(j['setoran_perbulan'] for j in jukir_enriched)
print('total setoran/bln:', st)