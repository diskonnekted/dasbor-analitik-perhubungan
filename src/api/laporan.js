// API client untuk data laporan kerusakan.
// Strategi:
//  1. Coba backend lapor-jalan (VITE_REPORTS_API / Railway / Vercel).
//  2. Kalau backend mati → fallback ke /pengaduan.json (ekstraksi SQL dump
//     onlinkid_rambu.sql via scripts/build_keselamatan.py) — data real dari DB.
//  3. Terakhir: SAMPLE_LAPORAN statis (8 item) untuk demo.

import { SAMPLE_LAPORAN } from '../data/laporan-fallback';

const API_BASES = [
  import.meta.env.VITE_REPORTS_API,
  'https://lapor-jalan-backend.up.railway.app/api',
  '/api',
].filter(Boolean);

const TIMEOUT_MS = 4000;

async function tryFetchJson(url, opts = {}) {
  if (!url) return null;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(tid);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(tid);
    return null;
  }
}

// ── Fallback 2: data pengaduan dari SQL dump (14 record, build_keselamatan.py)
// ponytail: geocoding belum tersedia di DB → koordinat null, peta fallback.
let _pengaduanCache = null;
async function getPengaduanLocal() {
  if (_pengaduanCache) return _pengaduanCache;
  const [pengaduan, riwayat] = await Promise.all([
    fetch('/pengaduan.json').then(r => r.json()),
    fetch('/riwayat.json').then(r => r.json()),
  ]);
  const STATUS_MAP = { 0: 'Menunggu', 1: 'Diproses', 2: 'Selesai', 3: 'Ditolak' };
  const all = [
    ...pengaduan.map(p => ({
      id: p.id_pengaduan,
      nama: p.nama,
      jenis: STATUS_MAP[p.status] ?? `Status ${p.status}`,
      status: p.status,
      tingkat: 'Sedang',
      isi: p.isilaporan,
      foto: p.foto ? `/${p.foto}` : null,
      tgl: p.tgl_pengaduan,
      koordinat: null,
      sumber: `DB lokal (onlinkid_rambu)` ,
    })),
    ...riwayat.map((r, i) => ({
      id: r.id_riwayat ?? `rw-${i}`,
      nama: '— (riwayat)',
      jenis: r.keterangan?.includes('Selesai') ? 'Selesai' : 'Riwayat',
      status: 2,
      tingkat: 'Sedang',
      isi: r.keterangan,
      foto: null,
      tgl: r.tgl_selesai || r.tgl_buka,
      koordinat: null,
      sumber: 'DB lokal (riwayat)',
    })),
  ];
  all.sort((a, b) => (b.tgl || '').localeCompare(a.tgl || ''));
  _pengaduanCache = all;
  return all;
}

export async function getLaporan(filters = {}) {
  // 1) Coba backend
  for (const base of API_BASES) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.tingkat) params.set('tingkat', filters.tingkat);
    if (filters.jenis) params.set('jenis', filters.jenis);
    const qs = params.toString();
    const url = qs ? `${base}/laporan?${qs}` : `${base}/laporan`;
    const data = await tryFetchJson(url);
    if (data && (Array.isArray(data) || data.items || data.data)) {
      const items = Array.isArray(data) ? data : (data.items || data.data || []);
      return { items, source: base, total: items.length };
    }
  }

  // 2) Fallback: data pengaduan dari SQL dump
  try {
    const items = await getPengaduanLocal();
    if (items.length) return { items, source: 'fallback-db', total: items.length };
  } catch {}

  // 3) Terakhir: sample statis
  return { items: SAMPLE_LAPORAN.items, source: 'fallback-sample', total: SAMPLE_LAPORAN.items.length };
}

export async function getLaporanStats() {
  for (const base of API_BASES) {
    const data = await tryFetchJson(`${base}/laporan/stats`);
    if (data) return { ...data, source: base };
  }
  // Hitung stats dari data SQL dump
  try {
    const [pengaduan, riwayat] = await Promise.all([
      fetch('/pengaduan.json').then(r => r.json()),
      fetch('/riwayat.json').then(r => r.json()),
    ]);
    const STATUS_MAP = { 0: 'Menunggu', 1: 'Diproses', 2: 'Selesai', 3: 'Ditolak' };
    const byStatus = {};
    for (const p of pengaduan) {
      const k = STATUS_MAP[p.status] ?? `Status ${p.status}`;
      byStatus[k] = (byStatus[k] || 0) + 1;
    }
    return {
      total: pengaduan.length + riwayat.length,
      pending: byStatus['Menunggu'] || 0,
      inProgress: byStatus['Diproses'] || 0,
      resolved: (byStatus['Selesai'] || 0) + riwayat.length,
      byStatus,
      byTingkat: { Sedang: pengaduan.length },
      byJenis: {},
      byKecamatan: {},
      source: 'fallback-db',
    };
  } catch {}
  return SAMPLE_LAPORAN.stats;
}

export async function getDamageTypes() {
  for (const base of API_BASES) {
    const data = await tryFetchJson(`${base}/damage-types`);
    if (Array.isArray(data)) return data;
  }
  const local = await tryFetchJson('/damage_types.json');
  return local || [];
}
