import { useEffect, useMemo, useState } from 'react';
import {
  Bus,
  Filter,
  MapPin,
  Search,
  PackageOpen,
} from 'lucide-react';
import { getPerkap } from '../api/perlengkapan';

// ponytail: data trayek & operasional belum ada di DB. Halaman ini menampilkan
// titik Terminal & Halte yang sudah terpetakan (jenis 27/28 di perlengkapan_jalan).
// Upgrade path: tambah tabel `trayek` di onlinkid_rambu, export ke public/
// (misal trayek.geojson + trayek.json), lalu render tabel trayek di sini.
const TERMINAL = 27;
const HALTE = 28;

// ponytail: DB onlinkid_rambu belum punya tabel trayek/armada. Data di bawah = DUMMY untuk demo.
// Upgrade path: tambah tabel `trayek` di DB, export ke public/angkutan.json, ganti array ini dengan fetch.
export const DATA_DUMMY = true;

// [kode, trayek, rute, jenis, armada, headway, jam]
const TRAYEK = [
  ['T-01', 'Terminal Banjarnegara — Purwokerto', 'TER Banjarnegara → Karangtengah → Baturaden → PURWOKERTO', 'AKAP', '12 bus', '30 mnt', '04.30–17.00'],
  ['T-02', 'Terminal Banjarnegara — Semarang', 'TER Banjarnegara → Bandungan → Ungaran → SEMARANG', 'AKAP', '8 bus', '60 mnt', '05.00–16.00'],
  ['T-03', 'Terminal Banjarnegara — Wonosobo (Dieng)', 'TER Banjarnegara → Sigaluh → Dieng → WONOSOBO', 'AKAP', '6 bus', '60 mnt', '05.30–16.30'],
  ['A-11', 'Banjarnegara — Ponhorjo', 'TER → Rejasari → Purwata → Ponhorjo', 'Angdes', '4 mikrolet', '15 mnt', '05.00–17.30'],
  ['A-12', 'Banjarnegara — Rakit', 'TER → Wanayasa → Somomorodukuh → Rakit', 'Angdes', '5 mikrolet', '15 mnt', '05.00–17.30'],
  ['A-13', 'Banjarnegara — Pagentan', 'TER → Karangtengah → Watu Payung → Pagentan', 'Angdes', '4 mikrolet', '20 mnt', '05.00–17.00'],
  ['A-14', 'Banjarnegara — Wanadadi', 'TER → Purwonegoro → Anjatan → Wanadadi', 'Angdes', '3 mikrolet', '30 mnt', '05.30–16.30'],
  ['A-15', 'Banjarnegara — Kaliangkrik', 'TER → Pandansari → Kaliwuluh → Kaliangkrik', 'Angdes', '3 mikrolet', '30 mnt', '05.30–16.30'],
  ['A-16', 'Banjarnegara — Kalibening', 'TER → Madukara → Kalibening', 'Angdes', '2 mikrolet', '40 mnt', '06.00–16.00'],
  ['K-01', 'Dieng Tour Loop', 'Kompleks Candi Arjuna → Telaga Warna → Sikidang', 'Wisata', '2 minibus', '20 mnt', '07.00–16.00'],
];

const ARMADA = [
  { label: 'Bus AKAP', val: 26 },
  { label: 'Mikrolet Angdes', val: 21 },
  { label: 'Minibus Wisata', val: 2 },
];

const rows = TRAYEK.map(([kode, trayek, rute, jenis, armada, headway, jam], i) => ({ no: i + 1, kode, trayek, rute, jenis, armada, headway, jam }));

const TONE = {
  [TERMINAL]: { fill: '#475569', ring: '#0F172A', label: 'Terminal' },
  [HALTE]: { fill: '#64748B', ring: '#334155', label: 'Halte' },
};

