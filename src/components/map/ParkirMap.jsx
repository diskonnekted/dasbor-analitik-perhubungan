import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapIcon, RotateCcw } from 'lucide-react';

const CENTER = [-7.4, 109.7];
const DEFAULT_ZOOM = 12;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/\\/g, '/').replace(/^\.?\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

/**
 * Peta sebaran titik parkir + juru parkir (vanilla Leaflet).
 * Titik parkir memakai circleMarker biru; jukir memakai divIcon badge merah.
 */
export default function ParkirMap({ parkir = [], jukir = [], titikJukir = [], titikParkir = [], kecamatan = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const kecRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(el, { center: CENTER, zoom: DEFAULT_ZOOM, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (kecamatan) {
      kecRef.current = L.geoJSON(kecamatan, {
        style: { color: '#94a3b8', weight: 1.2, fill: false, dashArray: '4 3' }
      }).addTo(map);
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      kecRef.current = null;
    };
  }, []);

  // Render marker saat data berubah.
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Lookup foto lokasi dari data master (titikParkir) by id_titik_parkir.
    const fotoLokasiById = {};
    titikParkir.forEach((t) => {
      if (t.id_titik_parkir != null && t.foto_lokasi) fotoLokasiById[t.id_titik_parkir] = t.foto_lokasi;
    });

    // Titik parkir.
    let points = [];
    parkir.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties || {};
      const lokasiUrl = mediaUrl(fotoLokasiById[p.id]);
      const cm = L.circleMarker([lat, lng], {
        radius: 7,
        color: '#1E3A8A',
        weight: 1.5,
        fillColor: '#1E40AF',
        fillOpacity: 0.9
      });
      const srp = `${p.srp_motor || 0} motor / ${p.srp_mobil || 0} mobil`;
      cm.bindPopup(
        `<div class="map-popup"><div class="map-popup__label">Titik Parkir #${escapeHtml(p.id)}</div>` +
        `<div class="map-popup__title">${escapeHtml(p.nama || '—')}</div>` +
        (lokasiUrl ? `<img src="${lokasiUrl}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:6px;margin:4px 0;" />` : '') +
        `<div class="map-popup__row">Fasilitas: <b>${escapeHtml(p.jenis_fasilitas || '—')}</b></div>` +
        `<div class="map-popup__row">SRP: <b>${escapeHtml(srp)}</b></div>` +
        `<div class="map-popup__row">Luas: <b>${escapeHtml(p.luas_lokasi)} m²</b></div>` +
        `<div class="map-popup__row">Ruas: <b>${escapeHtml(p.ruas || '—')}</b></div>` +
        `<div class="map-popup__row">Kecamatan: <b>${escapeHtml((p.nama_kecamatan || '').trim())}</b></div>` +
        `</div>`
      );
      cm.addTo(layerGroup);
      points.push([lat, lng]);
    });

    // Lookup foto dari data master (titikJukir) by no_juru_parkir.
    const fotoByNo = {};
    titikJukir.forEach((t) => {
      if (t.no_juru_parkir) fotoByNo[t.no_juru_parkir] = t;
    });

    // Jukir (badge).
    jukir.forEach((j) => {
      const [lng, lat] = j.geometry.coordinates;
      const p = j.properties || {};
      const master = fotoByNo[p.no_juru_parkir] || {};
      const icon = L.divIcon({
        className: 'parkir-jukir-icon',
        html: `<div style="background:#DC2626;color:#fff;border-radius:9999px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3);">J</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const m = L.marker([lat, lng], { icon });
      const setoran = p.setoran_perbulan ? `Rp ${Number(p.setoran_perbulan).toLocaleString('id-ID')}` : 'Rp 0';
      const fotoUrl = mediaUrl(master.foto);
      const lokasiUrl = mediaUrl(master.foto_lokasi);
      m.bindPopup(
        `<div class="map-popup"><div class="map-popup__label">Juru Parkir</div>` +
        (fotoUrl ? `<img src="${fotoUrl}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin:4px 0;" />` : '') +
        `<div class="map-popup__title">${escapeHtml(p.nama_jukir || master.nama_jukir || '—')}</div>` +
        `<div class="map-popup__row">No: <b>${escapeHtml(p.no_juru_parkir || '—')}</b></div>` +
        `<div class="map-popup__row">Lokasi: <b>${escapeHtml(p.nama_lokasi || '—')}</b></div>` +
        `<div class="map-popup__row">Setoran/bln: <b>${escapeHtml(setoran)}</b></div>` +
        (lokasiUrl ? `<img src="${lokasiUrl}" alt="lokasi parkir" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-top:4px;" />` : '') +
        `<div class="map-popup__row">Status: <b>${Number(p.activated) === 1 ? 'Aktif' : 'Nonaktif'}</b></div>` +
        `</div>`
      );
      m.addTo(layerGroup);
      points.push([lat, lng]);
    });

    // Fit bounds jika ada titik.
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [parkir, jukir, titikJukir, titikParkir]);

  return (
    <div className="relative h-[520px] w-full">
      <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />

      <div className="pointer-events-none absolute bottom-4 left-4 z-[400]">
        <div className="card pointer-events-auto p-3 text-xs">
          <div className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-ink">
            <MapIcon size={12} strokeWidth={2.5} aria-hidden="true" /> Legenda
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border" style={{ background: '#1E40AF', borderColor: '#1E3A8A' }} aria-hidden="true" />
              <span>Titik Parkir</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#DC2626] text-[8px] font-bold text-white" aria-hidden="true">J</span>
              <span>Juru Parkir</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-[400]">
        <button
          onClick={() => mapRef.current?.setView(CENTER, DEFAULT_ZOOM)}
          className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-semibold text-subink shadow-sm hover:bg-muted"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}