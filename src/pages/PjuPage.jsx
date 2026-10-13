import { useEffect, useMemo, useState } from 'react';
import {
  Lightbulb, Loader2, AlertTriangle, Filter, Search, BarChart3, TrendingUp,
  Zap, Receipt, Users, ChevronLeft, ChevronRight, ArrowUpDown, Info, SunMedium
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, AreaChart, Area, PieChart, Pie, ComposedChart, Line
} from 'recharts';
import {
  getPju, computePjuStats, filterPju, buildYearlyIncomeTrend,
  JENIS_LAMPU_LABEL, JENIS_LAMPU_COLOR, KONDISI_TONE, CATUDAYA_LABEL, formatRupiah
} from '../api/pju';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function shortMonth(ym) {
  const m = Number(ym.slice(5, 7)) - 1;
  return (MONTHS_ID[m] || ym.slice(5, 7)) + " '" + ym.slice(2, 4);
}

export default function PjuPage() {
  const [pjuData, setPjuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Filter & sort aset PJU
  const [search, setSearch] = useState('');
  const [fJenisLampu, setFJenisLampu] = useState('all');
  const [fKondisi, setFKondisi] = useState('all');
  const [fCatudaya, setFCatudaya] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    getPju().then((d) => {
      if (!mounted) return;
      setPjuData(d);
    }).catch((e) => {
      if (mounted) setErr(e.message || String(e));
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const allStats = useMemo(() => computePjuStats(pjuData?.pju || []), [pjuData]);

  const filtered = useMemo(() => {
    const f = filterPju(pjuData?.pju || [], { search, jenisLampu: fJenisLampu, kondisi: fKondisi, catudaya: fCatudaya });
    const dir = sortDir === 'asc' ? 1 : -1;
    return f.slice().sort((a, b) => {
      switch (sortBy) {
        case 'id': return dir * ((a.id_pju || 0) - (b.id_pju || 0));
        case 'jenis_lampu': return dir * String(a.jenis_lampu || '').localeCompare(String(b.jenis_lampu || ''));
        case 'daya': return dir * ((a.daya_lampu || 0) - (b.daya_lampu || 0));
        case 'kondisi': return dir * String(a.kondisi || '').localeCompare(String(b.kondisi || ''));
        default: return 0;
      }
    });
  }, [pjuData, search, fJenisLampu, fKondisi, fCatudaya, sortBy, sortDir]);

  useEffect(() => { setPage(1); }, [search, fJenisLampu, fKondisi, fCatudaya, sortBy, sortDir, pageSize]);

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

  // ---------- Chart data ----------
  const monthlyChart = useMemo(() => {
    return (pjuData?.monthly_tagihan || []).map((m) => ({
      month: shortMonth(m.month),
      full: m.month,
      total: m.total,
      kwhRp: m.kwh_rp,
      nonkwhRp: m.nonkwh_rp,
      kwh: m.kwh,
      count: m.count
    }));
  }, [pjuData]);

  const yearlyTrend = useMemo(() => {
    return buildYearlyIncomeTrend(pjuData?.monthly_tagihan || []);
  }, [pjuData]);

  const jenisLampuChart = useMemo(() => {
    return Object.entries(allStats.byJenisLampu)
      .filter(([k]) => k !== '(tidak terdata)')
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => ({
        name: JENIS_LAMPU_LABEL[k] || k,
        short: k,
        count: c,
        fill: JENIS_LAMPU_COLOR[k] || '#94a3b8'
      }));
  }, [allStats]);

  const kondisiChart = useMemo(() => {
    return Object.entries(allStats.byKondisi).map(([k, c]) => ({
      name: k,
      value: c,
      fill: KONDISI_TONE[k]?.dot || '#94a3b8'
    }));
  }, [allStats]);

  const catudayaChart = useMemo(() => {
    return Object.entries(allStats.byCatudaya).map(([k, c]) => ({
      name: CATUDAYA_LABEL[k] || k,
      value: c,
      fill: k === 'T' ? '#1E40AF' : k === 'M' ? '#10B981' : '#94a3b8'
    }));
  }, [allStats]);

  const kwhPieChart = useMemo(() => {
    return [
      { name: 'kWh', value: pjuData?.billing?.kwh_rows || 0, fill: '#1CAF9A' },
      { name: 'non-kWh', value: pjuData?.billing?.nonkwh_rows || 0, fill: '#D9534F' }
    ];
  }, [pjuData]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function resetFilter() {
    setSearch('');
    setFJenisLampu('all');
    setFKondisi('all');
    setFCatudaya('all');
  }

  const hasFilter = search || fJenisLampu !== 'all' || fKondisi !== 'all' || fCatudaya !== 'all';

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-6">
        <Loader2 size={18} className="animate-spin text-primary-700" />
        <span className="text-sm font-bold uppercase tracking-wider text-subink">Memuat analisa PJU…</span>
      </div>
    );
  }

  const b = pjuData?.billing || {};
  const c = pjuData?.counts || {};

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Hero */}
      <section className="card overflow-hidden bg-gradient-to-br from-primary-800 to-primary-900 p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-200">
              <Lightbulb size={14} strokeWidth={2.5} aria-hidden="true" /> Modul Penerangan Jalan Umum
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Analisa Biaya & Aset PJU</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-100">
              Rekapitulasi tagihan listrik (kWh vs non-kWh), komposisi jenis lampu, kondisi aset, serta basis data IDPEL PLN dan titik PJU mandiri solar.
            </p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 md:flex">
            <Zap size={28} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat label="Total Pembayaran" value={formatRupiah(b.total_pembayaran, { compact: true })} desc={`${(b.total_pembayaran / 1e9).toFixed(1)} M rupiah`} />
          <HeroStat label="Titik Aset PJU" value={allStats.total} suffix="titik" />
          <HeroStat label="IDPEL Aktif" value={c.distinct_idpel_billing || 0} suffix="pelanggan" tone="accent" />
          <HeroStat label="Kondisi Rusak" value={allStats.rusakCount} suffix="titik" tone="destructive" />
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

      {/* KPI biaya */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Receipt} label="Total Tagihan PLN" value={formatRupiah(b.total_tagihan_pln, { compact: true })} sub={`${(b.total_tagihan_pln / 1e9).toFixed(1)} miliar`} />
        <KpiCard icon={Zap} label="Pembayaran kWh Meter" value={formatRupiah(b.kwh_rp, { compact: true })} sub={`${b.kwh_rows} baris`} tone="green" />
        <KpiCard icon={SunMedium} label="Pembayaran non-kWh" value={formatRupiah(b.nonkwh_rp, { compact: true })} sub={`${b.nonkwh_rows} baris`} tone="red" />
        <KpiCard icon={TrendingUp} label="Rata² / IDPEL / bulan" value={formatRupiah(b.avg_per_idpel_per_bulan, { compact: true })} sub={`${(b.total_kwh / 1e6).toFixed(2)} jt kWh total`} />
      </div>

      {/* Tren tagihan per bulan */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
          <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" /> Tren Tagihan Listrik per Bulan (kWh vs non-kWh)
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyChart} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="gKwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1CAF9A" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1CAF9A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNonkwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D9534F" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#D9534F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickFormatter={(v) => `${(v / 1e9).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#475569' }} width={52} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                formatter={(v, n) => [formatRupiah(v), n === 'kwhRp' ? 'kWh' : n === 'nonkwhRp' ? 'non-kWh' : n]}
                labelFormatter={(l, p) => p?.[0]?.payload?.full || l}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="nonkwhRp" name="non-kWh" stroke="#D9534F" strokeWidth={2} fill="url(#gNonkwh)" />
              <Area type="monotone" dataKey="kwhRp" name="kWh" stroke="#1CAF9A" strokeWidth={2} fill="url(#gKwh)" />
              <Line type="monotone" dataKey="total" name="Total" stroke="#1E40AF" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tren pemasukan per tahun + prediksi 2026 */}
      <div className="card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
          <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" /> Tren Pemasukan Pembayaran PJU per Tahun (dengan Prediksi 2026)
        </div>
        <p className="mb-3 flex items-center gap-1.5 text-[11px] text-subink">
          <Info size={11} className="shrink-0" aria-hidden="true" />
          Tahun 2020–2022 data riil tagihan; 2023–2025 proyeksi melanjutkan tren; 2026 prediksi regresi linier.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tickFormatter={(v) => `${(v / 1e9).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#475569' }} width={52} domain={['dataMin - 1000000000', 'dataMax + 1000000000']} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                formatter={(v, n) => [formatRupiah(v), 'Pembayaran']}
                labelFormatter={(l) => `Tahun ${l}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Pemasukan"
                stroke="#1D4ED8"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                fill="#3B82F6"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-subink">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1E40AF]" aria-hidden="true" /> Data riil (2020–2022)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#6366F1]" aria-hidden="true" /> Proyeksi dummy (2023–2025)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F59E0B]" aria-hidden="true" /> Prediksi (2026)
          </span>
        </div>
      </div>

      {/* Distribusi jenis lampu & kondisi */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Komposisi Jenis Lampu
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenisLampuChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="short" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                  formatter={(v, n, p) => [`${v} titik`, p.payload.name]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {jenisLampuChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" /> Kondisi Aset
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kondisiChart} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={76} paddingAngle={2}
                  label={(d) => d.value > 0 ? `${d.value}` : ''} labelLine={false}>
                  {kondisiChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* kWh vs non-kWh pie + catudaya */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <Zap size={12} strokeWidth={2.5} aria-hidden="true" /> Klasifikasi Tagihan (kWh vs non-kWh)
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kwhPieChart} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}
                  label={(d) => `${d.value.toLocaleString('id-ID')}`} labelLine={false}>
                  {kwhPieChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v.toLocaleString('id-ID')} baris`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <SunMedium size={12} strokeWidth={2.5} aria-hidden="true" /> Sumber Catu Daya
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catudayaChart} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}
                  label={(d) => d.value > 0 ? `${d.value}` : ''} labelLine={false}>
                  {catudayaChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top IDPEL */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-4 py-3">
          <Users size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-subink">Top 20 IDPEL dengan Tagihan Tertinggi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>IDPEL</th>
                <th>Nama / Lokasi</th>
                <th>Daya (VA)</th>
                <th>Gardu</th>
                <th className="text-right">Total kWh</th>
                <th className="text-right">Total Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {(pjuData?.top_idpel || []).map((r, i) => (
                <tr key={r.idpel}>
                  <td className="font-mono font-bold text-ink">{i + 1}</td>
                  <td className="font-mono text-[12px] font-semibold text-primary-700">{r.idpel}</td>
                  <td>
                    <div className="line-clamp-1 font-semibold text-ink">{r.nama || '—'}</div>
                    <div className="line-clamp-1 text-[10px] text-subink">{r.lokasi || '—'}</div>
                  </td>
                  <td className="font-mono text-[12px]">{r.daya ? r.daya.toLocaleString('id-ID') : '—'}</td>
                  <td className="font-mono text-[11px] text-subink">{r.kdgardu || '—'}</td>
                  <td className="font-mono text-[12px] text-right">{r.billing?.total_kwh?.toLocaleString('id-ID') || 0}</td>
                  <td className="font-mono text-[12px] text-right font-semibold text-primary-700">{formatRupiah(r.billing?.total_pembayaran)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter + tabel aset PJU */}
      <section aria-label="Filter Aset PJU" className="card p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subink">
          <Filter size={12} strokeWidth={2.5} aria-hidden="true" /> Filter Aset PJU
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subink" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari IDPEL / lokasi…" aria-label="Pencarian PJU" className="input pl-8" />
            </div>
          </div>
          <select value={fJenisLampu} onChange={(e) => setFJenisLampu(e.target.value)} aria-label="Filter jenis lampu" className="input">
            <option value="all">Semua Jenis Lampu</option>
            {Object.entries(allStats.byJenisLampu).sort((a, b) => b[1] - a[1]).map(([k, c]) => (
              <option key={k} value={k}>{k} ({c})</option>
            ))}
          </select>
          <select value={fKondisi} onChange={(e) => setFKondisi(e.target.value)} aria-label="Filter kondisi" className="input">
            <option value="all">Semua Kondisi</option>
            {Object.entries(allStats.byKondisi).map(([k, c]) => (
              <option key={k} value={k}>{k} ({c})</option>
            ))}
          </select>
          <select value={fCatudaya} onChange={(e) => setFCatudaya(e.target.value)} aria-label="Filter catu daya" className="input">
            <option value="all">Semua Catu Daya</option>
            {Object.entries(allStats.byCatudaya).map(([k, c]) => (
              <option key={k} value={k}>{CATUDAYA_LABEL[k] || k} ({c})</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{filtered.length}</b> dari <span className="font-mono">{allStats.total}</span> titik
          </span>
          {hasFilter && <button onClick={resetFilter} className="btn-secondary text-[11px]">Reset Filter</button>}
        </div>
      </section>

      {/* Tabel aset */}
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
                <th>
                  <button onClick={() => toggleSort('jenis_lampu')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    Jenis Lampu <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('daya')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    Daya <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('kondisi')} className="inline-flex items-center gap-1 hover:text-primary-700">
                    Kondisi <ArrowUpDown size={10} aria-hidden="true" />
                  </button>
                </th>
                <th>Catu Daya</th>
                <th>IDPEL</th>
                <th>Lokasi / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-subink">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-subink"><Lightbulb size={18} aria-hidden="true" /></div>
                      <div className="text-xs font-semibold uppercase tracking-wider">Tidak ada titik</div>
                      <div className="text-[11px]">Coba ubah filter atau reset pencarian</div>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.map((p) => {
                const knd = p.kondisi || '(tidak terdata)';
                const kndTone = KONDISI_TONE[knd] || KONDISI_TONE['(tidak terdata)'];
                const jlColor = JENIS_LAMPU_COLOR[p.jenis_lampu] || '#94a3b8';
                return (
                  <tr key={p.id_pju}>
                    <td className="font-mono font-bold text-ink">#{p.id_pju}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: jlColor }} aria-hidden="true" />
                        <span className="text-xs font-semibold text-ink">{p.jenis_lampu || '—'}</span>
                      </div>
                    </td>
                    <td className="font-mono text-[12px]">{p.daya_lampu ? `${p.daya_lampu} W` : '—'}</td>
                    <td>
                      <span className={`chip ${kndTone.chip}`}>
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: kndTone.dot }} />
                        {knd}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${p.catudaya === 'T' ? 'bg-primary-50 text-primary-700 border-primary-200' : p.catudaya === 'M' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {CATUDAYA_LABEL[p.catudaya] || p.catudaya || '—'}
                      </span>
                    </td>
                    <td className="font-mono text-[11px] text-primary-700">{p.id_pel || <span className="text-subink">—</span>}</td>
                    <td>
                      <div className="line-clamp-2 max-w-xs text-xs text-ink">{p.keterangan || p.lokasi || '—'}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border bg-canvas px-3 py-2 md:flex-row md:items-center md:justify-between md:px-4">
            <div className="flex items-center gap-2 text-xs text-subink">
              <span>
                Menampilkan <b className="font-mono text-ink">{pageStart + 1}</b>–<b className="font-mono text-ink">{pageEnd}</b> dari <b className="font-mono text-ink">{filtered.length}</b> titik
              </span>
              <label className="flex items-center gap-1.5">
                <span className="hidden md:inline">Tampilkan</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label="Jumlah baris per halaman"
                  className="h-7 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-mono text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
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
                <ChevronLeft size={14} strokeWidth={2.5} aria-hidden="true" />
              </PageBtn>
              {pageNumbers.map((n, i) =>
                n === '…' ? (
                  <span key={`g${i}`} className="px-1 text-xs text-subink">…</span>
                ) : (
                  <PageBtn key={n} active={n === safePage} onClick={() => setPage(n)} aria-label={`Halaman ${n}`} aria-current={n === safePage ? 'page' : undefined}>{n}</PageBtn>
                )
              )}
              <PageBtn disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Halaman berikutnya">
                <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStat({ label, value, suffix, desc, tone = 'default' }) {
  const ring = tone === 'destructive' ? 'ring-red-400/30'
    : tone === 'accent' ? 'ring-emerald-400/30'
    : 'ring-white/20';
  return (
    <div className={`rounded-lg p-3 ring-1 ring-inset ${ring}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-primary-200">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold leading-none text-white tabular-nums">{value}</span>
        {suffix && <span className="text-[11px] text-primary-200">{suffix}</span>}
      </div>
      {desc && <div className="mt-1 text-[11px] text-primary-200">{desc}</div>}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  const iconTone = tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : tone === 'red' ? 'bg-red-50 text-red-700 ring-red-200'
    : 'bg-primary-50 text-primary-700 ring-primary-200';
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${iconTone}`}>
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-subink">{label}</div>
        <div className="mt-1 font-mono text-lg font-bold leading-none text-ink tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-[10px] text-subink">{sub}</div>}
      </div>
    </div>
  );
}

function PageBtn({ active, disabled, onClick, children, ...rest }) {
  const base = 'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';
  if (active) {
    return <button onClick={onClick} disabled={disabled} aria-current="page" className={`${base} border-primary-300 bg-primary-50 text-primary-700`} {...rest}>{children}</button>;
  }
  if (disabled) {
    return <button onClick={onClick} disabled className={`${base} border-border bg-surface text-subink opacity-40 cursor-not-allowed`} {...rest}>{children}</button>;
  }
  return <button onClick={onClick} className={`${base} border-border bg-surface text-ink hover:bg-muted hover:border-primary-200`} {...rest}>{children}</button>;
}