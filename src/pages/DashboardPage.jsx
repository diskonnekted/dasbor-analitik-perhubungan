import { useEffect, useState } from 'react'
import { Lightbulb, MapPin, Car, ShieldCheck, TrendingUp, AlertCircle, ArrowUpRight, BarChart3, Zap } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { getPju } from '../api/pju'
import { getRuas, computeRuasStats } from '../api/jalan'

// ponytail: KPI dihitung dari pju_analysis.json (counts) + pju_ruas.geojson (haversine).
// "Ruas Jalan" panjang dihitung langsung dari geometry — sudah divalidasi OSRM di build pipeline.
// Angka tanpa sumber data (Trayek, Pengaduan) tetap placeholder sampai backend aktif.
const TONE_CLASS = {
  blue:  { icon: 'bg-primary-100 text-primary-800',   ring: 'ring-primary-100'   },
  green: { icon: 'bg-accent-100 text-accent-700',     ring: 'ring-accent-100'    },
  sky:   { icon: 'bg-sky-100 text-sky-700',           ring: 'ring-sky-100'       },
  plum:  { icon: 'bg-purple-100 text-purple-700',     ring: 'ring-purple-100'    },
  amber: { icon: 'bg-amber-100 text-amber-700',       ring: 'ring-amber-100'     },
  red:   { icon: 'bg-red-100 text-red-700',           ring: 'ring-red-100'       },
}

const KPIS_STATIC = [
  { label: 'Trayek Angkutan',     value: '46',      icon: TrendingUp,  tone: 'plum'  },
  { label: 'Pengaduan Aktif',     value: '12',      sub: '7 PJU • 5 Parkir', icon: AlertCircle, tone: 'red' },
]

const CHART_COLORS = ['#1E40AF', '#0EA5E9', '#16A34A', '#D97706', '#8B5CF6', '#DC2626', '#0891B2', '#65A30D', '#475569']

const KONDISI_COLOR = {
  'Baik': '#16A34A',
  'Rusak': '#DC2626',
  '(tidak terdata)': '#94a3b8',
}

function fmt(n) {
  if (n == null) return '–'
  return Number(n).toLocaleString('id-ID')
}