export default function AngkutanPage({ onNavigate }) {
  const [perkap, setPerkap] = useState(null);
  const [filterJenis, setFilterJenis] = useState('all'); // 'all' | TERMINAL | HALTE
  const [q, setQ] = useState('');

  useEffect(() => {
    getPerkap().then(setPerkap).catch(() => setPerkap(null));
  }, []);

  const titik = useMemo(() => {
    if (!perkap?.features) return [];
    const query = q.trim().toLowerCase();
    return perkap.features.filter((f) => {
      const p = f.properties || {};
      const jenis = p.id_jenis;
      if (jenis !== TERMINAL && jenis !== HALTE) return false;
      if (filterJenis !== 'all' && jenis !== Number(filterJenis)) return false;
      if (query) {
        const blob = [p.nama, p.lokasi, p.keterangan].join(' ').toLowerCase();
        if (!blob.includes(query)) return false;
      }
      return true;
    });
  }, [perkap, filterJenis, q]);

  const stats = useMemo(() => {
    const s = { terminal: 0, halte: 0, baik: 0, rusak: 0 };
    for (const f of perkap?.features || []) {
      const p = f.properties || {};
      if (p.id_jenis === TERMINAL) s.terminal++;
      if (p.id_jenis === HALTE) s.halte++;
      if (p.kondisi === 'Baik') s.baik++;
      if (p.kondisi === 'Rusak' || p.kondisi === 'Hilang') s.rusak++;
    }
    return s;
  }, [perkap]);

  if (!perkap) {
    return (
      <div className="card p-12 text-center text-subink animate-fade-in">
        <Bus size={28} className="mx-auto text-subink/40" />
        <p className="mt-2 text-sm">Memuat data titik angkutan…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700 ring-4 ring-primary-50">
              <Bus size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink md:text-xl">Angkutan &amp; Terminal</h1>
              <p className="mt-0.5 text-sm text-subink">
                {stats.terminal} terminal · {stats.halte} halte · {ARMADA.reduce((a, b) => a + b.val, 0)} armada terdaftar
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subink" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / lokasi…"
              className="input pl-9 text-sm"
              aria-label="Cari titik angkutan"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Filter size={12} className="text-subink" aria-hidden="true" />
          {[
            { id: 'all', label: 'Semua' },
            { id: TERMINAL, label: 'Terminal' },
            { id: HALTE, label: 'Halte' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterJenis(c.id)}
              className={`chip cursor-pointer ${filterJenis === c.id ? 'bg-primary text-white border-primary' : 'border'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keterangan data dummy */}
      <div className="card flex items-center gap-3 border-l-4 border-l-amber-400 p-3.5 text-xs">
        <span className="rounded-md bg-amber-100 px-2 py-1 font-bold uppercase tracking-wider text-amber-800">Data Dummy</span>
        <p className="text-subink">
          Data <b className="text-ink">trayek, jadwal, &amp; armada</b> di bawah adalah <b className="text-ink">contoh (dummy) untuk demo tampilan</b>, bukan data riil.
          Titik terminal &amp; halte di bagian bawah halaman adalah data riil dari pemetaan perlengkapan jalan.
          Data asli akan menggantikan data dummy setelah tabel trayek di-import ke database.
        </p>
      </div>

      {/* KPI armada */}
      <div className="grid grid-cols-3 gap-3">
        {ARMADA.map((a) => (
          <div key={a.label} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <Bus size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="font-mono text-2xl font-bold text-ink">{a.val}</span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-subink">{a.label}</p>
          </div>
        ))}
      </div>

      {/* Tabel trayek */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="font-bold uppercase tracking-wider text-subink">Daftar Trayek &amp; Jadwal</span>
          <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {rows.length} trayek
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-[11px] uppercase tracking-wider text-subink">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Kode</th>
                <th className="px-4 py-2.5 font-semibold">Trayek</th>
                <th className="px-4 py-2.5 font-semibold">Rute</th>
                <th className="px-4 py-2.5 font-semibold">Jenis</th>
                <th className="px-4 py-2.5 font-semibold">Armada</th>
                <th className="px-4 py-2.5 font-semibold">Headway</th>
                <th className="px-4 py-2.5 font-semibold">Jam Operasi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kode} className="border-b border-border/60 last:border-0 hover:bg-canvas">
                  <td className="px-4 py-2.5 font-mono text-xs text-subink">{r.no}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-primary-700">{r.kode}</td>
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.trayek}</td>
                  <td className="px-4 py-2.5 text-xs text-subink">{r.rute}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${r.jenis === 'AKAP' ? 'bg-sky-50 text-sky-700 ring-sky-200' : r.jenis === 'Angdes' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-violet-50 text-violet-700 ring-violet-200'}`}>
                      {r.jenis}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{r.armada}</td>
                  <td className="px-4 py-2.5 text-subink">{r.headway}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-subink">{r.jam}</td>
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
          <li><b className="text-ink">AKAP</b> — Angkutan Antar Kota dalam Provinsi (bus antar kabupaten/kota).</li>
          <li><b className="text-ink">Angdes</b> — Angkutan Desa, melayani trayek pendek antar desa/kecamatan dengan tarif terjangkau.</li>
          <li><b className="text-ink">Headway</b> — jeda keberangkatan antar kendaraan pada trayek yang sama.</li>
          <li><b className="text-ink">Jam Operasi</b> — rentang waktu pelayanan penumpang pertama hingga terakhir.</li>
        </ul>
      </div>

      {/* Titik riil: Terminal & Halte terpetakan */}
      {titik.length === 0 ? (
        <div className="card p-8 text-center">
          <PackageOpen size={26} className="mx-auto text-subink/40" aria-hidden="true" />
          <p className="mt-2 text-sm text-subink">
            Tidak ada titik yang cocok dengan filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {titik.map((f) => {
            const p = f.properties || {};
            const t = TONE[p.id_jenis];
            const toneKondisi =
              p.kondisi === 'Baik'
                ? 'bg-accent-50 text-accent-700 border-accent-200'
                : 'bg-red-50 text-red-700 border-red-200';
            return (
              <div key={p.id} className="card card-hover p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-4"
                    style={{
                      background: t.fill,
                      color: '#fff',
                      boxShadow: '0 0 0 4px ' + t.ring + '22',
                    }}
                  >
                    <Bus size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink">{p.nama || 'Tanpa Nama'}</span>
                      <span className={`chip text-[10px] font-semibold border ${toneKondisi}`}>
                        {p.kondisi || '—'}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-xs text-subink">
                      <div>
                        <dt className="inline font-semibold text-ink/70">Tipe: </dt>
                        <dd className="inline">{t.label}</dd>
                      </div>
                      {(p.lokasi || p.keterangan) && (
                        <div>
                          <dt className="inline font-semibold text-ink/70">Lokasi: </dt>
                          <dd className="inline">{p.lokasi || p.keterangan}</dd>
                        </div>
                      )}
                      {p.id_ruasjalan != null && (
                        <div>
                          <dt className="inline font-semibold text-ink/70">Ruas: </dt>
                          <dd className="inline font-mono">#{p.id_ruasjalan}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onNavigate?.('perkap')}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-muted"
                      >
                        <MapPin size={12} strokeWidth={2.2} aria-hidden="true" />
                        Lihat di Peta Perkap
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
