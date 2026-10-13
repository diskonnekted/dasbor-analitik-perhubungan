import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, AlertTriangle, Loader2, Search, Filter, X, Camera, CheckCircle2, Clock, Wrench, XCircle, Map as MapIcon, Inbox, BookOpen, ArrowUpRight, ListChecks } from 'lucide-react';
import { getLaporan, getDamageTypes, getLaporanStats } from '../api/laporan';
import MapView from '../components/map/MapView';

const STATUS_META = {
  pending:     { label: 'Menunggu',     tone: 'amber' },
  verified:    { label: 'Diverifikasi', tone: 'sky'   },
  in_progress: { label: 'Ditangani',    tone: 'indigo' },
  done:        { label: 'Selesai',      tone: 'green' },
  rejected:    { label: 'Ditolak',      tone: 'red'   }
};

const TINGKAT_TONE = {
  ringan: 'amber',
  sedang: 'orange',
  berat:  'red'
};

const TONE = {
  blue:   { chip: 'bg-primary-50  text-primary-700  border-primary-200',  ring: 'ring-primary-100'  },
  green:  { chip: 'bg-accent-50   text-accent-700   border-accent-200',   ring: 'ring-accent-100'   },
  amber:  { chip: 'bg-amber-50    text-amber-700    border-amber-200',    ring: 'ring-amber-100'    },
  orange: { chip: 'bg-orange-50   text-orange-700   border-orange-200',   ring: 'ring-orange-100'   },
  red:    { chip: 'bg-red-50      text-red-700      border-red-200',      ring: 'ring-red-100'      },
  sky:    { chip: 'bg-sky-50      text-sky-700      border-sky-200',      ring: 'ring-sky-100'      },
  indigo: { chip: 'bg-indigo-50   text-indigo-700   border-indigo-200',   ring: 'ring-indigo-100'   },
  slate:  { chip: 'bg-slate-50    text-slate-700    border-slate-200',    ring: 'ring-slate-100'    }
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  const t = TONE[m.tone] || TONE.amber;
  const Icon = status === 'done' ? CheckCircle2 : status === 'rejected' ? XCircle : status === 'in_progress' ? Wrench : status === 'verified' ? CheckCircle2 : Clock;
  return (
    <span className={`chip ${t.chip}`}>
      <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
      {m.label}
    </span>
  );
}

function TingkatBadge({ tingkat }) {
  const tone = TINGKAT_TONE[tingkat] || 'slate';
  const t = TONE[tone] || TONE.slate;
  return (
    <span className={`chip ${t.chip} uppercase`}>
      {tingkat || '—'}
    </span>
  );
}

