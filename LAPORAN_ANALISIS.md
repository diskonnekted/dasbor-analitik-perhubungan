# Laporan Analisis & Rekomendasi Dasbor Analitik
## **Dinas Perhubungan Kabupaten Banjarnegara**

> **Status:** Analisis & Rekomendasi (Pra-Implementasi)
> **Tanggal:** 2026-08-29
> **Lokasi Kerja:** `I:\perhubungan`

---

## 1. Ringkasan Eksekutif

Dasbor analitik yang akan dibangun adalah **single-page application (SPA)** berbasis React yang mengonsolidasikan data operasional **3 sistem internal** + **5 dataset OpenData** milik Dinas Perhubungan Banjarnegara. Tujuannya adalah menyediakan **satu jendela informasi** (single source of truth) untuk pengambilan keputusan Kepala Dinas, Kabid, dan Kasi.

**Nilai Tambah Dasbor:**
- Memvisualisasikan data yang selama ini tercecer di 2 aplikasi terpisah (SIAP2 & PJU) + 5 dataset OpenData.
- Mendukung analisis lintas-domain: **Jalan ↔ Perlengkapan ↔ Parkir ↔ Angkutan ↔ Keselamatan**.
- Mempercepat pelaporan kepada **Bappeda, BPKAD, dan Publik**.

---

## 2. Sumber Data yang Telah Dipetakan

### 2.1 Referensi Arsitektur: `I:\pariwisatav2`

| Aspek | Detail |
|---|---|
| **Framework** | React 18 + Vite 6 |
| **Styling** | Tailwind CSS v4 (neo-brutalist / retro-industrial) |
| **Visualisasi** | Recharts (line, bar, area, pie) |
| **Peta** | Leaflet + react-leaflet |
| **Ikon** | lucide-react |
| **Font** | JetBrains Mono + Inter + Playfair Display |
| **Struktur** | SPA 10 tab: Dashboard, Analisa Lanjutan, Peta Tematik, Event, Cagar Budaya, Investasi, OpenData, Smart Weather, Bencana, UMKM |
| **State** | Lokal (useState), JSON statis |

**Insight:** Pola ini terbukti efektif untuk dasbor SKPD. Kita akan **replikasi arsitektur** dan **style guide** dengan penyesuaian domain Perhubungan.

---

### 2.2 Sistem Internal #1: `D:\xampp\htdocs\pju` (CodeIgniter 4)

**Tujuan:** Sistem Informasi Manajemen **Perlengkapan Jalan & PJU** (SIMPEL JALAN).

**Tech Stack:** CodeIgniter 4, MySQL (db: `pju`), Template Nifty v2.5.

**Database Schema Inti:**

| Tabel | Fungsi | Kolom Kunci |
|---|---|---|
| `ruas_jalan` | Master ruas jalan | `nomor_ruas`, `nama_ruas`, `titik_awal`, `titik_akhir`, `panjang` (km), `lebar`, `kelas` |
| `jenis_perlengkapan` | Master kategori | `id`, `nama`, `gambar` (Rambu, PJU, APILL, Marka, dll) |
| `perlengkapan_jalan` | Data titik per ruas | `id_ruas`, `id_jenis`, `lat`, `lng`, `kondisi`, `nama`, `foto`, `tgl_pasang` |
| `pju` | Detail PJU (sub=jenis) | `id_perlengkapan`, `jenis_lampu`, `daya_watt`, `sumber_listrik` |
| `idpel_terpasang` | Pelanggan PLN | `idpel`, `nama`, `alamat`, `tarif` |
| `tagihan` | Tagihan listrik | `blth`, `idpel`, `kwh`, `total_pembayaran` |
| `pengaduan` | Pengaduan masyarakat | `nama`, `lokasi`, `keterangan`, `foto`, `status` |
| `lmandiri` | Laporan mandiri | `id_perlengkapan`, `kondisi`, `tgl_lapor`, `pelapor` |

**Fakta Operasional:**
- **251 ruas jalan** kabupaten, total **885,8 km**.
- **Kondisi jalan**: Baik 58,007% • Sedang 19,598% • Rusak Ringan 14,005% • Rusak Berat 8,390%.
- Ribuan titik PJU, ratusan rambu, APILL, marka — semuanya punya koordinat GPS.
- Tagihan listrik PJU per bulan tersedia historis.

**Endpoint API Existing (siap dipakai):**
- `app\Controllers\Peta.php` → `perlengkapan()` & `perlengkapan2()` (return JSON marker).
- `app\Controllers\Dashboard.php` → counter jenis perlengkapan.
- `app\Controllers\Admin\Pju.php` → tagihan listrik + grafik bulanan.

