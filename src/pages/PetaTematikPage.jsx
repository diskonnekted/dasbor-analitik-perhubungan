import { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Loader2, AlertTriangle, FileJson, MapPin, Car, User2, BarChart2, ClipboardList } from 'lucide-react';
import MapView from '../components/map/MapView';
import { getLaporan } from '../api/laporan';

export default function PetaTematikPage() {
  const [kecamatan, setKecamatan] = useState(null);
  const [desa, setDesa] = useState(null);
  const [ruas, setRuas] = useState(null);
  const [parkir, setParkir] = useState(null);
  const [jukir, setJukir] = useState(null);
  const [choropleth, setChoropleth] = useState(null);
  const [laporan, setLaporan] = useState([]);
  const [laporanSrc, setLaporanSrc] = useState('loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function tryFetch(url) {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch { return null; }
    }
    async function load() {
      try {
        const [k, d, r, p, j, c, lap] = await Promise.all([
          tryFetch('/peta_kecamatan.geojson'),
          tryFetch('/peta_desa.geojson'),
          tryFetch('/pju_ruas.geojson'),
          tryFetch('/pju_titik_parkir.geojson'),
          tryFetch('/pju_titik_jukir.geojson'),
          tryFetch('/pju_choropleth.json'),
          getLaporan()
        ]);
        if (!mounted) return;
        setKecamatan(k);
        setDesa(d);
        setRuas(r);
        setParkir(p);
        setJukir(j);
        setChoropleth(c?.data ?? c);
        setLaporan(lap.items);
        setLaporanSrc(lap.source);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Hitung panjang total ruas (km) dengan Haversine dari polyline.
  // Prioritaskan panjang dari geometry aktual (mengikuti jalan nyata via OSRM),
  // fallback ke properties.panjang_km (nilai PU awal, garis lurus) jika geometry cuma 2 titik.
  const panjangKm = useMemo(() => {
    if (!ruas?.features) return 0;
    let total = 0;
    for (const f of ruas.features) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      if (coords.length > 2) {
        for (let i = 1; i < coords.length; i++) {
          const [lon1, lat1] = coords[i - 1];
          const [lon2, lat2] = coords[i];
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
          total += 2 * R * Math.asin(Math.sqrt(a));
        }
        continue;
      }
      if (f.properties?.panjang_km) {
        total += Number(f.properties.panjang_km) || 0;
      }
    }
    return total;
  }, [ruas]);

  const stats = {
    kec: kecamatan?.features?.length || 0,
    desa: desa?.features?.length || 0,
    ruas: ruas?.features?.length || 0,
    parkir: parkir?.features?.length || 0,
    jukir: jukir?.features?.length || 0,
    panjangKm,
    laporan: laporan.length
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard tone="blue"   icon={MapIcon}        label="Kecamatan" value={stats.kec}    src="geojson" />
        <StatCard tone="green"  icon={FileJson}       label="Desa"      value={stats.desa}   src="geojson" />
        <StatCard tone="indigo" icon={MapPin}         label="Ruas"      value={stats.ruas}   sub={`${stats.panjangKm.toFixed(1)} km`} src="lapor-jalan" />
        <StatCard tone="sky"    icon={Car}            label="Parkir"    value={stats.parkir} sub="titik" src="onlinkid_parkir" />
        <StatCard tone="purple" icon={User2}          label="Jukir"     value={stats.jukir}  sub="aktif" src="onlinkid_parkir" />
        <StatCard tone="red"    icon={ClipboardList}  label="Laporan"   value={stats.laporan} sub="kerusakan" src={laporanSrc} />
        <StatCard tone="amber"  icon={BarChart2}      label="Choro"     value={choropleth ? Object.keys(choropleth?.data || choropleth).length : 0} sub="kec." src="onlinkid_parkir" />
      </div>

      {/* Fallback notice */}
      {laporanSrc === 'fallback' && !loading && (
        <div className="card border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="text-xs text-amber-800">
              <div className="font-semibold uppercase tracking-wider">Mode Sample (Backend OFF)</div>
              <div className="mt-1 text-amber-700">
                Backend Supabase/lapor-jalan tidak tersedia. Menampilkan 8 laporan contoh. Hidupkan backend untuk data real-time.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card flex items-center gap-3 p-6">
          <Loader2 size={18} className="animate-spin text-primary-700" />
          <span className="text-sm font-medium text-ink">Memuat data…</span>
        </div>
      )}

      {/* Map */}
      {!loading && (
        <MapView
          kecamatan={kecamatan}
          desa={desa}
          ruas={ruas}
          parkir={parkir}
          jukir={jukir}
          choropleth={choropleth}
          laporan={laporan}
        />
      )}

      {/* Cara pakai */}
      <div className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-subink">Cara Pakai</h3>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-ink md:grid-cols-2">
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span><b>7 layer</b>: Kecamatan, Desa, Ruas, Ruas Rusak (auto), Parkir, Jukir, Laporan.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span><b>Ruas rusak</b> otomatis di-highlight <span className="font-semibold text-red-600">merah</span> jika ada laporan.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span><b>Filter kelas</b> jalan (I–VI) + search nama ruas.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span><b>Filter tingkat</b> laporan: Berat / Sedang / Ringan.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span>Klik <b>laporan</b> → info pelapor, jenis kerusakan, deskripsi.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-500">•</span>
            <span>Klik <b>ruas</b> dengan badge merah → lihat daftar laporan di ruas tersebut.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

const TONE = {
  blue:   { icon: 'bg-primary-100 text-primary-800'   },
  green:  { icon: 'bg-accent-100 text-accent-700'     },
  indigo: { icon: 'bg-indigo-100 text-indigo-700'     },
  sky:    { icon: 'bg-sky-100 text-sky-700'           },
  purple: { icon: 'bg-purple-100 text-purple-700'     },
  red:    { icon: 'bg-red-100 text-red-700'           },
  amber:  { icon: 'bg-amber-100 text-amber-700'       },
};

function StatCard({ tone = 'blue', icon: Icon, label, value, sub, src }) {
  const t = TONE[tone] || TONE.blue;
  return (
    <div className="card p-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${t.icon}`}>
          <Icon size={14} strokeWidth={2.2} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
          {src}
        </span>
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-subink">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xl font-bold leading-none text-ink">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-subink">{sub}</div>
      )}
    </div>
  );
}
