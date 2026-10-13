import re, json
sql = open(r'I:\perhubungan\public\onlinkid_rambu.sql', encoding='utf-8').read()

def parse_inserts(sql, table):
    rows = []
    pattern = re.compile(r"INSERT INTO `" + re.escape(table) + r"`\s*\(([^)]*)\)\s*VALUES\s*(.*?);", re.DOTALL | re.IGNORECASE)
    for m in pattern.finditer(sql):
        cols = [c.strip().strip('`') for c in m.group(1).split(",")]
        datastr = m.group(2)
        tuples = re.findall(r"\((.*?)\)", datastr, re.DOTALL)
        for t in tuples:
            vals = split_values(t)
            rec = {}
            for i, c in enumerate(cols):
                if i < len(vals):
                    rec[c] = vals[i]
            rows.append(rec)
    return rows

def split_values(s):
    vals, cur, inq, i, n = [], [], False, 0, len(s)
    while i < n:
        ch = s[i]
        if ch == "'":
            if inq and i+1 < n and s[i+1] == "'":
                cur.append("'"); i += 2; continue
            inq = not inq; cur.append(ch); i += 1; continue
        if ch == "," and not inq:
            vals.append(clean("".join(cur))); cur = []; i += 1; continue
        cur.append(ch); i += 1
    if cur: vals.append(clean("".join(cur)))
    return vals

def clean(v):
    v = v.strip()
    if v == "NULL": return None
    if len(v) >= 2 and v[0] == "'" and v[-1] == "'": return v[1:-1]
    if re.fullmatch(r"-?\d+", v): return int(v)
    if re.fullmatch(r"-?\d+\.\d+", v): return float(v)
    return v

idpel = parse_inserts(sql, "idpel_terpasang")
pju = parse_inserts(sql, "pju")

idp_set = set(str(r.get("idpel")) for r in idpel)
pju_idp = set(str(p.get("id_pel")) for p in pju if p.get("id_pel"))
print("idpel total", len(idpel), "unique idpel", len(idp_set))
print("pju total", len(pju), "pju with id_pel", len(pju_idp))
inter = idp_set & pju_idp
print("matched idpel:", len(inter))
print("pju id_pel NOT in idpel_terpasang:", len(pju_idp - idp_set))
print("sample idpel keys:", list(idp_set)[:3])
print("sample pju id_pel:", list(pju_idp)[:3])