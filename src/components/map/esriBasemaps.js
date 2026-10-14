import L from 'leaflet';

// ponytail: dua basemap Esri (Satelit default + Topografi) + switcher, dipakai semua peta vanilla Leaflet.
// Upgrade path: tambah opsi basemap lain di object layers bila perlu.
const URL_SATELIT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const URL_TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const ATTR_SATELIT = 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';
const ATTR_TOPO = 'Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS User Community';

/**
 * Pasang basemap Esri Satelit (aktif) + Topografi beserta layer switcher ke peta Leaflet.
 * @param {L.Map} map - instance peta Leaflet
 * @param {{position?: string}} [opts] - posisi kontrol switcher
 * @returns {{satelit: L.TileLayer, topografi: L.TileLayer}}
 */
export function addEsriBasemaps(map, { position = 'topright' } = {}) {
  const satelit = L.tileLayer(URL_SATELIT, { attribution: ATTR_SATELIT, maxZoom: 19 }).addTo(map);
  const topografi = L.tileLayer(URL_TOPO, { attribution: ATTR_TOPO, maxZoom: 19 });

  L.control.layers({ Satelit: satelit, Topografi: topografi }, null, { position }).addTo(map);

  return { satelit, topografi };
}
