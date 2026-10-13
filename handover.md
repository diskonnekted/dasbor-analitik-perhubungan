# Dishub Banjarnegara Dashboard - Handover Dokumentasi

**Tanggal Handover:** 30 Agustus 2026  
**Periode:** Pekerjaan hari ini → Lanjutan besok  
**Status Proyek:** 70% selesai (7 dari 10 halaman)

---

## 🔄 UPDATE 2026-10-10 — Sesi Pengembangan P0–P3

> Status mutakhir. Bagian di bawah dokumen ini masih mereferensikan kondisi 30 Ags (70%). Baca dulu update ini.

**Yang sudah berubah sejak 30 Ags:**
- **Semua 11 modul kini aktif** — PKB, Angkutan & Terminal, OpenData bukan lagi placeholder:
  - `PkbPage.jsx` — empty state + 3 langkah import (DB belum ada data kendaraan)
  - `AngkutanPage.jsx` — sebaran 2 titik Terminal & Halte (jenis 27/28 `perlengkapan_jalan.geojson`)
  - `OpenDataPage.jsx` — 10 dataset publik dengan filter + unduh
- **Dashboard KPI dinamis** — `DashboardPage.jsx` fetch `getPju()` + `getRuas()` (bukan lagi hardcoded).
- **Backend laporan di-rebuild dari SQL dump** — `src/api/laporan.js` kini fallback 3 tingkat: `VITE_REPORTS_API` → `pengaduan.json`+`riwayat.json` (28 record, via `scripts/build_keselamatan.py`) → sample statis. Tidak butuh Supabase/Railway aktif.
- **Choropleth fix** — `PetaTematikPage` pass `c?.data ?? c` + `normKec()` di `MapView.jsx` (nama kecamatan `purwareja klampok` vs `purwarejaklampok`).
- **JalanPage + PjuPage sudah dibuat** (P0) — `JalanPage.jsx`, `api/jalan.js`, `PjuPage.jsx`, `api/pju.js` terdaftar di `App.jsx`.

**Test P3 (2026-10-10):** 11 halaman serve HTTP 200, 31 endpoint data tidak ada yang 404, `npm run build` sukses (0 error, ~21s), bundle 922 KB memuat semua halaman.

**Sisa / belum selesai:**
- Data trayek, jadwal & armada (Angkutan) — belum ada di DB, halaman menampilkan empty state.
- Data uji kendaraan (PKB) — belum ada di DB, halaman menampilkan empty state.
- `VITE_REPORTS_API` — backend lapor-jalan masih mati, aplikasi fallback ke DB lokal (sudah berfungsi).
- Choropleth kecamatan bernilai 0 — masalah upstream DB `wilayah_kecamatan` belum terisi.

**Dev server:** port **5180** (bukan 5173 — port 5173 dipakai aplikasi lain): `npm run dev -- --port 5180`

---

## 1. APA YANG SUDAH SELESAI HARI INI

### Dokumen yang Dibuat

| No | Dokumen | Status | Deskripsi |
|----|---------|--------|-----------|
| 1 | [PROGRESS.md](PROGRESS.md) | ✅ Selesai | Dokumentasi progress proyek lengkap |
| 2 | [PENGEMBANGAN.md](PENGEMBANGAN.md) | ✅ Selesai | Rencana pengembangan analitik strategis (13 initiatives) |
| 3 | [TODO.md](TODO.md) | ✅ Selesai | Checklist task terstruktur (355 tasks, 15 initiatives) |

### Progress Halaman Aplikasi

