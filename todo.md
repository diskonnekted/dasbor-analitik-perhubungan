# TODO — Persiapan Meneruskan Aplikasi Dishub Banjarnegara

## 🔴 P0 — Halaman yang hilang (error 404/route kosong)

- [x] Buat `src/api/jalan.js`
  - [x] `getRuas()` → fetch `/pju_ruas.geojson` (251 ruas, sudah OSRM geocoded)
  - [x] `getRuasById(id)` → filter dari data local
- [x] Buat `src/pages/JalanPage.jsx`
  - [x] Filter: kelas jalan (I–VI), nama ruas, kecamatan
  - [x] Tabel: nama, kelas, panjang (km dari geometry Haversine), kondisi, kecamatan
  - [x] Peta Leaflet: polyline ruas, highlight per kelas
  - [x] Reuse `MapView` dari `src/components/map/`
- [x] Update `App.jsx` → import & register `JalanPage` ke route `/jalan`
- [x] Buat `src/pages/PjuPage.jsx`
  - [x] Data: `pju_ruas.geojson` layer `pju` (3.967 titik PJU)
  - [x] Tabel: id, nama ruas, status (aktif/rusak/standby), tipe lampu
  - [x] Filter: status, kecamatan, tipe
  - [x] Peta: cluster titik PJU, warna per status
- [x] Update `App.jsx` → import & register `PjuPage` ke route `/pju`

**Status P0: SELESAI** — `JalanPage.jsx` + `api/jalan.js` dan `PjuPage.jsx` + `api/pju.js` sudah dibuat & terdaftar di `App.jsx`. Build produksi sukses (2439 modul, 0 error), kedua halaman serve HTTP 200 di dev server.

## 🟠 P1 — Integrasi backend & data dinamis

- [ ] **Backend lapor-jalan** — `VITE_REPORTS_API` belum terisi / endpoint mati. Untuk menghidupkan: isi `VITE_REPORTS_API` di `.env`, backend harus bisa di-reach dari browser (CORS).
- [x] **Rebuild data laporan dari SQL dump** (tanpa Supabase):
  - [x] `scripts/build_keselamatan.py` — di-fix: path SQL `G:\Download\...` → `I:\perhubungan\public\onlinkid_rambu.sql`; `splitv()` kini strip kutipan SQL
  - [x] Jalankan: `python scripts/build_keselamatan.py` → `public/pengaduan.json` (14 record) + `public/riwayat.json` (14 record)
  - [x] `src/api/laporan.js` — tambah `getPengaduanLocal()`: gabung `pengaduan.json` + `riwayat.json`, otomatis aktif saat backend mati
  - [x] `getLaporanStats()` — hitung byStatus/pending/inProgress/resolved dari data lokal
  - [x] `getDamageTypes()` — fallback ke `/damage_types.json`
- [x] Hapus hard-coded `KPIS` di `DashboardPage.jsx`
  - [x] Hitung dari: `pju_ruas.geojson` (270 ruas, total 4.540 km via `computeRuasStats`), `pju_analysis.json` (`counts.pju_survey` = 1.929, `counts.perlengkapan_jalan` = 5.119), `billing.total_materai`
  - [x] KPI dinamis: Total PJU Aktif, Ruas Jalan Kabupaten, Titik Perlengkapan, Pendapatan Retribusi
  - [x] KPI statis (belum ada data): Trayek Angkutan (46), Pengaduan Aktif (12) — tetap placeholder
