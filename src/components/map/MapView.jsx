import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, GeoJSON, FeatureGroup, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Eye, EyeOff, Info, MapPin, Car, User2, BarChart3, AlertTriangle, Search } from 'lucide-react';
import { clusterPerkap, JENIS_COLOR, JENIS_LABEL, JENIS_ICON, KONDISI_TONE } from '../../api/perlengkapan';

const BANJARNEGARA_CENTER = [-7.4, 109.7];
const DEFAULT_ZOOM = 11;

const PALETTE = [
  '#FFD500', '#22C55E', '#0EA5E9', '#7C3AED', '#FF3B30',
  '#F97316', '#EC4899', '#14B8A6', '#84CC16', '#A855F7',
  '#EF4444', '#06B6D4', '#10B981', '#F59E0B', '#3B82F6',
  '#8B5CF6', '#D946EF', '#F43F5E', '#FB923C', '#FBBF24'
];

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// Derive 'kelas' jalan dari nomor_ruas ("I.10" -> "I", "III.2" -> "III")
function deriveKelas(nomor) {
  if (!nomor) return { kelas: 'Lain', source: 'none' };
  const m = String(nomor).match(/^([IVX]+)/i);
  if (m) return { kelas: m[1].toUpperCase(), source: 'nomor' };
  return { kelas: 'Lain', source: 'none' };
}