export default function LaporanPage({ embedded = false, onClose }) {
  const [laporan, setLaporan] = useState([]);
  const [stats, setStats] = useState(null);
  const [damageTypes, setDamageTypes] = useState([]);
  const [src, setSrc] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  // Filters
  const [fStatus, setFStatus] = useState('all');
  const [fTingkat, setFTingkat] = useState('all');
  const [fKategori, setFKategori] = useState('all');
  const [fKecamatan, setFKecamatan] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [lap, dt, st] = await Promise.all([
          getLaporan(),
          getDamageTypes(),
          getLaporanStats().catch(() => null)
        ]);
        if (!mounted) return;
        setLaporan(lap.items);
        setSrc(lap.source);
        setDamageTypes(Array.isArray(dt) ? dt : []);
        setStats(st);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Unique kecamatan dari data
  const kecamatanList = useMemo(() => {
    const set = new Set();
    laporan.forEach((l) => l.kecamatan && set.add(l.kecamatan));
    return Array.from(set).sort();
  }, [laporan]);

  // Kategori unik
  const kategoriList = useMemo(() => {
    const set = new Set();
    damageTypes.forEach((d) => d.category && set.add(d.category));
    if (set.size === 0) {
      laporan.forEach((l) => l.kategori && set.add(l.kategori));
    }
    return Array.from(set).sort();
  }, [damageTypes, laporan]);

  // Filter
  const filtered = useMemo(() => {
    return laporan.filter((l) => {
      if (fStatus !== 'all' && l.status !== fStatus) return false;
      if (fTingkat !== 'all' && l.tingkat !== fTingkat) return false;
      if (fKategori !== 'all' && l.kategori !== fKategori) return false;
      if (fKecamatan !== 'all' && l.kecamatan !== fKecamatan) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = [
          l.nama_pelapor, l.nama_jalan, l.nomor_ruas,
          l.kecamatan, l.desa, l.jenis_label, l.deskripsi
        ].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [laporan, fStatus, fTingkat, fKategori, fKecamatan, search]);

  // Local stats
  const localStats = useMemo(() => {
    const by_status = { pending: 0, verified: 0, in_progress: 0, done: 0, rejected: 0 };
    const by_tingkat = { ringan: 0, sedang: 0, berat: 0 };
    const by_kategori = {};
    filtered.forEach((l) => {
      if (l.status in by_status) by_status[l.status]++;
      if (l.tingkat in by_tingkat) by_tingkat[l.tingkat]++;
      if (l.kategori) by_kategori[l.kategori] = (by_kategori[l.kategori] || 0) + 1;
    });
    return { total: filtered.length, by_status, by_tingkat, by_kategori };
  }, [filtered]);

  const displayStats = stats || localStats;
  const hasActiveFilter = fStatus !== 'all' || fTingkat !== 'all' || fKategori !== 'all' || fKecamatan !== 'all' || search;

  function resetFilter() {
    setFStatus('all');
    setFTingkat('all');
    setFKategori('all');
    setFKecamatan('all');
    setSearch('');
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header banner (jika bukan embedded) */}
      {!embedded && (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-3 md:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
            <ClipboardList size={18} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="flex-1 text-xs md:text-sm">
            <div className="font-bold text-ink">Laporan Kerusakan Jalan</div>
            <div className="mt-0.5 text-subink">
              Integrasi dari <code className="rounded bg-surface px-1 font-mono text-[11px] text-primary-800">lapor-jalan</code> repo (diskonnekted).
              {src === 'fallback' && <span> Mode sample karena backend OFF.</span>}
            </div>
          </div>
          {embedded === false && onClose && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-md p-1.5 text-subink hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {src === 'fallback' && !loading && (
        <div className="card flex items-start gap-3 border-sky-200 bg-sky-50 p-3 md:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <AlertTriangle size={18} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="flex-1 text-xs md:text-sm">
            <div className="font-bold text-ink">Mode Sample (Backend OFF)</div>
            <div className="mt-0.5 text-subink">
              Menampilkan {laporan.length} laporan contoh. Aktifkan Supabase/lapor-jalan backend untuk data real-time.
            </div>
          </div>
        </div>
      )}

      {/* Stats ringkasan */}
      <section aria-label="Ringkasan Status">
        <h2 className="section-title mb-3">Ringkasan Status</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatBox tone="blue"   label="Total"     value={displayStats.total ?? filtered.length} sub="laporan" icon={ListChecks} />
          <StatBox tone="amber"  label="Menunggu"  value={displayStats.by_status?.pending ?? 0}   icon={Clock} />
          <StatBox tone="sky"    label="Verified"  value={displayStats.by_status?.verified ?? 0}  icon={CheckCircle2} />
          <StatBox tone="indigo" label="Ditangani" value={displayStats.by_status?.in_progress ?? 0} icon={Wrench} />
          <StatBox tone="green"  label="Selesai"   value={displayStats.by_status?.done ?? 0}     icon={CheckCircle2} />
        </div>
      </section>

      {/* Stats tingkat */}
      <section aria-label="Ringkasan Tingkat Kerusakan">
        <h2 className="section-title mb-3">Tingkat Kerusakan</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatBox tone="amber"  label="Ringan" value={displayStats.by_tingkat?.ringan ?? 0} sub="tingkat" small />
          <StatBox tone="orange" label="Sedang" value={displayStats.by_tingkat?.sedang ?? 0} sub="tingkat" small />
          <StatBox tone="red"    label="Berat"  value={displayStats.by_tingkat?.berat  ?? 0} sub="tingkat" small />
        </div>
      </section>

      {/* Filter bar */}
      <section aria-label="Filter & Pencarian" className="card p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subink">
          <Filter size={12} strokeWidth={2.5} aria-hidden="true" /> Filter & Pencarian
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subink" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pelapor / jalan / ruas / desa…"
                aria-label="Pencarian laporan"
                className="input pl-8"
              />
            </div>
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter status" className="input">
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="verified">Diverifikasi</option>
            <option value="in_progress">Ditangani</option>
            <option value="done">Selesai</option>
            <option value="rejected">Ditolak</option>
          </select>
          <select value={fTingkat} onChange={(e) => setFTingkat(e.target.value)} aria-label="Filter tingkat" className="input">
            <option value="all">Semua Tingkat</option>
            <option value="ringan">Ringan</option>
            <option value="sedang">Sedang</option>
            <option value="berat">Berat</option>
          </select>
          <select value={fKategori} onChange={(e) => setFKategori(e.target.value)} aria-label="Filter kategori" className="input">
            <option value="all">Semua Kategori</option>
            {kategoriList.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={fKecamatan} onChange={(e) => setFKecamatan(e.target.value)} aria-label="Filter kecamatan" className="input">
            <option value="all">Semua Kecamatan</option>
            {kecamatanList.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{filtered.length}</b> dari <span className="font-mono">{laporan.length}</span> laporan
          </span>
          {hasActiveFilter && (
            <button onClick={resetFilter} className="btn-secondary text-[11px]">
              Reset Filter
            </button>
          )}
        </div>
      </section>

      {/* Toggle peta */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMap((v) => !v)}
          aria-pressed={showMap}
          className={showMap ? 'btn-primary' : 'btn-secondary'}
        >
          <MapIcon size={14} strokeWidth={2.5} aria-hidden="true" />
          {showMap ? 'Sembunyikan' : 'Tampilkan'} Peta
          <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
            {filtered.length}
          </span>
        </button>
      </div>

      {showMap && (
        <div className="card overflow-hidden p-1">
          <MapView
            kecamatan={null}
            desa={null}
            ruas={null}
            parkir={null}
            jukir={null}
            choropleth={null}
            laporan={filtered}
          />
        </div>
      )}

      {/* Tabel */}
      {loading ? (
        <div className="card flex items-center gap-3 p-6">
          <Loader2 size={18} className="animate-spin text-primary-700" />
          <span className="text-sm font-bold uppercase tracking-wider text-subink">Memuat laporan…</span>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Tingkat</th>
                  <th>Lokasi</th>
                  <th>Ruas</th>
                  <th>Pelapor</th>
                  <th>Status</th>
                  <th className="text-center">Foto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-subink">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-subink">
                          <Inbox size={18} aria-hidden="true" />
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider">
                          Tidak ada laporan
                        </div>
                        <div className="text-[11px] text-subink">
                          Coba ubah filter atau reset pencarian
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono font-bold text-ink">#{l.id}</td>
                    <td className="whitespace-nowrap font-mono text-[11px]">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <div className="font-semibold text-ink">{l.jenis_label || '—'}</div>
                      {l.kategori && <div className="text-[10px] uppercase tracking-wider text-subink">{l.kategori}</div>}
                    </td>
                    <td>
                      <TingkatBadge tingkat={l.tingkat} />
                    </td>
                    <td>
                      <div className="font-semibold text-ink">{l.nama_jalan || '—'}</div>
                      <div className="text-[10px] uppercase tracking-wider text-subink">
                        {l.kecamatan || '—'} / {l.desa || '—'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {l.nomor_ruas ? (
                        <div>
                          <div className="font-mono font-semibold text-ink">{l.nomor_ruas}</div>
                          {l.id_ruas && <div className="font-mono text-[10px] text-subink">id: {l.id_ruas}</div>}
                        </div>
                      ) : <span className="text-subink">—</span>}
                    </td>
                    <td>
                      <div className="font-semibold text-ink">{l.nama_pelapor || 'Anonim'}</div>
                      {l.no_hp && <div className="font-mono text-[10px] text-subink">{l.no_hp}</div>}
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="text-center">
                      {l.foto ? (
                        <Camera size={12} className="inline text-subink" aria-label="Ada foto" />
                      ) : (
                        <span className="text-subink">—</span>
                      )}
                      {l.foto_perbaikan && (
                        <Wrench size={12} className="ml-1 inline text-accent-700" aria-label="Ada foto perbaikan" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Damage type reference */}
      {damageTypes.length > 0 && (
        <details className="card p-3 md:p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink">
            <BookOpen size={14} strokeWidth={2.5} aria-hidden="true" />
            <span>Referensi 14 Jenis Kerusakan Bina Marga</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700 border border-primary-200">
              {damageTypes.length} jenis
            </span>
            <ArrowUpRight size={12} className="text-subink transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {Object.entries(
              damageTypes.reduce((acc, d) => {
                if (!acc[d.category]) acc[d.category] = [];
                acc[d.category].push(d);
                return acc;
              }, {})
            ).map(([cat, items]) => (
              <div key={cat} className="rounded-md border border-border bg-canvas p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary-700">{cat}</div>
                <ul className="mt-1.5 space-y-1">
                  {items.map((d) => (
                    <li key={d.id} className="text-[11px] text-ink">
                      <b className="font-semibold">{d.label}</b>
                      <span className="text-subink"> — {d.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StatBox({ tone = 'blue', label, value, sub, icon: Icon, small }) {
  const t = TONE[tone] || TONE.blue;
  return (
    <div className={`card card-hover ${small ? 'p-3' : 'p-4'} ring-1 ring-inset ${t.ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-subink">{label}</span>
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.chip}`}>
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className={`mt-2 font-mono font-bold leading-none text-ink ${small ? 'text-xl' : 'text-2xl'}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-subink">{sub}</div>
      )}
    </div>
  );
}