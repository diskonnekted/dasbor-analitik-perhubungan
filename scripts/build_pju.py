# -*- coding: utf-8 -*-
"""
Ekstrak + analisa data PJU Dishub Banjarnegara dari onlinkid_rambu.sql
Menghasilkan public/pju_analysis.json untuk halaman PJU.

Sumber data:
- pju                  : survey aset PJU (jenis_lampu, daya_lampu, catudaya, sumberdana)
- perlengkapan_jalan   : kondisi, lokasi, koordinat, keterangan (id_jenis=3 -> PJU)
- idpel_terpasang      : data IDPEL PLN per titik (nama, daya, no_meter, gardu, tiang)
- tagihan              : billing bulanan per IDPEL (kWh, tagihan, pembayaran)
- lmandiri             : data PJU mandiri/solar

Metode klasifikasi kWh vs non-kWh (sesuai Pju.php):
  per-baris tagihan:  (daya/1000)*375 <= kwh  -> non-kWh meter
                      (daya/1000)*375 >  kwh  -> kWh meter
"""
import re, json, os
from collections import defaultdict

SRC = r"I:\perhubungan\public\onlinkid_rambu.sql"
OUT = r"I:\perhubungan\public\pju_analysis.json"


# ---------- helper: parse multi-row INSERT ----------
def parse_inserts(sql, table):
    rows = []
    pattern = re.compile(
        r"INSERT INTO `" + re.escape(table) + r"`\s*\(([^)]*)\)\s*VALUES\s*(.*?);",
        re.DOTALL | re.IGNORECASE,
    )
    for m in pattern.finditer(sql):
        colstr = m.group(1)
        datastr = m.group(2)
        cols = [c.strip().strip('`') for c in colstr.split(",")]
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
    vals = []
    cur = []
    inq = False
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "'":
            if inq and i + 1 < n and s[i + 1] == "'":
                cur.append("'")
                i += 2
                continue
            inq = not inq
            cur.append(ch)
            i += 1
            continue
        if ch == "," and not inq:
            vals.append(clean("".join(cur)))
            cur = []
            i += 1
            continue
        cur.append(ch)
        i += 1
    if cur:
        vals.append(clean("".join(cur)))
    return vals


def clean(v):
    v = v.strip()
    if v == "NULL":
        return None
    if len(v) >= 2 and v[0] == "'" and v[-1] == "'":
        return v[1:-1]
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if re.fullmatch(r"-?\d+\.\d+", v):
        return float(v)
    return v


