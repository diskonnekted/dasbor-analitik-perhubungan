import { useMemo, useState } from 'react';
import {
  Database,
  FileJson,
  Download,
  Map,
  Search,
} from 'lucide-react';

// Dataset yang terekspos di public/ — sumber: onlinkid_rambu DB + geocoding OSRM +
// data BPS kecamatan. Unduh = file statis yang sudah di-preprocess di pipeline lokal.
const DATASETS = [
  {
    id: 'pju_ruas',
    nama: 'PJU & Ruas Jalan',
    deskripsi:
      '270 ruas jalan kabupaten beserta 1.929 titik PJU (geocoding OSRM) + 4.762 tagihan triwulan. Sifat: line + point.',
    file: 'pju_ruas.geojson',
    format: 'GeoJSON',
    ukuranKb: 1012,
    kategori: 'PJU',
    sumber: 'onlinkid_rambu (Dishub) + OSRM',
  },
  {
    id: 'perkap',
    nama: 'Perlengkapan Jalan',
    deskripsi:
      '5.119 titik perlengkapan (APILL, rambu, marka, guardrail, cermin, dll.) + jenis master 28 kategori. Sifat: point.',
    file: 'perlengkapan_jalan.geojson',
    format: 'GeoJSON',
    ukuranKb: 1641,
    kategori: 'Perkakapan',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'perkap-jenis',
    nama: 'Master Jenis Perlengkapan',
    deskripsi:
      'Daftar 28 jenis perlengkapan jalan beserta warna & ikon standar. Dipakai legend peta Perkap.',
    file: 'perlengkapan_jenis.json',
    format: 'JSON',
    ukuranKb: 1,
    kategori: 'Perkakapan',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'kecamatan',
    nama: 'Batas Kecamatan',
    deskripsi:
      '20 kecamatan Kabupaten Banjarnegara (batas administratif). Sifat: polygon. Dipakai peta tematik + choropleth.',
    file: 'peta_kecamatan.geojson',
    format: 'GeoJSON',
    ukuranKb: 277,
    kategori: 'Administrasi',
    sumber: 'BPS / ONS Banjarnegara',
  },
  {
    id: 'desa',
    nama: 'Batas Desa',
    deskripsi:
      'Batas desa/kelurahan seluruh kecamatan. Sifat: polygon. Overlay di atas batas kecamatan.',
    file: 'peta_desa.geojson',
    format: 'GeoJSON',
    ukuranKb: 113,
    kategori: 'Administrasi',
    sumber: 'BPS / ONS Banjarnegara',
  },
  {
    id: 'tagihan',
    nama: 'Tagihan Listrik PJU',
    deskripsi:
      '4.762 tagihan triwulan (Jan–Jun 2025), 1.829 idpel. Basis analisis biaya & efisiensi energi PJU.',
    file: 'pju_analysis.json',
    format: 'JSON',
    ukuranKb: 449,
    kategori: 'PJU',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'pengaduan',
    nama: 'Pengaduan Jalan & PJU',
    deskripsi:
      '14 pengaduan + 14 riwayat penyelesaian. Termasuk lokasi, status, keterangan, dan tgl pelaporan.',
    file: 'pengaduan.json',
    format: 'JSON',
    ukuranKb: 0,
    kategori: 'Layanan',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'riwayat',
    nama: 'Riwayat Penyelesaian',
    deskripsi:
      'Riwayat progres 14 pengaduan: tgl_buka, tgl_selesai, keterangan penyelesaian.',
    file: 'riwayat.json',
    format: 'JSON',
    ukuranKb: 0,
    kategori: 'Layanan',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'titik-parkir',
    nama: 'Titik & Area Parkir',
    deskripsi:
      '11 titik / area parkir (10 titik + 1 area), termasuk kapasitas, tarif, dan juru parkir aktif. Sifat: point + polygon.',
    file: 'pju_titik_parkir.geojson',
    format: 'GeoJSON',
    ukuranKb: 0,
    kategori: 'Parkir',
    sumber: 'onlinkid_rambu (Dishub)',
  },
  {
    id: 'titik-jukir',
    nama: 'Juru Parkir (Jukir)',
    deskripsi: '8 jukir terdata beserta lokasi & ID petugas. Sifat: point.',
    file: 'pju_titik_jukir.geojson',
    format: 'GeoJSON',
    ukuranKb: 0,
    kategori: 'Parkir',
    sumber: 'onlinkid_rambu (Dishub)',
  },
];

const KATEGORI = ['Semua', ...new Set(DATASETS.map((d) => d.kategori))];

function formatKb(kb) {
  if (kb == null || kb === 0) return '—';
  if (kb < 1) return '< 1 KB';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function DownloadIcon({ size = 14 }) {
  return <Download size={size} strokeWidth={2.2} aria-hidden="true" />;
}

export default function OpenDataPage() {
  const [q, setQ] = useState('');
  const [kategori, setKategori] = useState('Semua');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DATASETS.filter((d) => {
      if (kategori !== 'Semua' && d.kategori !== kategori) return false;
      if (query) {
        const blob = [d.nama, d.deskripsi, d.format, d.kategori, d.sumber].join(' ').toLowerCase();
        if (!blob.includes(query)) return false;
      }
      return true;
    });
  }, [q, kategori]);

  const totalUkuran = DATASETS.reduce((a, d) => a + (d.ukuranKb || 0), 0);

  function unduh(file) {
    const url = `${import.meta.env.BASE_URL}${file}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700 ring-4 ring-primary-50">
              <Database size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink md:text-xl">OpenData</h1>
              <p className="mt-0.5 text-sm text-subink">
                {DATASETS.length} dataset · {formatKb(totalUkuran)} total · format GeoJSON / JSON
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subink" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari dataset…"
                className="input pl-9 text-sm"
                aria-label="Cari dataset"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {KATEGORI.map((k) => (
            <button
              key={k}
              onClick={() => setKategori(k)}
              className={`chip cursor-pointer ${kategori === k ? 'bg-primary text-white border-primary' : 'border'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Grid dataset */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((d) => (
          <div key={d.id} className="card card-hover p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
                {d.format === 'GeoJSON' ? (
                  <Map size={18} strokeWidth={2} className="text-primary-600" aria-hidden="true" />
                ) : (
                  <FileJson size={18} strokeWidth={2} className="text-primary-600" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-ink">{d.nama}</h3>
                  <span className="chip bg-surface text-[10px] font-semibold text-subink border">
                    {d.kategori}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-subink">{d.deskripsi}</p>
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subink">
                  <div>
                    <dt className="inline font-semibold text-ink/70">File:</dt>{' '}
                    <dd className="inline font-mono text-ink">{d.file}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-ink/70">Ukuran:</dt>{' '}
                    <dd className="inline">{formatKb(d.ukuranKb)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-ink/70">Sumber:</dt>{' '}
                    <dd className="inline">{d.sumber}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => unduh(d.file)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-600"
                  >
                    <DownloadIcon /> Unduh
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-8 text-center">
          <FileText size={28} strokeWidth={1.5} className="mx-auto text-subink/50" aria-hidden="true" />
          <p className="mt-2 text-sm text-subink">Tidak ada dataset yang cocok dengan filter.</p>
        </div>
      )}
    </div>
  );
}