| Halaman | Status | Catatan |
|---------|--------|---------|
| Dashboard | ✅ Selesai | 6 KPI cards (tapi hardcoded/static) |
| Peta Tematik | ✅ Selesai | 7 layer data, choropleth, clustering |
| Laporan | ✅ Selesai | Tabel pengaduan dengan filter + map |
| Jalan (Ruas) | ✅ Selesai | 251 ruas, charts, pagination |
| Perlengkapan | ✅ Selesai | ~1,147 equipment, cluster map |
| PJU | ✅ Selesai | 3,967 titik, billing, regression |
| Parkir | ✅ Selesai | 11 titik, 12 juru, map |
| Keselamatan | ✅ Selesai | Dummy accident data |
| PKB | ⏳ Placeholder | Belum diimplementasi |
| Angkutan | ⏳ Placeholder | Belum diimplementasi |
| OpenData | ⏳ Placeholder | Belum diimplementasi |

---

## 2. ANALISA DATA GAP — KRITIS UNTUK DILEWATI BESOK

### Data yang SUDAH ADA dan Bisa Langsung Dipakai

| Data Source | Volume | Siap Pakai? | Catatan |
|-------------|--------|-------------|---------|
| `pju_analysis.json` | 3,967 PJU | ✅ Ya | Billing, jenis lampu, kondisi, daya ada lengkap |
| `pju_ruas.geojson` | 251 ruas | ✅ Ya | Panjang, lebar, kecamatan ada |
| `perlengkapan_jalan.geojson` | ~1,147 equipment | ✅ Ya | Kondisi, posisi, jenis ada |
| `parkir_analysis.json` | 11 titik, 12 juru | ✅ Ya | Setoran bulanan ada |
| `pengaduan.json` | ~63 laporan | ⚠️ Partial | **Tidak ada koordinat** |
| `riwayat.json` | 7 records | ⚠️ Minimal | Hanya 7 record, perlu lebih banyak |
| `peta_kecamatan.geojson` | 20 kecamatan | ✅ Ya | |
| CKAN API | 5 datasets | ✅ Ya | Endpoint tersedia |

### Data yang HILANG dan Harus Ditambahkan SEBELUM TODO Tertentu Bisa Jalan

| # | Data yang Hilang | Blocks TODO | Urgency | Cara Mengambil |
|---|-----------------|-------------|---------|---------------|
| 1 | `tanggal_instalasi` di perlengkapan | 4.2, 4.5, 4.7, 4.8 (Equipment Lifecycle) | 🔴 Kritis | Ekstrak dari DB `onlinkid_rambu.perlengkapan_jalan` di `D:\xampp\htdocs\pju` |
| 2 | `biaya_perbaikan` di riwayat | 4.3, 4.9 (Cost Tracking) | 🔴 Kritis | Ekstrak dari DB backend |
| 3 | Koordinat (`lat`/`lng`) pengaduan | 5.6, 5.16 (Spatial Analytics) | 🔴 Kritis | Geocode manual ~63 alamat pengaduan |
| 4 | Data kecelakaan nyata (Satlantas) | 9.1-9.25 (Road Safety) | 🔴 Kritis | Koordinasi Polres Banjarnegara |
| 5 | Field `kelas` & `status` di ruas | 3.1-3.6 (RHI) | 🔴 Kritis | Update DB `pju.ruas_jalan` — 98% NULL |
| 6 | Historical `histori_setoran` | 8.4 (Revenue Forecasting) | 🔴 Kritis | Ekstrak dari DB `siap.parkir` di `D:\xampp\htdocs\siap2` |
| 7 | `target_setoran` retribusi | 2.4-2.5 (Revenue Comparison) | 🟡 High | Data internal Dishub |
| 8 | Data penduduk per kecamatan (BPS) | 3.2, 7.1 (RHI normalization) | 🟡 High | Download dari website BPS Banjarnegara |

### Ringkasan Data Gap

- **85% tasks di TODO bisa jalan** dengan data yang sudah ada
- **15% tasks BLOCKED** menunggu data tambahan
- **Prioritas urutan:** Data backend DB → Geocoding pengaduan → Koordinasi Satlantas

---

## 3. PRIORITAS PEKERJAAN BESOK

### Besok: Mulai dari TODO #1 (Dashboard Data Integration)

**TODO #1 tidak butuh data tambahan.** Semua data yang diperlukan sudah ada di API modules.