export default function DashboardPage() {
  const [counts, setCounts] = useState(null)
  const [ruasInfo, setRuasInfo] = useState(null)
  const [billing, setBilling] = useState(null)
  const [lampu, setLampu] = useState([])
  const [kondisi, setKondisi] = useState([])
  const [monthly, setMonthly] = useState([])

  useEffect(() => {
    getPju()
      .then((d) => {
        setCounts(d.counts || null)
        setBilling(d.billing || null)
        setLampu(Object.entries(d.jenis_lampu || {}).sort((a, b) => b[1] - a[1]))
        setKondisi(Object.entries(d.kondisi || {}).sort((a, b) => b[1] - a[1]))
        setMonthly((d.monthly_tagihan || []).map((m) => ({
          bulan: m.month,
          tagihan: Math.round(m.total / 1e6),
          kwh: Math.round(m.kwh / 1000),
        })))
      })
      .catch(() => {})
    getRuas()
      .then((data) => {
        setRuasInfo(computeRuasStats(data.features || []))
      })
      .catch(() => {})
  }, [])

  const KPI_DINAMIS = [
    { label: 'Total PJU Aktif',      value: counts ? fmt(counts.pju_survey) : '…',  icon: Lightbulb, tone: 'blue'  },
    { label: 'Ruas Jalan Kabupaten', value: ruasInfo ? fmt(ruasInfo.total) : '…', sub: ruasInfo ? `${fmt(Math.round(ruasInfo.totalPanjang * 10) / 10)} km` : 'memuat data…', icon: MapPin, tone: 'green' },
    { label: 'Titik Perlengkapan',   value: counts ? fmt(counts.perlengkapan_jalan) : '…', icon: Car, tone: 'sky' },
    { label: 'Pendapatan Retribusi', value: billing ? `Rp ${fmt(Math.round(billing.total_materai / 1e6))}M` : '…', icon: ShieldCheck, tone: 'amber' },
  ]

  const KPIS = [...KPI_DINAMIS, ...KPIS_STATIC]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <section className="card overflow-hidden bg-gradient-to-br from-primary-800 to-primary-900 p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-100">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Dasbor Analitik
            </div>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Dinas Perhubungan
            </h2>
            <p className="mt-1 text-sm text-primary-200 md:text-base">
              Kabupaten Banjarnegara · 2026
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip border-white/20 bg-white/10 text-white">20 Kecamatan</span>
              <span className="chip border-white/20 bg-white/10 text-white">
                {ruasInfo ? `${fmt(ruasInfo.total)} Ruas Jalan` : 'Muat data…'}
              </span>
              <span className="chip border-white/20 bg-white/10 text-white">
                {counts ? `${fmt(counts.pju_survey)} PJU` : 'Muat data…'}
              </span>
              <span className="chip border-white/20 bg-white/10 text-white">5 Dataset OpenData</span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <img src="/logo.webp" alt="Logo Dishub" className="h-16 w-16 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h3 className="section-title">Indikator Utama</h3>
          <span className="text-xs text-subink">Periode: 2026</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => {
            const Icon = k.icon
            const tone = TONE_CLASS[k.tone] || TONE_CLASS.blue
            return (
              <div
                key={k.label}
                className={`card card-hover p-4 ring-1 ring-inset ${tone.ring}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tone.icon}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  {k.delta ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                      <ArrowUpRight size={10} strokeWidth={3} />
                      {k.delta}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-subink">
                  {k.label}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold leading-none text-ink">
                  {k.value}
                </div>
                {k.sub ? <div className="mt-1 text-[11px] text-subink">{k.sub}</div> : null}
              </div>
            )
          })}
        </div>
      </section>

      {/* Ringkasan Statistik */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h3 className="section-title">Ringkasan Statistik</h3>
          <span className="text-xs text-subink">Sumber: pju_analysis.json · pju_ruas.geojson</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Tren tagihan listrik PJU */}
          <div className="card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
              <Zap size={12} strokeWidth={2.5} aria-hidden="true" /> Tren Tagihan Listrik PJU (Rp Juta/bln)
            </div>
            <div className="h-60">
              {monthly.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTagihan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#475569' }} interval={2} angle={-25} textAnchor="end" height={42} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ stroke: '#93C5FD', strokeDasharray: '3 3' }}
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }}
                      formatter={(v, n) => [n === 'tagihan' ? `Rp ${v} jt` : `${v} ribu kWh`, n === 'tagihan' ? 'Tagihan' : 'KWh']}
                    />
                    <Area type="monotone" dataKey="tagihan" stroke="#1E40AF" strokeWidth={2} fill="url(#gradTagihan)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="kwh" stroke="#0EA5E9" strokeWidth={1.5} fillOpacity={0} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subink">Memuat data tagihan…</div>
              )}
            </div>
          </div>

          {/* Kondisi PJU */}
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
              <Lightbulb size={12} strokeWidth={2.5} aria-hidden="true" /> Kondisi PJU
            </div>
            <div className="h-60">
              {kondisi.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kondisi.map(([nama, nilai]) => ({ name: nama === '(tidak terdata)' ? 'Tidak Terdata' : nama, value: nilai, fill: KONDISI_COLOR[nama] || '#94a3b8' }))}
                      dataKey="value"
                      cx="50%"
                      cy="46%"
                      innerRadius={44}
                      outerRadius={74}
                      paddingAngle={2}
                      label={(d) => d.value > 0 ? `${d.value}` : ''}
                      labelLine={false}
                    >
                      {kondisi.map(([nama], i) => (
                        <Cell key={i} fill={KONDISI_COLOR[nama] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v, n) => [`${v} titik`, n]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subink">Memuat data kondisi…</div>
              )}
            </div>
          </div>

          {/* Sebaran ruas jalan per kecamatan */}
          <div className="card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
              <MapPin size={12} strokeWidth={2.5} aria-hidden="true" /> Sebaran Ruas Jalan per Kecamatan
            </div>
            <div className="h-72">
              {ruasInfo && ruasInfo.byKecamatan.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ruasInfo.byKecamatan.map(([nama, jumlah], i) => ({ name: nama, count: jumlah, fill: CHART_COLORS[i % CHART_COLORS.length] }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} interval={0} angle={-30} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v) => [`${v} ruas`, 'Jumlah']} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {ruasInfo.byKecamatan.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subink">Memuat data ruas jalan…</div>
              )}
            </div>
          </div>

          {/* Jenis lampu PJU */}
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
              <Lightbulb size={12} strokeWidth={2.5} aria-hidden="true" /> Jenis Lampu PJU
            </div>
            <div className="h-72">
              {lampu.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lampu.map(([nama, jumlah], i) => ({ name: nama === '(tidak terdata)' ? 'Tidak Terdata' : nama, count: jumlah, fill: CHART_COLORS[i % CHART_COLORS.length] }))}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9EFF5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={76} />
                    <Tooltip cursor={{ fill: '#EFF6FF' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #BFDBFE', boxShadow: '0 4px 6px rgba(15,23,42,0.08)' }} formatter={(v) => [`${v} titik`, 'Jumlah']} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-subink">Memuat data jenis lampu…</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Welcome notice */}
      <section className="card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Selamat Datang</h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-subink">
              Pilih menu di sidebar untuk mulai eksplorasi data. Menu{' '}
              <span className="font-semibold text-ink">Peta Tematik</span> sudah aktif — menampilkan
              20 kecamatan &amp; desa di Banjarnegara dari file GeoJSON.
            </p>
          </div>
          <button className="btn-primary self-start md:self-auto">
            Buka Peta Tematik
          </button>
        </div>
      </section>
    </div>
  )
}
