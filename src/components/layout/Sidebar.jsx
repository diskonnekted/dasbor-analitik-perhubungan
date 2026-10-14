import { LayoutDashboard, LineChart, Map, MapPin, Building2, Lightbulb, Car, ShieldAlert, ClipboardCheck, Database, FileText, Bus, ClipboardList, Navigation } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, soon: false },
  { id: 'analitik', label: 'Analitik Perhubungan', icon: LineChart, soon: false },
  { id: 'rekomendasi', label: 'Rekomendasi', icon: Navigation, soon: false },
  { id: 'peta', label: 'Peta Tematik', icon: Map, soon: false },
  { id: 'laporan', label: 'Laporan', icon: ClipboardList, soon: false },
  { id: 'jalan', label: 'Jalan & Ruas', icon: MapPin, soon: false },
  { id: 'perkap', label: 'Perlengkapan', icon: Building2, soon: false },
  { id: 'pju', label: 'PJU', icon: Lightbulb, soon: false },
  { id: 'parkir', label: 'Perparkiran', icon: Car, soon: false },
  { id: 'kecelakaan', label: 'Keselamatan', icon: ShieldAlert, soon: false },
  { id: 'pkb', label: 'PKB', icon: ClipboardCheck, soon: false },
  { id: 'angkutan', label: 'Angkutan', icon: Bus, soon: false },
  { id: 'opendata', label: 'OpenData', icon: Database, soon: false }
];

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-primary-900 text-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-primary-800 bg-primary-900 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 overflow-hidden">
          <img src="/logo.webp" alt="Logo Dasbor Analitik Perhubungan" className="h-8 w-8 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight">Dasbor Analitik Perhubungan</div>
          <div className="truncate text-[11px] font-medium uppercase tracking-wider text-primary-200">
            Kabupaten Banjarnegara
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-primary-200/70">
          Menu Utama
        </div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-primary-100 hover:bg-white/5 hover:text-white'
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className={isActive ? 'text-accent-400' : 'text-primary-200/80 group-hover:text-white'}
                    />
                    {item.label}
                  </span>
                  {item.soon && (
                    <span className="rounded-full bg-primary-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-200">
                      soon
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-primary-800 bg-primary-900/80 px-4 py-3 text-[11px] text-primary-200">
        <div className="font-medium">jadantara.org</div>
        <div className="mt-0.5 text-primary-300/80">Dasbor Analitik v0.1</div>
      </div>
    </aside>
  );
}