**Strategi Integrasi:** Bangun **REST API wrapper** ringan (mis. CodeIgniter 4 controller di folder `app/Controllers/Api/`) yang expose data PJU ke frontend. Tidak perlu migrasi database.

---

### 2.3 Sistem Internal #2: `D:\xampp\htdocs\siap2` (Laravel)

**Tujuan:** **Sistem Informasi Administrasi Perparkiran** (bukan sistem izin angkutan seperti dugaan awal). Nama "SIAP" = **SI**stem **A**dministrasi **P**arkir.

**Tech Stack:** Laravel (versi default), MySQL, Blade Template. Tanpa Eloquent model — pakai **Query Builder** langsung. Password MD5 (perlu di-upgrade nanti).

**Database Schema Inti:**

| Tabel | Fungsi | Kolom Kunci |
|---|---|---|
| `users` | Akun admin/operator | `id_users`, `username`, `password` (MD5), `nama`, `level` |
| `wilayah_provinsi/kabupaten/kecamatan/desa` | Master wilayah | Standar kode BPS |
| `ruas_jalan` | Master ruas | `status_ruas` (Nasional/Provinsi/Kabupaten), `nomor_ruas`, `nama_ruas`, `panjang`, `lebar`, `from_lat`, `from_lng`, `to_lat`, `to_lng` |
| `titik_parkir` | Lokasi parkir | `nama_lokasi`, `jenis_fasilitas` (dalam/luar), `jenis_parkir_luar` (tkp/tpk), `panjang_lokasi`, `luas_lokasi`, `srp_motor`, `srp_mobil`, `id_ruas_jalan`, `titik_lat`, `titik_lng`, `foto_lokasi` |
| `juru_parkir` | Data Jukir (orang) | `nik`, `nama`, `tgl_lahir`, `jk`, `alamat`, `no_telp`, `foto`, `verifikasi` |
| `pengelola_perorangan` | Pengelola perorangan | `nik`, `nama`, `foto_ktp`, `verifikasi` |
| `pengelola_badan` | Pengelola badan usaha | Setara + `nama_badan`, `npwp` (mungkin) |
| `titik_jukir` | Penugasan jukir | `tahun_pengelolaan`, `id_titik_parkir`, `id_juru_parkir`, `setoran_perbulan`, `tmt_spt_awal`, `tmt_spt_akhir`, `actived` |
| `pengaduan` | Pengaduan parkir liar | `plat_nomor`, `lokasi`, `keterangan`, `respon` (belum/sedang/sudah) |
| `pengaduan_jukir` | Pengaduan kinerja jukir | `id_juru_parkir`, `keterangan` |
| `sk_perorangan/badan` | Surat Keputusan | Nomor SK, pejabat, masa berlaku |
| `tahun_pengelolaan` | Master tahun anggaran | `tahun`, `actived` |
| `pejabat` | Pejabat penandatangan SK | `nama_pejabat`, `nip_pejabat`, `pangkat` |

**Insight Operasional:**
- SIAP2 memiliki **data spasial titik parkir** (lat/lng) → cocok untuk **peta tematik parkir**.
- Ada **siklus verifikasi** (perorangan/badan/jukir) → bisa divisualisasikan sebagai **funnel**.
- **Pengaduan parkir** punya status respon → bisa dibuat **SLA dashboard**.

**Strategi Integrasi:** Tambah route prefix `/api/*` di `routes/web.php` yang return JSON. Karena pakai Query Builder, query sangat cepat (tidak ada overhead Eloquent).

---

### 2.4 OpenData: `https://opendata.banjarnegarakab.go.id/dataset/`

**Platform:** CKAN. **API:** `https://opendata.banjarnegarakab.go.id/api/3/action/datastore_search?resource_id=XXXX&limit=100`.

**5 Dataset DINHUB yang berhasil dimuat:**

| # | Dataset | Resource ID | Records | Kolom |
|---|---|---|---|---|
| 1 | **Sarana/Prasarana Angkutan** | `3e0ad659-...` | 28 | Ketersediaan, Jumlah, Tahun (2018-2024) |
| 2 | **Keselamatan Jalan** | `213a35c9-...` | 35 | Jenis Sarana, Jumlah, Tahun (2018-2024) |
| 3 | **Retribusi Parkir** | `cd6d2b32-...` | 28 | Pengelolaan, Jumlah, Tahun (2018-2024) |
| 4 | **Pengujian PKB** | `857dd5f7-...` | 108 | Jenis Kendaraan, Uji Pertama (U/TU), Uji Berkala (U/TU), Tahun (2019-2024) |
| 5 | **Luas Kecamatan** | `98f83b53-...` | 140 | Kecamatan, Ibukota, Luas km², Persentase, Jumlah Pulau, Tinggi mdpl, Tahun |

