"""Verifikasi hasil preprocess pju_ruas.geojson"""
import json
from pathlib import Path

p = Path("public/pju_ruas.geojson")
with open(p, "r", encoding="utf-8") as f:
    d = json.load(f)

print(f"Total features: {len(d['features'])}")
print(f"Metadata: {d.get('metadata')}")
print()

counts = {"2pts": 0, "3to10": 0, "11to50": 0, "51to200": 0, "200plus": 0}
for f in d["features"]:
    n = len(f["geometry"]["coordinates"])
    if n == 2:
        counts["2pts"] += 1
    elif n <= 10:
        counts["3to10"] += 1
    elif n <= 50:
        counts["11to50"] += 1
    elif n <= 200:
        counts["51to200"] += 1
    else:
        counts["200plus"] += 1

print("Distribusi jumlah titik per ruas:")
for k, v in counts.items():
    print(f"  {k}: {v}")

print()
print("Sample 3 ruas (acak):")
for fid in ["572", "583", "600"]:
    f = next((x for x in d["features"] if str(x["properties"]["id"]) == fid), None)
    if f:
        p = f["properties"]
        g = f["geometry"]
        print(f"  #{fid} {p['nomor_ruas']} {p['nama_ruas'][:30]}: {len(g['coordinates'])} pts, source={p.get('geometry_source')}")

# 12 ruas fallback
print()
fallback = [f for f in d["features"] if f["properties"].get("geometry_source") == "pu_fallback"]
print(f"Ruas fallback (garis lurus): {len(fallback)}")
for f in fallback:
    p = f["properties"]
    print(f"  #{p['id']} {p.get('nomor_ruas', '?')} {p.get('nama_ruas', '?')}")
