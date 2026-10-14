import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV } from './navItems';

// ponytail: bottom nav khusus mobile (md:hidden). 4 item primary + tombol "Menu"
// yang membuka bottom sheet berisi semua 13 item. Upgrade path: tambah item primary
// cukup set primary:true di navItems.js.
export default function MobileNav({ active, onSelect }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const primary = NAV.filter((i) => i.primary);

  // tutup sheet saat halaman berpindah
  useEffect(() => { setSheetOpen(false); }, [active]);

  // kunci scroll body + tutup via Escape saat sheet terbuka
  useEffect(() => {
    if (!sheetOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const go = (id) => { onSelect(id); setSheetOpen(false); };

  return (
    <>
      {/* Bottom sheet: semua menu */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-bold text-ink">Menu</span>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Tutup menu"
                className="rounded-md p-1.5 text-subink transition-colors hover:bg-canvas hover:text-ink"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center transition-colors',
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-subink hover:bg-canvas',
                    ].join(' ')}
                  >
                    <Icon size={20} strokeWidth={2} className={isActive ? 'text-primary-600' : ''} />
                    <span className="text-[11px] font-medium leading-tight">{item.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Navigasi utama mobile"
      >
        <div className="flex items-stretch">
          {primary.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary-700' : 'text-subink hover:text-ink',
                ].join(' ')}
              >
                <Icon size={20} strokeWidth={2} className={isActive ? 'text-primary-600' : ''} />
                <span className="leading-none">{item.short}</span>
              </button>
            );
          })}
          <button
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className={[
              'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
              sheetOpen ? 'text-primary-700' : 'text-subink hover:text-ink',
            ].join(' ')}
          >
            <Menu size={20} strokeWidth={2} />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
