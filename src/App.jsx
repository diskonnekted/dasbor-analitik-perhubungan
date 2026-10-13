import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import DashboardPage from './pages/DashboardPage';
import PetaTematikPage from './pages/PetaTematikPage';
import LaporanPage from './pages/LaporanPage';
import PkbPage from './pages/PkbPage';
import AngkutanPage from './pages/AngkutanPage';
import OpenDataPage from './pages/OpenDataPage';
import JalanPage from './pages/JalanPage';
import PerkapPage from './pages/PerkapPage';
import PjuPage from './pages/PjuPage';
import ParkirPage from './pages/ParkirPage';
import KeselamatanPage from './pages/KeselamatanPage';
import AnalitikPage from './pages/AnalitikPage';
import RekomendasiPage from './pages/RekomendasiPage';

const TITLES = {
  dashboard: { title: 'Dashboard Utama', subtitle: 'Ringkasan operasional Perhubungan' },
  analitik: { title: 'Analitik Perhubungan', subtitle: 'Analisa keselamatan, infrastruktur, energi & retribusi' },
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
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
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
        </div>
      </main>
    </div>
  );
}
