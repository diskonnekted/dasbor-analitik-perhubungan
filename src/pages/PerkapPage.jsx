import { useEffect, useMemo, useState } from 'react';
import { Construction, Loader2, AlertTriangle, Filter, Search, BarChart3, ArrowUpDown, MapIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, TrendingUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, PieChart, Pie } from 'recharts';
import PerkapMapNew from '../components/map/PerkapMapNew';
import { getPerkap, computePerkapStats, filterPerkap, JENIS_LABEL, JENIS_COLOR, JENIS_ICON, KONDISI_TONE, KONDISI_LIST, STATUS_LIST, STATUS_LABEL, POSISI_LIST } from '../api/perlengkapan';

export default function PerkapPage() {
  const [perkap, setPerkap] = useState({ features: [], jenis: [], source: 'loading' });
  const [kecamatan, setKecamatan] = useState(null);
  const [desa, setDesa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Filter
  const [search, setSearch] = useState('');
  const [fJenis, setFJenis] = useState('all');
  const [fKondisi, setFKondisi] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fPosisi, setFPosisi] = useState('all');
  const [fTahun, setFTahun] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const p = await getPerkap();
        const [kecRes, desaRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}peta_kecamatan.geojson`, { cache: 'force-cache' }),
          fetch(`${import.meta.env.BASE_URL}peta_desa.geojson`, { cache: 'force-cache' })
        ]);
        if (!mounted) return;
        setPerkap(p);
        if (kecRes.ok) setKecamatan(await kecRes.json());
        if (desaRes.ok) setDesa(await desaRes.json());
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const allStats = useMemo(() => computePerkapStats(perkap.features), [perkap]);

  const filtered = useMemo(() => {
    const f = filterPerkap(perkap.features, {
      search,
      jenis: fJenis,
      kondisi: fKondisi,
      status: fStatus,
      posisi: fPosisi,
      tahun: fTahun
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return f.slice().sort((a, b) => {
      const pa = a.properties || {};
      const pb = b.properties || {};
      switch (sortBy) {
        case 'id':     return dir * ((pa.id || 0) - (pb.id || 0));
        case 'nama':   return dir * String(pa.nama || '').localeCompare(String(pb.nama || ''));
        case 'jenis':  return dir * ((pa.id_jenis || 0) - (pb.id_jenis || 0));
        case 'kondisi':return dir * String(pa.kondisi || '').localeCompare(String(pb.kondisi || ''));
        case 'tgl':    return dir * String(pa.tgl_insert || '').localeCompare(String(pb.tgl_insert || ''));
        default:       return 0;
      }
    });
  }, [perkap.features, search, fJenis, fKondisi, fStatus, fPosisi, fTahun, sortBy, sortDir]);

  // Reset page
  useEffect(() => { setPage(1); }, [search, fJenis, fKondisi, fStatus, fPosisi, fTahun, sortBy, sortDir, pageSize]);

  // Pagination derivation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const pagedRows = filtered.slice(pageStart, pageEnd);

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

  // Chart data
  const jenisChart = useMemo(() => {
    return Object.entries(allStats.byJenis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, c]) => ({
        name: JENIS_LABEL[k] || `#${k}`,
        short: (JENIS_LABEL[k] || `#${k}`).replace('Rambu ', 'R.'),
        count: c,
        fill: JENIS_COLOR[k]?.fill || '#94a3b8'
      }));
  }, [allStats]);

  const kondisiChart = useMemo(() => {
    return KONDISI_LIST.map((k) => ({
      name: k,
      value: allStats.byKondisi[k] || 0,
      fill: KONDISI_TONE[k]?.dot || '#94a3b8'
    }));
  }, [allStats]);

  const tahunChart = useMemo(() => {
    return Object.entries(allStats.byTahun).sort((a, b) => a[0].localeCompare(b[0])).map(([k, c]) => ({ name: k, count: c }));
  }, [allStats]);

  // GeoJSON untuk MapView (filter)
  const filteredGeo = useMemo(() => ({
    type: 'FeatureCollection',
    features: filtered
  }), [filtered]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function resetFilter() {
    setSearch('');
    setFJenis('all');
    setFKondisi('all');
    setFStatus('all');
    setFPosisi('all');
    setFTahun('all');
  }

  const hasFilter = search || fJenis !== 'all' || fKondisi !== 'all' || fStatus !== 'all' || fPosisi !== 'all' || fTahun !== 'all';

  // Unique tahun dari data
  const tahunOpts = useMemo(() => Object.keys(allStats.byTahun).sort().reverse(), [allStats]);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-6">
        <Loader2 size={18} className="animate-spin text-primary-700" />
        <span className="text-sm font-bold uppercase tracking-wider text-subink">Memuat perlengkapan jalan…</span>
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
              <Construction size={14} strokeWidth={2.5} aria-hidden="true" /> Modul Perlengkapan Jalan
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Perlengkapan Jalan</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-100">
              Sebaran Rambu, APILL, Warning Light, PJU, Marka, Guardrail, Delineator & Cermin Tikungan. Cluster otomatis saat zoom rendah, individu saat zoom tinggi.
            </p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 md:flex">
            <Layers size={28} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat label="Total" value={allStats.total} suffix="titik" />
          <HeroStat label="Kondisi Baik" value={allStats.baikCount} suffix="titik" tone="accent" />
          <HeroStat label="Rusak" value={allStats.rusakCount} suffix="titik" tone="destructive" />
          <HeroStat label="Hilang" value={allStats.hilangCount} suffix="titik" tone="warning" />
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

      {/* Distribusi chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Top 10 Jenis Perlengkapan
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenisChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="short" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(v) => [`${v} titik`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {jenisChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" /> Kondisi
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kondisiChart}
                  dataKey="value"
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={70}
                  paddingAngle={2}
                  label={(d) => d.value > 0 ? `${d.value}` : ''}
                  labelLine={false}
                >
                  {kondisiChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v, n) => [v, n]}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {tahunChart.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Tren Pemasukan per Tahun
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tahunChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v) => [`${v} titik`, 'Jumlah']}
                />
                <Bar dataKey="count" fill="#1E40AF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <section aria-label="Filter Perlengkapan" className="card p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subink">
          <Filter size={12} strokeWidth={2.5} aria-hidden="true" /> Filter Perlengkapan
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subink" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / keterangan…"
                aria-label="Pencarian perkap"
                className="input pl-8"
              />
            </div>
          </div>
          <select value={fJenis} onChange={(e) => setFJenis(e.target.value)} aria-label="Filter jenis" className="input">
            <option value="all">Semua Jenis</option>
            {Object.entries(allStats.byJenis).sort((a, b) => b[1] - a[1]).map(([k, c]) => (
              <option key={k} value={k}>{JENIS_LABEL[k] || `Jenis #${k}`} ({c})</option>
            ))}
          </select>
          <select value={fKondisi} onChange={(e) => setFKondisi(e.target.value)} aria-label="Filter kondisi" className="input">
            <option value="all">Semua Kondisi</option>
            {KONDISI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter status" className="input">
            <option value="all">Semua Status</option>
            {STATUS_LIST.map((k) => <option key={k} value={k}>{STATUS_LABEL[k] || k}</option>)}
          </select>
          <select value={fTahun} onChange={(e) => setFTahun(e.target.value)} aria-label="Filter tahun" className="input">
            <option value="all">Semua Tahun</option>
            {tahunOpts.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{filtered.length}</b> dari <span className="font-mono">{allStats.total}</span> titik
          </span>
          {hasFilter && (
            <button onClick={resetFilter} className="btn-secondary text-[11px]">Reset Filter</button>
          )}
        </div>
      </section>

      {/* Peta full-screen */}
      <div className="card">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <MapIcon size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Peta Sebaran</span>
          <span className="ml-auto rounded-full bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700 border border-primary-200">
            {filtered.length} titik
          </span>
        </div>
        <PerkapMapNew features={filtered} kecamatan={kecamatan} desa={desa} />
        <div className="border-t border-border bg-canvas px-3 py-2 text-[11px] text-subink">
          <div className="flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
            <p>
              <b>Tips:</b> Marker dikelompokkan (cluster) secara otomatis saat zoom rendah. Zoom-in (≥14) untuk melihat per titik. Klik cluster/info-bubble untuk melihat ringkasan.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel paginated */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    # <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
                <th>Jenis</th>
                <th>
                  <button onClick={() => toggleSort('nama')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    Nama <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
                <th>Kondisi</th>
                <th>Status</th>
                <th>Posisi</th>
                <th>Ruas</th>
                <th>
                  <button onClick={() => toggleSort('tgl')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    Tgl Insert <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-subink">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-subink">
                        <Construction size={18} aria-hidden="true" />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Tidak ada titik</div>
                      <div className="text-[11px]">Coba ubah filter atau reset pencarian</div>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.map((f) => {
                const p = f.properties || {};
                const knd = p.kondisi || 'Tidak Diketahui';
                const kndTone = KONDISI_TONE[knd] || KONDISI_TONE['Tidak Diketahui'];
                const fill = JENIS_COLOR[p.id_jenis]?.fill || '#94a3b8';
                const ring  = JENIS_COLOR[p.id_jenis]?.ring  || '#475569';
                const icon  = JENIS_ICON[p.id_jenis] || '📍';
                return (
                  <tr key={p.id}>
                    <td className="font-mono font-bold text-ink">#{p.id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px]"
                          style={{ background: fill + '20', color: fill, border: `1px solid ${ring}55` }}
                          aria-hidden="true"
                        >
                          {icon}
                        </span>
                        <span className="text-xs font-semibold text-ink">{JENIS_LABEL[p.id_jenis] || `#${p.id_jenis}`}</span>
                      </div>
                    </td>
                    <td>
                      <div className="line-clamp-2 max-w-xs font-semibold text-ink">{p.nama || '—'}</div>
                      {p.keterangan && <div className="line-clamp-1 text-[10px] text-subink">{p.keterangan}</div>}
                    </td>
                    <td>
                      <span className={`chip ${kndTone.chip}`}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: kndTone.dot }} />
                        {knd}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${p.status === 'T' ? 'bg-accent-50 text-accent-700 border-accent-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {STATUS_LABEL[p.status] || p.status || '—'}
                      </span>
                    </td>
                    <td className="capitalize">{p.posisi || <span className="text-subink">—</span>}</td>
                    <td className="font-mono text-[11px] text-ink">{p.id_ruasjalan != null ? `#${p.id_ruasjalan}` : '—'}</td>
                    <td className="font-mono text-[11px] text-subink">{p.tgl_insert || '—'}</td>
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
                Menampilkan <b className="font-mono text-ink">{pageStart + 1}</b>–<b className="font-mono text-ink">{pageEnd}</b> dari <b className="font-mono text-ink">{filtered.length}</b> titik
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
    </div>
  );
}

function HeroStat({ label, value, suffix, tone = 'default' }) {
  const ring = tone === 'destructive' ? 'ring-red-400/30'
    : tone === 'warning' ? 'ring-amber-400/30'
    : tone === 'accent' ? 'ring-emerald-400/30'
    : 'ring-white/20';
  return (
    <div className={`rounded-lg p-3 ring-1 ring-inset ${ring}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-primary-200">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold leading-none text-white tabular-nums">{value}</span>
        <span className="text-[11px] text-primary-200">{suffix}</span>
      </div>
    </div>
  );
}

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