#### Task Besok (High Priority):

```
1.1  Buat src/api/dashboard.js — aggregator API
1.2  Buat src/components/dashboard/LiveKpiCard.jsx
1.3  Hubungkan KPI "Total PJU Aktif" → computePjuStats()
1.4  Hubungkan KPI "Ruas Jalan" → computeRuasStats()
1.5  Hubungkan KPI "Titik Parkir" → computeParkirStats()
1.6  Hubungkan KPI "Trayek Angkutan" → fetch CKAN
1.7  Hubungkan KPI "Pendapatan Retribusi" → gabungan parkir + PJU
1.8  Hubungkan KPI "Pengaduan Aktif" → gabungan laporan + keselamatan
1.9  Tambahkan trend indicator
1.10 Update DashboardPage.jsx
```

**Estimasi:** 6-8 jam (1 hari kerja)

### Hari ke-2: Lanjut ke TODO #6 dan #11

```
6.1  Buat src/api/dataQuality.js
11.1 Buat src/context/FilterContext.jsx
11.2 Implementasi filter state
11.3 Buat GlobalFilterBar.jsx
```

### Hari ke-3: Mulai TODO #2 (Financial Analytics)

```
2.1  computeCostPerLamp()
2.2  computeEfficiencyRatio()
2.3  detectRevenueLeakage()
2.4  compareSetoranVsTarget() ← butuh target_setoran data dulu
```

---

## 4. INFO TEKNIS PENTING UNTUK DEVELOPER BARU

### 4.1 Struktur Project

```
i:\perhubungan\
├── src/
│   ├── api/                    # 6 API modules (jalan, pju, parkir, perlengkapan, keselamatan, laporan)
│   ├── components/
│   │   ├── dashboard/          # LiveKpiCard (buat besok)
│   │   ├── filters/            # GlobalFilterBar (buat hari ke-2)
│   │   └── map/                # 5 map components
│   ├── pages/                  # 10 halaman (8 selesai, 3 placeholder)
│   └── utils/                  # Helper functions
├── public/                     # Static JSON/GeoJSON (14 file)
├── public/*.sql                # 2 SQL dumps (onlinkid_rambu.sql, rambu.sql)
├── PROGRESS.md                 # Progress documentation
├── PENGEMBANGAN.md             # Strategic development plan
├── TODO.md                     # Task checklist (355 tasks)
└── handover.md                 # File ini
```

### 4.2 Pola Data Access (HARUS Dipahami)

Setiap API module punya pola yang sama:
```javascript
// 1. Cache di memory (menghindari fetch berulang)
let cache = null;
let loadingPromise = null;

// 2. Fetch dari static JSON
const data = await fetch('/pju_analysis.json');

// 3. Fallback chain: API → Vercel → Local → In-code fallback
```

**Jangan ubah pola ini.** Semua 6 API modules mengikuti pola yang sama.

### 4.3 Backend Database (Referensi - Tidak Ada di Repo Ini)

| Sistem | Lokasi | DB | Tabel Penting |
|--------|--------|----|---------------|
| PJU System | `D:\xampp\htdocs\pju` | `pju` | ruas_jalan, perlengkapan_jalan, pju, idpel_terpasang, tagihan, pengaduan |
| SIAP2 Parking | `D:\xampp\htdocs\siap2` | `siap` | titik_parkir, juru_parkir, titik_jukir |
| Laporan (Cloud) | Railway.app | Supabase | laporan, kerusakan |

### 4.4 Cara Menjalankan Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build production
npm run build
```

Dev server berjalan di `http://localhost:5173`

### 4.5 API Modules — Quick Reference

