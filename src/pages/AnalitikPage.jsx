import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine,
} from 'recharts';
import { AlertTriangle, Gauge, Lightbulb, Car, ShieldCheck } from 'lucide-react';
import { ACCIDENT_STATS } from '../api/keselamatan';
import { getRuas } from '../api/jalan';
import { getPju } from '../api/pju';
import { getParkir } from '../api/parkir';

const C = { biru: '#1E40AF', merah: '#DC2626', oranye: '#D97706', hijau: '#16A34A', abu: '#94A3B8', ungu: '#7C3AED' };

// ruas JPROVOSI (nama DB, lihat pju_choropleth.Upgrade path: perbaiki spread data di build pipeline.
const UP = { 1: 'Tidak Diketahui' }; // placeholder untuk kelas map; lihat ponytail di bawah

const fmtRp = (n) => 'Rp ' + Math.round(n / 1e6) + ' jt';
const fmtKm = (n) => (n >= 1000 ? (n / 1000).toFixed(0) + ' km' : Math.round(n) + ' m');

export default function AnalitikPage() {
  const [accident] = useState(ACCIDENT_STATS);
  const [ruas, setRuas] = useState([]);
  const [pju, setPju] = useState(null);
  const [parkir, setParkir] = useState(null);

  useEffect(() => {
    getRuas().then((r) => setRuas(r.features || []));
    getPju().then(setPju);
    getParkir().then(setParkir);
  }, []);

  // ---- Section 1: keselamatan
  const fatality = useMemo(() => accident.map((s) => ({
    tahun: String(s.tahun),
    kejadian: s.kejadian,
    meninggal: s.korban_meninggal,
    fatalitas: +((s.korban_meninggal / s.kejadian) * 100).toFixed(1),
    kerugian_jt: Math.round(s.kerugian_material / 1e6),
  })), [accident]);
  const trendKejadian = accident[accident.length - 1].kejadian - accident[0].kejadian;
  const trendKejadianPct = Math.round((trendKejadian / accident[0].kejadian) * 100);
  const avgFatalitas = (accident.reduce((a, s) => a + s.korban_meninggal / s.kejadian, 0) / accident.length * 100).toFixed(1);

  // ---- Section 2: kondisi ruas & prioritas
  const ruasStats = useMemo(() => {
    const byKelas = {};
    const byKecamatan = {};
    const kelasKondisi = {};
    for (const f of ruas) {
      const p = f.properties || {};
      const kls = p.kelas_jalan || 'Lain';
      const knd = p.kondisi || 'Baik';
      const kec = p.kecamatan || 'Tidak Diketahui';
      const panjang = Number(p.panjang_geo_km) || Number(p.panjang_km) || 0;
      byKelas[kls] = (byKelas[kls] || 0) + 1;
      byKecamatan[kec] = (byKecamatan[kec] || 0) + panjang;
      if (!kelasKondisi[kls]) kelasKondisi[kls] = {};
      kelasKondisi[kls][knd] = (kelasKondisi[kls][knd] || 0) + 1;
    }
    const kondisiOrder = ['Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat'];
    const stackedKelas = Object.entries(byKelas).map(([kelas]) => {
      const row = { kelas };
      kondisiOrder.forEach((k) => { row[k] = kelasKondisi[kelas]?.[k] || 0; });
      return row;
    }).sort((a, b) => a.kelas.localeCompare(b.kelas));
    const kmRusakKec = Object.entries(byKecamatan).map(([kec, km]) => ({ kec, km: +km.toFixed(1) })).sort((a, b) => b.km - a.km).slice(0, 10);
    return { stackedKelas, kmRusakKec, totalKm: Object.values(byKecamatan).reduce((a, b) => a + b, 0) };
  }, [ruas]);

  // ---- Section 3: energi PJU
  const energi = useMemo(() => {
    if (!pju) return null;
    const monthly = (pju.monthly_tagihan || []).map((m) => ({
      bulan: m.month,
      rp_jt: +(m.total / 1e6).toFixed(1),
      kwh: Math.round(m.kwh),
      rp_per_kwh: +(m.total / Math.max(1, m.kwh)).toFixed(0),
    }));
    const kondisi = pju.kondisi || {};
    const baik = kondisi['Baik'] || 0;
    const rusak = kondisi['Rusak'] || 0;
    const totalLampu = baik + rusak + (kondisi['(tidak terdata)'] || 0);
    const rasioRusak = totalLampu ? ((rusak / totalLampu) * 100).toFixed(1) : '0';
    // estimasi: 1 titik rusak sudah dibayar (diearning) tapi tidak menghasilkan pelayanan → pemborosan
    const avgRpPerTitik = monthly.length ? monthly.reduce((a, m) => a + m.rp_jt, 0) / monthly.length : 0;
    const pemborosanPerTahun = (avgRpPerTitik * 12) * (rasioRusak / 100);
    return { monthly, totalLampu, rusak, rasioRusak, pemborosanPerTahun, avgRpPerTitik };
  }, [pju]);

  // ---- Section 4: parkir & retribusi
  const parkirStats = useMemo(() => {
    if (!parkir) return null;
    const zona = {};
    let totBln = 0;
    (parkir.retribusi || []).forEach((r) => {
      const z = r.zona || 'Lain';
      zona[z] = zona[z] || { zona: z, sk: 0, perbulan: 0 };
      zona[z].sk += 1;
      zona[z].perbulan += Number(r.retribusi_perbulan) || 0;
      totBln += Number(r.retribusi_perbulan) || 0;
    });
    const zonaData = Object.values(zona).map((z) => ({ ...z, perbulan_jt: +(z.perbulan / 1e6).toFixed(1) })).sort((a, b) => b.perbulan - a.perbulan);
    const juru = parkir.juru || [];
    const terverifikasi = juru.filter((j) => Number(j.verifikasi) === 1).length;
    const placed = juru.filter((j) => j.placed).length;
    const jumlahTitik = (parkir.titikParkir || parkir.parkir || []).length;
    return {
      zonaData, totalZona: zonaData.length, sk: (parkir.retribusi || []).length, totBln,
      juru: juru.length, terverifikasi, rasioVerifikasi: juru.length ? Math.round((terverifikasi / juru.length) * 100) : 0,
      placed, jumlahTitik, rasioJuru: jumlahTitik ? (juru.length / jumlahTitik).toFixed(1) : '0',
    };
  }, [parkir]);

  // ---- Section 5: skor komposit kecamatan
  const skorKecamatan = useMemo(() => {
    if (!pju || ruas.length === 0) return [];
    const kec = {};
    for (const f of ruas) {
      const p = f.properties || {};
      const k = p.kecamatan || 'Tidak Diketahui';
      kec[k] = kec[k] || { ruas: 0, km: 0, kmRusak: 0 };
      const panjang = Number(p.panjang_geo_km) || Number(p.panjang_km) || 0;
      const knd = p.kondisi || 'Baik';
      kec[k].ruas += 1;
      kec[k].km += panjang;
      if (knd === 'Rusak Berat' || knd === 'Sedang' || knd === 'Rusak Ringan') kec[k].kmRusak += panjang;
    }
    const totalRuasPju = Object.values(pju.kondisi || {}).reduce((a, b) => a + b, 0) || 1;
    // distribusi PJU per kecamatan tidak diketahui; pakai kasar (ponytail)
    if (ruas.length === 0) return [];
    const rows = Object.entries(kec).map(([nama, v]) => {
      const rasioRusakKm = v.km ? (v.kmRusak / v.km) * 100 : 0;
      // skor = 100 - rasio km rusak (bobot 60%) - indikasi layanan (bobot 40%)
      const skorJalan = 100 - rasioRusakKm;
      const skor = Math.max(0, Math.min(100, skorJalan)); // ponytail: skor komposit awal,Upgrade path: tambah densitas PJU + parkir per kecamatan
      return { kecamatan: nama.replace(/^Kec\. /i, ''), ruas: v.ruas, km: +v.km.toFixed(1), kmRusak: +v.kmRusak.toFixed(1), rasioRusak: +rasioRusakKm.toFixed(1), skor: Math.round(skor) };
    }).sort((a, b) => a.skor - b.skor);
    return rows;
  }, [pju, ruas]);

  const terlemah = skorKecamatan.slice(0, 8);

  const KPI = [
    { label: 'Tren Kejadian 2020–26', val: `+${trendKejadianPct}%`, icon: AlertTriangle, cls: 'text-red-700 bg-red-50' },
    { label: 'Avg Fatalitas', val: `${avgFatalitas}%`, icon: ShieldCheck, cls: 'text-amber-700 bg-amber-50' },
    { label: 'Rasio Lampu Rusak', val: pju ? `${energi.rasioRusak}%` : '…', icon: Lightbulb, cls: 'text-sky-700 bg-sky-50' },
    { label: 'Retribusi Parkir/bln', val: parkirStats ? fmtRp(parkirStats.totBln) : '…', icon: Car, cls: 'text-emerald-700 bg-emerald-50' },
    { label: 'Kec Terlemah', val: terlemah[0]?.kecamatan || '…', icon: Gauge, cls: 'text-violet-700 bg-violet-50' },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {KPI.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.cls}`}>
                <k.icon size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="truncate font-mono text-xl font-bold text-ink">{k.val}</span>
            </div>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-subink">{k.label}</p>
          </div>
        ))}
      </div>

      {/* 1. Keselamatan */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-bold uppercase tracking-wider text-subink">1 · Keselamatan Jalan</p>
            <p className="text-xs text-subink">Tren kejadian vs korban meninggal, dengan tingkat fatalitas</p>
          </div>
          <span className="font-mono text-xs text-subink">{accident.length} tahun</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={fatality}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tahun" fontSize={11} />
              <YAxis yAxisId="l" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" fontSize={11} unit="%" />
              <Tooltip formatter={(v, n) => (n === 'Fatalitas' ? v + '%' : v)} />
              <Legend />
              <Bar yAxisId="l" dataKey="kejadian" name="Kejadian" fill={C.biru} radius={[3, 3, 0, 0]} />
              <Line yAxisId="l" dataKey="meninggal" name="Meninggal" stroke={C.merah} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="r" dataKey="fatalitas" name="Fatalitas" stroke={C.oranye} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-subink">
            <b className="text-ink">Insight:</b> kejadian naik <b className="text-red-600">+{trendKejadianPct}%</b> ({accident[0].kejadian} → {accident[accident.length-1].kejadian}) sejak 2020, fatalitas rata-rata <b className="text-ink">{avgFatalitas}%</b>. Prioritas: titik hitam (blackspot) di ruas nasional dengan lalu lintas tertinggi.
          </p>
        </div>
      </section>

      {/* 2. Kondisi ruas */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-bold uppercase tracking-wider text-subink">2 · Kondisi Ruas &amp; Prioritas Perbaikan</p>
            <p className="text-xs text-subink">Sebaran kondisi per kelas jalan &amp; kecamatan dengan km terpanjang</p>
          </div>
          <span className="font-mono text-xs text-subink">{ruas.length} ruas</span>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subink">Kondisi per Kelas Jalan</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ruasStats.stackedKelas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="kelas" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Baik" stackId="a" fill={C.hijau} />
                <Bar dataKey="Rusak Ringan" stackId="a" fill={C.oranye} />
                <Bar dataKey="Rusak Sedang" stackId="a" fill="#FBBF24" />
                <Bar dataKey="Rusak Berat" stackId="a" fill={C.merah} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subink">10 Kecamatan — Total km Jalan</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ruasStats.kmRusakKec} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="kec" width={120} fontSize={10} />
                <Tooltip formatter={(v) => v + ' km'} />
                <Bar dataKey="km" name="Total km" fill={C.biru} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 3. Energi PJU */}
      {energi && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-bold uppercase tracking-wider text-subink">3 · Efisiensi Energi PJU</p>
              <p className="text-xs text-subink">Biaya per kWh bulanan — indikator deteksi kenaikan tarif &amp; kebocoran energi</p>
            </div>
            <span className="font-mono text-xs text-subink">{energi.totalLampu} titik</span>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={energi.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bulan" fontSize={10} />
                  <YAxis yAxisId="l" fontSize={11} />
                  <YAxis yAxisId="r" orientation="right" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="l" dataKey="rp_jt" name="Tagihan (jt Rp)" fill={C.biru} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="r" dataKey="rp_per_kwh" name="Rp/kWh" stroke={C.oranye} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Rasio Lampu Rusak</p>
                <p className="mt-1 font-mono text-2xl font-bold text-red-600">{energi.rasioRusak}%</p>
                <p className="text-xs text-subink">{energi.rusak} dari {energi.totalLampu} titik</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Estimasi Pemborosan</p>
                <p className="mt-1 font-mono text-2xl font-bold text-amber-600">{fmtRp(energi.pemborosanPerTahun * 1e6)}</p>
                <p className="mt-1 text-xs text-subink">per tahun — tagihan titik yang rusak/non-fungsional (<b className="text-ink">ponytail: asumsi tarif flat</b>)</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Rata-rata Tagihan/bln</p>
                <p className="mt-1 font-mono text-2xl font-bold text-ink">{fmtRp(energi.avgRpPerTitik * 1e6)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Parkir & retribusi */}
      {parkirStats && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-bold uppercase tracking-wider text-subink">4 · Retribusi &amp; Kepatuhan Parkir</p>
              <p className="text-xs text-subink">Potensi retribusi per zona &amp; rasio pengawasan juru parkir</p>
            </div>
            <span className="font-mono text-xs text-subink">{parkirStats.sk} SK</span>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={parkirStats.zonaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="zona" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v, n) => (n === 'Potensi/bln' ? fmtRp(v * 1e6) : v)} />
                  <Legend />
                  <Bar dataKey="perbulan_jt" name="Potensi/bln" fill={C.hijau} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="sk" name="Jumlah SK" fill={C.biru} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Total Potensi/bln</p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">{fmtRp(parkirStats.totBln)}</p>
                <p className="text-xs text-subink">{parkirStats.totalZona} zona · {parkirStats.sk} SK</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Juru Terverifikasi</p>
                <p className="mt-1 font-mono text-2xl font-bold text-ink">{parkirStats.rasioVerifikasi}%</p>
                <p className="text-xs text-subink">{parkirStats.terverifikasi} dari {parkirStats.juru} juru parkir</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-subink">Rasio Juru : Titik</p>
                <p className="mt-1 font-mono text-2xl font-bold text-ink">{parkirStats.rasioJuru}</p>
                <p className="text-xs text-subink">{parkirStats.juru} juru untuk {parkirStats.jumlahTitik} titik parkir</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Skor komposit kecamatan */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-bold uppercase tracking-wider text-subink">5 · Skor Kesiapan per Kecamatan</p>
            <p className="text-xs text-subink">Skor berdasarkan rasio km jalan rusak — semakin rendah, semakin lemah</p>
          </div>
          <span className="font-mono text-xs text-subink">{skorKecamatan.length} kecamatan</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={[...terlemah].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="kecamatan" fontSize={10} angle={-30} textAnchor="end" height={60} />
              <YAxis fontSize={11} domain={[0, 100]} />
              <Tooltip />
              <ReferenceLine y={70} stroke={C.merah} strokeDasharray="4 4" label={{ value: 'ambang 70', fontSize: 10 }} />
              <Bar dataKey="skor" name="Skor" radius={[3, 3, 0, 0]}>
                {terlemah.map((r) => <Cell key={r.kecamatan} fill={r.skor < 70 ? C.merah : r.skor < 85 ? C.oranye : C.hijau} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-subink">
            <b className="text-ink">Insight:</b> {terlemah.filter((r) => r.skor < 70).length} kecamatan di bawah ambang 70 — prioritaskan rotasi perbaikan jalan &amp; verifikasi PJU di wilayah tersebut.
          </p>
        </div>
      </section>

      {/* Catatan sumber */}
      <p className="px-1 text-[11px] text-subink">
        Sumber: pju_ruas.geojson (ruas &amp; kondisi), pju_analysis.json (lampu &amp; tagihan), parkir_*.json (SK retribusi &amp; juru), data kecelakaan 2020–2026. Skor komposit bersifat indikatif.
      </p>
    </div>
  );
}
