/**
 * Loader + helpers untuk dataset PJU (sumber: public/pju_analysis.json,
 * hasil ekstrak onlinkid_rambu.pju + perlengkapan_jalan + idpel_terpasang + tagihan + lmandiri).
 *
 * Fitur:
 *  - getPju(): fetch dataset analisa (cached).
 *  - computePjuStats(): turunan agregat untuk hero & chart.
 *  - filterPju(): filter/sort titik aset PJU.
 *  - formatRupiah(): format nominal rupiah (IDR).
 */

let cache = null;
let loadingPromise = null;

export const JENIS_LAMPU_LABEL = {
  HPS: 'High Pressure Sodium',
  HPL: 'Mercury (HPL)',
  SON: 'Sodium (SON)',
  LED: 'LED',
  SL: 'Sodium Low',
  MH: 'Metal Halide',
  TL: 'Fluorescent (TL)',
  MERK: 'Mercury'
};

export const JENIS_LAMPU_COLOR = {
  HPS: '#F59E0B',
  HPL: '#64748B',
  SON: '#D97706',
  LED: '#10B981',
  SL: '#FBBF24',
  MH: '#8B5CF6',
  TL: '#3B82F6',
  MERK: '#94A3B8'
};

export const KONDISI_TONE = {
  'Baik': { chip: 'bg-accent-50 text-accent-700 border-accent-200', dot: '#16A34A' },
  'Rusak': { chip: 'bg-red-50 text-red-700 border-red-200', dot: '#DC2626' },
  '(tidak terdata)': { chip: 'bg-slate-50 text-slate-700 border-slate-200', dot: '#475569' }
};

export function normalizeKondisi(k) {
  if (!k) return '(tidak terdata)';
  return k;
}

