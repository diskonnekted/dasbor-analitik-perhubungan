import {
  LayoutDashboard, LineChart, Map, MapPin, Building2, Lightbulb, Car,
  ShieldAlert, ClipboardCheck, Database, Bus, ClipboardList, Navigation,
} from 'lucide-react';

// ponytail: konfigurasi nav tunggal — dipakai Sidebar (desktop) & MobileNav (bottom nav mobile).
// primary: true → tampil langsung di bottom nav mobile; sisanya diakses via sheet "Menu".
// short → label ringkas untuk bottom nav (label penuh tetap dipakai Sidebar).
export const NAV = [
  { id: 'dashboard', label: 'Dashboard', short: 'Dashboard', icon: LayoutDashboard, primary: true },
  { id: 'analitik', label: 'Analitik Perhubungan', short: 'Analitik', icon: LineChart, primary: true },
  { id: 'rekomendasi', label: 'Rekomendasi', short: 'Rekomendasi', icon: Navigation, primary: true },
  { id: 'peta', label: 'Peta Tematik', short: 'Peta', icon: Map, primary: true },
  { id: 'laporan', label: 'Laporan', short: 'Laporan', icon: ClipboardList },
  { id: 'jalan', label: 'Jalan & Ruas', short: 'Jalan', icon: MapPin },
  { id: 'perkap', label: 'Perlengkapan', short: 'Perlengkapan', icon: Building2 },
  { id: 'pju', label: 'PJU', short: 'PJU', icon: Lightbulb },
  { id: 'parkir', label: 'Perparkiran', short: 'Parkir', icon: Car },
  { id: 'kecelakaan', label: 'Keselamatan', short: 'Keselamatan', icon: ShieldAlert },
  { id: 'pkb', label: 'PKB', short: 'PKB', icon: ClipboardCheck },
  { id: 'angkutan', label: 'Angkutan', short: 'Angkutan', icon: Bus },
  { id: 'opendata', label: 'OpenData', short: 'OpenData', icon: Database },
];
