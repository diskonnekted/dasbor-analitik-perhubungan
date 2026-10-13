/**
 * Peta khusus halaman Perlengkapan Jalan.
 * Dibuat dari nol (tanpa MapView existing) untuk menghindari konflik rendering/popup/pane.
 *
 * Fitur:
 *  - Render cluster bubble (L.divIcon) saat zoom rendah
 *  - Render individual marker (L.circleMarker) saat zoom tinggi
 *  - Tile OSM, zoom control
 *  - Legend floating + tombol reset zoom
 *  - Popup dengan styling konsisten
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { JENIS_COLOR, JENIS_LABEL, KONDISI_TONE } from '../../api/perlengkapan';
import { Info, Maximize2 } from 'lucide-react';

// Fix default icon (Leaflet tidak bisa resolve path di Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const CENTER = [-7.4, 109.7];

export default function PerkapMap({ features = [], height = 600 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [zoom, setZoom] = useState(11);
  const [tick, setTick] = useState(0); // force re-render cluster/singles saat zoom berubah
  const [mapReady, setMapReady] = useState(false);

  // --- MAP INIT dengan ResizeObserver (tunggu ukuran > 0) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    // Tunggu sampai element punya width/height > 0
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          ro.disconnect();
          initMap();
        }
      }
    });
    ro.observe(el);

    // Fallback: kalau ResizeObserver tidak fire (mis. element sudah punya size), init manual
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      ro.disconnect();
      initMap();
    }

    function initMap() {
      // Cleanup peta lama kalau ada (StrictMode double-init)
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) { /* noop */ }
        mapRef.current = null;
        layerRef.current = null;
      }

      console.info('[PerkapMap] init map at', CENTER, { width: el.clientWidth, height: el.clientHeight });
      const map = L.map(el, {
        center: CENTER,
        zoom: 11,
        scrollWheelZoom: true,
        zoomControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      layerRef.current = layer;
      mapRef.current = map;
      setMapReady(true);

      map.on('zoomend', () => {
        setZoom(map.getZoom());
        setTick((t) => t + 1);
      });

      // invalidateSize setelah DOM siap
      requestAnimationFrame(() => {
        try { map.invalidateSize(); } catch (e) { /* noop */ }
      });
      const t = setTimeout(() => {
        try { map.invalidateSize(); } catch (e) { /* noop */ }
        setTick((x) => x + 1);
      }, 300);

      return () => {
        clearTimeout(t);
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
        setMapReady(false);
      };
    }

    return () => {
      ro.disconnect();
    };
  }, []);

  // Compute clusters/singles
  const { clusters, singles } = useMemo(() => {
    console.info('[PerkapMap] useMemo clusters', { featuresLen: features?.length, zoom });
    if (!features || features.length === 0) return { clusters: [], singles: [] };
    // Switch threshold: zoom ≥ 14 → render individual, selain itu cluster.
    if (zoom >= 14) return { clusters: [], singles: features };

    const precision = zoom < 11 ? 0.04 : zoom < 12 ? 0.02 : zoom < 13 ? 0.01 : 0.005;
    const buckets = new Map();
    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates;
      const key = `${Math.round(lng / precision)}_${Math.round(lat / precision)}`;
      if (!buckets.has(key)) buckets.set(key, { points: [], lngSum: 0, latSum: 0, count: 0, byJenis: {} });
      const b = buckets.get(key);
      b.points.push(f);
      b.lngSum += lng;
      b.latSum += lat;
      b.count += 1;
      const j = f.properties?.id_jenis || 0;
      b.byJenis[j] = (b.byJenis[j] || 0) + 1;
    }
    const cs = [];
    const ss = [];
    for (const b of buckets.values()) {
      if (b.count >= 2) {
        const topJenis = Object.entries(b.byJenis).sort((a, c) => c[1] - a[1])[0];
        cs.push({
          lng: b.lngSum / b.count,
          lat: b.latSum / b.count,
          count: b.count,
          topJenisId: Number(topJenis[0]),
          items: b.points
        });
      } else {
        for (const p of b.points) ss.push(p);
      }
    }
    return { clusters: cs, singles: ss };
  }, [features, zoom]);

  // Render ulang cluster+singles saat zoom/fitur berubah
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();

    // Pastikan Leaflet tau ukuran container yang sebenarnya
    // (kadang container diukur 0 saat parent render async)
    try { mapRef.current.invalidateSize(); } catch (e) { /* noop */ }

    console.info('[PerkapMap] render layers', {
      featuresIn: features.length,
      clusters: clusters.length,
      singles: singles.length,
      zoom
    });

    // Cluster
    for (const c of clusters) {
      const fill = JENIS_COLOR[c.topJenisId]?.fill || '#0EA5E9';
      const ring = JENIS_COLOR[c.topJenisId]?.ring || '#0c4a6e';
      const size = Math.min(60, 28 + Math.log2(c.count) * 8);
      const icon = L.divIcon({
        className: 'perkap-cluster-icon',
        html: `<div class="perkap-cluster" style="background:${fill};border-color:${ring};width:${size}px;height:${size}px;"><span>${c.count}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      const m = L.marker([c.lat, c.lng], { icon });
      const jenisCounts = Object.entries(c.items.reduce((acc, it) => {
        const j = it.properties?.id_jenis || 0;
        acc[j] = (acc[j] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const jenisList = jenisCounts.map(([jid, n]) =>
        `<div class="map-popup__row">${JENIS_LABEL[jid] || `#${jid}`}: <b>${n}</b></div>`
      ).join('');
      m.bindPopup(`
        <div class="map-popup">
          <div class="map-popup__label">Cluster Perlengkapan</div>
          <div class="map-popup__title">${c.count} titik</div>
          <div class="map-popup__row">Jenis dominan: <b>${JENIS_LABEL[c.topJenisId] || `#${c.topJenisId}`}</b></div>
          ${jenisList}
          <div class="map-popup__hint">Zoom-in untuk melihat per titik</div>
        </div>
      `);
      m.addTo(layerRef.current);
    }

    // Singles
    for (const f of singles) {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties || {};
      const fill = JENIS_COLOR[p.id_jenis]?.fill || '#0EA5E9';
      const ring = JENIS_COLOR[p.id_jenis]?.ring || '#0c4a6e';
      const knd = p.kondisi || 'Tidak Diketahui';
      const kndTone = KONDISI_TONE[knd] || KONDISI_TONE['Tidak Diketahui'];
      const radius = p.kondisi === 'Rusak' ? 9 : p.kondisi === 'Hilang' ? 7 : 6;
      const m = L.circleMarker([lat, lng], {
        radius,
        color: ring,
        weight: 1.5,
        fillColor: fill,
        fillOpacity: 0.92
      });
      m.bindPopup(`
        <div class="map-popup">
          <div class="map-popup__label">Perlengkapan #${p.id}</div>
          <div class="map-popup__title">${escapeHtml(p.nama || JENIS_LABEL[p.id_jenis] || '—')}</div>
          <div class="map-popup__row">Jenis: <b>${JENIS_LABEL[p.id_jenis] || `#${p.id_jenis}`}</b></div>
          ${p.id_ruasjalan != null ? `<div class="map-popup__row">ID Ruas: <b>#${p.id_ruasjalan}</b></div>` : ''}
          <div class="map-popup__row">Status: <b>${p.status === 'T' ? 'Terpasang' : (p.status === 'K' ? 'Tidak Terpasang' : (p.status || '—'))}</b></div>
          <div class="map-popup__row">Kondisi:
            <span class="chip ml-1" style="background:${kndTone.dot}15;color:${kndTone.dot};border-color:${kndTone.dot}55;">${knd}</span>
          </div>
          ${p.posisi ? `<div class="map-popup__row">Posisi: <b style="text-transform:capitalize;">${p.posisi}</b></div>` : ''}
          ${p.keterangan ? `<div class="map-popup__quote">${escapeHtml(p.keterangan)}</div>` : ''}
          ${p.tgl_insert ? `<div class="map-popup__meta">Tgl: ${p.tgl_insert}</div>` : ''}
        </div>
      `);
      m.addTo(layerRef.current);
    }
  }, [clusters, singles, tick]);

  function handleReset() {
    if (!mapRef.current) return;
    mapRef.current.setView(CENTER, 11);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border" style={{ height: `${height}px` }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Floating controls (kanan atas) */}
      <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
        <button
          onClick={handleReset}
          aria-label="Reset zoom"
          title="Reset ke pusat"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <Maximize2 size={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Legend (kiri bawah) */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] max-w-xs">
        <div className="card pointer-events-auto p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
            <Info size={12} strokeWidth={2.5} aria-hidden="true" /> Legenda
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-subink">Jenis</div>
            <LegendDot color="#DC2626" label="APILL" />
            <LegendDot color="#D97706" label="Warning Light" />
            <LegendDot color="#FBBF24" label="PJU" />
            <LegendDot color="#0EA5E9" label="Rambu" />
            <LegendDot color="#A855F7" label="Marka" />
            <LegendDot color="#1E40AF" label="Guardrail" />
            <LegendDot color="#10B981" label="Delineator" />
            <LegendDot color="#EC4899" label="Cermin Tikungan" />
            <div className="mt-2 border-t border-border pt-1.5 text-[10px] font-mono text-subink">
              Zoom {zoom} · {zoom >= 14 ? `${singles.length} titik` : `${clusters.length} cluster + ${singles.length} individu`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-inset" style={{ background: color, borderColor: color + '80' }} aria-hidden="true" />
      <span className="text-ink">{label}</span>
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}