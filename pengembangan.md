# Analisis & Status Pengembangan — Aplikasi Dishub Banjarnegara

> Disusun: 2026-10-10. Sumber: hasil baca seluruh `src/`, `public/`, `data/`, dan dokumentasi (`handover.md`, `PROGRESS.md`, `PETA_ANALISIS.md`).
> Catatan: nama file halaman yang sebenarnya berbeda dengan `handover.md` lama — gunakan tabel di bawah sebagai acuan.

## A. Arsitektur

```
public/  →  data statis (GeoJSON + JSON lookup)  →  Vite serve
src/api/ →  wrapper fetch: coba /api/... dulu, fallback ke data static
src/pages/ → 11 modul (lihat tabel)
src/components/ → layout (Sidebar/Topbar), map (MapView Leaflet), chart (d3/recharts), ui
data/ →  data mentah + hasil analisis + query SQL sumber (off-app)
```

Alur data: **DB Supabase (onlinkid_parkir) → script Python (di `data/`) → GeoJSON/JSON di `public/` → Vite → `src/api/` → `src/pages/`**. Backend API `/api/...` belum berjalan, jadi hampir semua data masih static.

## B. Status Modul (11 item di sidebar)

| # | Modul | File Halaman | API | Status | Catatan |
|---|---|---|---|---|---|
| 1 | Dashboard | `DashboardPage.jsx` | - | ✅ Selesai | KPI masih hard-coded di `KPIS` array |
| 2 | Peta Tematik | `PetaTematikPage.jsx` | `laporan.js` | ✅ Selesai | 7 layer aktif, choropleth dari `pju_choropleth.json` |
| 3 | Laporan Kerusakan | `LaporanPage.jsx` | `laporan.js` | ⚠️ Sebagian | UI lengkap, backend Supabase/lapor-jalan belum hidup → mode fallback 8 sample |
| 4 | Jalan & Ruas | `JalanPage.jsx` | `api/jalan.js` | ✅ Selesai | Tabel paginated, 3 chart, filter kelas, peta ruas. Data dari `public/pju_ruas.geojson` (270 ruas, OSRM) |
| 5 | Perlengkapan Jalan | `PerkapPage.jsx` | `perlengkapan.js` | ✅ Selesai | Chart + peta cluster + tabel paginated |
| 6 | PJU | `PjuPage.jsx` | `api/pju.js` | ✅ Selesai | Tren tagihan (Recharts), 3 KPI card, chart kondisi/jenis/daya, filter status, tabel paginated |
| 7 | Perparkiran | `ParkirPage.jsx` | `parkir.js` | ✅ Selesai | 11 titik parkir, 8 jukir, 12 juru |
| 8 | Kecelakaan | `KecelakaanPage.jsx` | - | ✅ Selesai | Analisis fatalitas + hot spot per kecamatan |
| 9 | PKB | `Placeholder.jsx` | - | 🟡 Placeholder | Belum diimplementasi |
| 10 | Angkutan & Terminal | `Placeholder.jsx` | - | 🟡 Placeholder | Belum diimplementasi |
| 11 | OpenData | `Placeholder.jsx` | - | 🟡 Placeholder | Belum diimplementasi |

## C. Temuan Masalah

### P0 — Selesai
1. ~~**`JalanPage.jsx` + `src/api/jalan.js` belum ada.**~~ ✅ Selesai — `JalanPage.jsx` (tabel paginated, 3 chart, filter kelas jalan, peta ruas Leaflet) + `api/jalan.js` sudah dibuat, terdaftar di `App.jsx`, serve HTTP 200 di dev server.
2. ~~**`PjuRoutePage.jsx` belum ada.**~~ ✅ Selesai sebagai `PjuPage.jsx` — halaman dashboard PJU dengan tren tagihan bulanan (Recharts AreaChart), 3 KPI card, chart kondisi/jenis/daya, filter status, tabel paginated. Data dari `pju_ruas.geojson` (270 ruas, 1.929 titik PJU) + `pju_analysis.json`.

### P1 — Sebagian selesai
3. ~~**Backend laporan belum terintegrasi.**~~ ⚠️ **Tertunda** — `REPORTS_API` & kredensial Supabase belum tersedia. Halaman masih fallback ke 8 sample.
4. ~~**KPI Dashboard hard-coded.**~~ ✅ **Selesai** — `DashboardPage.jsx` kini fetch `getPju()` (counts: pju_survey=1.929, perlengkapan_jalan=5.119, billing.total_materai) + `getRuas()` (270 ruas, 4.540 km). KPI "Trayek Angkutan" & "Pengaduan Aktif" tetap placeholder (belum ada data sumber).
5. ~~**Choropleth data belum lengkap.**~~ ✅ **Bug fix selesai** — (a) `PetaTematikPage` sebelumnya pass `c` (seluruh response `{version,data}`) ke MapView, sekarang pass `c?.data ?? c`. (b) Nama kecamatan `purwareja klampok` (JSON, ada spasi) vs `purwarejaklampok` (GeoJSON, tanpa spasi) kini dinormalisasi via `normKec()` di `MapView.jsx`. Nilai 0 di beberapa kecamatan tetap ada — masalah **upstream** DB, bukan aplikasi.

### P2 — Selesai belakangan
5. **3 modul masih placeholder**: PKB, Angkutan & Terminal, OpenData. Semua `<Placeholder>` "Sedang dikembangkan". Data `onlinkid_parkir` (DB Supabase) sudah ada — perlu di-check: data PKB/terminal sudah tersedia di DB belum? Kalau belum, langkah pertama = export data dari sumber (BUPTDA, dsb) ke DB.
6. **Choropleth data belum lengkap.** Di `pju_choropleth.json`, banyak kecamatan nilainya 0 (Banjarmangu, Batur, Bawang, Kalibening dll). Cek apakah source DB (`onlinkid_parkir.wilayah_kecamatan`) memang belum terisi lengkap, atau hanya data parkir/jukir yang belum masuk ke kecamatan tersebut.
7. **Detail kecil di `ParkirPage.jsx`:** logika `p.ruas ? ... : '—'` (flag ada/tidaknya ruas) dipasangkan dengan display `p.id_ruasjalan` — benar secara logika, tapi kalau ada titik parkir tanpa id ruas, display jadi `—` padahal mungkin masih ada nama lokasi lain. Minor, tidak error.

## D. Yang Sudah Baik (tidak perlu disentuh)

- `PetaTematikPage.jsx`: Haversine length calc, fallback 2-titik, highlight ruas rusak auto — sudah solid
- `KecelakaanPage.jsx`: agregasi fatalitas per kecamatan + hot spot top 5 — selesai
- `PerkapPage.jsx` & `ParkirPage.jsx`: pagination, sorting, filter, chart — selesai
- Struktur `public/` & `data/` rapi, ada README.md di tiap folder data
- `handover.md` & `PROGRESS.md` sudah ada sebagai dokumentasi awal
