/**
 * Keselamatan Page — Dashboard keselamatan lalu lintas & keamanan jalan.
 * Data: pengaduan, perlengkapan jalan, riwayat pemeliharaan, dummy kecelakaan.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Shield, AlertTriangle, Wrench, FileText, ChevronLeft, ChevronRight,
  MapPin, Camera, Eye, Calendar, User, CheckCircle2, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  getKeselamatan, computePengaduanStats, filterPengaduan,
  computePerlengkapanStats, filterPerlengkapan,
  computeRiwayatStats, ACCIDENT_STATS, buildAccidentTrend,
  LAMPIRAN_STATUS, LAMPIRAN_STATUS_COLOR, JENIS_LAMPIRAN,
  STATUS_COLORS
} from '../api/keselamatan';
import KeselamatanMap from '../components/map/KeselamatanMap';

const PAGINATION = 10;

export default function KeselamatanPage() {
  const [pengaduan, setPengaduan] = useState([]);
  const [perlengkapan, setPerlengkapan] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [statsPengaduan, setStatsPengaduan] = useState({});
  const [statsPerlengkapan, setStatsPerlengkapan] = useState({});
  const [statsRiwayat, setStatsRiwayat] = useState({});
  const [trendData, setTrendData] = useState([]);

  // Filters
  const [pengaduanFilter, setPengaduanFilter] = useState({ status: 'semua', jenis: 'semua', bulan: 'semua' });
  const [perlengkapanFilter, setPerlengkapanFilter] = useState({ kondisi: 'semua', jenis: 'semua' });
  const [pagePengaduan, setPagePengaduan] = useState(1);
  const [pagePerlengkapan, setPagePerlengkapan] = useState(1);

  useEffect(() => {
    async function load() {
      const { pengaduan, perlengkapan, riwayat } = await getKeselamatan();
      setPengaduan(pengaduan);
      setPerlengkapan(perlengkapan);
      setRiwayat(riwayat);
      setStatsPengaduan(computePengaduanStats(pengaduan));
      setStatsPerlengkapan(computePerlengkapanStats(perlengkapan));
      setStatsRiwayat(computeRiwayatStats(riwayat));
      setTrendData(buildAccidentTrend());
    }
    load();
  }, []);

  // Filtered data
  const filteredPengaduan = useMemo(() => filterPengaduan(pengaduan ?? [], pengaduanFilter), [pengaduan, pengaduanFilter]);
  const filteredPerlengkapan = useMemo(() => filterPerlengkapan(perlengkapan ?? [], perlengkapanFilter), [perlengkapan, perlengkapanFilter]);

  // Pagination
  const totalPagesPengaduan = Math.max(1, Math.ceil(filteredPengaduan.length / PAGINATION));
  const pagedPengaduan = filteredPengaduan.slice((pagePengaduan - 1) * PAGINATION, pagePengaduan * PAGINATION);
  const totalPagesPerlengkapan = Math.max(1, Math.ceil(filteredPerlengkapan.length / PAGINATION));
  const pagedPerlengkapan = filteredPerlengkapan.slice((pagePerlengkapan - 1) * PAGINATION, pagePerlengkapan * PAGINATION);

  // Reset page on filter change
  useEffect(() => { setPagePengaduan(1); }, [pengaduanFilter]);
  useEffect(() => { setPagePerlengkapan(1); }, [perlengkapanFilter]);

  // Pie data helpers
  const pieData = (obj) => {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([, value]) => typeof value === 'number' && value > 0)
      .map(([name, value]) => ({ name, value }));
  };
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6', '#EC4899'];

  // --- KPI Summary ---
  const totalKecelakaan = trendData.length > 0 ? trendData[trendData.length - 1].kejadian : 0;
  const totalKorbanMati = trendData.length > 0 ? trendData[trendData.length - 1].korban_meninggal : 0;
  const totalPengaduanOpen = statsPengaduan.unresolved || 0;
  const totalPerlengkapanRusak = (statsPerlengkapan.byKondisi?.rusak_ringan || 0) + (statsPerlengkapan.byKondisi?.rusak_berat || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-blue-200 p-6 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
            <Shield className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-blue-900">Keselamatan Jalan</h1>
            <p className="text-blue-600 mt-1">Monitoring keselamatan lalu lintas, pengaduan masyarakat, dan kondisi perlengkapan jalan di Kabupaten Banjarnegara.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl border border-red-200 p-4 bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
            <div className="text-2xl font-bold text-red-800">{totalKecelakaan}</div>
            <div className="text-sm text-red-600">Total Kecelakaan 2026</div>
          </div>
          <div className="rounded-xl border border-red-200 p-4 bg-red-50">
            <div className="text-2xl font-bold text-red-800">{totalKorbanMati}</div>
            <div className="text-sm text-red-600">Korban Meninggal</div>
          </div>
          <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
            <FileText className="w-5 h-5 text-amber-600 mb-2" />
            <div className="text-2xl font-bold text-amber-800">{totalPengaduanOpen}</div>
            <div className="text-sm text-amber-600">Pengaduan Terbuka</div>
          </div>
          <div className="rounded-xl border border-orange-200 p-4 bg-orange-50">
            <Wrench className="w-5 h-5 text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-800">{totalPerlengkapanRusak}</div>
            <div className="text-sm text-orange-600">Perlengkapan Rusak</div>
          </div>
        </div>
      </div>

      {/* Tren Kecelakaan */}
      <div className="rounded-2xl border border-blue-200 p-6 bg-white">
        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Tren Kecelakaan Lalu Lintas (2020–2026)
        </h2>
        <p className="text-sm text-gray-500 mt-1">Sumber: Banyumas Ekspres / Satlantas Polres Banjarnegara</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="tahun" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #DBEAF5' }} />
              <Legend />
              <Area type="monotone" dataKey="kejadian" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} name="Kejadian" />
              <Area type="monotone" dataKey="korban_meninggal" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2} name="Korban Meninggal" />
              <Area type="monotone" dataKey="korban_luka_berat" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} name="Korban Luka" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pengaduan Pie */}
        <div className="rounded-2xl border border-blue-200 p-6 bg-white">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Status Pengaduan
          </h2>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData(statsPengaduan.byStatus)} cx="50%" cy="50%" labelLine={false} label={({ name, pct }) => `${name} ${((pct * 100) || 0).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value" fontSize={10}>
                  {pieData(statsPengaduan.byStatus).map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Perlengkapan Kondisi Pie */}
        <div className="rounded-2xl border border-blue-200 p-6 bg-white">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            Kondisi Perlengkapan Jalan
          </h2>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData(statsPerlengkapan.byKondisi)} cx="50%" cy="50%" labelLine={false} label={({ name, pct }) => `${name} ${((pct * 100) || 0).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value" fontSize={10}>
                  {pieData(statsPerlengkapan.byKondisi).map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riwayat Pie */}
        <div className="rounded-2xl border border-blue-200 p-6 bg-white">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-green-500" />
            Pemeliharaan Terbaru
          </h2>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {riwayat.slice(-8).reverse().map((r) => (
              <div key={r.id_riwayat} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <Calendar className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">{r.jenis_pemeliharaan}</div>
                  <div className="text-xs text-gray-500 truncate">ID #{r.id_perlengkapan} — {r.tgl_pemeliharaan}</div>
                </div>
              </div>
            ))}
            {riwayat.length === 0 && <div className="text-sm text-gray-400">Tidak ada data</div>}
          </div>
        </div>

        {/* Peta Keselamatan */}
        <div className="rounded-2xl border border-blue-200 p-6 bg-white">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Peta Pengaduan & Perlengkapan
          </h2>
          <div className="mt-4 rounded-xl overflow-hidden border border-blue-100" style={{ height: 400 }}>
            <KeselamatanMap pengaduan={pengaduan} perlengkapan={perlengkapan.slice(0, 200)} />
          </div>
        </div>
      </div>

      {/* --- Tabel Pengaduan --- */}
      <div className="rounded-2xl border border-blue-200 bg-white">
        <div className="p-6 border-b border-blue-100">
          <h2 className="text-lg font-bold text-blue-900">Tabel Pengaduan Masyarakat</h2>
          <div className="flex flex-wrap gap-3 mt-4">
            <select className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm bg-blue-50"
              value={pengaduanFilter.status} onChange={(e) => setPengaduanFilter(prev => ({ ...prev, status: e.target.value }))}>
              <option value="semua">Semua Status</option>
              {Object.values(LAMPIRAN_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm bg-blue-50"
              value={pengaduanFilter.jenis} onChange={(e) => setPengaduanFilter(prev => ({ ...prev, jenis: e.target.value }))}>
              <option value="semua">Semua Jenis</option>
              {Object.values(JENIS_LAMPIRAN).map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50 text-blue-800">
                <th className="px-4 py-3 text-left font-semibold">No</th>
                <th className="px-4 py-3 text-left font-semibold">Pelapor</th>
                <th className="px-4 py-3 text-left font-semibold">Perangkat</th>
                <th className="px-4 py-3 text-left font-semibold">Keluhan</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {pagedPengaduan.map((p, idx) => (
                <tr key={p.id_pengaduan} className={`border-t border-blue-50 ${((idx + ((pagePengaduan - 1) * PAGINATION))) % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}`}>
                  <td className="px-4 py-3 text-gray-500">{(pagePengaduan - 1) * PAGINATION + idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{(p.nama?.[0] || '?')}</div>
                      <div>
                        <div className="font-medium text-gray-800">{p.nama}</div>
                        <div className="text-xs text-gray-400">{p.nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.perlengkapan || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.isilaporan}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: LAMPIRAN_STATUS_COLOR[p.status] }}>
                      {LAMPIRAN_STATUS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.tgl_pengaduan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-blue-100">
          <span className="text-sm text-gray-500">Halaman {pagePengaduan} / {totalPagesPengaduan}</span>
          <div className="flex gap-2">
            <button disabled={pagePengaduan <= 1} onClick={() => setPagePengaduan(p => p - 1)}
              className="px-3 py-1 rounded-lg border border-blue-200 text-sm bg-blue-50 hover:bg-blue-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={pagePengaduan >= totalPagesPengaduan} onClick={() => setPagePengaduan(p => p + 1)}
              className="px-3 py-1 rounded-lg border border-blue-200 text-sm bg-blue-50 hover:bg-blue-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Tabel Perlengkapan Jalan --- */}
      <div className="rounded-2xl border border-blue-200 bg-white">
        <div className="p-6 border-b border-blue-100">
          <h2 className="text-lg font-bold text-blue-900">Monitoring Perlengkapan Jalan</h2>
          <div className="flex flex-wrap gap-3 mt-4">
            <select className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm bg-blue-50"
              value={perlengkapanFilter.kondisi} onChange={(e) => setPerlengkapanFilter(prev => ({ ...prev, kondisi: e.target.value }))}>
              <option value="semua">Semua Kondisi</option>
              <option value="baik">Baik</option>
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{filteredPerlengkapan.length} / {perlengkapan.length} item</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50 text-blue-800">
                <th className="px-4 py-3 text-left font-semibold">No</th>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Jenis</th>
                <th className="px-4 py-3 text-left font-semibold">Kondisi</th>
                <th className="px-4 py-3 text-left font-semibold">Lokasi</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedPerlengkapan.map((p, idx) => (
                <tr key={p.id} className={`border-t border-blue-50 ${((idx + ((pagePerlengkapan - 1) * PAGINATION))) % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}`}>
                  <td className="px-4 py-3 text-gray-500">{(pagePerlengkapan - 1) * PAGINATION + idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nama || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{p.jenis || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[p.kondisi?.toLowerCase()] || '#6B7280' }}>
                      {p.kondisi || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-xs">{p.lokasi}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${p.status === 'K' ? 'text-green-600' : 'text-red-600'}`}>
                      {p.status === 'K' ? 'Keluar' : 'Tidak Keluar'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-blue-100">
          <span className="text-sm text-gray-500">Halaman {pagePerlengkapan} / {totalPagesPerlengkapan}</span>
          <div className="flex gap-2">
            <button disabled={pagePerlengkapan <= 1} onClick={() => setPagePerlengkapan(p => p - 1)}
              className="px-3 py-1 rounded-lg border border-blue-200 text-sm bg-blue-50 hover:bg-blue-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={pagePerlengkapan >= totalPagesPerlengkapan} onClick={() => setPagePerlengkapan(p => p + 1)}
              className="px-3 py-1 rounded-lg border border-blue-200 text-sm bg-blue-50 hover:bg-blue-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