| Module | Path | Fungsi Utama | Data Source |
|--------|------|-------------|-------------|
| `jalan.js` | `src/api/jalan.js` | `getRuas()`, `computeRuasStats()` | `public/pju_ruas.geojson` |
| `pju.js` | `src/api/pju.js` | `getPju()`, `computePjuStats()`, `buildYearlyIncomeTrend()` | `public/pju_analysis.json` |
| `parkir.js` | `src/api/parkir.js` | `getParkir()`, `computeParkirStats()` | `public/parkir_analysis.json` |
| `perlengkapan.js` | `src/api/perlengkapan.js` | `getPerkap()`, `computePerkapStats()` | `public/perlengkapan_jalan.geojson` |
| `keselamatan.js` | `src/api/keselamatan.js` | `getKeselamatan()`, `buildAccidentTrend()` | pengaduan + perlengkapan + riwayat |
| `laporan.js` | `src/api/laporan.js` | `getLaporan()`, `getLaporanStats()` | Railway API → JSON → fallback |

### 4.6 Chart Components yang Sudah Ada

Semua halaman menggunakan **Recharts** (bukan chart library lain):
- `BarChart`, `Bar` — Bar charts (Jalan, Perkap)
- `PieChart`, `Pie`, `Cell` — Donut/Pie charts (Perkap, PJU, Parkir)
- `AreaChart`, `Area` — Area charts (PJU billing, Keselamatan trend)
- `LineChart`, `Line` — Line charts (PJU regression prediction)

### 4.7 Map Components

| Component | Path | Library | Fitur |
|-----------|------|---------|-------|
| `MapView` | `src/components/map/MapView.jsx` | react-leaflet | 7 layers, choropleth, clustering |
| `PerkapMapNew` | `src/components/map/PerkapMapNew.jsx` | vanilla Leaflet | SVG donut charts, 5-level zoom clustering |
| `ParkirMap` | `src/components/map/ParkirMap.jsx` | vanilla Leaflet | Circle markers, DivIcon badges |
| `KeselamatanMap` | `src/components/map/KeselamatanMap.jsx` | vanilla Leaflet | Safety overlay (placeholder) |

### 4.8 Common Pitfalls

1. **Dashboard hardcoded values** — Jangan copy-paste angka dari DashboardPage.jsx, semuanya statis
2. **Keselamatan dummy data** — ACCIDENT_STATS di `keselamatan.js` adalah dummy, jangan dianggap real
3. **Pengaduan tanpa koordinat** — Field `lokasi` 100% kosong, semua pengaduan tanpa lat/lng
4. **SQL files besar** — `onlinkid_rambu.sql` dan `rambu.sql` masing-masing 5.5MB, hati-hati saat dibuka
5. **Kecamatan choropleth nol** — `pju_choropleth.json` hampir semua kecamatan nilai 0 (hanya Banjarnegara & Kalibening ada data)

### 4.9 External APIs

| API | Endpoint | Rate Limit | Notes |
|-----|----------|-----------|-------|
| CKAN | `https://opendata.banjarnegarakab.go.id/api/3/...` | - | 5 datasets tersedia |
| Railway API | `https://lapor-jalan-backend.up.railway.app/api/...` | - | Laporan backend |
| OSRM | `https://router.project-osrm.org/route/v1/...` | Public | Road polyline enrichment |

### 4.10 File Config Penting

| File | Purpose |
|------|---------|
| `package.json` | Dependencies dan scripts |
| `vite.config.js` | Vite configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `src/App.jsx` | Main routing (semua routes terdefinisi di sini) |
| `src/main.jsx` | React entry point |

---

## 5. OPEN QUESTIONS / BLOCKERS UNTUK DIBAHAS BERSAMA

### Blockers (Harus di-clear sebelum coding)

| # | Question | Dampak | Owner |
|---|----------|--------|-------|
| 1 | Apakah `tanggal_instalasi` ada di DB `perlengkapan_jalan`? | Blocks TODO #4 (Equipment Lifecycle) | Developer + DB Admin |
| 2 | Apakah `kelas` dan `status` bisa di-populate di `ruas_jalan`? | Blocks TODO #3 (Road Health) | Developer + DB Admin |
| 3 | Apakah ada data `histori_setoran` di DB `siap.parkir`? | Blocks TODO #8 (Time-Series) | Developer + DB Admin |
| 4 | Bagaimana akses ke data Satlantas kecelakaan? | Blocks TODO #9 (Road Safety) | Project Manager |
| 5 | Apakah data penduduk BPS sudah tersedia? | Blocks TODO #3 (RHI normalization) | Project Manager |

