# Dishub Banjarnegara Dashboard - Dokumentasi Progress

## Ringkasan Proyek

**Nama:** Dishub Banjarnegara Dashboard  
**Tujuan:** Dashboard analitik untuk Dinas Perhubungan Kabupaten Banjarnegara, Jawa Tengah  
**Domain:** Manajemen infrastruktur jalan, penerangan jalan umum (PJU), administrasi parkir, keselamatan transportasi, pengujian kendaraan berkala (PKB), dan pelaporan pengaduan masyarakat  
**Status:** Development - 11 dari 11 halaman selesai (100%) — diperbarui 2026-10-10

---

## Progress Halaman

> Perbarui: 2026-10-10. Tabel status asli di bawah diarsipkan; status mutakhir di tabel "Update" ini.

| # | Halaman | Status | Deskripsi |
|---|---------|--------|-----------|
| 1 | **Dashboard** | ✅ Selesai | KPI dinamis (`getPju()` + `getRuas()`), bukan lagi hardcoded |
| 2 | **Peta Tematik** | ✅ Selesai | 7 layer; choropleth fix (`c?.data ?? c` + `normKec()`) |
| 3 | **Laporan** | ✅ Selesai | Fallback 3 tingkat: backend → `pengaduan.json` (28 record dari SQL dump) → sample |
| 4 | **Jalan (Ruas)** | ✅ Selesai | `JalanPage.jsx` + `api/jalan.js` (270 ruas, 4.540 km) |
| 5 | **Perkap** | ✅ Selesai | 5.119 titik, cluster map |
| 6 | **PJU** | ✅ Selesai | `PjuPage.jsx` + `api/pju.js` (tren tagihan, KPI card) |
| 7 | **Parkir** | ✅ Selesai | 11 titik + 12 juru |
| 8 | **Keselamatan** | ✅ Selesai | Fatalitas + hot spot |
| 9 | **PKB** | ✅ Selesai (empty state) | `PkbPage.jsx` — DB belum ada data kendaraan, halaman tampilkan langkah import |
| 10 | **Angkutan** | ✅ Selesai (sebagian) | `AngkutanPage.jsx` — sebaran 2 titik Terminal & Halte; data trayek/jadwal belum ada di DB |
| 11 | **OpenData** | ✅ Selesai | `OpenDataPage.jsx` — 10 dataset publik, filter + unduh |

---

## Teknologi yang Digunakan

### Frontend
| Teknologi | Versi | Peran |
|-----------|-------|-------|
| React | 18.3.1 | UI Framework |
| Vite | 5.4.8 | Build Tool, Dev Server |
| Tailwind CSS | 3.4.13 | Utility-first Styling |
| Leaflet | 1.9.4 | Interactive Mapping |
| react-leaflet | 4.2.1 | React Bindings for Leaflet |
| Recharts | 2.13.0 | Chart Visualization |
| lucide-react | 0.460.0 | Icon Library |

### Backend & Database
| Teknologi | Platform | Peran |
|-----------|----------|-------|
| CodeIgniter 4 | Lokal (XAMPP) | PJU System Backend |
| Laravel | Lokal (XAMPP) | SIAP2 Parking System |
| MySQL/MariaDB 10.5 | Lokal | Database Utama |
| Supabase | Cloud | Laporan Backend |
| Railway.app | Cloud | Laporan API Hosting |

---

## Arsitektur Sistem

```
Static JSON/GeoJSON (public/)  ──┐
                                 ├──> React Pages (useState + useEffect)
CKAN OpenData API ───────────────┤
                                 ├──> Recharts Charts (Bar, Pie, Area, Line)
External APIs (Railway/Vercel) ──┤
                                 └──> Leaflet Maps (GeoJSON, CircleMarker, divIcon)
Supabase Backend ────────────────┘
```

### Pola Data Access (Static-First with API Fallback)
1. Fetch dari primary source (static JSON/GeoJSON di `public/`)
2. Jika API layer gagal → gunakan cached data di memory
3. Jika semua gagal → return empty/default structure

### State Management
- React `useState` untuk semua state (tanpa Redux/Zustand/Context)
- `useMemo` untuk derived/filtered data
- `useEffect` untuk data fetching dan side effects
- Tidak ada global store; setiap page mengelola state sendiri

### Map Rendering (Hybrid Pattern)
- **react-leaflet:** Declarative GeoJSON rendering (`MapView.jsx`, `PerkapMap.jsx`)
- **vanilla Leaflet:** Imperative approach (`ParkirMap.jsx`, `PerkapMapNew.jsx`, `KeselamatanMap.jsx`)

---

## Sumber Data

### 1. Static JSON/GeoJSON (bundled di `public/`)

