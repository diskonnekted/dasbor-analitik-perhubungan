import { useEffect, useMemo, useState } from 'react';
import { Route, Loader2, AlertTriangle, MapPin, Ruler, Layers, Filter, Search, BarChart3, ArrowUpDown, Map as MapIcon, ListChecks, TrendingUp, Building2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import MapView from '../components/map/MapView';
import { getRuas, computeRuasStats, filterRuas, KELAS_LIST, KONDISI_LIST, KONDISI_TONE } from '../api/jalan';

const KELAS_COLOR = {
  I:   '#FF3B30',
  II:  '#FF3B30',
  III: '#FFD500',
  IV:  '#FFD500',
  V:   '#22C55E',
  VI:  '#22C55E',
  Lain: '#0EA5E9'
};

function fmtKm(n) {
  if (n == null) return '—';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export default function JalanPage() {
  const [ruas, setRuas] = useState({ features: [], geo: null, source: 'loading' });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [fKelas, setFKelas] = useState('all');
  const [fKondisi, setFKondisi] = useState('all');
  const [fKecamatan, setFKecamatan] = useState('all');
  const [sortBy, setSortBy] = useState('panjang');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await getRuas();
        if (!mounted) return;
        setRuas(r);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Stats dari full dataset (untuk hero cards & grafik ringkasan)
  const allStats = useMemo(() => computeRuasStats(ruas.features), [ruas]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    const f = filterRuas(ruas.features, {
      search,
      kelas: fKelas,
      kondisi: fKondisi,
      kecamatan: fKecamatan
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return f.slice().sort((a, b) => {
      const pa = a.properties || {};
      const pb = b.properties || {};
      switch (sortBy) {
        case 'id':       return dir * ((pa.id || 0) - (pb.id || 0));
        case 'nomor':    return dir * String(pa.nomor_ruas || '').localeCompare(String(pb.nomor_ruas || ''));
        case 'nama':     return dir * String(pa.nama_ruas || '').localeCompare(String(pb.nama_ruas || ''));
        case 'panjang': {
          const a2 = Number(pa.panjang_geo_km) || Number(pa.panjang_km) || 0;
          const b2 = Number(pb.panjang_geo_km) || Number(pb.panjang_km) || 0;
          return dir * (a2 - b2);
        }
        case 'lebar':    return dir * ((Number(pa.lebar_m) || 0) - (Number(pb.lebar_m) || 0));
        case 'kelas':    return dir * String(pa.kelas_jalan || '').localeCompare(String(pb.kelas_jalan || ''));
        default:         return 0;
      }
    });
  }, [ruas.features, search, fKelas, fKondisi, fKecamatan, sortBy, sortDir]);

  // Reset page ke 1 saat filter/sort/pageSize berubah
  useEffect(() => {
    setPage(1);
  }, [search, fKelas, fKondisi, fKecamatan, sortBy, sortDir, pageSize]);

  // Pagination derivation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pagedRows = filtered.slice(pageStart, pageEnd);

  // Windowed page numbers (max 7 buttons)
  const pageNumbers = useMemo(() => {
    const span = 5;
    const start = Math.max(1, Math.min(totalPages - span + 1, safePage - 2));
    const end = Math.min(totalPages, start + span - 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    if (start > 1) pages.unshift('…');
    if (end < totalPages) pages.push('…');
    return pages;
  }, [safePage, totalPages]);

  // Stats dari filtered (untuk hero "Ruas Terpilih")
  const filteredCount = filtered.length;
  const filteredPanjang = filtered.reduce((acc, f) => {
    const p = f.properties || {};
    return acc + (Number(p.panjang_geo_km) || Number(p.panjang_km) || 0);
  }, 0);

  // Opsi kecamatan (dari semua data)
  const kecamatanOpts = useMemo(() => {
    return allStats.byKecamatan.map(([k]) => k).filter(Boolean);
  }, [allStats]);

  // Chart data
  const kelasChart = useMemo(() => {
    return allStats.byKelas.map(([k, c]) => ({ name: k, count: c, fill: KELAS_COLOR[k] || '#0EA5E9' }));
  }, [allStats]);

  const kondisiChart = useMemo(() => {
    return KONDISI_LIST.map((k) => ({
      name: k,
      count: allStats.byKondisi.find(([n]) => n === k)?.[1] || 0,
      fill: KONDISI_TONE[k]?.dot || '#94a3b8'
    }));
  }, [allStats]);

  const kecamatanChart = useMemo(() => {
    return allStats.byKecamatan.slice(0, 10).map(([k, c]) => ({ name: k, count: c }));
  }, [allStats]);

  // Kondisi count (untuk hero)
  const kondisiCount = (name) => allStats.byKondisi.find(([n]) => n === name)?.[1] || 0;

  // Toggles sort
  function toggleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function resetFilter() {
    setSearch('');
    setFKelas('all');
    setFKondisi('all');
    setFKecamatan('all');
  }

  const hasFilter = search || fKelas !== 'all' || fKondisi !== 'all' || fKecamatan !== 'all';

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-6">
        <Loader2 size={18} className="animate-spin text-primary-700" />
        <span className="text-sm font-bold uppercase tracking-wider text-subink">Memuat ruas jalan…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Hero */}
      <section className="card overflow-hidden bg-gradient-to-br from-primary-800 to-primary-900 p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-200">
              <Route size={14} strokeWidth={2.5} aria-hidden="true" /> Modul Jalan Kabupaten
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Jalan & Ruas</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-100">
              Dataset ruas jalan PU kabupaten Banjarnegara — total panjang, kelas I–VI, kondisi, dan sebaran per kecamatan.
            </p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 md:flex">
            <Ruler size={28} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat label="Total Ruas" value={allStats.total} suffix="ruas" tone="bg-white/10" />
          <HeroStat label="Total Panjang" value={fmtKm(allStats.totalPanjang)} suffix="km" tone="bg-white/10" />
          <HeroStat label="Kelas" value={KELAS_LIST.filter(k => allStats.byKelas.find(([n]) => n === k)).length} suffix="kelas aktif" tone="bg-white/10" />
          <HeroStat label="Kecamatan" value={kecamatanOpts.length} suffix="kec." tone="bg-white/10" />
        </div>
      </section>

      {err && (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-3 md:p-4">
          <AlertTriangle size={18} className="mt-0.5 text-red-700" aria-hidden="true" />
          <div className="flex-1 text-xs md:text-sm text-red-700">
            <div className="font-bold">Gagal memuat data</div>
            <div className="mt-0.5">{err}</div>
          </div>
        </div>
      )}

      {/* Hero metrics — kondisi */}
      <section aria-label="Ringkasan Kondisi Ruas">
        <h2 className="section-title mb-3">Ringkasan Kondisi</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard tone="green"  icon={ListChecks}     label="Baik"         value={kondisiCount('Baik')}         sub="kondisi" />
          <StatCard tone="amber"  icon={AlertTriangle}  label="Rusak Ringan" value={kondisiCount('Rusak Ringan')} sub="kondisi" />
          <StatCard tone="orange" icon={AlertTriangle}  label="Rusak Sedang" value={kondisiCount('Rusak Sedang')} sub="kondisi" />
          <StatCard tone="red"    icon={AlertTriangle}  label="Rusak Berat"  value={kondisiCount('Rusak Berat')}  sub="kondisi" />
        </div>
      </section>

      {/* Distribusi kelas + Kondisi chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Distribusi Kelas Jalan
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kelasChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v) => [`${v} ruas`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {kelasChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-subink">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> I-II (Nasional)</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: '#FFD500' }} /> III-IV (Provinsi)</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-accent-600" /> V-VI (Kabupaten)</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Distribusi Kondisi
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kondisiChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v) => [`${v} ruas`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {kondisiChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top kecamatan */}
      {kecamatanChart.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <Building2 size={12} strokeWidth={2.5} aria-hidden="true" /> Top 10 Kecamatan (Jumlah Ruas)
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kecamatanChart} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v) => [`${v} ruas`, 'Jumlah']}
                />
                <Bar dataKey="count" fill="#1E40AF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rekor */}
      {(allStats.longest || allStats.shortest) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {allStats.longest && (
            <div className="card flex items-start gap-3 border-accent-200 bg-accent-50 p-3 md:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-100 text-accent-700">
                <TrendingUp size={18} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="flex-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent-700">Ruas Terpanjang</div>
                <div className="mt-0.5 font-bold text-ink">{allStats.longest.nama}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-accent-700">{fmtKm(allStats.longest.panjang)} km · Kelas {allStats.longest.kelas}</div>
              </div>
            </div>
          )}
          {allStats.shortest && allStats.shortest.id !== allStats.longest?.id && (
            <div className="card flex items-start gap-3 border-primary-200 bg-primary-50 p-3 md:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700">
                <Ruler size={18} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="flex-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary-700">Ruas Terpendek</div>
                <div className="mt-0.5 font-bold text-ink">{allStats.shortest.nama}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-primary-700">{fmtKm(allStats.shortest.panjang)} km · Kelas {allStats.shortest.kelas}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <section aria-label="Filter Ruas" className="card p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subink">
          <Filter size={12} strokeWidth={2.5} aria-hidden="true" /> Filter Ruas
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subink" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / nomor / titik…"
                aria-label="Pencarian ruas"
                className="input pl-8"
              />
            </div>
          </div>
          <select value={fKelas} onChange={(e) => setFKelas(e.target.value)} aria-label="Filter kelas" className="input">
            <option value="all">Semua Kelas</option>
            {KELAS_LIST.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
          <select value={fKondisi} onChange={(e) => setFKondisi(e.target.value)} aria-label="Filter kondisi" className="input">
            <option value="all">Semua Kondisi</option>
            {KONDISI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={fKecamatan} onChange={(e) => setFKecamatan(e.target.value)} aria-label="Filter kecamatan" className="input">
            <option value="all">Semua Kecamatan</option>
            {kecamatanOpts.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{filteredCount}</b> dari <span className="font-mono">{allStats.total}</span> ruas · <span className="font-mono">{fmtKm(filteredPanjang)}</span> km
          </span>
          {hasFilter && (
            <button onClick={resetFilter} className="btn-secondary text-[11px]">Reset Filter</button>
          )}
        </div>
      </section>

      {/* Tabel + Peta side by side (lg+) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Tabel */}
        <div className="card overflow-hidden xl:col-span-3">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-primary-700">
                      # <ArrowUpDown size={10} aria-hidden="true" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => toggleSort('nomor')} className="inline-flex items-center gap-1 hover:text-primary-700">
                      No. Ruas <ArrowUpDown size={10} aria-hidden="true" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => toggleSort('nama')} className="inline-flex items-center gap-1 hover:text-primary-700">
                      Nama <ArrowUpDown size={10} aria-hidden="true" />
                    </button>
                  </th>
                  <th>Kelas</th>
                  <th>Kondisi</th>
                  <th>Kecamatan</th>
                  <th className="text-right">
                    <button onClick={() => toggleSort('panjang')} className="inline-flex items-center gap-1 hover:text-primary-700">
                      Panjang (km) <ArrowUpDown size={10} aria-hidden="true" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => toggleSort('lebar')} className="inline-flex items-center gap-1 hover:text-primary-700">
                      Lebar (m) <ArrowUpDown size={10} aria-hidden="true" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-subink">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-subink">
                          <Layers size={18} aria-hidden="true" />
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider">Tidak ada ruas</div>
                        <div className="text-[11px]">Coba ubah filter atau reset pencarian</div>
                      </div>
                    </td>
                  </tr>
                ) : pagedRows.map((f) => {
                  const p = f.properties || {};
                  const kls = p.kelas_jalan || 'Lain';
                  const knd = p.kondisi || 'Baik';
                  const tone = KONDISI_TONE[knd] || KONDISI_TONE['Baik'];
                  const panjang = Number(p.panjang_geo_km) || Number(p.panjang_km) || 0;
                  return (
                    <tr key={p.id}>
                      <td className="font-mono font-bold text-ink">#{p.id}</td>
                      <td className="whitespace-nowrap font-mono text-[11px] font-semibold text-ink">{p.nomor_ruas || '—'}</td>
                      <td>
                        <div className="font-semibold text-ink">{p.nama_ruas || '—'}</div>
                        <div className="text-[10px] text-subink">
                          {p.titik_awal || '—'} → {p.titik_akhir || '—'}
                        </div>
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            background: `${KELAS_COLOR[kls]}15`,
                            borderColor: `${KELAS_COLOR[kls]}66`,
                            color: KELAS_COLOR[kls]
                          }}
                        >
                          {kls}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${tone.chip}`}>
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
                          {knd}
                        </span>
                      </td>
                      <td className="capitalize">{p.kecamatan || <span className="text-subink">—</span>}</td>
                      <td className="text-right font-mono font-bold tabular-nums text-ink">{fmtKm(panjang)}</td>
                      <td className="text-right font-mono tabular-nums text-ink">{p.lebar_m ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {filtered.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border bg-canvas px-3 py-2 md:flex-row md:items-center md:justify-between md:px-4">
              <div className="flex items-center gap-2 text-xs text-subink">
                <span>
                  Menampilkan <b className="font-mono text-ink">{pageStart + 1}</b>–<b className="font-mono text-ink">{pageEnd}</b> dari <b className="font-mono text-ink">{filtered.length}</b> ruas
                </span>
                <span className="hidden md:inline">·</span>
                <label className="flex items-center gap-1.5">
                  <span className="hidden md:inline">Tampilkan</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Jumlah baris per halaman"
                    className="h-7 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-mono text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="hidden md:inline">/hal</span>
                </label>
              </div>

              <div className="flex items-center gap-1">
                <PageBtn disabled={safePage === 1} onClick={() => setPage(1)} aria-label="Halaman pertama">
                  <ChevronsLeft size={14} strokeWidth={2.5} aria-hidden="true" />
                </PageBtn>
                <PageBtn disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Halaman sebelumnya">
                  <ChevronLeft size={14} strokeWidth={2.5} aria-hidden="true" />
                </PageBtn>

                {pageNumbers.map((n, i) =>
                  n === '…' ? (
                    <span key={`g${i}`} className="px-1 text-xs text-subink">…</span>
                  ) : (
                    <PageBtn
                      key={n}
                      active={n === safePage}
                      onClick={() => setPage(n)}
                      aria-label={`Halaman ${n}`}
                      aria-current={n === safePage ? 'page' : undefined}
                    >
                      {n}
                    </PageBtn>
                  )
                )}

                <PageBtn disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Halaman berikutnya">
                  <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
                </PageBtn>
                <PageBtn disabled={safePage === totalPages} onClick={() => setPage(totalPages)} aria-label="Halaman terakhir">
                  <ChevronsRight size={14} strokeWidth={2.5} aria-hidden="true" />
                </PageBtn>
              </div>
            </div>
          )}
        </div>

        {/* Peta */}
        <div className="xl:col-span-2">
          <div className="card mb-2 flex items-center gap-2 px-3 py-2 text-xs">
            <MapIcon size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
            <span className="font-bold uppercase tracking-wider text-subink">Peta Ruas</span>
            <span className="ml-auto rounded-full bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700 border border-primary-200">
              {filtered.length} ruas
            </span>
          </div>
          <MapView
            kecamatan={null}
            desa={null}
            ruas={filtered.length > 0 ? { type: 'FeatureCollection', features: filtered } : null}
            parkir={null}
            jukir={null}
            choropleth={null}
            laporan={[]}
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, suffix, tone }) {
  return (
    <div className={`rounded-lg p-3 ring-1 ring-inset ring-white/20 ${tone}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-primary-200">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold leading-none text-white tabular-nums">{value}</span>
        <span className="text-[11px] text-primary-200">{suffix}</span>
      </div>
    </div>
  );
}

function StatCard({ tone = 'blue', label, value, sub, icon: Icon }) {
  const t = TONE_CLASS[tone] || TONE_CLASS.blue;
  return (
    <div className={`card card-hover p-3 ring-1 ring-inset ${t.ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-subink">{label}</span>
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.icon}`}>
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-2 font-mono text-xl font-bold leading-none text-ink tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-wider text-subink">{sub}</div>}
    </div>
  );
}

const TONE_CLASS = {
  blue:   { ring: 'ring-primary-100',  icon: 'bg-primary-50  text-primary-700'  },
  green:  { ring: 'ring-accent-100',   icon: 'bg-accent-50   text-accent-700'   },
  amber:  { ring: 'ring-amber-100',    icon: 'bg-amber-50    text-amber-700'    },
  orange: { ring: 'ring-orange-100',   icon: 'bg-orange-50   text-orange-700'   },
  red:    { ring: 'ring-red-100',      icon: 'bg-red-50      text-red-700'      },
  sky:    { ring: 'ring-sky-100',      icon: 'bg-sky-50      text-sky-700'      },
  indigo: { ring: 'ring-indigo-100',   icon: 'bg-indigo-50   text-indigo-700'   },
  slate:  { ring: 'ring-slate-100',    icon: 'bg-slate-50    text-slate-700'    }
};

function PageBtn({ active, disabled, onClick, children, ...rest }) {
  const base = 'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';
  if (active) {
    return (
      <button onClick={onClick} disabled={disabled} aria-current="page"
        className={`${base} border-primary-300 bg-primary-50 text-primary-700`} {...rest}>
        {children}
      </button>
    );
  }
  if (disabled) {
    return (
      <button onClick={onClick} disabled
        className={`${base} border-border bg-surface text-subink opacity-40 cursor-not-allowed`} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className={`${base} border-border bg-surface text-ink hover:bg-muted hover:border-primary-200`} {...rest}>
      {children}
    </button>
  );
}