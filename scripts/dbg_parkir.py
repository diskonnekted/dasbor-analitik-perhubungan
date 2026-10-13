import re, json

src = r'D:\xampp\htdocs\siap\PARKIR.sql'
s = open(src, encoding='utf-8', errors='replace').read()

tables = ['juru_parkir','titik_parkir','titik_jukir','pengelola_badan',
          'pengelola_perorangan','pengaduan_jukir','pengaduan','pejabat',
          'sk_badan','sk_perorangan','tahun_pengelolaan','users','ruas_jalan']

print("=== jumlah INSERT blok per tabel ===")
for t in tables:
    # count rows: count occurrences of "),\n(" style is hard; count INSERT VALUES statements
    blocks = re.findall(r'INSERT INTO `' + t + r'`', s)
    print(t, len(blocks))

# For juru_parkir, extract actual records count by splitting
def parse_inserts(table):
    out = []
    # find create table block header to get columns
    pat = re.compile(r'INSERT INTO `' + table + r'` \((.*?)\) VALUES\n(.*?);', re.DOTALL)
    for m in pat.finditer(s):
        cols = [c.strip('` ') for c in m.group(1).split(',')]
        body = m.group(2)
        # split into rows: rows end with ),\n ( and final ,(...);
        rows = re.findall(r'\((.*?)\)(?:,|$)', body, re.DOTALL)
        for r in rows:
            out.append(r)
    return cols, out

cols, rows = parse_inserts('juru_parkir')
print("\n=== juru_parkir ===")
print("columns:", cols)
print("record count:", len(rows))

cols_tj, rows_tj = parse_inserts('titik_jukir')
print("\n=== titik_jukir ===", len(rows_tj), "records")

# print juru_parkir sample names
print("\n=== juru_parkir: no, nama, kelamin ===")
# map indices
def idx(colname):
    return cols.index(colname) if colname in cols else None

i_no = idx('no_juru_parkir')
i_nama = idx('nama')
i_nik = idx('nik')
i_jk = idx('jk')

def splitv(r):
    # naive split respecting quotes
    parts = []
    cur = ''
    inq = False
    for ch in r:
        if ch == "'":
            inq = not inq
            continue
        if ch == ',' and not inq:
            parts.append(cur)
            cur = ''
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts]

count = 0
for r in rows:
    v = splitv(r)
    if len(v) < max([i for i in [i_no,i_nama,i_nik,i_jk] if i is not None])+1:
        continue
    nama = v[i_nama] if i_nama is not None and i_nama < len(v) else '?'
    no = v[i_no] if i_no is not None and i_no < len(v) else '?'
    jk = v[i_jk] if i_jk is not None and i_jk < len(v) else '?'
    count += 1
    if count <= 30:
        print(no, nama, jk)

print("... total juru_parkir =", count)