// Haversine: jarak (meter) antara 2 titik (lon,lat)
function haversineM(lon1, lat1, lon2, lat2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Minimum distance (meter) dari titik (lon,lat) ke polyline [[lon,lat], ...]
function minDistToLine(px, py, lineCoords) {
  if (!lineCoords || lineCoords.length === 0) return Infinity;
  let min = Infinity;
  const step = lineCoords.length > 50 ? Math.ceil(lineCoords.length / 50) : 1;
  for (let i = step; i < lineCoords.length; i += step) {
    const [lon, lat] = lineCoords[i];
    const d = haversineM(px, py, lon, lat);
    if (d < min) min = d;
  }
  for (let i = step; i < lineCoords.length; i += step) {
    const a = lineCoords[i - step];
    const b = lineCoords[i];
    const d = pointToSegmentM(px, py, a[0], a[1], b[0], b[1]);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegmentM(px, py, ax, ay, bx, by) {
  const cosLat = Math.cos(((ay + by) / 2) * Math.PI / 180);
  const axm = ax * cosLat, bxm = bx * cosLat;
  const dx = bxm - axm, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px * cosLat - axm) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const projX = axm + t * dx;
  const projY = ay + t * dy;
  return haversineM(px, py, projX / cosLat, projY);
}

function colorByKelas(kelas) {
  const k = String(kelas || '').toUpperCase();
  if (k === 'I' || k === 'II') return '#FF3B30';
  if (k === 'III' || k === 'IV') return '#FFD500';
  if (k === 'V' || k === 'VI') return '#22C55E';
  return '#0EA5E9';
}

function weightByKelas(kelas) {
  const k = String(kelas || '').toUpperCase();
  if (k === 'I' || k === 'II') return 3;
  if (k === 'III' || k === 'IV') return 2.5;
  if (k === 'V' || k === 'VI') return 2;
  return 1.5;
}

function colorByFasilitas(jenis, sub) {
  const f = String(jenis || '').toLowerCase();
  if (f === 'dalam') return '#7C3AED';
  if (f === 'luar') {
    const luar = String(sub || '').toLowerCase();
    if (luar === 'tkp') return '#06B6D4';
    if (luar === 'tpk') return '#F97316';
  }
  return '#0EA5E9';
}

function colorByTingkat(tingkat) {
  const t = String(tingkat || '').toLowerCase();
  if (t === 'berat') return '#FF3B30';
  if (t === 'sedang') return '#F97316';
  if (t === 'ringan') return '#FFD500';
  return '#0EA5E9';
}

function tingkatChipTone(tingkat) {
  const t = String(tingkat || '').toLowerCase();
  if (t === 'berat')  return 'bg-red-50 text-red-700 border-red-200';
  if (t === 'sedang') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (t === 'ringan') return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function FitToBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    try {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch (e) {
      console.warn('FitToBounds', e);
    }
  }, [geojson, map]);
  return null;
}

function ZoomListener({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom())
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

export default function MapView({ kecamatan, desa, ruas, parkir, jukir, choropleth, laporan = [], perlengkapan = null }) {
  const [showKec, setShowKec] = useState(true);
  const [showDesa, setShowDesa] = useState(true);
  const [showRuas, setShowRuas] = useState(true);
  const [showRuasRusak, setShowRuasRusak] = useState(true);
  const [showParkir, setShowParkir] = useState(true);
  const [showJukir, setShowJukir] = useState(true);
  const [showLaporan, setShowLaporan] = useState(true);
  const [showPerkap, setShowPerkap] = useState(true);
  const [choroplethOn, setChoroplethOn] = useState(false);
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterFasilitas, setFilterFasilitas] = useState('all');
  const [filterTingkat, setFilterTingkat] = useState('all');
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Kelas list
  const kelasList = useMemo(() => {
    if (!ruas?.features) return [];
    const set = new Set();
    ruas.features.forEach((f) => {
      const k = deriveKelas(f.properties?.nomor_ruas).kelas;
      if (k !== 'Lain') set.add(k);
    });
    return Array.from(set).sort();
  }, [ruas]);

  // Ruas yang punya laporan (highlight merah).
  const { ruasRusakIds, laporanByRuas } = useMemo(() => {
    const ids = new Set();
    const byRuas = {};
    const PROX_M = 200;

    const ruasList = (ruas?.features || []).map((f) => {
      const id = f.properties?.id;
      const coords = f.geometry?.coordinates || [];
      return { id, coords, props: f.properties };
    });

    (laporan || []).forEach((l) => {
      let matched = false;
      if (l.id_ruas != null) {
        for (const r of ruasList) {
          if (r.id === l.id_ruas) {
            ids.add(r.id);
            if (!byRuas[r.id]) byRuas[r.id] = [];
            byRuas[r.id].push(l);
            matched = true;
            break;
          }
        }
      }
      if (matched) return;
      if (l.latitude && l.longitude) {
        let bestId = null, bestDist = Infinity;
        for (const r of ruasList) {
          const d = minDistToLine(l.longitude, l.latitude, r.coords);
          if (d < bestDist) { bestDist = d; bestId = r.id; }
        }
        if (bestDist < PROX_M && bestId != null) {
          ids.add(bestId);
          if (!byRuas[bestId]) byRuas[bestId] = [];
          byRuas[bestId].push(l);
        }
      }
    });
    return { ruasRusakIds: ids, laporanByRuas: byRuas };
  }, [laporan, ruas]);

  // Fasilitas list
  const fasList = useMemo(() => {
    if (!parkir?.features) return [];
    const set = new Set();
    parkir.features.forEach((f) => {
      const key = [f.properties?.jenis_fasilitas, f.properties?.jenis_parkir_luar].filter(Boolean).join('-');
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [parkir]);

  // Stats
  const stats = useMemo(() => ({
    totalRuas: ruas?.features?.length || 0,
    totalRuasRusak: ruasRusakIds.size,
    parkir: parkir?.features?.length || 0,
    jukirAktif: jukir?.features?.filter(f => f.properties?.activated === 1).length || 0,
    jukirTotal: jukir?.features?.length || 0,
    laporanTotal: laporan.length,
    perkapTotal: perlengkapan?.features?.length || 0
  }), [ruas, parkir, jukir, laporan, ruasRusakIds, perlengkapan]);

  // Clustering perkap: switch cluster vs individual berdasarkan zoom.
  // Cluster saat zoom < CLUSTER_ZOOM_THRESHOLD, individual saat >=.
  const CLUSTER_ZOOM_THRESHOLD = 14;
  const perkapClustered = useMemo(() => {
    if (!perlengkapan?.features || !showPerkap) return { clusters: [], singles: [] };
    // precision lebih besar saat zoom rendah (lebih agresif clustering)
    const precision = zoom < 11 ? 0.04 : zoom < 12 ? 0.02 : zoom < 13 ? 0.01 : zoom < CLUSTER_ZOOM_THRESHOLD ? 0.005 : 0;
    if (precision === 0) {
      // Di atas threshold, render semua individual
      return { clusters: [], singles: perlengkapan.features };
    }
    // minCount: 2 → cell dengan 1 titik jadi 'singles' (ditampilkan sebagai individu), bukan cluster
    return clusterPerkap(perlengkapan.features, { precision, minCount: 2 });
  }, [perlengkapan, showPerkap, zoom]);

  // Render strategi: di zoom rendah, render cluster; di zoom tinggi, render individual.
  // Threshold zoom 14+ = individual; <14 = cluster.
  // Untuk kejelasan, kita RENDER KEDUANYA: cluster bubble + label hitungan, individual marker.
  // Tapi untuk performance, di zoom <11 kita skip individual dan hanya render cluster.

  // Debug effect untuk verifikasi
  useEffect(() => {
    if (showPerkap && perlengkapan?.features?.length > 0) {
      console.info('[Perkap]', {
        zoom, clusters: perkapClustered.clusters.length, singles: perkapClustered.singles.length,
        total: perkapClustered.clusters.reduce((a, c) => a + c.count, 0) + perkapClustered.singles.length
      });
    }
  }, [showPerkap, perlengkapan, zoom, perkapClustered]);

  // Filtered ruas
  const ruasFiltered = useMemo(() => {
    if (!ruas?.features) return null;
    if (filterKelas === 'all' && !search) return ruas;
    return {
      ...ruas,
      features: ruas.features.filter((f) => {
        const k = deriveKelas(f.properties?.nomor_ruas).kelas;
        const okKelas = filterKelas === 'all' || k === filterKelas;
        const p = f.properties || {};
        const haystack = [p.nama_ruas, p.nomor_ruas]
          .filter(Boolean).join(' ').toLowerCase();
        const okSearch = !search || haystack.includes(search.toLowerCase());
        return okKelas && okSearch;
      })
    };
  }, [ruas, filterKelas, search]);

  // Filtered parkir
  const parkirFiltered = useMemo(() => {
    if (!parkir?.features) return null;
    if (filterFasilitas === 'all') return parkir;
    return {
      ...parkir,
      features: parkir.features.filter((f) => {
        const key = [f.properties?.jenis_fasilitas, f.properties?.jenis_parkir_luar].filter(Boolean).join('-');
        return key === filterFasilitas;
      })
    };
  }, [parkir, filterFasilitas]);

  // Filtered laporan
  const laporanFiltered = useMemo(() => {
    if (filterTingkat === 'all') return laporan;
    return laporan.filter((l) => (l.tingkat || '').toLowerCase() === filterTingkat);
  }, [laporan, filterTingkat]);

  // Style functions
  // ponytail: normalisasi nama kecamatan — hapus semua spasi agar 'purwareja klampok'
  // (di pju_choropleth.json) cocok dengan 'purwarejaklampok' (di peta_kecamatan.geojson).
  const normKec = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();
  function kecamatanStyle(feature) {
    if (choroplethOn && choropleth) {
      const name = normKec(feature.properties?.Kecamatan || feature.properties?.NAME);
      const data = choropleth[name];
      const densitas = data?.densitas_parkir || 0;
      const max = 0.5;
      const t = Math.min(densitas / max, 1);
      const r = 255;
      const g = Math.round(213 * (1 - t));
      const b = Math.round(48 * (1 - t));
      return { fillColor: `rgb(${r},${g},${b})`, fillOpacity: 0.5, color: '#0a0a0a', weight: 1.5, dashArray: '4 2' };
    }
    const name = feature?.properties?.Kecamatan || feature?.properties?.NAME || '—';
    return { fillColor: hashColor(name), fillOpacity: 0.25, color: '#0a0a0a', weight: 1.5, dashArray: '4 2' };
  }

  function ruasStyle(feature) {
    const k = deriveKelas(feature.properties?.nomor_ruas).kelas;
    const propId = feature.properties?.id;
    const rusak = ruasRusakIds.has(propId);
    if (showRuasRusak && rusak) {
      return { color: '#FF3B30', weight: 4, opacity: 0.95 };
    }
    return { color: colorByKelas(k), weight: weightByKelas(k), opacity: 0.85 };
  }

  function desaStyle(feature) {
    const name = feature?.properties?.Desa || feature?.properties?.NAME || '—';
    return { fillColor: hashColor(name), fillOpacity: 0.1, color: '#7C3AED', weight: 0.8, dashArray: '2 2' };
  }

  function onEachKecamatan(feature, layer) {
    const props = feature.properties || {};
    const name = props.Kecamatan || props.NAME || 'Tanpa Nama';
    const data = choropleth?.[normKec(name)];
    const html = `
      <div class="map-popup">
        <div class="map-popup__label">Kecamatan</div>
        <div class="map-popup__title">${name}</div>
        ${data ? `
          <div class="map-popup__divider"></div>
          <div class="map-popup__row">Jumlah Ruas: <b>${data.jumlah_ruas}</b></div>
          <div class="map-popup__row">Total Panjang: <b>${Number(data.total_panjang_km).toFixed(1)} km</b></div>
          <div class="map-popup__row">Titik Parkir: <b>${data.jumlah_titik_parkir}</b></div>
          <div class="map-popup__row">Jukir: <b>${data.jumlah_jukir}</b></div>
          <div class="map-popup__row">Densitas Parkir: <b>${data.densitas_parkir}</b> /km</div>
        ` : '<div class="map-popup__hint">Data choropleth belum tersedia</div>'}
      </div>`;
    layer.bindPopup(html);
    layer.on('mouseover', () => layer.setStyle({ weight: 3, fillOpacity: 0.6 }));
    layer.on('mouseout', () => layer.setStyle({ weight: 1.5, fillOpacity: choroplethOn ? 0.5 : 0.25 }));
  }

  function onEachRuas(feature, layer) {
    const p = feature.properties || {};
    const k = deriveKelas(p.nomor_ruas).kelas;
    const propId = p.id;
    const isRusak = ruasRusakIds.has(propId);
    const laporanRuas = laporanByRuas[propId] || [];
    const label = p.nama_ruas || `Ruas #${p.id}`;
    const panjang = p.panjang_km != null ? `${Number(p.panjang_km).toFixed(2)} km` : '—';
    const lebar = p.lebar_m != null ? `${p.lebar_m} m` : '—';
    const html = `
      <div class="map-popup">
        <div class="map-popup__label">Ruas Jalan (PU)</div>
        <div class="map-popup__title">${label}</div>
        ${isRusak ? `<div class="map-popup__chip" style="background:#FEE2E2;color:#B91C1C;border-color:#FECACA">⚠ ${laporanRuas.length} LAPORAN</div>` : ''}
        ${p.nomor_ruas ? `<div class="map-popup__row">No. Ruas: <b>${p.nomor_ruas}</b> · Kelas: <b style="color:${colorByKelas(k)}">${k}</b></div>` : ''}
        <div class="map-popup__row">Panjang: <b>${panjang}</b> · Lebar: <b>${lebar}</b></div>
        <div class="map-popup__row">Titik Awal: <b>${p.titik_awal || '—'}</b></div>
        <div class="map-popup__row">Titik Akhir: <b>${p.titik_akhir || '—'}</b></div>
        <div class="map-popup__meta">ID: ${p.id}</div>
        ${laporanRuas.length > 0 ? `
          <div class="map-popup__divider"></div>
          <div class="map-popup__sub">Laporan:</div>
          ${laporanRuas.slice(0, 3).map(l => `<div class="map-popup__row map-popup__row--small">• <b>${l.jenis_label}</b> (${l.tingkat})</div>`).join('')}
        ` : ''}
      </div>`;
    layer.bindPopup(html);
    layer.on('mouseover', () => layer.setStyle({ weight: weightByKelas(k) + 1 }));
    layer.on('mouseout', () => layer.setStyle({ weight: weightByKelas(k) }));
  }

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-canvas p-3 text-ink">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-subink">
          <Layers size={14} strokeWidth={2.5} className="text-primary-700" aria-hidden="true" />
          <span>Layer</span>
        </div>
        <span className="mx-1 hidden h-5 w-px bg-border md:inline" aria-hidden="true" />

        <LayerBtn on={showKec} onClick={() => setShowKec(v => !v)} color="amber" label="Kec" />
        <LayerBtn on={showDesa} onClick={() => setShowDesa(v => !v)} color="green" label="Desa" />
        <LayerBtn on={showRuas} onClick={() => setShowRuas(v => !v)} color="yellow" label="Ruas" />
        <LayerBtn on={showRuasRusak} onClick={() => setShowRuasRusak(v => !v)} color="red" label={`Rusak (${stats.totalRuasRusak})`} />
        <LayerBtn on={showParkir} onClick={() => setShowParkir(v => !v)} color="cyan" label="Parkir" />
        <LayerBtn on={showJukir} onClick={() => setShowJukir(v => !v)} color="plum" label="Jukir" />
        <LayerBtn on={showLaporan} onClick={() => setShowLaporan(v => !v)} color="pink" label={`Laporan (${stats.laporanTotal})`} />
        {stats.perkapTotal > 0 && (
          <LayerBtn on={showPerkap} onClick={() => setShowPerkap(v => !v)} color="indigo" label={`Perkap (${stats.perkapTotal})`} />
        )}
        <LayerBtn on={choroplethOn} onClick={() => setChoroplethOn(v => !v)} color="slate" label="Choro" />

        <span className="mx-1 hidden h-5 w-px bg-border md:inline" aria-hidden="true" />

        {kelasList.length > 0 && (
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            aria-label="Filter kelas jalan"
            className="input h-8 py-1 text-xs"
          >
            <option value="all">Kelas I-VI</option>
            {kelasList.map((k) => (
              <option key={k} value={k}>Kelas {k}</option>
            ))}
          </select>
        )}

        {fasList.length > 0 && (
          <select
            value={filterFasilitas}
            onChange={(e) => setFilterFasilitas(e.target.value)}
            aria-label="Filter fasilitas parkir"
            className="input h-8 py-1 text-xs"
          >
            <option value="all">Parkir</option>
            {fasList.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}

        <select
          value={filterTingkat}
          onChange={(e) => setFilterTingkat(e.target.value)}
          aria-label="Filter tingkat laporan"
          className="input h-8 py-1 text-xs"
        >
          <option value="all">Tingkat</option>
          <option value="berat">Berat</option>
          <option value="sedang">Sedang</option>
          <option value="ringan">Ringan</option>
        </select>

        <div className="relative ml-auto w-40">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-subink" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama ruas…"
            aria-label="Pencarian ruas"
            className="input h-8 py-1 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[700px] w-full">
        <MapContainer center={BANJARNEGARA_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full">
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satelit">
              <TileLayer
                attribution='Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Topografi">
              <TileLayer
                attribution='Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <ZoomListener onZoomChange={setZoom} />

          <FeatureGroup>
            <FitToBounds geojson={kecamatan} />
            {showKec && kecamatan && (
              <GeoJSON key={`kec-${choroplethOn}`} data={kecamatan} style={kecamatanStyle} onEachFeature={onEachKecamatan} />
            )}
            {showDesa && desa && (
              <GeoJSON key="desa" data={desa} style={desaStyle} onEachFeature={(f, l) => {
                const name = f.properties?.Desa || f.properties?.NAME || '—';
                l.bindPopup(`<div class="map-popup"><div class="map-popup__label">Desa/Kelurahan</div><div class="map-popup__title">${name}</div></div>`);
              }} />
            )}
            {showRuas && ruasFiltered && (
              <GeoJSON
                key={`ruas-${filterKelas}-${search}-${showRuasRusak}`}
                data={ruasFiltered}
                style={ruasStyle}
                onEachFeature={onEachRuas}
              />
            )}
          </FeatureGroup>

          {showParkir && parkirFiltered && (
            <FeatureGroup>
              {parkirFiltered.features.map((f, idx) => {
                const [lng, lat] = f.geometry.coordinates;
                const fill = colorByFasilitas(f.properties?.jenis_fasilitas, f.properties?.jenis_parkir_luar);
                const p = f.properties || {};
                return (
                  <CircleMarker
                    key={p.id ?? idx}
                    center={[lat, lng]}
                    radius={5}
                    pathOptions={{ color: '#0a0a0a', weight: 1.5, fillColor: fill, fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup__label">Titik Parkir</div>
                        <div className="map-popup__title">{p.nama || '—'}</div>
                        <div className="map-popup__row">Jenis: <b>{p.jenis_fasilitas || '—'}{p.jenis_parkir_luar ? ' / ' + p.jenis_parkir_luar : ''}</b></div>
                        <div className="map-popup__row">SRP Motor: <b>{p.srp_motor || 0}</b> · SRP Mobil: <b>{p.srp_mobil || 0}</b></div>
                        <div className="map-popup__row">Luas: <b>{p.luas_lokasi || 0} m²</b></div>
                        {p.nama_kecamatan && <div className="map-popup__row">Kecamatan: <b className="capitalize">{p.nama_kecamatan}</b></div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </FeatureGroup>
          )}

          {showJukir && jukir && (
            <FeatureGroup>
              {jukir.features.map((f, idx) => {
                const [lng, lat] = f.geometry.coordinates;
                const aktif = f.properties?.activated === 1;
                const p = f.properties || {};
                return (
                  <CircleMarker
                    key={p.id ?? idx}
                    center={[lat, lng]}
                    radius={8}
                    pathOptions={{ color: aktif ? '#0a0a0a' : '#94a3b8', weight: 2, fillColor: aktif ? '#EC4899' : '#94a3b8', fillOpacity: 0.7 }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup__label">Juru Parkir</div>
                        <div className="map-popup__title">{p.nama_jukir || '—'}</div>
                        <div className="map-popup__row">No. Jukir: <b>{p.no_juru_parkir || '—'}</b></div>
                        <div className="map-popup__row">NIK: <b>{p.nik || '—'}</b></div>
                        <div className="map-popup__row">Lokasi: <b>{p.nama_lokasi || '—'}</b></div>
                        <div className="map-popup__row">Setoran/bln: <b>Rp {(p.setoran_perbulan || 0).toLocaleString('id-ID')}</b></div>
                        <div className="map-popup__row">Status: <span className={`chip ${aktif ? 'bg-accent-50 text-accent-700 border-accent-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{aktif ? 'Aktif' : 'Non-aktif'}</span></div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </FeatureGroup>
          )}

          {showLaporan && laporanFiltered.length > 0 && (
            <FeatureGroup>
              {laporanFiltered.map((l) => {
                if (!l.latitude || !l.longitude) return null;
                const c = colorByTingkat(l.tingkat);
                return (
                  <CircleMarker
                    key={l.id}
                    center={[l.latitude, l.longitude]}
                    radius={9}
                    pathOptions={{ color: '#0a0a0a', weight: 2, fillColor: c, fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup__label">Laporan #{l.id}</div>
                        <div className="map-popup__title">{l.jenis_label || '—'}</div>
                        <span className={`chip ${tingkatChipTone(l.tingkat)} mt-1`}>TINGKAT: {String(l.tingkat || '').toUpperCase()}</span>
                        <div className="map-popup__row">Pelapor: <b>{l.nama_pelapor || 'Anonim'}</b></div>
                        <div className="map-popup__row">Lokasi: <b>{l.nama_jalan || '—'}</b></div>
                        <div className="map-popup__row">Kec/Desa: <b>{l.kecamatan || '—'} / {l.desa || '—'}</b></div>
                        {l.deskripsi && <div className="map-popup__quote">{l.deskripsi}</div>}
                        <div className="map-popup__meta">Status: {l.status || '—'} · {new Date(l.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </FeatureGroup>
          )}

          {/* Perlengkapan jalan (cluster + individual) */}
          {showPerkap && (perlengkapan?.features?.length || 0) > 0 && (
            <>
              {/* Cluster bubbles (divIcon dengan label count) */}
              {perkapClustered.clusters.map((c, idx) => {
                const fill = JENIS_COLOR[c.topJenisId]?.fill || '#0EA5E9';
                const ring = JENIS_COLOR[c.topJenisId]?.ring || '#0c4a6e';
                const size = Math.min(60, 28 + Math.log2(c.count) * 8);
                const icon = L.divIcon({
                  className: 'perkap-cluster-icon',
                  html: `<div class="perkap-cluster" style="background:${fill};border-color:${ring};width:${size}px;height:${size}px;"><span>${c.count}</span></div>`,
                  iconSize: [size, size],
                  iconAnchor: [size / 2, size / 2]
                });
                return (
                  <Marker
                    key={`pc-${idx}`}
                    position={[c.lat, c.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup__label">Cluster Perlengkapan</div>
                        <div className="map-popup__title">{c.count} titik</div>
                        <div className="map-popup__row">Jenis dominan: <b>{JENIS_LABEL[c.topJenisId] || `Jenis #${c.topJenisId}`}</b></div>
                        <div className="map-popup__hint">Zoom-in untuk melihat per titik</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {/* Individual markers (saat zoom tinggi ATAU cell tunggal) */}
              {perkapClustered.singles.map((f, idx) => {
                const [lng, lat] = f.geometry.coordinates;
                const p = f.properties || {};
                const fill = JENIS_COLOR[p.id_jenis]?.fill || '#0EA5E9';
                const ring = JENIS_COLOR[p.id_jenis]?.ring || '#0c4a6e';
                const knd = p.kondisi || 'Tidak Diketahui';
                const kndTone = KONDISI_TONE[knd] || KONDISI_TONE['Tidak Diketahui'];
                const radius = p.kondisi === 'Rusak' ? 8 : p.kondisi === 'Hilang' ? 6 : 5;
                return (
                  <CircleMarker
                    key={p.id ?? idx}
                    center={[lat, lng]}
                    radius={radius}
                    pathOptions={{ color: ring, weight: 1.5, fillColor: fill, fillOpacity: 0.9 }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <div className="map-popup__label">Perlengkapan #{p.id}</div>
                        <div className="map-popup__title">{p.nama || JENIS_LABEL[p.id_jenis] || '—'}</div>
                        <div className="map-popup__row">Jenis: <b>{JENIS_LABEL[p.id_jenis] || `#${p.id_jenis}`}</b></div>
                        {p.id_ruasjalan != null && <div className="map-popup__row">ID Ruas: <b>#{p.id_ruasjalan}</b></div>}
                        <div className="map-popup__row">Status: <b>{p.status === 'T' ? 'Terpasang' : (p.status === 'K' ? 'Tidak Terpasang' : p.status || '—')}</b></div>
                        <div className="map-popup__row">Kondisi:
                          <span className="chip ml-1" style={{ background: kndTone.chip.includes('bg-accent-50') ? '#F0FDF4' : kndTone.chip.includes('bg-red-50') ? '#FEF2F2' : kndTone.chip.includes('bg-slate-50') ? '#F8FAFC' : '#FFFBEB', color: kndTone.dot, borderColor: kndTone.dot + '40' }}>
                            {knd}
                          </span>
                        </div>
                        {p.posisi && <div className="map-popup__row">Posisi: <b className="capitalize">{p.posisi}</b></div>}
                        {p.keterangan && <div className="map-popup__quote">{p.keterangan}</div>}
                        {p.tgl_insert && <div className="map-popup__meta">Tgl: {p.tgl_insert}</div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </>
          )}
        </MapContainer>

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-[400]">
          <div className="card pointer-events-auto max-w-xs p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <Info size={12} strokeWidth={2.5} aria-hidden="true" /> Legenda
            </div>

            {showRuas && (
              <div className="mb-2 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Ruas (Kelas)</div>
                <LegendLine color="#FF3B30" label="I, II" />
                <LegendLine color="#FFD500" label="III, IV" />
                <LegendLine color="#22C55E" label="V, VI" />
              </div>
            )}

            {showRuasRusak && stats.totalRuasRusak > 0 && (
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="inline-block h-1 w-6 bg-red-500" style={{ height: '4px' }} aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Ruas Rusak ({stats.totalRuasRusak})</span>
              </div>
            )}

            {showLaporan && (
              <div className="mb-2 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Laporan</div>
                <LegendDot color="#FF3B30" label="Berat" />
                <LegendDot color="#F97316" label="Sedang" />
                <LegendDot color="#FFD500" label="Ringan" />
              </div>
            )}

            {showParkir && (
              <div className="mb-2 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Parkir</div>
                <LegendDot color="#7C3AED" label="Dalam" />
                <LegendDot color="#06B6D4" label="Luar TKP" />
                <LegendDot color="#F97316" label="Luar TPK" />
              </div>
            )}

            {showJukir && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Jukir ({stats.jukirAktif}/{stats.jukirTotal} aktif)</div>
                <LegendDot color="#EC4899" label="Aktif" />
                <LegendDot color="#94a3b8" label="Non-aktif" />
              </div>
            )}

            {showPerkap && stats.perkapTotal > 0 && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Perkap ({stats.perkapTotal})</div>
                <LegendDot color="#DC2626" label="APILL" />
                <LegendDot color="#D97706" label="Warning Light" />
                <LegendDot color="#FBBF24" label="PJU" />
                <LegendDot color="#0EA5E9" label="Rambu (Peringatan/Larangan/dll)" />
                <LegendDot color="#A855F7" label="Marka" />
                <LegendDot color="#1E40AF" label="Guardrail" />
                <LegendDot color="#10B981" label="Delineator" />
                <LegendDot color="#EC4899" label="Cermin" />
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-subink">Zoom {zoom} · {zoom >= 14 ? `${perkapClustered.singles.length} titik` : `${perkapClustered.clusters.length} cluster`}</div>
              </div>
            )}
          </div>
        </div>

        {/* Stats overlay */}
        <div className="pointer-events-none absolute right-4 top-4 z-[400]">
          <div className="card pointer-events-auto p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <BarChart3 size={12} strokeWidth={2.5} aria-hidden="true" /> Ringkasan
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-subink"><MapPin size={10} aria-hidden="true" /> Ruas</span>
                <b className="font-mono text-ink">{ruasFiltered?.features?.length ?? 0}</b>
              </div>
              {stats.totalRuasRusak > 0 && (
                <div className="flex items-center justify-between gap-3 text-red-600">
                  <span className="flex items-center gap-1"><AlertTriangle size={10} aria-hidden="true" /> Rusak</span>
                  <b className="font-mono">{stats.totalRuasRusak}</b>
                </div>
              )}
              {parkir && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-subink"><Car size={10} aria-hidden="true" /> Parkir</span>
                  <b className="font-mono text-ink">{parkirFiltered?.features?.length ?? 0}</b>
                </div>
              )}
              {jukir && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-subink"><User2 size={10} aria-hidden="true" /> Jukir</span>
                  <b className="font-mono text-ink">{stats.jukirAktif}/{stats.jukirTotal}</b>
                </div>
              )}
              {laporan && (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-1">
                  <span className="flex items-center gap-1 text-subink"><AlertTriangle size={10} aria-hidden="true" /> Laporan</span>
                  <b className="font-mono text-ink">{laporanFiltered?.length ?? 0}</b>
                </div>
              )}
              {stats.perkapTotal > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-subink"><Info size={10} aria-hidden="true" /> Perkap</span>
                  <b className="font-mono text-ink">{stats.perkapTotal}</b>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LayerBtn({ on, onClick, color, label }) {
  const colorMap = {
    amber: { active: 'bg-amber-100 text-amber-800 border-amber-300' },
    green: { active: 'bg-accent-100 text-accent-700 border-accent-300' },
    yellow: { active: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    red:   { active: 'bg-red-100 text-red-700 border-red-300' },
    cyan:  { active: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    plum:  { active: 'bg-purple-100 text-purple-700 border-purple-300' },
    pink:  { active: 'bg-pink-100 text-pink-700 border-pink-300' },
    slate: { active: 'bg-slate-100 text-slate-700 border-slate-300' },
    indigo: { active: 'bg-indigo-100 text-indigo-700 border-indigo-300' }
  };
  const c = colorMap[color] || colorMap.amber;
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={[
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
        on ? c.active : 'border-border bg-surface text-subink hover:bg-muted'
      ].join(' ')}
    >
      {on ? <Eye size={11} strokeWidth={2.5} aria-hidden="true" /> : <EyeOff size={11} strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </button>
  );
}

function LegendLine({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-1 w-6 rounded-full" style={{ background: color, height: '4px' }} aria-hidden="true" />
      <span className="text-ink">{label}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full border border-ink" style={{ background: color }} aria-hidden="true" />
      <span className="text-ink">{label}</span>
    </div>
  );
}