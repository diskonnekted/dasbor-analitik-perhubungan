import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { addEsriBasemaps } from './esriBasemaps';
import { MapIcon, RotateCcw } from 'lucide-react';
import { JENIS_COLOR, JENIS_LABEL, clusterPerkap } from '../../api/perlengkapan';

const CENTER = [-7.4, 109.7];
const DEFAULT_ZOOM = 11;

const BASE = import.meta.env.BASE_URL;

// URL foto lokasi / gambar / ikon rambu dari public/uploads.
function fotoUrl(name) {
  if (!name) return null;
  return `${BASE}uploads/perlengkapan/${encodeURIComponent(name)}`;
}
function rambuUrl(name) {
  if (!name) return null;
  return `${BASE}uploads/rambu/${encodeURIComponent(name)}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Generate SVG donut pie chart untuk cluster, menunjukkan komposisi jenis.
 * Segmen proporsional terhadap jumlah tiap jenis; angka count di tengah.
 */
function clusterDonutSvg(composition, count, size) {
  const R = size / 2;
  const r = R * 0.58; // lubang donut
  const cx = R;
  const cy = R;
  const total = composition.reduce((a, c) => a + c.n, 0) || count;
  let acc = 0;
  const segments = composition.map((c) => {
    const frac = c.n / total;
    const startAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
    acc += c.n;
    const endAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = frac > 0.5 ? 1 : 0;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const x1i = cx + r * Math.cos(startAngle);
    const y1i = cy + r * Math.sin(startAngle);
    const x2i = cx + r * Math.cos(endAngle);
    const y2i = cy + r * Math.sin(endAngle);
    const fill = JENIS_COLOR[c.id]?.fill || '#94A3B8';
    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x2i} ${y2i}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${x1i} ${y1i}`,
      'Z'
    ].join(' ');
    return `<path d="${path}" fill="${fill}" stroke="#fff" stroke-width="1" />`;
  }).join('');

  return (
    `<div class="perkap-cluster" style="width:${size}px;height:${size}px;">` +
      `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;filter:drop-shadow(0 3px 6px rgba(15,23,42,0.35));">` +
        `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="#e2e8f0" stroke-width="1.5" />` +
        segments +
      `</svg>` +
      `<span class="perkap-cluster__count" style="position:absolute;font-weight:700;color:#1e293b;text-shadow:none;font-size:${Math.max(11, size / 4)}px;">${count}</span>` +
    `</div>`
  );
}

/**
 * Peta sebaran perlengkapan jalan (vanilla Leaflet, tanpa react-leaflet).
 * Setiap kali `features` berubah, seluruh layer dibersihkan dan dirender ulang.
 */