| File | Database Source | Deskripsi |
|------|----------------|-----------|
| `pju_analysis.json` | `pju.pju` + `perlengkapan_jalan` + `idpel_terpasang` + `tagihan` + `lmandiri` | Analitik PJU: jumlah per tipe lampu, kondisi, sumber daya, data billing, tagihan bulanan |
| `parkir_analysis.json` | `siap.PARKIR.sql` (master 2021) | Master parkir: juru_parkir (12), titik_jukir (8), titik_parkir (11) |
| `pju_ruas.geojson` | `pju.ruas_jalan` + OSRM enrichment | 270 ruas jalan dengan koordinat dan polyline |
| `pju_titik_parkir.geojson` | `onlinkid_parkir.titik_parkir` | 11 lokasi titik parkir |
| `pju_titik_jukir.geojson` | `onlinkid_parkir.titik_jukir` | Penugasan juru parkir (jukir) |
| `pju_choropleth.json` | Derived data | Choropleth lookup per kecamatan |
| `perlengkapan_jalan.json` | `onlinkid_rambu.perlengkapan_jalan` (~1147 records) | Equipment jalan dengan koordinat dan kondisi |
| `perlengkapan_jalan.geojson` | Sama seperti di atas | Versi GeoJSON dari equipment jalan |
| `perlengkapan_jenis.json` | `onlinkid_rambu.jenis_perlengkapan` | Katalog tipe equipment (12 jenis: APILL, Rambu, PJU, Marka, Guardrail) |
| `pengaduan.json` | `onlinkid_rambu.pengaduan` (~63 records) | Pengaduan masyarakat dengan status dan jenis |
| `riwayat.json` | - | Riwayat maintenance/repair |
| `peta_kecamatan.geojson` | Geo spatial | 20 batas kecamatan |
| `peta_desa.geojson` | Geo spatial | Batas desa/kelurahan |
| `damage_types.json` | Bina Marga classification | 14 jenis kerusakan jalan standar |
| `ruas_jalan_db.json` | `pju.ruas_jalan` | Data mentah ruas jalan (ID, nomor, panjang, lebar, lat/lng) |

### 2. SQL Database Dump

| File | Database | Deskripsi |
|------|----------|-----------|
| `public/onlinkid_rambu.sql` | `onlinkid_rambu` (MariaDB 10.5) | Full dump: tabel `berita`, `gambar_rambu`, `perlengkapan_jalan`, `jenis_perlengkapan` |
| `public/rambu.sql` | - | Subset data rambu jalan |

### 3. External APIs

| API | Platform | Endpoint | Data |
|-----|----------|----------|------|
| **Lapor-Jalan Backend** | Railway.app | `https://lapor-jalan-backend.up.railway.app/api/laporan` | Kerusakan jalan (status, jenis, lokasi, foto) |
| **OpenData Banjarnegara** | CKAN | `https://opendata.banjarnegarakab.go.id/api/3/...` | 5 dataset: Aset Transport, Keselamatan, Pendapatan Parkir, Pengujian Kendaraan, Area Kecamatan |
| **OSRM Public Router** | project-osrm.org | `https://router.project-osrm.org/route/v1/driving/...` | Enrichment polyline jalan untuk GeoJSON |

### 4. Backend Database (Referensi - Tidak Ada di Repository Ini)

#### PJU System (CodeIgniter 4)
- **Lokasi:** `D:\xampp\htdocs\pju` (development, tidak ada di repo)
- **Framework:** CodeIgniter 4 + Nifty v2.5 Template
- **Database:** MySQL, database `pju`
- **Tabel:** `ruas_jalan`, `jenis_perlengkapan`, `perlengkapan_jalan`, `pju`, `idpel_terpasang`, `tagihan`, `pengaduan`, `lmandiri`
- **Key Figures:** 251 ruas jalan, 885.8 km total, 3,967 unit PJU

#### SIAP2 Parking System (Laravel)
- **Lokasi:** `D:\xampp\htdocs\siap2` (development, tidak ada di repo)
- **Framework:** Laravel (Query Builder)
- **Database:** MySQL, database `siap`
- **Tabel:** `wilayah_*`, `ruas_jalan`, `titik_parkir`, `juru_parkir`, `pengelola_perorangan`, `pengelola_badan`, `titik_jukir`, `pengaduan`, `sk_perorangan`, `sk_badan`, `tahun_pengelolaan`, `pejabat`
- **Key Figures:** 277 titik parkir, 485 juru parkir, Rp 1.35M pendapatan parkir

---

## Statistik Proyek

| Metric | Value |
|--------|-------|
| React page components | 10 (8 selesai, 3 placeholder) |
| Map components | 5 (`MapView`, `ParkirMap`, `PerkapMap`, `PerkapMapNew`, `KeselamatanMap`) |
| API service modules | 6 (`jalan`, `perlengkapan`, `pju`, `parkir`, `keselamatan`, `laporan`) |
| Static JSON files | 14 (di `public/` dan `dist/`) |
| GeoJSON files | 5 (`peta_kecamatan`, `peta_desa`, `pju_ruas`, `pju_titik_parkir`, `pju_titik_jukir`, `perlengkapan_jalan`) |
| SQL dump files | 2 (`onlinkid_rambu.sql`, `rambu.sql`) |
| Image assets | 200+ (foto equipment, simbol rambu, foto portrait) |
| Python scripts | 1 (`preprocess-osrm.py` untuk road polyline enrichment) |

---

## Fitur yang Belum Diimplementasi

| Halaman | Deskripsi | Sumber Data |
|---------|-----------|-------------|
| **PKB** | Pengujian Kendaraan Berkala - analitik pengujian kendaraan | OpenData CKAN dataset #4 |
| **Angkutan** | Transportasi & Terminal - halts, routes, terminals, taxi | OpenData CKAN dataset #1 |
| **OpenData** | Repository page untuk semua 5 CKAN datasets + CSV download | CKAN API |
