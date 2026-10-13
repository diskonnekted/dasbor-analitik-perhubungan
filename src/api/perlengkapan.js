/**
 * Loader + helpers untuk dataset perlengkapan jalan (sumber: public/perlengkapan_jalan.geojson
 * berasal dari onlinkid_rambu database onlinkid_rambu.perlengkapan_jalan).
 *
 * Fitur:
 *  - getPerkap(): fetch sekaligus jenis master + titik geojson (cached).
 *  - computePerkapStats(): agregasi per jenis, kondisi, tahun, status.
 *  - filterPerkap(): filter + sort.
 *  - clusterPerkap(): grid-based clustering sederhana untuk render preview tanpa leaflet plugin.
 */
let cache = null;
let loadingPromise = null;

export const JENIS_LABEL = {
  1: 'APILL',
  2: 'Warning Light',
  3: 'Lampu PJU',
  4: 'Rambu',
  5: 'Marka',
  6: 'Guardrail',
  7: 'Delineator',
  8: 'Cermin Tikungan',
  9: 'Rambu Peringatan',
  10: 'Rambu Larangan',
  11: 'Rambu Perintah',
  12: 'Rambu Petunjuk',
  27: 'Terminal Bus',
  28: 'Halte Bus'
};

export const JENIS_COLOR = {
  1:  { fill: '#DC2626', ring: '#7F1D1D' }, // APILL - merah
  2:  { fill: '#D97706', ring: '#78350F' }, // Warning Light - amber
  3:  { fill: '#FBBF24', ring: '#78350F' }, // PJU - kuning
  4:  { fill: '#0EA5E9', ring: '#075985' }, // Rambu - sky
  5:  { fill: '#A855F7', ring: '#581C87' }, // Marka - purple
  6:  { fill: '#1E40AF', ring: '#1E3A8A' }, // Guardrail - biru tua
  7:  { fill: '#10B981', ring: '#064E3B' }, // Delineator - hijau
  8:  { fill: '#EC4899', ring: '#831843' }, // Cermin - pink
  9:  { fill: '#0EA5E9', ring: '#075985' }, // sub rambu
  10: { fill: '#DC2626', ring: '#7F1D1D' },
  11: { fill: '#16A34A', ring: '#064E3B' },
  12: { fill: '#0284C7', ring: '#075985' },
  27: { fill: '#475569', ring: '#0F172A' },
  28: { fill: '#64748B', ring: '#0F172A' }
};

export const JENIS_ICON = {
  1:  '🚦',
  2:  '⚠️',
  3:  '💡',
  4:  '🪧',
  5:  '🦓',
  6:  '🛡️',
  7:  '🪧',
  8:  '🪞',
  9:  '⚠️',
  10: '🚫',
  11: '➡️',
  12: '🧭',
  27: '🚏',
  28: '🚏'
};

export const KONDISI_TONE = {
  'Baik':               { chip: 'bg-accent-50  text-accent-700  border-accent-200',  dot: '#16A34A' },
  'Rusak':              { chip: 'bg-red-50     text-red-700     border-red-200',     dot: '#DC2626' },
  'Hilang':             { chip: 'bg-slate-50   text-slate-700   border-slate-200',   dot: '#475569' },
  'Tidak Diketahui':    { chip: 'bg-amber-50   text-amber-700   border-amber-200',   dot: '#D97706' }
};

function normalizeKondisi(k) {
  if (!k) return 'Tidak Diketahui';
  return k;
}

