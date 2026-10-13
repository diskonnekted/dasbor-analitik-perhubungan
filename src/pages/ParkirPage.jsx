import { useEffect, useMemo, useState } from 'react';
import {
  Car, Loader2, AlertTriangle, Filter, Search, BarChart3, TrendingUp, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MapIcon, Info, Users, SquareStack, BadgeDollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend } from 'recharts';
import ParkirMap from '../components/map/ParkirMap';
import { getParkir, computeParkirStats, filterParkir, filterJukir, JENIS_FASILITAS_LABEL, JENIS_FASILITAS_COLOR, formatRupiah, mediaUrl } from '../api/parkir';

const FACILITY_COLORS = ['#1E40AF', '#0EA5E9', '#16A34A', '#D97706', '#8B5CF6'];

export default function ParkirPage() {
  const [parkir, setParkir] = useState([]);
  const [jukir, setJukir] = useState([]);
  const [juru, setJuru] = useState([]);
  const [juruUnplaced, setJuruUnplaced] = useState([]);
  const [titikJukir, setTitikJukir] = useState([]);
  const [titikParkir, setTitikParkir] = useState([]);
  const [retribusi, setRetribusi] = useState([]);
  const [pengaduan, setPengaduan] = useState([]);
  const [kecamatan, setKecamatan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Filter parkir
  const [search, setSearch] = useState('');
  const [fFasilitas, setFFasilitas] = useState('all');
  const [fKecamatan, setFKecamatan] = useState('all');

  // Filter jukir
  const [jSearch, setJSearch] = useState('');
  const [jStatus, setJStatus] = useState('all');

  // Sort & pagination parkir
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getParkir();
        const kecRes = await fetch(`${import.meta.env.BASE_URL}peta_kecamatan.geojson`, { cache: 'force-cache' });
        if (!mounted) return;
        setParkir(data.parkir);
        setJukir(data.jukir);
        setJuru(data.juru || []);
        setJuruUnplaced(data.juruUnplaced || []);
        setTitikJukir(data.titikJukir || []);
        setTitikParkir(data.titikParkir || []);
        setRetribusi(data.retribusi || []);
        setPengaduan(data.pengaduan || []);
        if (kecRes.ok) setKecamatan(await kecRes.json());
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => computeParkirStats(parkir, jukir, { juru, juruUnplaced }), [parkir, jukir, juru, juruUnplaced]);

  const filteredParkir = useMemo(() => {
    const f = filterParkir(parkir, { search, fasilitas: fFasilitas, kecamatan: fKecamatan });
    const dir = sortDir === 'asc' ? 1 : -1;
    return f.slice().sort((a, b) => {
      const pa = a.properties || {};
      const pb = b.properties || {};
      switch (sortBy) {
        case 'id': return dir * ((pa.id || 0) - (pb.id || 0));
        case 'nama': return dir * String(pa.nama || '').localeCompare(String(pb.nama || ''));
        case 'srp': return dir * ((Number(pa.srp_motor) + Number(pa.srp_mobil)) - (Number(pb.srp_motor) + Number(pb.srp_mobil)));
        case 'luas': return dir * ((Number(pa.luas_lokasi) || 0) - (Number(pb.luas_lokasi) || 0));
        default: return 0;
      }
    });
  }, [parkir, search, fFasilitas, fKecamatan, sortBy, sortDir]);

  const filteredJukir = useMemo(() => {
    return filterJukir(jukir, { search: jSearch, status: jStatus });
  }, [jukir, jSearch, jStatus]);

  const juruByNo = useMemo(() => {
    const m = {};
    titikJukir.forEach((t) => { if (t.no_juru_parkir) m[t.no_juru_parkir] = t; });
    return m;
  }, [titikJukir]);

  const fotoLokasiById = useMemo(() => {
    const m = {};
    titikParkir.forEach((t) => { if (t.id_titik_parkir != null) m[t.id_titik_parkir] = t.foto_lokasi; });
    return m;
  }, [titikParkir]);

  useEffect(() => { setPage(1); }, [search, fFasilitas, fKecamatan, sortBy, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredParkir.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredParkir.length);
  const pagedRows = filteredParkir.slice(pageStart, pageEnd);

  // ponytail: paginasi kedua untuk tabel juru — duplikat kecil dari blok titik di atas.
  const [jPage, setJPage] = useState(1);
  const jPageSize = 15;
  const jTotalPages = Math.max(1, Math.ceil(filteredJukir.length / jPageSize));
  const jSafePage = Math.min(jPage, jTotalPages);
  const jPaged = filteredJukir.slice((jSafePage - 1) * jPageSize, jSafePage * jPageSize);
  const jPageNumbers = useMemo(() => {
    const span = 5;
    const start = Math.max(1, Math.min(jTotalPages - span + 1, jSafePage - 2));
    const end = Math.min(jTotalPages, start + span - 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    if (start > 1) pages.unshift('…');
    if (end < jTotalPages) pages.push('…');
    return pages;
  }, [jSafePage, jTotalPages]);
  useEffect(() => { setJPage(1); }, [jSearch, jStatus]);

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
  const fasilitasChart = useMemo(() => {
    return Object.entries(stats.byFasilitas).map(([k, c]) => ({
      name: JENIS_FASILITAS_LABEL[k] || k,
      count: c,
      fill: JENIS_FASILITAS_COLOR[k] || '#94a3b8'
    }));
  }, [stats]);

  const kecamatanChart = useMemo(() => {
    return Object.entries(stats.byKecamatan)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c], i) => ({ name: k, count: c, fill: FACILITY_COLORS[i % FACILITY_COLORS.length] }));
  }, [stats]);

  const srpChart = useMemo(() => [
    { name: 'SRP Motor', value: stats.srpMotor, fill: '#1E40AF' },
    { name: 'SRP Mobil', value: stats.srpMobil, fill: '#0EA5E9' }
  ], [stats]);

  const jukirStatusChart = useMemo(() => [
    { name: 'Aktif', value: stats.jukir.aktif, fill: '#16A34A' },
    { name: 'Nonaktif', value: stats.jukir.nonaktif, fill: '#94A3B8' }
  ], [stats]);

  const domisiliChart = useMemo(() => {
    return Object.entries(stats.master.byDomisili)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c], i) => ({ name: k, count: c, fill: FACILITY_COLORS[i % FACILITY_COLORS.length] }));
  }, [stats]);

  const jkChart = useMemo(() => {
    return Object.entries(stats.master.byJk)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c], i) => ({ name: k, count: c, fill: FACILITY_COLORS[i % FACILITY_COLORS.length] }));
  }, [stats]);

  // ===== Retribusi SK perorangan (194 SK) =====
  const retribusiStats = useMemo(() => {
    const byZona = {};
    const byJenis = {};
    let totalBln = 0, totalThn = 0, aktif = 0;
    retribusi.forEach((r) => {
      totalBln += Number(r.retribusi_perbulan) || 0;
      totalThn += Number(r.retribusi_pertahun) || 0;
      if (String(r.status) === '1' || String(r.status).toLowerCase() === 'aktif') aktif++;
      const z = r.zona || 'Tanpa Zona';
      byZona[z] = (byZona[z] || 0) + 1;
      byJenis[r.jenis_lokasi || 'Lainnya'] = (byJenis[r.jenis_lokasi || 'Lainnya'] || 0) + 1;
    });
    const zonaChart = Object.entries(byZona)
      .sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true }))
      .map(([k, c], i) => ({ name: k, count: c, fill: FACILITY_COLORS[i % FACILITY_COLORS.length] }));
    return { totalBln, totalThn, aktif, zonaChart, byJenis: Object.entries(byJenis).sort((a, b) => b[1] - a[1]) };
  }, [retribusi]);

  // ===== Pengaduan (8) =====
  const pengaduanStats = useMemo(() => {
    const c = { selesai: 0, proses: 0, menunggu: 0 };
    pengaduan.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [pengaduan]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function resetFilter() {
    setSearch('');
    setFFasilitas('all');
    setFKecamatan('all');
  }

  const hasFilter = search || fFasilitas !== 'all' || fKecamatan !== 'all';
  const kecamatanOpts = useMemo(() => Object.keys(stats.byKecamatan).sort(), [stats]);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-6">
        <Loader2 size={18} className="animate-spin text-primary-700" />
        <span className="text-sm font-bold uppercase tracking-wider text-subink">Memuat data perparkiran…</span>
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
              <Car size={14} strokeWidth={2.5} aria-hidden="true" /> Modul Perparkiran
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Fasilitas & Juru Parkir</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-100">
              Rekapitulasi titik parkir, kapasitas SRP, luas lahan, serta sebaran juru parkir dan setoran retribusi per bulan.
            </p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 md:flex">
            <Car size={28} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat label="Titik Parkir" value={stats.total} suffix="lokasi" />
          <HeroStat label="Juru Parkir" value={stats.master.totalJuru} suffix="terdata" />
          <HeroStat label="Kapasitas SRP" value={stats.srpMotor + stats.srpMobil} suffix="slot" tone="accent" />
          <HeroStat label="Luas Lahan" value={stats.luas} suffix="m²" tone="warning" />
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

      {/* KPI setoran */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={BadgeDollarSign} label="Setoran Retribusi/bln" value={formatRupiah(stats.jukir.totalSetoran)} sub={`${stats.jukir.setoranCount} jukir menyetor`} />
        <KpiCard icon={BadgeDollarSign} label="Retribusi SK/bln" value={formatRupiah(retribusiStats.totalBln)} sub={`${retribusi.length} SK perorangan`} tone="green" />
        <KpiCard icon={SquareStack} label="Terverifikasi KTP" value={stats.master.verified} sub={`${stats.master.unplaced} belum ditempatkan`} tone="blue" />
        <KpiCard icon={AlertTriangle} label="Pengaduan" value={pengaduan.length} sub={`${(pengaduanStats.selesai || 0) + (pengaduanStats.proses || 0)} ditindaklanjuti`} tone="warning" />
      </div>

      {/* Chart fasilitas + kecamatan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Jenis Fasilitas
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fasilitasChart} dataKey="count" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={2}
                  label={(d) => d.count > 0 ? `${d.count}` : ''} labelLine={false}>
                  {fasilitasChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} lokasi`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Sebaran Titik Parkir per Kecamatan
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kecamatanChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v) => [`${v} lokasi`, 'Jumlah']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {kecamatanChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SRP & jukir status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <SquareStack size={12} strokeWidth={2.5} aria-hidden="true" /> Kapasitas SRP (Motor vs Mobil)
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={srpChart} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}
                  label={(d) => `${d.value}`} labelLine={false}>
                  {srpChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} slot`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <Users size={12} strokeWidth={2.5} aria-hidden="true" /> Status Juru Parkir
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={jukirStatusChart} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}
                  label={(d) => `${d.value}`} labelLine={false}>
                  {jukirStatusChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} orang`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Domisili & profil juru parkir */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <Users size={12} strokeWidth={2.5} aria-hidden="true" /> Domisili Juru Parkir per Kecamatan
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domisiliChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-20} textAnchor="end" height={46} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v) => [`${v} jukir`, 'Jumlah']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {domisiliChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <Users size={12} strokeWidth={2.5} aria-hidden="true" /> Profil Juru Parkir
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={jkChart} dataKey="count" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}
                  label={(d) => `${d.count}`} labelLine={false}>
                  {jkChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} orang`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <section aria-label="Filter Parkir" className="card p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subink">
          <Filter size={12} strokeWidth={2.5} aria-hidden="true" /> Filter Titik Parkir
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="col-span-2 md:col-span-1">
            <div className="relative">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subink" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / ruas…" aria-label="Pencarian parkir" className="input pl-8" />
            </div>
          </div>
          <select value={fFasilitas} onChange={(e) => setFFasilitas(e.target.value)} aria-label="Filter fasilitas" className="input">
            <option value="all">Semua Fasilitas</option>
            {Object.entries(stats.byFasilitas).map(([k, c]) => (
              <option key={k} value={k}>{JENIS_FASILITAS_LABEL[k] || k} ({c})</option>
            ))}
          </select>
          <select value={fKecamatan} onChange={(e) => setFKecamatan(e.target.value)} aria-label="Filter kecamatan" className="input">
            <option value="all">Semua Kecamatan</option>
            {kecamatanOpts.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{filteredParkir.length}</b> dari <span className="font-mono">{stats.total}</span> lokasi
          </span>
          {hasFilter && <button onClick={resetFilter} className="btn-secondary text-[11px]">Reset Filter</button>}
        </div>
      </section>

      {/* Peta */}
      <div className="card">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <MapIcon size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Peta Sebaran</span>
          <span className="ml-auto rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {filteredParkir.length} parkir · {stats.jukir.total} jukir
          </span>
        </div>
        <ParkirMap parkir={filteredParkir} jukir={jukir} titikJukir={titikJukir} titikParkir={titikParkir} kecamatan={kecamatan} />
        <div className="border-t border-border bg-canvas px-3 py-2 text-[11px] text-subink">
          <div className="flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
            <p><b>Tips:</b> Titik biru adalah lokasi parkir, badge merah "J" adalah juru parkir. Klik marker untuk detail.</p>
          </div>
        </div>
      </div>

      {/* Tabel parkir */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <Car size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Daftar Titik Parkir</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><button onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-primary-700"># <ArrowUpDown size={10} /></button></th>
                <th><button onClick={() => toggleSort('nama')} className="inline-flex items-center gap-1 hover:text-primary-700">Nama <ArrowUpDown size={10} /></button></th>
                <th>Foto</th>
                <th>Fasilitas</th>
                <th><button onClick={() => toggleSort('srp')} className="inline-flex items-center gap-1 hover:text-primary-700">SRP Motor/Mobil <ArrowUpDown size={10} /></button></th>
                <th><button onClick={() => toggleSort('luas')} className="inline-flex items-center gap-1 hover:text-primary-700">Luas <ArrowUpDown size={10} /></button></th>
                <th>Ruas</th>
                <th>Kecamatan</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-subink">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-subink"><Car size={18} /></div>
                    <div className="text-xs font-semibold uppercase tracking-wider">Tidak ada titik</div>
                    <div className="text-[11px]">Coba ubah filter atau reset pencarian</div>
                  </div>
                </td></tr>
              ) : pagedRows.map((f) => {
                const p = f.properties || {};
                const fas = p.jenis_fasilitas || 'Tidak Diketahui';
                return (
                  <tr key={p.id}>
                    <td className="font-mono font-bold text-ink">#{p.id}</td>
                    <td><div className="line-clamp-1 max-w-xs font-semibold text-ink">{p.nama || '—'}</div></td>
                    <td>
                      {mediaUrl(fotoLokasiById[p.id]) ? (
                        <img src={mediaUrl(fotoLokasiById[p.id])} alt={p.nama || 'lokasi'} className="h-9 w-12 rounded-md border border-border object-cover" />
                      ) : (
                        <span className="flex h-9 w-12 items-center justify-center rounded-md bg-muted text-[10px] text-subink">—</span>
                      )}
                    </td>
                    <td>
                      <span className="chip bg-primary-50 text-primary-700 border-primary-200">{JENIS_FASILITAS_LABEL[fas] || fas}</span>
                    </td>
                    <td className="font-mono text-[12px]">{p.srp_motor} / {p.srp_mobil}</td>
                    <td className="font-mono text-[12px]">{p.luas_lokasi ? `${p.luas_lokasi} m²` : '—'}</td>
                    <td className="font-mono text-[11px] text-ink">{p.ruas ? `#${p.id_ruasjalan}` : '—'}</td>
                    <td className="text-xs text-ink">{(p.nama_kecamatan || '').trim()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredParkir.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border bg-canvas px-3 py-2 md:flex-row md:items-center md:justify-between md:px-4">
            <div className="flex items-center gap-2 text-xs text-subink">
              <span>Menampilkan <b className="font-mono text-ink">{pageStart + 1}</b>–<b className="font-mono text-ink">{pageEnd}</b> dari <b className="font-mono text-ink">{filteredParkir.length}</b> lokasi</span>
              <label className="flex items-center gap-1.5">
                <span className="hidden md:inline">Tampilkan</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label="Jumlah baris per halaman" className="h-7 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-mono text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                  <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                </select>
                <span className="hidden md:inline">/hal</span>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <PageBtn disabled={safePage === 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></PageBtn>
              <PageBtn disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></PageBtn>
              {pageNumbers.map((n, i) => n === '…' ? <span key={`g${i}`} className="px-1 text-xs text-subink">…</span> : <PageBtn key={n} active={n === safePage} onClick={() => setPage(n)}>{n}</PageBtn>)}
              <PageBtn disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></PageBtn>
              <PageBtn disabled={safePage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={14} /></PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* Tabel jukir */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <Users size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Daftar Juru Parkir</span>
          <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {filteredJukir.length} juru parkir
          </span>
          <input value={jSearch} onChange={(e) => setJSearch(e.target.value)} placeholder="Cari nama / no…" className="input ml-auto w-40" />
          <select value={jStatus} onChange={(e) => setJStatus(e.target.value)} className="input w-32">
            <option value="all">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Jukir</th>
                <th>No SPT</th>
                <th>Lokasi Parkir</th>
                <th className="text-right">Setoran/bln</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jPaged.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-subink">Tidak ada juru parkir</td></tr>
              ) : jPaged.map((j) => {
                const p = j.properties || {};
                const master = juruByNo[p.no_juru_parkir] || {};
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-[12px] text-primary-700">{p.no_juru_parkir || '—'}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        {mediaUrl(master.foto) ? (
                          <img src={mediaUrl(master.foto)} alt={p.nama_jukir || 'jukir'} className="h-8 w-8 rounded-full border border-primary-100 object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-primary-600"><Users size={14} /></span>
                        )}
                        <span className="font-semibold text-ink">{p.nama_jukir || '—'}</span>
                      </span>
                    </td>
                    <td className="font-mono text-[12px]">{p.no_spt || '—'}</td>
                    <td className="text-xs text-ink">{p.nama_lokasi || '—'}</td>
                    <td className="font-mono text-[12px] text-right font-semibold text-primary-700">{formatRupiah(p.setoran_perbulan)}</td>
                    <td>
                      <span className={`chip ${Number(p.activated) === 1 ? 'bg-accent-50 text-accent-700 border-accent-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {Number(p.activated) === 1 ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-canvas px-3 py-2 text-xs">
          <span className="text-subink">
            Menampilkan <b className="font-mono text-ink">{jPaged.length === 0 ? 0 : (jSafePage - 1) * jPageSize + 1}</b>–<b className="font-mono text-ink">{(jSafePage - 1) * jPageSize + jPaged.length}</b> dari <b className="font-mono text-ink">{filteredJukir.length}</b> juru
          </span>
          <div className="flex items-center gap-1">
            <PageBtn disabled={jSafePage === 1} onClick={() => setJPage(1)}><ChevronsLeft size={14} /></PageBtn>
            <PageBtn disabled={jSafePage === 1} onClick={() => setJPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></PageBtn>
            {jPageNumbers.map((n, i) => n === '…' ? <span key={`g${i}`} className="px-1 text-xs text-subink">…</span> : <PageBtn key={n} active={n === jSafePage} onClick={() => setJPage(n)}>{n}</PageBtn>)}
            <PageBtn disabled={jSafePage === jTotalPages} onClick={() => setJPage((p) => Math.min(jTotalPages, p + 1))}><ChevronRight size={14} /></PageBtn>
            <PageBtn disabled={jSafePage === jTotalPages} onClick={() => setJPage(jTotalPages)}><ChevronsRight size={14} /></PageBtn>
          </div>
        </div>
      </div>

      {/* Data master juru parkir (12) */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <Users size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Data Master Juru Parkir</span>
          <span className="ml-auto rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {juru.length} terdata · {juruUnplaced.length} belum ditempatkan
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>NIK</th>
                <th>Domisili</th>
                <th>JK</th>
                <th>Verifikasi</th>
                <th>Penempatan</th>
              </tr>
            </thead>
            <tbody>
              {juru.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-subink">Tidak ada data juru parkir</td></tr>
              ) : juru.map((jp) => {
                const placed = !juruUnplaced.some((u) => u.id_juru_parkir === jp.id_juru_parkir);
                const isBadan = (jp.no_juru_parkir || '').startsWith('B');
                return (
                  <tr key={jp.id_juru_parkir}>
                    <td className="font-mono text-[12px] font-bold text-primary-700">{jp.no_juru_parkir || '—'}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        {mediaUrl(jp.foto) ? (
                          <img src={mediaUrl(jp.foto)} alt={jp.nama || 'jukir'} className="h-9 w-9 rounded-full border border-primary-100 object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-primary-600"><Users size={16} /></span>
                        )}
                        <span className="font-semibold text-ink">{jp.nama || '—'}</span>
                        {isBadan && <span className="ml-1.5 chip bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Badan</span>}
                      </span>
                    </td>
                    <td className="font-mono text-[12px] text-ink">{jp.nik || '—'}</td>
                    <td className="text-xs text-ink">
                      {jp.domisili_kecamatan || '—'}
                      {jp.domisili_alamat ? <span className="text-subink"> · {jp.domisili_alamat}</span> : null}
                    </td>
                    <td className="text-xs text-ink">{jp.jk === 'P' ? 'Perempuan' : jp.jk === 'L' ? 'Laki-laki' : '—'}</td>
                    <td>
                      <span className={`chip ${Number(jp.verifikasi) === 1 ? 'bg-accent-50 text-accent-700 border-accent-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {Number(jp.verifikasi) === 1 ? '✓ Terverifikasi' : 'Belum'}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${placed ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {placed ? 'Aktif' : 'Belum ditempatkan'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retribusi SK perorangan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BadgeDollarSign size={12} strokeWidth={2.5} aria-hidden="true" /> SK per Zona Retribusi
          </div>
          <div className="h-56">
            {retribusiStats.zonaChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={retribusiStats.zonaChart} dataKey="count" cx="50%" cy="50%" innerRadius={44} outerRadius={74} paddingAngle={2}
                    label={(d) => `${d.count}`} labelLine={false}>
                    {retribusiStats.zonaChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} SK`, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-subink">Tidak ada data SK</div>
            )}
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
            <BadgeDollarSign size={12} strokeWidth={2.5} aria-hidden="true" /> SK per Jenis Lokasi
          </div>
          <div className="h-56">
            {retribusiStats.byJenis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retribusiStats.byJenis.map(([k, c], i) => ({ name: k, count: c, fill: FACILITY_COLORS[i % FACILITY_COLORS.length] }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-20} textAnchor="end" height={46} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v) => [`${v} SK`, 'Jumlah']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {retribusiStats.byJenis.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-subink">Tidak ada data SK</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel SK retribusi */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <BadgeDollarSign size={14} className="text-primary-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Daftar SK Retribusi Perorangan</span>
          <span className="ml-auto rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-[10px] text-primary-700">
            {retribusi.length} SK · {formatRupiah(retribusiStats.totalBln)}/bln
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>No SK</th>
                <th>Pengelola</th>
                <th>Lokasi</th>
                <th>Zona</th>
                <th>Jenis</th>
                <th className="text-right">Retribusi/bln</th>
              </tr>
            </thead>
            <tbody>
              {retribusi.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-subink">Tidak ada data SK retribusi</td></tr>
              ) : retribusi
                .slice()
                .sort((a, b) => (Number(b.retribusi_perbulan) || 0) - (Number(a.retribusi_perbulan) || 0))
                .slice(0, 50)
                .map((r) => (
                  <tr key={r.id_sk}>
                    <td className="font-mono text-[11px] text-ink">{r.no_sk || '—'}</td>
                    <td className="text-xs font-semibold text-ink">{r.nama_pengelola || '—'}</td>
                    <td className="text-xs text-ink">{r.nama_lokasi || '—'}</td>
                    <td><span className="chip bg-primary-50 text-primary-700 border-primary-200">{r.zona || '—'}</span></td>
                    <td className="text-xs text-ink">{r.jenis_lokasi || '—'}</td>
                    <td className="font-mono text-[12px] text-right font-semibold text-primary-700">{formatRupiah(r.retribusi_perbulan)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {retribusi.length > 50 && (
          <div className="border-t border-border bg-canvas px-3 py-2 text-[11px] text-subink">
            Menampilkan 50 SK dengan retribusi terbesar dari {retribusi.length} total.
          </div>
        )}
      </div>

      {/* Tabel pengaduan */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-2 text-xs">
          <AlertTriangle size={14} className="text-amber-700" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-subink">Pengaduan Pelanggaran Parkir</span>
          <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700">
            {pengaduan.length} aduan · {pengaduanStats.selesai} selesai · {pengaduanStats.proses} proses
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pelapor</th>
                <th>Lokasi</th>
                <th>Plat</th>
                <th>Isi Aduan</th>
                <th>Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {pengaduan.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-subink">Belum ada pengaduan</td></tr>
              ) : pengaduan.map((r) => (
                <tr key={r.id_pengaduan}>
                  <td className="font-mono text-[11px] text-ink">{r.tanggal || '—'}</td>
                  <td className="text-xs font-semibold text-ink">{r.nama_pelapor || '—'}</td>
                  <td className="text-xs text-ink">{r.nama_lokasi || '—'}</td>
                  <td className="font-mono text-[11px] text-ink">{r.plat_nomor || '—'}</td>
                  <td className="max-w-xs text-xs text-ink"><div className="line-clamp-2">{r.isi_aduan || '—'}</div></td>
                  <td>
                    <span className={`chip ${r.status === 'selesai' ? 'bg-accent-50 text-accent-700 border-accent-200' : r.status === 'proses' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {r.status === 'selesai' ? '✓ Selesai' : r.status === 'proses' ? '⏳ Proses' : 'Menunggu'}
                    </span>
                    {r.respon_keterangan ? <span className="block max-w-[16rem] text-[10px] text-subink">{r.respon_keterangan}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        {suffix && <span className="text-[11px] text-primary-200">{suffix}</span>}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  const iconTone = tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : tone === 'blue' ? 'bg-sky-50 text-sky-700 ring-sky-200'
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
  if (active) return <button onClick={onClick} disabled={disabled} aria-current="page" className={`${base} border-primary-300 bg-primary-50 text-primary-700`} {...rest}>{children}</button>;
  if (disabled) return <button onClick={onClick} disabled className={`${base} border-border bg-surface text-subink opacity-40 cursor-not-allowed`} {...rest}>{children}</button>;
  return <button onClick={onClick} className={`${base} border-border bg-surface text-ink hover:bg-muted hover:border-primary-200`} {...rest}>{children}</button>;
}