**Highlight Data 2024:**
- **PJU**: 1639 (2018) → **3967** (2024) — lonjakan **+142%**.
- **Halte Bus**: 34 unit, **Trayek Angkutan Umum**: 46 trayek, **Terminal Tipe C**: 3 unit, **Taxi**: 24 armada.
- **Traffic Light**: 16 unit, **Rambu**: 936 unit, **Guardrail**: 350 unit, **Warning Light**: 60 unit.
- **Pendapatan Retribusi Parkir**: Rp 780jt (2018) → **Rp 1,35M** (2024) — kenaikan **+73%**.
- **Lokasi Parkir**: 53 → 84, **Juru Parkir**: 450 → 485, **Titik Parkir**: 238 → 277.
- **20 Kecamatan** di Banjarnegara, total luas + karakteristik tersedia.

**Strategi Integrasi:** Fetch via CKAN API langsung dari frontend (CORS-friendly) atau proxy via backend CodeIgniter. Simpan cache di IndexedDB/localStorage untuk offline.

---

## 3. Rekomendasi Struktur Dasbor Perhubungan

### 3.1 Tech Stack (Sama dengan Referensi)

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite 6 |
| Styling | Tailwind CSS v4 (neo-brutalist) |
| Chart | Recharts |
| Map | Leaflet + react-leaflet + marker cluster |
| HTTP | axios / fetch |
| Ikon | lucide-react |
| Font | JetBrains Mono + Inter + Playfair Display |

### 3.2 Arsitektur Folder

```
perhubungan/
├── src/
│   ├── components/
│   │   ├── layout/        (Sidebar, Topbar, Footer)
│   │   ├── cards/         (StatCard, ChartCard, MapCard)
│   │   ├── charts/        (LineChart, BarChart, PieChart, AreaChart)
│   │   ├── tables/        (DataTable, FilterTable)
│   │   └── map/           (LeafletMap, MarkerCluster, HeatLayer)
│   ├── pages/             (10 tab utama — lihat 3.3)
│   ├── services/          (api.js: pju, siap2, opendata)
│   ├── hooks/             (useFetch, useFilter, useChart)
│   ├── data/              (JSON statis sebagai fallback)
│   ├── utils/             (formatters, geo helpers)
│   └── App.jsx
├── public/
│   └── images/
└── package.json
```

### 3.3 10 Tab / Halaman Dasbor

| # | Tab | Sumber Data | Highlight Visualisasi |
|---|---|---|---|
| 1 | **Dashboard Utama** | Semua | KPI counter besar: total PJU, ruas jalan, titik parkir, armada, kecelakaan |
| 2 | **Jalan & Ruas** | PJU + SIAP2 | Peta 251 ruas, kondisi jalan (donut), panjang per kelas (bar), tabel ruas |
| 3 | **Perlengkapan Jalan** | PJU | Peta marker PJU/Rambu/APILL/Marka, filter kondisi, foto popup |
| 4 | **Penerangan Jalan (PJU)** | PJU | Grafik tagihan listrik/bulan, kWh vs Rp, peta sebaran PJU, ID pelanggan |
| 5 | **Perparkiran** | SIAP2 + OpenData #3 | Peta titik parkir, status jukir, funnel verifikasi, pendapatan retribusi |
| 6 | **Angkutan & Terminal** | OpenData #1 | Halte, trayek, terminal, taxi — line chart tren 7 tahun |
| 7 | **Keselamatan & Lalu Lintas** | OpenData #2 | PJU, traffic light, rambu, guardrail, warning light — grouped bar |
| 8 | **Pengujian Kendaraan (PKB)** | OpenData #4 | Heatmap jenis kendaraan, uji pertama vs berkala (stacked), tren per tahun |
| 9 | **Peta Tematik (Peta Geospasial)** | Semua | Multi-layer toggle: ruas, PJU, parkir,engkapan, trayek |
| 10 | **OpenData & Laporan** | OpenData + download | Repositori 5 dataset, link unduh CSV, generated report PDF |

### 3.4 Komponen Kunci (Best Practice dari Pariwisatav2)