export async function getPerkap() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const [jenisRes, geoRes] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}perlengkapan_jenis.json`, { cache: 'force-cache' }),
        fetch(`${import.meta.env.BASE_URL}perlengkapan_jalan.geojson`, { cache: 'force-cache' })
      ]);
      if (!jenisRes.ok) throw new Error(`jenis HTTP ${jenisRes.status}`);
      if (!geoRes.ok) throw new Error(`geo HTTP ${geoRes.status}`);
      const jenis = await jenisRes.json();
      const geo = await geoRes.json();

      const features = (geo.features || []).map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          kondisi: normalizeKondisi(f.properties?.kondisi)
        }
      }));

      cache = { jenis, geo, features, source: 'static' };
      return cache;
    } catch (e) {
      console.error('getPerkap failed', e);
      cache = { jenis: [], geo: { features: [] }, features: [], source: 'empty' };
      return cache;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function computePerkapStats(features) {
  const byJenis = {};
  const byKondisi = {};
  const byTahun = {};
  const byStatus = {};
  const byPosisi = {};
  const byRuas = {};
  let baikCount = 0;
  let rusakCount = 0;
  let hilangCount = 0;

  for (const f of features) {
    const p = f.properties || {};
    const jenisId = p.id_jenis;
    const knd = p.kondisi || 'Tidak Diketahui';
    const tahun = (p.tgl_insert || '').slice(0, 4);
    const status = p.status || '?';
    const posisi = p.posisi || 'Tidak Diketahui';
    const ruas = p.id_ruasjalan;

    byJenis[jenisId] = (byJenis[jenisId] || 0) + 1;
    byKondisi[knd] = (byKondisi[knd] || 0) + 1;
    if (tahun) byTahun[tahun] = (byTahun[tahun] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    byPosisi[posisi] = (byPosisi[posisi] || 0) + 1;
    if (ruas != null) byRuas[ruas] = (byRuas[ruas] || 0) + 1;

    if (knd === 'Baik') baikCount += 1;
    else if (knd === 'Rusak') rusakCount += 1;
    else if (knd === 'Hilang') hilangCount += 1;
  }

  return {
    total: features.length,
    byJenis,
    byKondisi,
    byTahun,
    byStatus,
    byPosisi,
    byRuas,
    baikCount,
    rusakCount,
    hilangCount,
    jenisLabel: (id) => JENIS_LABEL[id] || `Jenis #${id}`,
    jenisColor: (id) => JENIS_COLOR[id] || { fill: '#94A3B8', ring: '#475569' },
    jenisIcon:  (id) => JENIS_ICON[id] || '📍'
  };
}

export function filterPerkap(features, opts = {}) {
  const { search = '', jenis = 'all', kondisi = 'all', status = 'all', posisi = 'all', tahun = 'all' } = opts;
  const q = search.trim().toLowerCase();
  const jenisSet = jenis === 'all' ? null : new Set(Array.isArray(jenis) ? jenis : [jenis]);
  const kndSet   = kondisi === 'all' ? null : new Set(Array.isArray(kondisi) ? kondisi : [kondisi]);

  return features.filter((f) => {
    const p = f.properties || {};
    if (jenisSet && !jenisSet.has(p.id_jenis)) return false;
    if (kndSet && !kndSet.has(p.kondisi)) return false;
    if (status !== 'all' && (p.status || '?') !== status) return false;
    if (posisi !== 'all' && (p.posisi || 'Tidak Diketahui') !== posisi) return false;
    if (tahun !== 'all' && (p.tgl_insert || '').slice(0, 4) !== tahun) return false;
    if (q) {
      const blob = [p.nama, p.lokasi, p.keterangan, p.jenis, String(p.id_ruasjalan || '')]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Grid-based clustering sederhana: bucket titik ke cell dengan ukuran `precision` derajat,
 * lalu gabungkan per cell dengan centroid + count.
 */
export function clusterPerkap(features, { precision = 0.01, minCount = 2 } = {}) {
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
  const clusters = [];
  const singles = [];
  for (const b of buckets.values()) {
    if (b.count >= minCount) {
      const sortedJenis = Object.entries(b.byJenis)
        .map(([id, n]) => ({ id: Number(id), n }))
        .sort((a, b) => b.n - a.n);
      clusters.push({
        lng: b.lngSum / b.count,
        lat: b.latSum / b.count,
        count: b.count,
        topJenisId: sortedJenis[0].id,
        composition: sortedJenis,
        items: b.points
      });
    } else {
      for (const p of b.points) singles.push(p);
    }
  }
  return { clusters, singles };
}

export const STATUS_LABEL = {
  'T': 'Terpasang',
  'K': 'Tidak Terpasang'
};

export const KONDISI_LIST = ['Baik', 'Rusak', 'Hilang', 'Tidak Diketahui'];
export const STATUS_LIST = ['T', 'K'];
export const POSISI_LIST = ['kiri', 'kanan', 'tengah', 'Tidak Diketahui'];