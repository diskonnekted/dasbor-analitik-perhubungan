/**
 * Loader untuk dataset ruas jalan kabupaten.
 * Sumber utama: public/pju_ruas.geojson (270 ruas PU, sudah augmented:
 *   kelas_jalan, kecamatan via point-in-polygon, panjang_geo_km, kondisi).
 */
let cache = null;
let loadingPromise = null;

export async function getRuas() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}pju_ruas.geojson`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geo = await res.json();
      cache = {
        geo,
        features: geo.features || [],
        source: 'static'
      };
      return cache;
    } catch (e) {
      console.error('getRuas failed', e);
      cache = { geo: { type: 'FeatureCollection', features: [] }, features: [], source: 'empty' };
      return cache;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/** Hitung agregat ruas untuk kartu ringkasan & grafik. */
export function computeRuasStats(features) {
  const byKelas = {};
  const byKondisi = {};
  const byKecamatan = {};
  const byKelasKondisi = {}; // kelas -> kondisi -> count
  let totalPanjang = 0;
  let totalLebar = 0;
  let lebarCount = 0;
  let longest = null;
  let shortest = null;

  for (const f of features) {
    const p = f.properties || {};
    const kls = p.kelas_jalan || 'Lain';
    const knd = p.kondisi || 'Baik';
    const kec = p.kecamatan || 'Tidak Diketahui';
    const panjang = Number(p.panjang_geo_km) || Number(p.panjang_km) || 0;
    const lebar = Number(p.lebar_m);

    byKelas[kls] = (byKelas[kls] || 0) + 1;
    byKondisi[knd] = (byKondisi[knd] || 0) + 1;
    byKecamatan[kec] = (byKecamatan[kec] || 0) + 1;
    if (!byKelasKondisi[kls]) byKelasKondisi[kls] = {};
    byKelasKondisi[kls][knd] = (byKelasKondisi[kls][knd] || 0) + 1;

    totalPanjang += panjang;
    if (Number.isFinite(lebar)) {
      totalLebar += lebar;
      lebarCount += 1;
    }

    if (panjang > 0) {
      if (!longest || panjang > longest.panjang) longest = { id: p.id, nama: p.nama_ruas, panjang, kelas: kls };
      if (!shortest || panjang < shortest.panjang) shortest = { id: p.id, nama: p.nama_ruas, panjang, kelas: kls };
    }
  }

  // Sort
  const sortByCount = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

  return {
    total: features.length,
    totalPanjang,
    avgPanjang: features.length ? totalPanjang / features.length : 0,
    avgLebar: lebarCount ? totalLebar / lebarCount : 0,
    byKelas: sortByCount(byKelas),
    byKondisi: sortByCount(byKondisi),
    byKecamatan: sortByCount(byKecamatan),
    byKelasKondisi,
    longest,
    shortest
  };
}

/** Filter ruas berdasarkan kriteria sederhana. */
export function filterRuas(features, opts = {}) {
  const { search = '', kelas = 'all', kondisi = 'all', kecamatan = 'all' } = opts;
  const q = search.trim().toLowerCase();
  return features.filter((f) => {
    const p = f.properties || {};
    if (kelas !== 'all' && (p.kelas_jalan || 'Lain') !== kelas) return false;
    if (kondisi !== 'all' && (p.kondisi || 'Baik') !== kondisi) return false;
    if (kecamatan !== 'all' && (p.kecamatan || 'Tidak Diketahui') !== kecamatan) return false;
    if (q) {
      const blob = [p.nama_ruas, p.nomor_ruas, p.titik_awal, p.titik_akhir, p.kecamatan]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export const KELAS_LIST = ['I', 'II', 'III', 'IV', 'V', 'VI', 'Lain'];
export const KONDISI_LIST = ['Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat'];
export const KONDISI_TONE = {
  'Baik':          { chip: 'bg-accent-50  text-accent-700  border-accent-200',  dot: '#16A34A' },
  'Rusak Ringan':  { chip: 'bg-amber-50   text-amber-700   border-amber-200',   dot: '#D97706' },
  'Rusak Sedang':  { chip: 'bg-orange-50  text-orange-700  border-orange-200',  dot: '#EA580C' },
  'Rusak Berat':   { chip: 'bg-red-50     text-red-700     border-red-200',     dot: '#DC2626' }
};