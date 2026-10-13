import { AlertTriangle, Route, Lightbulb, Car, ShieldCheck, MapPin } from 'lucide-react';

// ponytail: rekomendasi di-hardcode dari temuan AnalitikPage (lihat analitik per kecamatan/jalan).
// Upgrade path: generate otomatis dari skor kecamatan + threshold analitik.
const REKOMENDASI = [
  {
    id: 'keselamatan',
    icon: AlertTriangle,
    prioritas: 'Tinggi',
    bidang: 'Keselamatan Jalan',
    judul: 'Penanganan titik hitam (blackspot) & audit keselamatan ruas nasional',
    temuan: 'Kejadian kecelakaan naik 210 → 384 (+83%) sejak 2020; fatalitas rata-rata 13,6% dengan puncak 17,2% pada 2024.',
    upaya: [
      'Audit keselamatan jalan (road safety audit) pada 10 ruas prioritas kelas I & II',
      'Pemasangan rambu peringatan & marking zebra cross di 5 titik hitam kecelakaan terbanyak',
      'Sosialisasi keselamatan ke sekolah & angkutan umum (safety riding)',
    ],
    indikator: 'Penurunan kejadian fatal ≥ 10% pada tahun berikutnya',
  },
  {
    id: 'infrastruktur',
    icon: MapPin,
    prioritas: 'Tinggi',
    bidang: 'Infrastruktur Jalan',
    judul: 'Rotasi perbaikan ruas rusak berat di kecamatan skor terendah',
    temuan: 'Sebagian kecamatan memiliki skor kesiapan di bawah ambang 70 — perbaikan jalan menjadi prioritas.',
    upaya: [
      'Prioritaskan perbaikan ruas Rusak Berat di 5 kecamatan skor terendah',
      'Program penurunan lapis permukaan (overlay) ruas prioritas angkutan desa',
      'Patroli & inventarisasi kondisi berkala tiap semester',
    ],
    indikator: 'Rasio km rusak berat turun dari ≥ 25% ke < 15% per kecamatan',
  },
  {
    id: 'pju',
    icon: Lightbulb,
    prioritas: 'Sedang',
    bidang: 'Penerangan Jalan Umum',
    judul: 'Rehabilitasi titik PJU rusak & efisiensi tagihan',
    temuan: 'Rasio lampu rusak 10,6% (205 dari 1.929 titik); estimasi pemborosan tagihan pada titik non-fungsional.',
    upaya: [
      'Konversi HPS/SON → LED di titik rusak untuk efisiensi energi jangka panjang',
      'Audit tiap titik tagihan vs titik terpasang — deteksi tagihan anak hudz (kontra)',
      'Kerja sama PLN untuk pemutakhiran tarif PJU kategori rumah tangga ke PJU khusus',
    ],
    indikator: 'Rasio lampu rusak < 5% dan tagihan per kWh stabil',
  },
  {
    id: 'parkir',
    icon: Car,
    prioritas: 'Sedang',
    bidang: 'Perparkiran',
    judul: 'Verifikasi juru parkir & digitalisasi retribusi',
    temuan: 'Hanya 47% juru parkir terverifikasi KTP; 398 juru untuk 215 titik (rasio 1,9 — potensi kewenangan ganda).',
    upaya: [
      'Program verifikasi & pencetakan ID card juru parkir 100%',
      'Digitalisasi setoran retribusi melalui QRIS / e-retribusi untuk transparansi',
      'Pemetaan ulang kios juru parkir — klarifikasi titik di luar zona resmi',
    ],
    indikator: '100% juru terverifikasi; capaian retribusi digital ≥ 80%',
  },
  {
    id: 'angkutan',
    icon: Route,
    prioritas: 'Sedang',
    bidang: 'Angkutan & Terminal',
    judul: 'Digitalisasi trayek & pemantauan armada angkutan umum',
    temuan: 'Armada angdes & AKAP terbatas; jarak trayek perkotaan belum terintegrasi dengan terminal tipe A/B.',
    upaya: [
      'Pencatatan GIS trayek angdes & AKAP — peta trayek resmi untuk masyarakat',
      'Uji PKB berkala angkutan umum — ketatkan kendaraan Tidak Lolos',
      'Program pengembangan angkutan wisata objek Dieng (K-01) pada musim ramai',
    ],
    indikator: '100% armada lulus uji berkala; trayek resmi terpetakan di web',
  },
  {
    id: 'layanan',
    icon: ShieldCheck,
    prioritas: 'Rendah',
    bidang: 'Layanan Publik',
    judul: 'Responsivitas pengaduan & transparansi data',
    temuan: 'Pengaduan parkir menggukana status proses sedang — kebutuhan SLA penanganan per kategori.',
    upaya: [
      'SLA penanganan pengaduan ≤ 7 hari kerja dengan notifikasi ke pelapor',
      'Integrasi kanal pengaduan (web/WA) ke dashboard bagi unit terkait',
      'Publikasi open data retribusi & PJU untuk akuntabilitas publik',
    ],
    indikator: '≥ 90% pengaduan selesai dalam SLA',
  },
];

const TAG_P = {
  Tinggi: 'bg-red-50 text-red-700 ring-red-200',
  Sedang: 'bg-amber-50 text-amber-700 ring-amber-200',
  Rendah: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default function RekomendasiPage() {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Intro */}
      <div className="card p-4">
        <p className="text-sm leading-relaxed text-subink">
          Rekomendasi berikut disusun dari <b className="text-ink">temuan analitik</b> — data riil
          kecelakaan 2020–2026, kondisi ruas, PJU, parkir, angkutan, dan pengaduan.
          Setiap rekomendasi memuat temuan, upaya, dan indikator keberhasilan sebagai acuan
          perencanaan program <b className="text-ink">Dinas Perhubungan Kab. Banjarnegara</b>.
        </p>
      </div>

      {/* Ringkasan prioritas */}
      <div className="grid grid-cols-3 gap-3">
        {['Tinggi', 'Sedang', 'Rendah'].map((p) => (
          <div key={p} className="card p-4">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TAG_P[p]}`}>{p}</span>
            <p className="mt-2 font-mono text-2xl font-bold text-ink">{REKOMENDASI.filter((r) => r.prioritas === p).length}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-subink">Rekomendasi prioritas {p}</p>
          </div>
        ))}
      </div>

      {/* Kartu rekomendasi */}
      {REKOMENDASI.map((r, i) => (
        <section key={r.id} className="card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <r.icon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-subink">R-{String(i + 1).padStart(2, '0')}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TAG_P[r.prioritas]}`}>{r.prioritas}</span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-subink">{r.bidang}</span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-ink md:text-base">{r.judul}</h2>
            </div>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">Temuan</p>
              <p className="text-xs leading-relaxed text-subink">{r.temuan}</p>
            </div>
            <div className="md:col-span-1">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">Upaya yang Disarankan</p>
              <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-subink">
                {r.upaya.map((u) => <li key={u}>{u}</li>)}
              </ul>
            </div>
            <div className="md:col-span-1">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Indikator Keberhasilan</p>
              <p className="text-xs leading-relaxed text-subink">{r.indikator}</p>
            </div>
          </div>
        </section>
      ))}

      <p className="px-1 text-[11px] text-subink">
        Dasar rekomendasi: halaman Analitik Perhubungan (keselamatan, infrastruktur, energi, parkir, angkutan, layanan).
        Perencanaan anggaran &amp; program tahunan mengacu pada RKPD Kab. Banjarnegara.
      </p>
    </div>
  );
}
