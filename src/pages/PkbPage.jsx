import { Car, ClipboardCheck, CircleCheck, CircleX, Clock } from 'lucide-react';

// ponytail: DB onlinkid_rambu belum punya tabel PKB. Data di bawah = DUMMY untuk demo.
// Upgrade path: tambah tabel `pkb_uji` di DB, export ke public/pkb.json, ganti array ini dengan fetch.
export const DATA_DUMMY = true;

// [nopol, jenis, pemilik, uji, tglUji, berlaku, hasil] — nopol format registrasi Banjarnegara: R xxxx xM/xD
const UJI = [
  ['R 1037 AM', 'Sepeda Motor (Dinas)', 'Dishub Banjarnegara', 'Pertama', '2026-08-12', '2027-08-11', 'Lolos'],
  ['R 1052 BM', 'Sepeda Motor (Dinas)', 'Dishub Banjarnegara', 'Pertama', '2026-08-12', '2027-08-11', 'Lolos'],
  ['R 7021 CM', 'Angkutan Desa (Mikrolet)', 'PO Angkutan Desa Wanayasa', 'Berkala', '2026-07-03', '2027-01-02', 'Lolos'],
  ['R 7022 DM', 'Angkutan Desa (Mikrolet)', 'PO Angkutan Desa Wanayasa', 'Berkala', '2026-07-03', '2027-01-02', 'Lolos'],
  ['R 7035 EM', 'Angkutan Desa (Mikrolet)', 'Koperasi Rakhar Banjarnegara', 'Berkala', '2026-05-21', '2026-11-20', 'Lolos'],
  ['R 7048 FM', 'Angkutan Desa (Mikrolet)', 'Koperasi Rakhar Banjarnegara', 'Berkala', '2026-03-14', '2026-09-13', 'Lolos'],
  ['R 7102 GM', 'Bus Menengah', 'PO Dieng/Virendra', 'Berkala', '2026-09-01', '2027-03-01', 'Lolos'],
  ['R 7110 HM', 'Bus Besar (AKAP)', 'PO Dieng/Virendra', 'Berkala', '2026-06-19', '2026-12-18', 'Lolos'],
  ['R 7115 ID', 'Bus Besar (AKAP)', 'PO Pembangunan Banyumas', 'Berkala', '2026-04-08', '2026-10-07', 'Tidak Lolos'],
  ['R 9112 JM', 'Truk Tangker (SBK)', 'CV Mitra Logistik', 'Berkala', '2026-08-30', '2027-02-27', 'Lolos'],
  ['R 9130 KM', 'Truk Bak', 'CV Mitra Logistik', 'Berkala', '2026-02-11', '2026-10-10', 'Lolos'],
  ['R 9155 LM', 'Truk Fuso', 'PT Bunga Kencana', 'Pertama', '2026-09-25', '2027-09-24', 'Lolos'],
  ['R 9160 MM', 'Truk CDD', 'PT Bunga Kencana', 'Pertama', '2026-09-25', '2027-09-24', 'Lolos'],
  ['R 1255 ND', 'Mobil Penumpang (Taksi)', 'Blue Bird Banjarnegara', 'Berkala', '2026-01-29', '2026-07-28', 'Lolos'],
  ['R 1260 OD', 'Mobil Penumpang (Antar Jemput Sekolah)', 'SDN 1 Banjarnegara', 'Berkala', '2026-10-05', '2027-04-04', 'Lolos'],
  ['R 8112 PD', 'Mobil Ambulans', 'RSUD Banjarnegara', 'Berkala', '2025-12-16', '2026-06-15', 'Tidak Lolos'],
];

const HARI_INI = new Date('2026-10-13'); // mengikuti tanggal demo; lihat ponytail di atas

const statusUji = (berlaku) => (new Date(berlaku) >= HARI_INI ? 'Berlaku' : 'Kedaluwarsa');

const fmt = (iso) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const rows = UJI.map(([nopol, jenis, pemilik, uji, tgl, berlaku, hasil], i) => ({
  no: i + 1, nopol, jenis, pemilik, uji, tgl, berlaku, hasil, status: statusUji(berlaku),
}));

