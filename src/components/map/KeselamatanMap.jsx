import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { addEsriBasemaps } from './esriBasemaps';

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

export default function KeselamatanMap({ pengaduan = [], perlengkapan = [] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([-7.3833, 109.6667], 11);

    addEsriBasemaps(mapInstance.current);

    // Layer pengaduan (red pin)
    const pengaduanLayer = L.layerGroup().addTo(mapInstance.current);
    pengaduan.forEach((p) => {
      // Pengaduan tidak punya koordinat, skip peta
    });

    // Layer perlengkapan (blue circleMarkers, limited to 200)
    const perlengkapanLayer = L.layerGroup().addTo(mapInstance.current);
    perlengkapan.forEach((p) => {
      const lat = p.coordinate_lat;
      const lng = p.coordinate_lng;
      if (!lat || !lng || lat === 0 || lng === 0) return;
      const color = p.kondisi?.toLowerCase().includes('baik') ? '#10B981' : '#EF4444';
      const cm = L.circleMarker([lat, lng], {
        radius: 4, color: color, weight: 1, fillColor: color, fillOpacity: 0.7
      });
      cm.bindPopup(
        `<div class="map-popup"><div class="map-popup__title">${escapeHtml(p.nama || '—')}</div>` +
        `<div class="map-popup__row">Jenis: <b>${p.jenis || '—'}</b></div>` +
        `<div class="map-popup__row">Kondisi: <b>${p.kondisi || '—'}</b></div>` +
        `<div class="map-popup__row">Lokasi: <b>${escapeHtml(p.lokasi || '—')}</b></div>` +
        `</div>`
      );
      cm.addTo(perlengkapanLayer);
    });

    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <div style="background:white;padding:8px 12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:12px;">
          <div style="font-weight:bold;margin-bottom:4px;">Kondisi</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#10B981;"></span> Baik</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#EF4444;"></span> Rusak</div>
        </div>`;
      return div;
    };
    legend.addTo(mapInstance.current);

    return () => {
      mapInstance.current.remove();
      mapInstance.current = null;
    };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
