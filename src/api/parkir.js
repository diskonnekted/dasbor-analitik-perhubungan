/**
 * Loader + helpers dataset Perparkiran Dishub Banjarnegara.
 * Sumber:
 *  - public/pju_titik_parkir.geojson     (onlinkid_parkir.titik_parkir, 11 titik)
 *  - public/parkir_analysis.json         (siap.PARKIR.sql master 2021: 12 juru_parkir + relasi + domisili)
 *
 * Fitur:
 *  - getParkir(): fetch geojson + master juru_parkir (cached).
 *  - computeParkirStats(): agregat fasilitas, SRP, luas, kecamatan, setoran, domisili jukir.
 *  - filterParkir() / filterJukir(): filter + sort.
 */

let cache = null;
let loadingPromise = null;

export const JENIS_FASILITAS_LABEL = {
  'dalam': 'Parkir Dalam (off-street)',
  'luar': 'Parkir Luar (on-street)'
};

export const JENIS_FASILITAS_COLOR = {
  'dalam': '#1E40AF',
  'luar': '#0EA5E9'
};

export const JENIS_DESA_LABEL = {
  'Kelurahan': 'Kelurahan',
  'Desa': 'Desa'
};

export function formatRupiah(v, { compact = false } = {}) {
  const n = Number(v) || 0;
  if (compact) {
    if (Math.abs(n) >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
    if (Math.abs(n) >= 1e3) return `Rp ${(n / 1e3).toFixed(1)} rb`;
    return `Rp ${n}`;
  }
  return 'Rp ' + n.toLocaleString('id-ID');
}

/**
 * Resolve path media (ex: 'media/foto/x.jpg') menjadi URL yang bisa dipakai <img>.
 */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/\\/g, '/').replace(/^\.?\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

const fetchOpts = { cache: 'no-cache' }; // revalidasi: jangan pakai salinan lama saat file di server diperbarui

async function fetchGeo(name) {
  const res = await fetch(`${import.meta.env.BASE_URL}${name}`, fetchOpts);
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  return res.json();
}

async function fetchJson(name) {
  const res = await fetch(`${import.meta.env.BASE_URL}${name}`, fetchOpts);
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  return res.json();
}

export async function getParkir() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const [parkirGeo, jukirGeo, juruMaster, retribusi, pengaduan] = await Promise.all([
        fetchGeo('parkir_titik_parkir.geojson'),
        fetchGeo('parkir_titik_jukir.geojson'),
        fetchJson('parkir_juru_parkir.json'),
        fetchJson('parkir_retribusi.json'),
        fetchJson('parkir_pengaduan.json'),
      ]);

      const parkir = (parkirGeo.features || []).map((f) => ({
        ...f,
        properties: { ...f.properties }
      }));
      const jukirGeoList = (jukirGeo.features || []).map((f) => ({
        ...f,
        properties: { ...f.properties }
      }));

      // master juru_parkir (398) — dengan domisili, jk, verifikasi, relasi.
      const juru = juruMaster || [];
      const placedNos = new Set(jukirGeoList.map((f) => f.properties.no_juru_parkir).filter(Boolean));
      const juruUnplaced = juru.filter((j) => !placedNos.has(j.no_juru_parkir));
      // titik_jukir enriched (207) sudah join lokasi + domisili.
      const titikJukir = jukirGeoList.map((f) => f.properties);
      // titik_parkir master (215) — dengan foto_lokasi.
      const titikParkir = parkir.map((f) => f.properties);

      cache = { parkir, jukir: jukirGeoList, juru, titikJukir, juruUnplaced, titikParkir, retribusi: retribusi || [], pengaduan: pengaduan || [], source: 'sql-dump' };
      return cache;
    } catch (e) {
      console.error('getParkir failed', e);
      // ponytail: hasil gagal tidak di-cache — return sementara agar retry terjadi di panggilan berikutnya.
      return { parkir: [], jukir: [], juru: [], titikJukir: [], juruUnplaced: [], titikParkir: [], retribusi: [], pengaduan: [], source: 'empty' };
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function computeParkirStats(parkir, jukir, master = {}) {
  const byFasilitas = {};
  const byKecamatan = {};
  const byDesa = {};
  let srpMotor = 0;
  let srpMobil = 0;
  let luas = 0;
  let panjang = 0;

  for (const f of parkir) {
    const p = f.properties || {};
    const fas = p.jenis_fasilitas || 'Tidak Diketahui';
    const kec = (p.nama_kecamatan || '').trim() || 'Tidak Diketahui';
    const des = p.jenis_desa || 'Tidak Diketahui';

    byFasilitas[fas] = (byFasilitas[fas] || 0) + 1;
    byKecamatan[kec] = (byKecamatan[kec] || 0) + 1;
    byDesa[des] = (byDesa[des] || 0) + 1;

    srpMotor += Number(p.srp_motor) || 0;
    srpMobil += Number(p.srp_mobil) || 0;
    luas += Number(p.luas_lokasi) || 0;
    panjang += Number(p.panjang_lokasi) || 0;
  }

  const jukirStats = {
    total: jukir.length,
    aktif: jukir.filter((j) => Number(j.properties?.activated) === 1).length,
    nonaktif: jukir.filter((j) => Number(j.properties?.activated) !== 1).length,
    totalSetoran: jukir.reduce((s, j) => s + (Number(j.properties?.setoran_perbulan) || 0), 0),
    setoranCount: jukir.filter((j) => (Number(j.properties?.setoran_perbulan) || 0) > 0).length,
    berspt: jukir.filter((j) => j.properties?.no_spt && j.properties.no_spt !== '0').length
  };

  // Master juru_parkir (12) — dimensi tambahan
  const juru = master.juru || [];
  const byDomisili = {};
  const byJk = {};
  for (const jp of juru) {
    const dom = (jp.domisili_kecamatan || '').trim() || 'Tidak Diketahui';
    const jk = jp.jk === 'P' ? 'Perempuan' : jp.jk === 'L' ? 'Laki-laki' : 'Tidak Diketahui';
    byDomisili[dom] = (byDomisili[dom] || 0) + 1;
    byJk[jk] = (byJk[jk] || 0) + 1;
  }
  const unplaced = (master.juruUnplaced || []).length;
  const verified = juru.filter((jp) => Number(jp.verifikasi) === 1).length;

  const masterStats = {
    totalJuru: juru.length,
    byDomisili,
    byJk,
    unplaced,
    verified,
    unknownDomisili: byDomisili['Tidak Diketahui'] || 0
  };

  return {
    total: parkir.length,
    byFasilitas,
    byKecamatan,
    byDesa,
    srpMotor,
    srpMobil,
    luas,
    panjang,
    jukir: jukirStats,
    master: masterStats
  };
}

export function filterParkir(parkir, opts = {}) {
  const { search = '', fasilitas = 'all', kecamatan = 'all' } = opts;
  const q = search.trim().toLowerCase();
  return parkir.filter((f) => {
    const p = f.properties || {};
    if (fasilitas !== 'all' && (p.jenis_fasilitas || 'Tidak Diketahui') !== fasilitas) return false;
    if (kecamatan !== 'all' && (p.nama_kecamatan || '').trim() !== kecamatan) return false;
    if (q) {
      const blob = [p.nama, p.ruas, p.nama_kecamatan, p.jenis_desa]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function filterJukir(jukir, opts = {}) {
  const { search = '', status = 'all' } = opts;
  const q = search.trim().toLowerCase();
  return jukir.filter((j) => {
    const p = j.properties || {};
    const act = Number(p.activated) === 1 ? 'aktif' : 'nonaktif';
    if (status !== 'all' && act !== status) return false;
    if (q) {
      const blob = [p.nama_jukir, p.no_juru_parkir, p.nama_lokasi, p.nik]
        .filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}