- **StatCard**: angka besar + label + delta (▲▼) vs tahun lalu + ikon.
- **ChartCard**: wrapper chart dengan title, filter, fullscreen toggle.
- **MapCard**: leaflet + layer control + legend + popup marker.
- **FilterBar**: dropdown kecamatan, tahun, jenis — tersinkronisasi antar tab via Context.
- **ExportButton**: download CSV/PDF/PNG untuk setiap chart.

### 3.5 Tema Visual (Neo-Brutalist dari Pariwisatav2)

- **Warna dominan:** Hitam `#000` + Kuning `#FFD500` + Merah `#FF3B30` + Hijau `#22C55E`.
- **Card:** border `4px solid black`, `box-shadow: 8px 8px 0 #000`, `rounded-none`.
- **Tipografi:** Judul pakai Playfair Display, body Inter, angka/data JetBrains Mono.
- **Animasi:** Hover translate `(-2px, -2px)`, shadow ikut bergeser.

---

## 4. Integrasi Data: Arsitektur 3-Lapis

```
┌─────────────────────────────────────────┐
│   FRONTEND (React SPA di Vite)          │
│   http://localhost:5173                 │
└──────────────┬──────────────────────────┘
               │ fetch JSON
       ┌───────┼────────┬──────────────┐
       ▼       ▼        ▼              ▼
  ┌────────┐ ┌─────┐ ┌────────┐  ┌──────────┐
  │ PJU CI4│ │SIAP2│ │ OpenData│  │ Static   │
  │ /api/* │ │Laravel│  │ CKAN   │  │ JSON     │
  │ :8080  │ │:8000 │ │direct │  │ (fallback)│
  └────┬───┘ └──┬──┘ └────┬───┘  └──────────┘
       │        │         │
       ▼        ▼         ▼
   MySQL:pju  MySQL:siap2  CKAN API
```

**Detail Endpoint yang Akan Dibangun:**

**A. PJU API (CodeIgniter 4)** — buat `app/Controllers/Api/DashboardApi.php`:
- `GET /api/pju/stats` → counter jenis perlengkapan.
- `GET /api/pju/markers?jenis=...&kondisi=...` → marker JSON untuk peta.
- `GET /api/pju/tagihan?year=...` → tagihan listrik per bulan.
- `GET /api/pju/ruas` → semua ruas + koordinat.

**B. SIAP2 API (Laravel)** — tambah route di `routes/web.php`:
- `GET /api/siap2/titik-parkir` → semua titik + lat/lng.
- `GET /api/siap2/jukir?status=...` → data jukir.
- `GET /api/siap2/pengaduan` → pengaduan + status respon.
- `GET /api/siap2/verifikasi-stats` → funnel verifikasi.

**C. OpenData CKAN** (langsung dari frontend):
- Helper `fetchCKAN(resourceId, limit)` yang handle pagination.

---

## 5. Roadmap Implementasi

| Phase | Deliverable | Estimasi Item |
|---|---|---|
| **P0. Setup** | Inisialisasi Vite + React + Tailwind + Recharts + Leaflet, porting style guide | 1 setup |
| **P1. Layout** | Sidebar, topbar, theme, 10 tab placeholder, router | 1 layout |
| **P2. Data Layer** | API wrapper (pju, siap2, opendata), fallback JSON | 4 services |
| **P3. Dashboard** | KPI cards, chart 7 tren tahun, peta overview | 1 page |
| **P4. Jalan & Perlengkapan** | Peta ruas + marker PJU/Rambu/APILL, filter kondisi | 2 pages |
| **P5. Perparkiran** | Peta titik parkir, funnel verifikasi, chart retribusi | 1 page |
| **P6. Angkutan & Keselamatan** | 4 sub-chart OpenData #1 & #2 | 1 page |
| **P7. PKB** | Heatmap + stacked chart OpenData #4 | 1 page |
| **P8. Peta Tematik** | Multi-layer Leaflet, geofence kecamatan | 1 page |
| **P9. OpenData & Export** | Halaman repositori + download PDF/CSV | 1 page |
| **P10. Polish** | Responsive, loading state, error boundary, SEO meta | Polish |

---

## 6. KPI / Metrik Utama yang Diprioritaskan

### 6.1 Headline KPI (Dashboard Utama)
1. **Total PJU Aktif** + delta vs tahun lalu.
2. **Total Ruas Jalan Kabupaten** + total panjang (km).
3. **Kondisi Jalan** — 4 kategori (Baik/Sedang/RR/RB) dengan %.
4. **Titik Parkir Terdaftar** + Jukir aktif.
5. **Pendapatan Retribusi Parkir** YTD.
6. **Trayek Angkutan Umum** aktif.
7. **Total Uji Kendaraan (PKB)** per tahun.
8. **Pengaduan Masuk** (PJU + Parkir) + SLA respon.