### Questions (Bisa dijawab sambil coding)

| # | Question | Default Decision (jika belum clear) |
|---|----------|-------------------------------------|
| 1 | Warna brand Dishub untuk design system? | Gunakan warna biru primary (#1e3a5f) yang sudah ada |
| 2 | Format export PDF — landscape atau portrait? | Default landscape untuk semua halaman |
| 3 | JWT auth untuk real-time monitoring? | Placeholder dulu, tanpa auth di Phase 1 |
| 4 | CKAN dataset mana yang prioritas? | Dataset #1 (Aset Transport) dan #4 (Vehicle Testing) |

---

## 6. FILE YANG PERLU DIBUKA BESOK (Quick Access)

### Untuk TODO #1 (Dashboard Integration) — PERTAMA:

| File | Alasan |
|------|--------|
| `src/pages/DashboardPage.jsx` | Target halaman yang akan diubah |
| `src/api/dashboard.js` | **File baru yang akan dibuat** — aggregator |
| `src/api/jalan.js` | Baca `computeRuasStats()` untuk referensi |
| `src/api/pju.js` | Baca `computePjuStats()` untuk referensi |
| `src/api/parkir.js` | Baca `computeParkirStats()` untuk referensi |
| `src/api/keselamatan.js` | Baca `computePengaduanStats()` untuk referensi |
| `src/api/laporan.js` | Baca `getLaporanStats()` untuk referensi |

### Untuk TODO #3 (Road Health) — KEDUA:

| File | Alasan |
|------|--------|
| `src/api/jalan.js` | Tambah `calculateRHI()` dan `detectRoadDegradation()` |
| `public/pju_ruas.geojson` | Baca struktur data ruas jalan |
| `public/peta_kecamatan.geojson` | Baca batas kecamatan |

### Untuk TODO #4 (Equipment Lifecycle) — KETIGA:

| File | Alasan |
|------|--------|
| `D:\xampp\htdocs\pju` | Backend CodeIgniter — ekstract `tanggal_instalasi` |
| `public/perlengkapan_jalan.geojson` | Update dengan field baru |
| `public/riwayat.json` | Update dengan `biaya_perbaikan` |

---

## 7. DATA EXTRACTION GUIDE — UNTUK DB ADMIN

### Step 1: Ekstrak `tanggal_instalasi` dari PJU Database

```sql
-- Jalankan di phpMyAdmin atau MySQL CLI
USE pju;

-- Cek apakah kolom tanggal_instalasi sudah ada
DESCRIBE perlengkapan_jalan;

-- Jika BELUM ada, tambahkan:
ALTER TABLE perlengkapan_jalan 
ADD COLUMN tanggal_instalasi DATE NULL AFTER status;

-- Jika sudah ada, export ke JSON:
SELECT 
    id,
    id_jenis,
    nama,
    kondisi,
    status,
    tanggal_instalasi,
    posisi,
    tgl_insert,
    id_ruasjalan,
    geom
FROM perlengkapan_jalan
WHERE tanggal_instalasi IS NOT NULL
INTO OUTFILE 'C:/xampp/htdocs/pju/public/perlengkapan_jalan_with_install_date.geojson';
```

### Step 2: Ekstrak `biaya_perbaikan` dari Riwayat

```sql
USE pju;

DESCRIBE riwayat_pemeliharaan;

-- Jika kolom biaya_perbaikan belum ada:
ALTER TABLE riwayat_pemeliharaan 
ADD COLUMN biaya_perbaikan DECIMAL(12,2) NULL AFTER jenis_pemeliharaan;
```

### Step 3: Update `kelas` dan `status` di ruas_jalan

```sql
USE pju;

-- Cek berapa persen yang NULL
SELECT 
    SUM(CASE WHEN kelas IS NULL THEN 1 ELSE 0 END) as null_kelas,
    COUNT(*) as total,
    ROUND(SUM(CASE WHEN kelas IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as persen_null
FROM ruas_jalan;

-- Kelas bisa diisi berdasarkan:
-- - Jalan Nasional = Kelas I
-- - Jalan Provinsi = Kelas II-III
-- - Jalan Kabupaten = Kelas IV-VI
-- Referensi: https://opendata.banjarnegarakab.go.id/dataset/area-kecamatan
```

### Step 4: Ekstrak `histori_setoran` dari SIAP2

```sql
USE siap;

-- Cek struktur tabel parkir
SHOW TABLES LIKE '%setoran%';
SHOW TABLES LIKE '%retribusi%';

-- Cari tabel yang menyimpan historis setoran per bulan
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'siap' 
  AND TABLE_NAME LIKE '%parkir%';
```

---

## 8. CHECKLIST SEBELUM MULAI BESOK

- [ ] Semua file TODO.md sudah dibaca dan dipahami
- [ ] PROGRESS.md sudah dibaca untuk konteks proyek
- [ ] PENGEMBANGAN.md sudah dibaca untuk arah strategis
- [ ] Dev server bisa dijalankan: `npm run dev`
- [ ] Akses ke database `D:\xampp\htdocs\pju` dan `D:\xampp\htdocs\siap2` (jika perlu)
- [ ] Data tambahan (8 items di section Data Gap) sudah dikumpulkan (jika memungkinkan)
- [ ] Open questions sudah diklarifikasi dengan stakeholder
- [ ] Browser development tools siap digunakan
- [ ] Git configured dan branch siap untuk feature work

---

## 9. RINGKASAN CEPAT (TL;DR)

**Apa yang sudah selesai:**
- 7 dari 10 halaman aplikasi (70%)
- 6 API modules dengan caching pattern konsisten
- 5 map components dengan clustering
- 14 static JSON files
- Dokumen: PROGRESS.md, PENGEMBANGAN.md, TODO.md

**Apa yang harus dikerjakan besok (prioritas):**
1. **TODO #1** — Dashboard Data Integration (10 tasks, 8 SP)
   - Buat `src/api/dashboard.js` dan `src/components/dashboard/LiveKpiCard.jsx`
   - Hubungkan 6 KPI cards dari hardcoded → real data
   - **Tidak butuh data tambahan, semua sudah ada**

**Apa yang butuh data tambahan (bukan besok, tapi diingatkan):**
1. Ekstrak `tanggal_instalasi` dari DB backend
2. Update field `kelas` dan `status` di ruas jalan
3. Geocode ~63 pengaduan (tambah lat/lng)
4. Koordinasi Satlantas untuk data kecelakaan
5. Download data BPS penduduk per kecamatan

**Tech stack yang dipakai:**
- Frontend: React 18.3 + Vite 5.4 + Tailwind CSS 3.4
- Charts: Recharts 2.13
- Maps: Leaflet 1.9 + react-leaflet 4.2
- Backend: CodeIgniter 4 (PJU) + Laravel (Parking) + Supabase (Laporan)
- Database: MySQL/MariaDB 10.5

**API modules yang sudah ada:**
- `src/api/jalan.js` — Road network
- `src/api/pju.js` — Street lighting & billing
- `src/api/parkir.js` — Parking management
- `src/api/perlengkapan.js` — Road equipment
- `src/api/keselamatan.js` — Safety & complaints
- `src/api/laporan.js` — Damage reporting

---

**Dokumen ini dibuat otomatis dari analisa kode dan data proyek.**  
**Pertanyaan? Baca TODO.md untuk task detail, PENGEMBANGAN.md untuk strategi, PROGRESS.md untuk status.**
