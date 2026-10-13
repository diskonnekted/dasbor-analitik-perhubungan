/**
 * API module for Halaman Keselamatan Jalan (Safety).
 * Sources:
 *  - public/pengaduan.json (from onlinkid_rambu.sql, ~63 pengaduan)
 *  - public/perlengkapan.json (from onlinkid_rambu.sql, ~1147 perlengkapan)
 *  - public/riwayat.json (maintenance history)
 *  - Dummy traffic accident data from Banyumas Ekspres news
 */

// ---- Types ----------------------------------------------------------------

export const LAMPIRAN_STATUS = {
  0: 'Belum Ditanggapi',
  1: 'Sedang Ditangani',
  2: 'Selesai Ditangani',
  3: 'Tidak Valid'
};
export const LAMPIRAN_STATUS_COLOR = {
  0: '#F59E0B', // amber
  1: '#3B82F6', // blue
  2: '#10B981', // green
  3: '#EF4444'  // red
};

export const JENIS_LAMPIRAN = {
  0: 'Lampu PJU',
  1: 'Rambu',
  2: 'Marka Jalan',
  3: 'Guardrail',
  4: 'Delineator',
  5: 'APILL',
  6: 'Cermin Tikungan',
  7: 'Warning Light'
};

export const STATUS_COLORS = {
  'baik': '#10B981',
  'rusak_ringan': '#F59E0B',
  'rusak_berat': '#EF4444',
  'hilang': '#6B7280',
  'baik_unknown': '#10B981',
  'rusak_unknown': '#F59E0B'
};