### 6.2 Analytics Turunan
- **Cakupan PJU per Kecamatan** (rasio PJU/km jalan).
- **Densitas Rambu per Ruas** (kepadatan perlengkapan).
- **Tren Kenaikan PJU** 2018→2024 (line chart).
- **Peta Panas** kecelakaan/laporan (jika data tersedia).
- **Distribusi Jenis Kendaraan** yang uji (donut chart).

---

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| **Data PJU/SIAP2 tidak online** (dev lokal) | Siapkan JSON statis dari snapshot DB sebagai fallback offline-first. |
| **CORS CKAN** | Proxy via backend PHP ringan jika frontend gagal fetch langsung. |
| **MD5 password SIAP2** (keamanan rendah) | Tidak menampilkan di dasbor; hanya dipakai untuk autentikasi internal. |
| **Performa render 250+ marker** | Pakai **Leaflet.markercluster** + lazy load. |
| **Data tidak konsisten** (mis. nama kecamatan beda kapital) | Buat **normalizer** di `utils/normalize.js`. |
| **Kurang data foto** | Placeholder dengan ikon kategori. |

---

## 8. Rekomendasi Lanjutan (Pasca-MVP)

1. **Autentikasi internal** (login Kepala Dinas, Kabid, Kasi dengan role berbeda).
2. **Scheduled fetch** CKAN harian → simpan di cache → kurangi hit API.
3. **Alert system**: notifikasi WhatsApp/Telegram jika ada pengaduan baru >24 jam.
4. **Print-friendly report** mingguan otomatis (PDF via jsPDF).
5. **Mobile-first** responsive untuk inspeksi lapangan.
6. **Heatmap kecelakaan** (jika Dishub punya data dari Polisi).
7. **Prediksi kebutuhan PJU** dengan regresi linier berdasarkan tren.

---

## 9. Lampiran: Struktur File Penting

### `I:\pariwisatav2` (Referensi)
- [App.jsx](file:///I:/pariwisatav2/src/App.jsx) — 979 baris, blueprint 10 tab.
- [style_guide.md](file:///I:/pariwisatav2/style_guide.md) — panduan visual.
- [handover.md](file:///I:/pariwisatav2/handover.md) — catatan teknis.

### `D:\xampp\htdocs\pju` (CodeIgniter 4)
- [Database.php](file:///D:/xampp/htdocs/pju/app/Config/Database.php) — `db: pju`.
- [HomeModel.php](file:///D:/xampp/htdocs/pju/app/Models/HomeModel.php) — model ruas.
- [Peta.php](file:///D:/xampp/htdocs/pju/app/Controllers/Peta.php) — endpoint JSON marker.
- [Dashboard.php](file:///D:/xampp/htdocs/pju/app/Controllers/Dashboard.php) — counter jenis.

### `D:\xampp\htdocs\siap2` (Laravel)
- [web.php](file:///D:/xampp/htdocs/siap2/routes/web.php) — 135 baris, semua route admin.
- [HomeController.php](file:///D:/xampp/htdocs/siap2/app/Http/Controllers/Admin/HomeController.php) — counter perparkiran.
- Migrations: 21 tabel termasuk `titik_parkir`, `juru_parkir`, `ruas_jalan`, `pengaduan`, `pejabat`.

### OpenData CKAN
- Endpoint: `https://opendata.banjarnegarakab.go.id/api/3/action/datastore_search`
- 5 resource_id: `3e0ad659-...`, `213a35c9-...`, `cd6d2b32-...`, `857dd5f7-...`, `98f83b53-...`.

---

## 10. Kesimpulan

Dasbor Perhubungan Banjarnegara **layak dibangun** dengan data yang tersedia. Tiga sumber data (PJU, SIAP2, OpenData) saling **melengkapi**:

- **PJU** → data kondisi fisik jalan & PJU.
- **SIAP2** → data perparkiran & juru parkir.
- **OpenData** → data tren tahunan, angkutan, keselamatan, PKB, kecamatan.

**Langkah selanjutnya yang disarankan:**
1. **Konfirmasi prioritas** tab mana yang paling dibutuhkan (saya rekomendasikan mulai dari Dashboard + Jalan & Perlengkapan + Perparkiran).
2. **Setup endpoint API** di PJU & SIAP2.
3. **Inisialisasi proyek React** di `I:\perhubungan`.
4. **Migrasi style guide** dari pariwisatav2.

Silakan beri arahan untuk **mulai implementasi** atau **gali lebih dalam** salah satu aspek.
