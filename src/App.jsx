import { useState, lazy, Suspense } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import MobileNav from './components/layout/MobileNav';

// ponytail: code-split semua halaman — tiap halaman jadi chunk terpisah, di-load saat dibutuhkan.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PetaTematikPage = lazy(() => import('./pages/PetaTematikPage'));
const LaporanPage = lazy(() => import('./pages/LaporanPage'));
const PkbPage = lazy(() => import('./pages/PkbPage'));
const AngkutanPage = lazy(() => import('./pages/AngkutanPage'));
const OpenDataPage = lazy(() => import('./pages/OpenDataPage'));
const JalanPage = lazy(() => import('./pages/JalanPage'));
const PerkapPage = lazy(() => import('./pages/PerkapPage'));
const PjuPage = lazy(() => import('./pages/PjuPage'));
const ParkirPage = lazy(() => import('./pages/ParkirPage'));
const KeselamatanPage = lazy(() => import('./pages/KeselamatanPage'));
const AnalitikPage = lazy(() => import('./pages/AnalitikPage'));
const RekomendasiPage = lazy(() => import('./pages/RekomendasiPage'));

const TITLES = {
  dashboard: { title: 'Dashboard Utama', subtitle: 'Ringkasan operasional Perhubungan' },
  analitik: { title: 'Analitik Perhubungan', subtitle: 'Analisa keselamatan, infrastruktur, energi & retribusi' },
  rekomendasi: { title: 'Rekomendasi', subtitle: 'Rekomendasi peningkatan layanan lalu lintas & perhubungan' },
  peta: { title: 'Peta Tematik', subtitle: 'Layer kecamatan & desa Banjarnegara' },
  laporan: { title: 'Laporan Kerusakan', subtitle: 'Pelaporan jalan rusak & status penanganan' },
  jalan: { title: 'Jalan & Ruas', subtitle: '251 ruas jalan kabupaten' },
  perkap: { title: 'Perlengkapan Jalan', subtitle: 'Rambu, APILL, Marka, PJU' },
  pju: { title: 'Penerangan Jalan Umum', subtitle: 'Tagihan & sebaran titik PJU' },
  parkir: { title: 'Perparkiran', subtitle: 'Titik parkir & juru parkir' },
  kecelakaan: { title: 'Keselamatan Jalan', subtitle: 'Data kecelakaan & rambu' },
  pkb: { title: 'Pengujian Kendaraan', subtitle: 'Uji pertama & berkala' },
  angkutan: { title: 'Angkutan & Terminal', subtitle: 'Halte, trayek, terminal' },
  opendata: { title: 'OpenData', subtitle: 'Repositori dataset DINHUB' },
};

export default function App() {
  const [active, setActive] = useState('dashboard');
  const meta = TITLES[active] || TITLES.dashboard;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar active={active} onSelect={setActive} />

      <main className="flex-1 overflow-y-auto">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <div className="mx-auto max-w-screen-2xl p-4 pb-20 md:p-6">
          <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-slate-400">Memuat halaman…</div>}>
            {active === 'dashboard' && <DashboardPage onNavigate={setActive} />}
            {active === 'analitik' && <AnalitikPage onNavigate={setActive} />}
            {active === 'rekomendasi' && <RekomendasiPage onNavigate={setActive} />}
            {active === 'peta' && <PetaTematikPage onNavigate={setActive} />}
            {active === 'laporan' && <LaporanPage onNavigate={setActive} />}
            {active === 'jalan' && <JalanPage onNavigate={setActive} />}
            {active === 'perkap' && <PerkapPage onNavigate={setActive} />}
            {active === 'pju' && <PjuPage onNavigate={setActive} />}
            {active === 'parkir' && <ParkirPage onNavigate={setActive} />}
            {active === 'kecelakaan' && <KeselamatanPage onNavigate={setActive} />}
            {active === 'pkb' && <PkbPage onNavigate={setActive} />}
            {active === 'angkutan' && <AngkutanPage onNavigate={setActive} />}
            {active === 'opendata' && <OpenDataPage onNavigate={setActive} />}
          </Suspense>
        </div>
      </main>

      <MobileNav active={active} onSelect={setActive} />
    </div>
  );
}
