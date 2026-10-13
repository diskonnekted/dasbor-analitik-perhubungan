"""
Pre-process pju_ruas.geojson dengan memanggil OSRM publik untuk setiap ruas.
Tujuan: ruas jalan yang tadinya hanya LineString 2 titik (garis lurus) menjadi
polyline yang mengikuti jalan nyata.

Referensi: https://github.com/diskonnekted/lapor-jalan
backend/routes/ruasJalan.js menggunakan logika yang sama.

Usage:
    python preprocess-osrm.py
    # Output: public/pju_ruas.geojson (overwrite)
"""
import json
import ssl
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

INPUT_FILE = Path("public/pju_ruas.geojson")
OUTPUT_FILE = Path("public/pju_ruas.geojson")  # overwrite in place
CACHE_FILE = Path("public/.osrm-cache.json")  # simpan hasil agar bisa di-resume
PROGRESS_FILE = Path("public/.osrm-progress.json")  # log progres

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
BATCH_SIZE = 5         # 5 ruas per batch (sama seperti lapor-jalan)
BATCH_DELAY = 1.0      # detik jeda antar batch (rate-limit friendly)
REQUEST_TIMEOUT = 30   # detik per request

# Skip SSL verification (umum di Windows Python yang tidak punya cert bundle)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def decode_polyline(encoded: str):
    """Decode Google/OSRM polyline string ke list of [lng, lat] (GeoJSON order)."""
    coords = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        b = 0
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng
        coords.append([lng / 1e5, lat / 1e5])
    return coords


def fetch_osrm_route(lng1, lat1, lng2, lat2):
    """Panggil OSRM publik, return list of [lng, lat] atau None jika gagal."""
    url = f"{OSRM_URL}/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=polyline&steps=false"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "dishub-banjarnegara-dashboard/1.0"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT, context=SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("code") == "Ok" and data.get("routes"):
            geom = data["routes"][0].get("geometry")
            if geom:
                return decode_polyline(geom)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"    ! OSRM error: {e}", file=sys.stderr)
    return None


def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f)


def save_progress(done, total, ok_count, fail_count):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"done": done, "total": total, "ok": ok_count, "fail": fail_count}, f)


def main():
    if not INPUT_FILE.exists():
        print(f"ERROR: {INPUT_FILE} tidak ditemukan.", file=sys.stderr)
        sys.exit(1)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    total = len(features)
    print(f"Total ruas: {total}")

    cache = load_cache()
    print(f"Cache awal: {len(cache)} ruas sudah pernah di-fetch")

    todo = [f for f in features if str(f["properties"].get("id")) not in cache]
    print(f"Ruas yang perlu di-fetch: {len(todo)}")
    print()

    ok_count = sum(1 for v in cache.values() if v is not None)
    fail_count = sum(1 for v in cache.values() if v is None)
    done = len(cache)

    for i in range(0, len(todo), BATCH_SIZE):
        batch = todo[i:i + BATCH_SIZE]
        for feat in batch:
            props = feat["properties"]
            fid = str(props.get("id"))
            coords = feat["geometry"]["coordinates"]
            if len(coords) < 2:
                print(f"  - Ruas #{fid}: skip (geometry tidak valid)")
                cache[fid] = None
                done += 1
                fail_count += 1
                continue

            lng1, lat1 = coords[0][0], coords[0][1]
            lng2, lat2 = coords[1][0], coords[1][1]
            nomor = props.get("nomor_ruas") or "?"
            nama = props.get("nama_ruas") or "?"
            print(f"  [{done + 1}/{total}] OSRM ruas {fid} ({nomor} {nama[:30]}): ", end="", flush=True)

            geometry = fetch_osrm_route(lng1, lat1, lng2, lat2)
            if geometry and len(geometry) >= 2:
                cache[fid] = geometry
                ok_count += 1
                print(f"OK ({len(geometry)} pts)")
            else:
                cache[fid] = None
                fail_count += 1
                print("FAIL (fallback garis lurus)")
            done += 1

        save_cache(cache)
        save_progress(done, total, ok_count, fail_count)

        if i + BATCH_SIZE < len(todo):
            time.sleep(BATCH_DELAY)

    print()
    print(f"Selesai fetch. OK: {ok_count}, FAIL: {fail_count}")
    print("Menulis GeoJSON hasil...")

    enriched = 0
    fallback = 0
    for feat in features:
        fid = str(feat["properties"].get("id"))
        cached_geom = cache.get(fid)
        if cached_geom and len(cached_geom) >= 2:
            feat["geometry"]["coordinates"] = cached_geom
            feat["properties"]["geometry_source"] = "osrm"
            enriched += 1
        else:
            feat["properties"]["geometry_source"] = "pu_fallback"
            fallback += 1

    geojson["metadata"] = {
        "osrm_enriched": enriched,
        "pu_fallback": fallback,
        "total": total,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"OK: {enriched} ruas di-enrich dengan OSRM")
    print(f"Fallback (garis lurus): {fallback} ruas")
    print(f"File ditulis: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