def is_valid_idpel(v):
    """IDPEL PLN Banjarnegara berformat numerik 12-13 digit; buang nilai korup."""
    if v is None:
        return False
    s = str(v).strip()
    # IDPEL valid: numerik, panjang 12-13
    return bool(re.fullmatch(r"\d{12,13}", s))


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        sql = f.read()

    idpel = parse_inserts(sql, "idpel_terpasang")
    pju = parse_inserts(sql, "pju")
    lman = parse_inserts(sql, "lmandiri")
    tagihan = parse_inserts(sql, "tagihan")
    perl = parse_inserts(sql, "perlengkapan_jalan")

    print("idpel_terpasang:", len(idpel))
    print("pju:", len(pju))
    print("lmandiri:", len(lman))
    print("tagihan:", len(tagihan))
    print("perlengkapan_jalan:", len(perl))

    # ---------- lookup maps ----------
    idpel_by_id = {}
    for r in idpel:
        idpel_by_id[str(r.get("idpel")).strip()] = r

    perl_by_id = {}
    for r in perl:
        perl_by_id[r.get("id")] = r

    lman_by_pju = {}
    for r in lman:
        lman_by_pju[r.get("id_pju")] = r

    # ---------- billing analysis (tagihan) ----------
    # Per-baris klasifikasi kWh vs non-kWh
    tagihan_by_idpel = defaultdict(lambda: {
        "count": 0, "kwh": 0, "total": 0, "tagihan_pln": 0,
        "materai": 0, "daya": None, "tarip": None, "months": set(),
        "kwh_rows": 0, "nonkwh_rows": 0, "kwh_rp": 0, "nonkwh_rp": 0,
    })
    for r in tagihan:
        idp = str(r.get("id_pel") or "").strip()
        if not idp:
            continue
        b = tagihan_by_idpel[idp]
        b["count"] += 1
        kwh = int(r.get("kwh") or 0)
        total = int(r.get("total_pembayaran") or 0)
        b["kwh"] += kwh
        b["total"] += total
        b["tagihan_pln"] += int(r.get("tagihan_pln") or 0)
        b["materai"] += int(r.get("materai") or 0)
        if r.get("daya") is not None:
            b["daya"] = int(r.get("daya") or 0)
        if r.get("tarip"):
            b["tarip"] = r.get("tarip")
        blth = str(r.get("blth") or "")[:7]
        if blth:
            b["months"].add(blth)
        # klasifikasi kWh vs non-kWh per baris
        daya = int(r.get("daya") or 0)
        if daya > 0:
            thresh = (daya / 1000.0) * 375.0
            if thresh <= kwh:
                b["nonkwh_rows"] += 1
                b["nonkwh_rp"] += total
            else:
                b["kwh_rows"] += 1
                b["kwh_rp"] += total

    # ---------- monthly billing series (with classification) ----------
    monthly = defaultdict(lambda: {
        "total": 0, "kwh": 0, "count": 0,
        "kwh_rp": 0, "nonkwh_rp": 0, "kwh_cnt": 0, "nonkwh_cnt": 0,
    })
    for r in tagihan:
        blth = str(r.get("blth") or "")[:7]
        if not blth:
            continue
        m = monthly[blth]
        kwh = int(r.get("kwh") or 0)
        total = int(r.get("total_pembayaran") or 0)
        daya = int(r.get("daya") or 0)
        m["total"] += total
        m["kwh"] += kwh
        m["count"] += 1
        if daya > 0:
            thresh = (daya / 1000.0) * 375.0
            if thresh <= kwh:
                m["nonkwh_rp"] += total
                m["nonkwh_cnt"] += 1
            else:
                m["kwh_rp"] += total
                m["kwh_cnt"] += 1
    monthly_list = [{"month": k, **v} for k, v in sorted(monthly.items())]

    # ---------- asset PJU analysis ----------
    pju_list = []
    # jenis lampu aggregate
    jenis_lampu = defaultdict(int)
    daya_lampu = defaultdict(int)
    catudaya = defaultdict(int)
    sumberdana = defaultdict(int)
    kondisi = defaultdict(int)
    jenis_kwh = defaultdict(int)

    for p in pju:
        pid = p.get("id_perlengkapan_jalan")
        perl_rec = perl_by_id.get(pid)
        idp_raw = p.get("id_pel")
        idp = str(idp_raw).strip() if idp_raw else None
        # valid idpel join
        idpel_rec = idpel_by_id.get(idp) if (idp and is_valid_idpel(idp)) else None
        lman_rec = lman_by_pju.get(p.get("id_pju"))
        tg = tagihan_by_idpel.get(idp) if (idp and is_valid_idpel(idp)) else None

        jl = p.get("jenis_lampu")
        # normalisasi jenis lampu (buang yang korup: berisi idpel/numerik/koordinat)
        jl_norm = None
        if jl and isinstance(jl, str):
            jl_s = jl.strip()
            if re.fullmatch(r"[A-Za-z]{2,8}", jl_s):
                jl_norm = jl_s.upper()

        jen = p.get("jenis") or ""

        obj = {
            "id_pju": p.get("id_pju"),
            "id_perlengkapan_jalan": pid,
            "catudaya": p.get("catudaya"),
            "id_pel": idp,
            "jenis": jen,
            "jenis_lampu": jl_norm,
            "daya_lampu": p.get("daya_lampu"),
            "sumberdana": p.get("sumberdana") or None,
            "kasus": p.get("kasus") or None,
            "diagnosa": p.get("diagnosa") or None,
            "kondisi": perl_rec.get("kondisi") if perl_rec else None,
            "lokasi": perl_rec.get("lokasi") if perl_rec else None,
            "keterangan": perl_rec.get("keterangan") if perl_rec else None,
            "th_anggaran": perl_rec.get("th_anggaran") if perl_rec else None,
            "lat": float(perl_rec.get("coordinate_lat") or 0) if perl_rec else None,
            "lng": float(perl_rec.get("coordinate_lng") or 0) if perl_rec else None,
            "idpel": {
                "nama": idpel_rec.get("nama") if idpel_rec else None,
                "lokasi": idpel_rec.get("lokasi") if idpel_rec else None,
                "daya": idpel_rec.get("daya") if idpel_rec else None,
                "no_meter": idpel_rec.get("no_meter") if idpel_rec else None,
                "no_tiang": idpel_rec.get("no_tiang") if idpel_rec else None,
                "kdgardu": idpel_rec.get("kdgardu") if idpel_rec else None,
                "id_tarif": idpel_rec.get("id_tarif") if idpel_rec else None,
                "tgl_nyala": idpel_rec.get("tgl_nyala") if idpel_rec else None,
            } if idpel_rec else None,
            "lmandiri": {
                "sumber": lman_rec.get("sumber"),
                "daya_panel": lman_rec.get("daya_panel"),
                "charger": lman_rec.get("charger"),
                "baterai": lman_rec.get("baterai"),
                "kapasitas_baterai": lman_rec.get("kapasitas_baterai"),
            } if lman_rec else None,
            "billing": {
                "count": tg["count"],
                "total_kwh": tg["kwh"],
                "total_pembayaran": tg["total"],
                "avg_kwh_per_bulan": round(tg["kwh"] / tg["count"], 2) if tg["count"] else 0,
                "kwh_rows": tg["kwh_rows"],
                "nonkwh_rows": tg["nonkwh_rows"],
                "kwh_rp": tg["kwh_rp"],
                "nonkwh_rp": tg["nonkwh_rp"],
            } if tg else None,
        }
        pju_list.append(obj)

        # aggregates
        jenis_lampu[jl_norm or "(tidak terdata)"] += 1
        dl = p.get("daya_lampu")
        if dl:
            daya_lampu[str(dl) + " W"] += 1
        catudaya[p.get("catudaya") or "?"] += 1
        sumberdana[(p.get("sumberdana") or "").strip() or "(kosong)"] += 1
        kd = perl_rec.get("kondisi") if perl_rec else None
        kondisi[kd or "(tidak terdata)"] += 1
        # jenis kWh/nkWh distribution
        if jen == "kWh":
            jenis_kwh["kWh"] += 1
        elif jen == "nkWh":
            jenis_kwh["non-kWh"] += 1

    # ---------- billing totals ----------
    total_pembayaran = sum(t["total"] for t in tagihan_by_idpel.values())
    total_tagihan_pln = sum(t["tagihan_pln"] for t in tagihan_by_idpel.values())
    total_kwh = sum(t["kwh"] for t in tagihan_by_idpel.values())
    total_materai = sum(t["materai"] for t in tagihan_by_idpel.values())
    total_kwh_rp = sum(t["kwh_rp"] for t in tagihan_by_idpel.values())
    total_nonkwh_rp = sum(t["nonkwh_rp"] for t in tagihan_by_idpel.values())
    total_kwh_rows = sum(t["kwh_rows"] for t in tagihan_by_idpel.values())
    total_nonkwh_rows = sum(t["nonkwh_rows"] for t in tagihan_by_idpel.values())
    distinct_idpel = len(tagihan_by_idpel)

    # ---------- idpel terpasang summary (aset IDPEL PLN) ----------
    idpel_list = []
    for r in idpel:
        idp = str(r.get("idpel")).strip()
        tg = tagihan_by_idpel.get(idp)
        idpel_list.append({
            "idpel": idp,
            "nama": r.get("nama"),
            "lokasi": r.get("lokasi"),
            "daya": r.get("daya"),
            "id_tarif": r.get("id_tarif"),
            "merk": r.get("merk"),
            "type": r.get("type"),
            "no_meter": r.get("no_meter"),
            "subkogol": r.get("subkogol"),
            "kdgardu": r.get("kdgardu"),
            "no_tiang": r.get("no_tiang"),
            "tgl_pasang": r.get("tgl_pasang"),
            "tgl_nyala": r.get("tgl_nyala"),
            "billing": {
                "count": tg["count"],
                "total_kwh": tg["kwh"],
                "total_pembayaran": tg["total"],
                "kwh_rows": tg["kwh_rows"],
                "nonkwh_rows": tg["nonkwh_rows"],
                "kwh_rp": tg["kwh_rp"],
                "nonkwh_rp": tg["nonkwh_rp"],
            } if tg else None,
        })

    # ---------- top IDPEL by cost ----------
    top_idpel = sorted(
        [i for i in idpel_list if i["billing"]],
        key=lambda x: x["billing"]["total_pembayaran"],
        reverse=True,
    )[:20]

    analysis = {
        "generated_at": "2026-08-30",
        "sources": [
            "onlinkid_rambu.pju",
            "onlinkid_rambu.perlengkapan_jalan",
            "onlinkid_rambu.idpel_terpasang",
            "onlinkid_rambu.tagihan",
            "onlinkid_rambu.lmandiri",
        ],
        "counts": {
            "pju_survey": len(pju_list),
            "perlengkapan_jalan": len(perl),
            "idpel_terpasang": len(idpel),
            "lmandiri": len(lman),
            "tagihan_rows": len(tagihan),
            "distinct_idpel_billing": distinct_idpel,
        },
        "jenis_lampu": dict(sorted(jenis_lampu.items(), key=lambda x: -x[1])),
        "daya_lampu": dict(sorted(daya_lampu.items(), key=lambda x: -x[1])),
        "catudaya": dict(catudaya),
        "sumberdana": dict(sumberdana),
        "kondisi": dict(kondisi),
        "jenis_kwh": dict(jenis_kwh),
        "billing": {
            "total_pembayaran": total_pembayaran,
            "total_tagihan_pln": total_tagihan_pln,
            "total_kwh": total_kwh,
            "total_materai": total_materai,
            "kwh_rp": total_kwh_rp,
            "nonkwh_rp": total_nonkwh_rp,
            "kwh_rows": total_kwh_rows,
            "nonkwh_rows": total_nonkwh_rows,
            "avg_per_idpel_per_bulan": round(total_pembayaran / distinct_idpel, 0) if distinct_idpel else 0,
        },
        "monthly_tagihan": monthly_list,
        "top_idpel": top_idpel,
        "pju": pju_list,
        "idpel": idpel_list,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=1)

    print("=== SUMMARY ===")
    print("PJU survey:", len(pju_list))
    print("jenis_lampu:", dict(sorted(jenis_lampu.items(), key=lambda x: -x[1])))
    print("catudaya:", dict(catudaya))
    print("kondisi:", dict(kondisi))
    print("jenis_kwh:", dict(jenis_kwh))
    print("sumberdana:", dict(sumberdana))
    print("Total pembayaran:", total_pembayaran)
    print("  kWh rows:", total_kwh_rows, f"(Rp {total_kwh_rp:,})")
    print("  non-kWh rows:", total_nonkwh_rows, f"(Rp {total_nonkwh_rp:,})")
    print("Distinct IDPEL billing:", distinct_idpel)
    print("Wrote:", OUT)


if __name__ == "__main__":
    main()