- [x] Perbaiki choropleth:
  - [x] Bug: `PetaTematikPage` set `choropleth` = seluruh response (`{version, data}`), tapi `MapView` akses `choropleth[name]` langsung → semua warna jadi "no-data". Fix: pass `c?.data ?? c`
  - [x] Bug: nama kecamatan `purwareja klampok` (dengan spasi, di JSON) vs `purwarejaklampok` (tanpa spasi, di GeoJSON) → tidak cocok. Fix: `normKec()` di `MapView.jsx` hapus semua spasi sebelum lookup
  - [ ] Nilai 0 di banyak kecamatan (Pagedangan, Karangkobar, Purwajati, Pejawangan, Madalongo, Mekarjati, Banjarejo, Susukan, Banjarnegara) — ini masalah **upstream**: DB `wilayah_kecamatan` memang belum terisi lengkap. Perlu: import data PJU per kecamatan dari DB, bukan dari JSON static
  - [ ] Tambah `counts.juru_parkir` & `counts.titik_parkir` ke `pju_analysis.json` (jika DB tersedia) agar bisa jadi KPI dinamis

**Status P1**: KPI Dashboard & choropleth SELESAI. Fallback DB lokal untuk laporan SELESAI (`pengaduan.json` dari SQL dump, otomatis aktif saat backend mati). Backend lapor-jalan aktif masih menunggu `VITE_REPORTS_API` diisi.

## 🟡 P2 — Modul placeholder

- [x] **PKB** (`/pkb`) — `PkbPage.jsx`
  - [x] Empty state + 3 langkah import data (DB `onlinkid_rambu` tidak punya tabel kendaraan/PKB)
  - [ ] Import data uji kendaraan (BUPTDA) ke DB + `public/pkb.json` → render tabel
- [x] **Angkutan & Terminal** (`/angkutan`) — `AngkutanPage.jsx`
  - [x] Tampilkan sebaran 2 titik (1 Terminal + 1 Halte) dari `perlengkapan_jalan.geojson` (jenis 27/28)
  - [ ] Data trayek, jadwal, armada belum ada di DB → tambah tabel `trayek`, export ke `public/trayek.geojson`
- [x] **OpenData** (`/opendata`) — `OpenDataPage.jsx`
  - [x] 10 dataset di `public/` (GeoJSON + JSON) dengan filter kategori, cari, unduh
  - [ ] Tambah metadata terakhir-update (timestamp) tiap dataset di manifest JSON

## ✅ P3 — Testing & handover

- [ ] Jalankan `npm run dev` → cek semua 11 route tidak ada error/blank page
- [ ] Cek `Peta Tematik` di layar kecil (overflow scroll)
- [ ] Update `handover.md` & `PROGRESS.md` dengan status terbaru
- [ ] Update `PETA_ANALISIS.md` / `README.md` jika ada perubahan fitur
- [ ] Tambah `.env` production (jika deploy ke Vercel):
  - `REPORTS_API`, `ONLINKID_DB_URL`, `ONLINKID_SERVICE_KEY` (lihat `.env.example`)

## ✅ P3 — Testing & handover

- [ ] Jalankan `npm run dev` → cek semua 11 route tidak ada error/blank page
- [ ] Cek `Peta Tematik` di layar kecil (overflow scroll)
- [ ] Update `handover.md` & `PROGRESS.md` dengan status terbaru
- [ ] Update `PETA_ANALISIS.md` / `README.md` jika ada perubahan fitur
- [ ] Tambah `.env` production (jika deploy ke Vercel):
  - `REPORTS_API`, `ONLINKID_DB_URL`, `ONLINKID_SERVICE_KEY` (lihat `.env.example`)

## 📎 Referensi cepat

| Item | Lokasi |
|---|---|
| Data GeoJSON ruas + PJU | `public/pju_ruas.geojson` |
| Data titik parkir/jukir | `public/pju_titik_parkir.geojson`, `public/pju_titik_jukir.geojson` |
| Data kecelakaan | `data/hasil_analisis/kecelakaan/` |
| Query SQL sumber | `data/onlinkid_parkir/` |
| Komponen peta (reuse) | `src/components/map/MapView.jsx`, `LayerControl.jsx`, `Legend.jsx` |
| Komponen chart | `src/components/charts/` |
| Env vars | `.env.example` |