const KPI = [
  { label: 'Total Kendaraan Diuji', val: rows.length, icon: ClipboardCheck, cls: 'text-primary-700 bg-primary-50' },
  { label: 'Uji Pertama', val: rows.filter((r) => r.uji === 'Pertama').length, icon: Car, cls: 'text-sky-700 bg-sky-50' },
  { label: 'Uji Berkala', val: rows.filter((r) => r.uji === 'Berkala').length, icon: Clock, cls: 'text-amber-700 bg-amber-50' },
  { label: 'Lolos', val: rows.filter((r) => r.hasil === 'Lolos').length, icon: CircleCheck, cls: 'text-emerald-700 bg-emerald-50' },
  { label: 'Tidak Lolos', val: rows.filter((r) => r.hasil === 'Tidak Lolos').length, icon: CircleX, cls: 'text-red-700 bg-red-50' },
];

const CHIP_STATUS = {
  Berlaku: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Kedaluwarsa: 'bg-red-50 text-red-700 ring-red-200',
};
const CHIP_HASIL = {
  Lolos: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Tidak Lolos': 'bg-red-50 text-red-700 ring-red-200',
};

export default function PkbPage({ onNavigate }) {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Keterangan data dummy */}
      <div className="card flex items-center gap-3 border-l-4 border-l-amber-400 p-3.5 text-xs">
        <span className="rounded-md bg-amber-100 px-2 py-1 font-bold uppercase tracking-wider text-amber-800">Data Dummy</span>
        <p className="text-subink">
          Seluruh data di halaman ini adalah <b className="text-ink">contoh (dummy) untuk demo tampilan</b>, bukan data riil.
          Database <span className="font-mono">onlinkid_rambu</span> belum memiliki tabel pengujian kendaraan —
          data asli akan menggantikan data dummy setelah diimport dari SIM PKB / rekam balai uji.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {KPI.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.cls}`}>
                <k.icon size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="font-mono text-2xl font-bold text-ink">{k.val}</span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-subink">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="font-bold uppercase tracking-wider text-subink">Daftar Pengujian Kendaraan</span>
          <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {rows.length} kendaraan
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-[11px] uppercase tracking-wider text-subink">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Nopol</th>
                <th className="px-4 py-2.5 font-semibold">Jenis Kendaraan</th>
                <th className="px-4 py-2.5 font-semibold">Pemilik</th>
                <th className="px-4 py-2.5 font-semibold">Jenis Uji</th>
                <th className="px-4 py-2.5 font-semibold">Tgl Uji</th>
                <th className="px-4 py-2.5 font-semibold">Berlaku s.d.</th>
                <th className="px-4 py-2.5 font-semibold">Hasil</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nopol + r.tgl} className="border-b border-border/60 last:border-0 hover:bg-canvas">
                  <td className="px-4 py-2.5 font-mono text-xs text-subink">{r.no}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-ink">{r.nopol}</td>
                  <td className="px-4 py-2.5 text-ink">{r.jenis}</td>
                  <td className="px-4 py-2.5 text-subink">{r.pemilik}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${r.uji === 'Pertama' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                      {r.uji}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-subink">{fmt(r.tgl)}</td>
                  <td className="px-4 py-2.5 text-subink">{fmt(r.berlaku)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CHIP_HASIL[r.hasil]}`}>{r.hasil}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CHIP_STATUS[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keterangan kolom */}
      <div className="card p-4 text-xs leading-relaxed text-subink">
        <p className="mb-1 font-bold uppercase tracking-wider text-ink">Keterangan</p>
        <ul className="list-inside list-disc space-y-1">
          <li><b className="text-ink">Uji Pertama</b> — pengujian pertama kali untuk kendaraan baru / pertama didaftarkan (SRUT pertama).</li>
          <li><b className="text-ink">Uji Berkala</b> — pengujian periodik kendaraan yang beroperasi/ganti kepemilikan; umumnya setiap 6 bulan untuk angkutan umum.</li>
          <li><b className="text-ink">Berlaku s.d.</b> — masa berlaku buku uji; status <b>Kedaluwarsa</b> artinya wajib diuji ulang.</li>
          <li><b className="text-ink">Hasil Lolos/Tidak Lolos</b> — kesimpulan pengujian balai uji terhadap kelayakan struktur, mesin, dan kelengkapan keselamatan.</li>
        </ul>
      </div>
    </div>
  );
}