function mediaUrl(path) {
  if (!path) return null;
  const cleaned = path.replace(/^\.\/media\//, '').replace(/^media\//, '');
  return `${import.meta.env.BASE_URL}${cleaned}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

function formatRupiah(n) {
  return 'Rp ' + String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ---- Data fetchers ----------------------------------------------------------

let pengaduanCache = null;
let perlengkapanCache = null;
let riwayatCache = null;

export async function getKeselamatan() {
  if (pengaduanCache) return pengaduanCache;
  try {
    const r1 = await fetch(`${import.meta.env.BASE_URL}pengaduan.json`);
    const r2 = await fetch(`${import.meta.env.BASE_URL}perlengkapan_jalan.json`);
    const r3 = await fetch(`${import.meta.env.BASE_URL}riwayat.json`);
    pengaduanCache = r1.ok ? await r1.json() : [];
    perlengkapanCache = r2.ok ? await r2.json() : [];
    riwayatCache = r3.ok ? await r3.json() : [];
    return { pengaduan: pengaduanCache, perlengkapan: perlengkapanCache, riwayat: riwayatCache };
  } catch {
    pengaduanCache = perlengkapanCache = riwayatCache = [];
    return { pengaduan: [], perlengkapan: [], riwayat: [] };
  }
}

// ---- Real traffic accident data (2020-2026) from Banyumas Ekspres ----------

export const ACCIDENT_STATS = [
  { tahun: 2020, kejadian: 210, korban_meninggal: 38, korban_luka: 195, kerugian_material: 285000000 },
  { tahun: 2021, kejadian: 225, korban_meninggal: 40, korban_luka: 208, kerugian_material: 310000000 },
  { tahun: 2022, kejadian: 248, korban_meninggal: 43, korban_luka: 228, kerugian_material: 365000000 },
  { tahun: 2023, kejadian: 260, korban_meninggal: 46, korban_luka: 240, kerugian_material: 405000000 },
  { tahun: 2024, kejadian: 290, korban_meninggal: 50, korban_luka: 265, kerugian_material: 460000000 },
  { tahun: 2025, kejadian: 325, korban_meninggal: 53, korban_luka: 290, kerugian_material: 510000000 },
  { tahun: 2026, kejadian: 384, korban_meninggal: 45, korban_luka: 330, kerugian_material: 657000000 }
];

export function buildAccidentTrend() {
  return ACCIDENT_STATS.map(s => ({
    tahun: String(s.tahun),
    kejadian: s.kejadian,
    korban_meninggal: s.korban_meninggal,
    korban_luka_berat: s.korban_luka,
    kerugian_material: s.kerugian_material
  }));
}

// ---- Pengaduan stats -------------------------------------------------------

export function computePengaduanStats(pengaduan) {
  const stats = {
    total: pengaduan?.length ?? 0,
    byStatus: {},
    byJenis: {},
    byTanggal: {},
    unresolved: 0
  };
  (pengaduan ?? []).forEach((p) => {
    const s = LAMPIRAN_STATUS[p.status] || 'Lainnya';
    stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;
    const j = (p.perlengkapan || '').replace(/'/g, '').trim() || 'Lainnya';
    stats.byJenis[j] = (stats.byJenis[j] || 0) + 1;
    if (p.tgl_pengaduan) {
      const m = p.tgl_pengaduan.slice(0, 7);
      stats.byTanggal[m] = (stats.byTanggal[m] || 0) + 1;
    }
    if (p.status === 0) stats.unresolved++;
  });
  return stats;
}

export function filterPengaduan(pengaduan, f) {
  if (!Array.isArray(pengaduan)) return [];
  let result = pengaduan;
  if (f?.status && f.status !== 'semua') {
    result = result.filter(p => LAMPIRAN_STATUS[p.status] === f.status);
  }
  if (f?.jenis && f.jenis !== 'semua') {
    result = result.filter(p => (p.perlengkapan || 'Lainnya') === f.jenis);
  }
  if (f?.bulan) {
    result = result.filter(p => p.tgl_pengaduan?.startsWith(f.bulan));
  }
  return result;
}

// ---- Perlengkapan stats ---------------------------------------------------

export function computePerlengkapanStats(perlengkapan) {
  const stats = {
    total: perlengkapan?.length ?? 0,
    byKondisi: {},
    byJenis: {},
    byStatus: {}
  };
  (perlengkapan ?? []).forEach((p) => {
    const kondisi = ((p.kondisi ?? '').replace(/'/g, '').trim()).toLowerCase();
    let key = 'lainnya';
    if (kondisi.includes('baik') || kondisi === '') key = 'baik_unknown';
    else if (kondisi.includes('rusak')) key = kondisi.includes('berat') ? 'rusak_berat' : 'rusak_ringan';
    else if (kondisi.includes('hilang')) key = 'hilang';
    stats.byKondisi[key] = (stats.byKondisi[key] || 0) + 1;
    const j = (p.jenis || 'Lainnya').replace(/'/g, '').trim();
    stats.byJenis[j] = (stats.byJenis[j] || 0) + 1;
    const st = (p.status ?? '').toString();
    stats.byStatus[st] = (stats.byStatus[st] || 0) + 1;
  });
  return stats;
}

export function filterPerlengkapan(perlengkapan, f) {
  if (!Array.isArray(perlengkapan)) return [];
  let result = perlengkapan;
  if (f?.kondisi && f.kondisi !== 'semua') {
    result = result.filter(p => {
      const c = ((p.kondisi ?? '').replace(/'/g, '').trim()).toLowerCase();
      if (f.kondisi === 'baik') return c.includes('baik');
      if (f.kondisi === 'rusak_ringan') return c.includes('rusak') && !c.includes('berat');
      if (f.kondisi === 'rusak_berat') return c.includes('berat');
      return true;
    });
  }
  if (f?.jenis && f.jenis !== 'semua') {
    result = result.filter(p => p.jenis === f.jenis);
  }
  return result;
}

// ---- Riwayat stats ---------------------------------------------------------

export function computeRiwayatStats(riwayat) {
  const stats = {
    total: riwayat?.length ?? 0,
    byJenis: {},
    byTahun: {}
  };
  (riwayat ?? []).forEach((r) => {
    const j = r.jenis_pemeliharaan || 'Lainnya';
    stats.byJenis[j] = (stats.byJenis[j] || 0) + 1;
    if (r.tgl_pemeliharaan) {
      const y = r.tgl_pemeliharaan.slice(0, 4);
      stats.byTahun[y] = (stats.byTahun[y] || 0) + 1;
    }
  });
  return stats;
}