export default function PerkapMapNew({ features = [], kecamatan = null, desa = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const kecRef = useRef(null);
  const desaRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [showDesa, setShowDesa] = useState(true);

  // Inisialisasi map hanya sekali.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Bersihkan map yang sudah ada (StrictMode double-mount).
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(el, {
      center: CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true
    });

    addEsriBasemaps(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Layer batas kecamatan (selalu tampil, di bawah marker).
    if (kecamatan) {
      kecRef.current = L.geoJSON(kecamatan, {
        style: { color: '#94a3b8', weight: 1.2, fill: false, dashArray: '4 3' },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.Kecamatan || feature.properties?.Name || '—';
          layer.bindPopup(
            `<div class="map-popup"><div class="map-popup__label">Kecamatan</div>` +
            `<div class="map-popup__title">${escapeHtml(name)}</div></div>`
          );
        }
      }).addTo(map);
    }

    // Layer batas desa (toggle).
    if (desa) {
      desaRef.current = L.geoJSON(desa, {
        style: { color: '#b0c4de', weight: 0.8, fill: false, opacity: 0.85 },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.Nama_Desa_ || feature.properties?.Name || '—';
          const kec = feature.properties?.Kecamatan || '—';
          layer.bindPopup(
            `<div class="map-popup"><div class="map-popup__label">Desa</div>` +
            `<div class="map-popup__title">${escapeHtml(name)}</div>` +
            `<div class="map-popup__row">Kecamatan: <b>${escapeHtml(kec)}</b></div></div>`
          );
        }
      });
      if (showDesa) desaRef.current.addTo(map);
    }

    console.info('[PerkapMapNew] map init', map.getZoom(), map.getCenter());

    // Pastikan ukuran benar setelah layout settle.
    setTimeout(() => {
      map.invalidateSize();
      setReady(true);
    }, 0);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      kecRef.current = null;
      desaRef.current = null;
    };
  }, []);

  // Render marker setiap kali features berubah.
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (!features || features.length === 0) {
      console.warn('[PerkapMapNew] render: no features');
      return;
    }

    const zoom = map.getZoom();
    // Clustering bertingkat: makin kecil zoom, grid makin kasar sehingga
    // cluster lebih sedikit dan tidak membanjiri peta saat pertama dibuka.
    const precision =
      zoom < 10 ? 0.30 :
      zoom < 11 ? 0.15 :
      zoom < 12 ? 0.08 :
      zoom < 13 ? 0.03 :
      zoom < 14 ? 0.01 : 0;

    let clusters = [];
    let singles = [];

    if (precision === 0) {
      singles = features;
    } else {
      const res = clusterPerkap(features, { precision, minCount: 2 });
      clusters = res.clusters;
      singles = res.singles;
    }

    console.info('[PerkapMapNew] render', { total: features.length, clusters: clusters.length, singles: singles.length, zoom, precision });

    // Cluster bubbles.
    clusters.forEach((c, idx) => {
      // Ukuran dijaga tetap ringkas agar tidak memenuhi peta: 24px (2 titik)
      // hingga maksimum 44px (cluster sangat besar).
      const size = Math.min(44, 24 + Math.log2(c.count) * 4);
      const icon = L.divIcon({
        className: 'perkap-cluster-icon',
        html: clusterDonutSvg(c.composition || [], c.count, size),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      const breakdown = (c.composition || []).slice(0, 4)
        .map((k) => `<div class="map-popup__row" style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${JENIS_COLOR[k.id]?.fill || '#94A3B8'};"></span>${escapeHtml(JENIS_LABEL[k.id] || '#' + k.id)}: <b>${k.n}</b></div>`)
        .join('');
      const more = (c.composition || []).length > 4
        ? `<div class="map-popup__hint">+ ${c.composition.length - 4} jenis lainnya</div>` : '';
      const m = L.marker([c.lat, c.lng], { icon });
      m.bindPopup(
        `<div class="map-popup"><div class="map-popup__label">Cluster Perlengkapan</div>` +
        `<div class="map-popup__title">${c.count} titik</div>` +
        `<div class="map-popup__row">Jenis dominan: <b>${escapeHtml(JENIS_LABEL[c.topJenisId] || '#' + c.topJenisId)}</b></div>` +
        breakdown + more +
        `<div class="map-popup__hint">Klik untuk zoom-in & pecahkan klaster</div></div>`
      );
      // Klik cluster → zoom ke bounds titik-titiknya (pecah jadi individual).
      m.on('click', () => {
        const pts = (c.items || []).map((it) => {
          const [ln, la] = it.geometry.coordinates;
          return [la, ln];
        });
        if (pts.length === 0) return;
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      });
      m.addTo(layerGroup);
    });

    // Individual points.
    singles.forEach((f, idx) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties || {};
      const fill = JENIS_COLOR[p.id_jenis]?.fill || '#0EA5E9';
      const ring = JENIS_COLOR[p.id_jenis]?.ring || '#075985';
      const radius = p.kondisi === 'Rusak' ? 8 : p.kondisi === 'Hilang' ? 6 : 5;
      const cm = L.circleMarker([lat, lng], {
        radius,
        color: ring,
        weight: 1.5,
        fillColor: fill,
        fillOpacity: 0.9
      });

      // Jenis rambu: tampilkan simbol rambu; selain itu (PJU dsb.) tampilkan foto lokasi.
      const rambuSub = [4, 9, 10, 11, 12];
      const isRambu = rambuSub.includes(p.id_jenis);

      // Gambar utama.
      const foto = p.foto || p.gambar;
      let mediaHtml = '';
      if (isRambu && p.gambar_rambu) {
        // Simbol rambu (dari gambar_rambu) sebagai gambar utama besar.
        mediaHtml =
          `<img src="${rambuUrl(p.gambar_rambu)}" alt="${escapeHtml(p.nama || 'rambu')}" ` +
          `style="width:100%;max-height:220px;object-fit:contain;border-radius:8px;margin-top:8px;background:#f8fafc;padding:4px;" ` +
          `loading="lazy" onerror="this.style.display='none'" />`;
      } else if (foto && fotoUrl(foto)) {
        // Foto lokasi (PJU, tiang lampu, dll).
        mediaHtml =
          `<img src="${fotoUrl(foto)}" alt="${escapeHtml(p.nama || 'foto')}" ` +
          `style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-top:8px;background:#f1f5f9;" ` +
          `loading="lazy" onerror="this.style.display='none'" />`;
      }
      const lokasi = p.keterangan || p.lokasi ? `<div class="map-popup__row">Lokasi: <b>${escapeHtml(p.keterangan || p.lokasi)}</b></div>` : '';

      cm.bindPopup(
        `<div class="map-popup"><div class="map-popup__label">Perlengkapan #${escapeHtml(p.id)}</div>` +
        `<div class="map-popup__title">${escapeHtml(p.nama || JENIS_LABEL[p.id_jenis] || '—')}</div>` +
        `<div class="map-popup__row">Jenis: <b>${escapeHtml(JENIS_LABEL[p.id_jenis] || '#' + p.id_jenis)}</b></div>` +
        `<div class="map-popup__row">Kondisi: <b>${escapeHtml(p.kondisi)}</b></div>` +
        lokasi +
        mediaHtml +
        `</div>`
      );
      cm.addTo(layerGroup);
    });
  }, [features, ready]);

  // Re-render saat zoom berubah.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => {
      const z = map.getZoom();
      // paksa render ulang layer
      setReady((v) => !v);
      console.info('[PerkapMapNew] zoomend', z);
    };
    map.on('zoomend', onZoom);
    return () => map.off('zoomend', onZoom);
  }, []);

  // Toggle layer desa.
  useEffect(() => {
    const map = mapRef.current;
    const layer = desaRef.current;
    if (!map || !layer) return;
    if (showDesa) {
      map.addLayer(layer);
    } else {
      map.removeLayer(layer);
    }
  }, [showDesa]);

  return (
    <div className="relative h-[700px] w-full">
      <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[400]">
        <div className="card pointer-events-auto max-w-xs p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
            <MapIcon size={12} strokeWidth={2.5} aria-hidden="true" /> Perkap
          </div>
          <div className="space-y-1 text-xs">
            {Object.entries(JENIS_COLOR).slice(0, 8).map(([id, c]) => (
              <div key={id} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border" style={{ background: c.fill, borderColor: c.ring }} aria-hidden="true" />
                <span>{JENIS_LABEL[id]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reset & toggle Desa */}
      <div className="absolute right-4 top-4 z-[400] flex flex-col gap-1.5">
        <button
          onClick={() => setShowDesa((v) => !v)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-sm border ${showDesa ? 'bg-primary text-white border-primary' : 'bg-surface text-subink border-border hover:bg-muted'}`}
        >
          Desa {showDesa ? 'On' : 'Off'}
        </button>
        <button
          onClick={() => mapRef.current?.setView(CENTER, DEFAULT_ZOOM)}
          className="flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs font-semibold text-subink shadow-sm border border-border hover:bg-muted"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}