export function formatRupiah(v, { compact = false } = {}) {
  const n = Number(v) || 0;
  if (compact) {
    if (Math.abs(n) >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} M`;
    if (Math.abs(n) >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
    if (Math.abs(n) >= 1e3) return `Rp ${(n / 1e3).toFixed(1)} rb`;
    return `Rp ${n}`;
  }
  return 'Rp ' + n.toLocaleString('id-ID');
}

export async function getPju() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}pju_analysis.json`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // normalisasi titik pju
      const pju = (data.pju || []).map((p) => ({
        ...p,
        kondisi: normalizeKondisi(p.kondisi)
      }));

      cache = { ...data, pju };
      return cache;
    } catch (e) {
      console.error('getPju failed', e);
      cache = {
        counts: {},
        jenis_lampu: {},
        daya_lampu: {},
        catudaya: {},
        sumberdana: {},
        kondisi: {},
        jenis_kwh: {},
        billing: {},
        monthly_tagihan: [],
        top_idpel: [],
        pju: [],
        idpel: [],
        source: 'empty'
      };
      return cache;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function computePjuStats(pju) {
  const byKondisi = {};
  const byJenisLampu = {};
  const byCatudaya = {};
  const bySumberdana = {};
  const byJenisKwh = {};
  let baikCount = 0;
  let rusakCount = 0;

  for (const p of pju) {
    const knd = p.kondisi || '(tidak terdata)';
    const jl = p.jenis_lampu || '(tidak terdata)';
    const cd = p.catudaya || '?';
    const sd = p.sumberdana || '(kosong)';
    const jk = p.jenis || '';

    byKondisi[knd] = (byKondisi[knd] || 0) + 1;
    byJenisLampu[jl] = (byJenisLampu[jl] || 0) + 1;
    byCatudaya[cd] = (byCatudaya[cd] || 0) + 1;
    bySumberdana[sd] = (bySumberdana[sd] || 0) + 1;
    if (jk === 'kWh') byJenisKwh['kWh'] = (byJenisKwh['kWh'] || 0) + 1;
    else if (jk === 'nkWh') byJenisKwh['non-kWh'] = (byJenisKwh['non-kWh'] || 0) + 1;

    if (knd === 'Baik') baikCount += 1;
    else if (knd === 'Rusak') rusakCount += 1;
  }

  return {
    total: pju.length,
    byKondisi,
    byJenisLampu,
    byCatudaya,
    bySumberdana,
    byJenisKwh,
    baikCount,
    rusakCount
  };
}

export function filterPju(pju, opts = {}) {
  const { search = '', jenisLampu = 'all', kondisi = 'all', catudaya = 'all' } = opts;
  const q = search.trim().toLowerCase();
  const jlSet = jenisLampu === 'all' ? null : new Set([jenisLampu]);
  const kndSet = kondisi === 'all' ? null : new Set([kondisi]);

  return pju.filter((p) => {
    if (jlSet && !jlSet.has(p.jenis_lampu || '(tidak terdata)')) return false;
    if (kndSet && !kndSet.has(p.kondisi || '(tidak terdata)')) return false;
    if (catudaya !== 'all' && (p.catudaya || '?') !== catudaya) return false;
    if (q) {
      const blob = [
        p.jenis_lampu, p.kondisi, p.lokasi, p.keterangan,
        p.id_pel, p.idpel?.nama, p.idpel?.no_meter,
        String(p.id_pju || ''), String(p.id_perlengkapan_jalan || '')
      ].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export const CATUDAYA_LABEL = {
  'T': 'Tersuplai PLN',
  'M': 'Mandiri / Solar',
  '?': 'Tidak terdata'
};

/**
 * Membangun tren pemasukan per tahun (bayar tagihan PJU) hingga 2025 + prediksi 2026.
 * - Tahun 2020–2022 dihitung dari data real `monthly_tagihan`.
 * - Tahun 2023–2025 adalah proyeksi "dummy" yang melanjutkan pola real
 *   (monoton naik ±5–8%/tahun agar tidak jauh dari angka riil).
 * - Tahun 2026 diprediksi dengan regresi linier sederhana atas seluruh titik
 *   (real + dummy), menghasilkan nilai yang wajar & kontinu.
 *
 * Return format untuk Recharts LineChart:
 *   [{ year, value, type: 'real'|'dummy'|'prediksi' }, ...]
 */
export function buildYearlyIncomeTrend(monthly) {
  // 1) agregasi real per tahun
  const real = {};
  for (const m of monthly || []) {
    const y = String(m.month).slice(0, 4);
    if (!y) continue;
    real[y] = (real[y] || 0) + (m.total || 0);
  }

  const series = [];

  // 2) real 2020–2022
  let lastVal = 0;
  for (const y of ['2020', '2021', '2022']) {
    if (real[y]) {
      lastVal = real[y];
      series.push({ year: y, value: real[y], type: 'real' });
    } else {
      series.push({ year: y, value: lastVal, type: 'real' });
    }
  }

  // 3) dummy 2023–2025 (naik ~6%/tahun dari nilai real terakhir)
  const base = real['2022'] || real['2021'] || real['2020'] || 13000000000;
  const growth = [0.06, 0.05, 0.06]; // 2023, 2024, 2025
  let prev = base;
  for (let i = 0; i < 3; i++) {
    const yr = String(2023 + i);
    const val = Math.round(prev * (1 + growth[i]));
    series.push({ year: yr, value: val, type: 'dummy' });
    prev = val;
  }

  // 4) prediksi 2026 — regresi linier atas titik tahun 2022..2025 (real+dummy)
  const fitYears = series.filter((s) => !isNaN(s.value));
  if (fitYears.length >= 2) {
    const n = fitYears.length;
    const xs = fitYears.map((s) => Number(s.year));
    const ys = fitYears.map((s) => s.value);
    const sx = xs.reduce((a, b) => a + b, 0);
    const sy = ys.reduce((a, b) => a + b, 0);
    const sxx = xs.reduce((a, b) => a + b * b, 0);
    const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    const pred2026 = Math.round(slope * 2026 + intercept);
    series.push({ year: '2026', value: pred2026, type: 'prediksi' });
  } else {
    const last = series[series.length - 1];
    series.push({ year: '2026', value: last ? Math.round(last.value * 1.06) : 0, type: 'prediksi' });
  }

  return series;
}