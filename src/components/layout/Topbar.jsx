import { Bell, Search, Settings, User } from 'lucide-react';

export default function Topbar({ title, subtitle }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight text-ink md:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-subink md:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-md border border-border bg-canvas px-3 py-1.5 transition-colors focus-within:border-primary-500 focus-within:bg-surface md:flex">
          <Search size={14} className="text-subink" />
          <input
            type="search"
            placeholder="Cari data…"
            aria-label="Cari data"
            className="w-40 bg-transparent text-xs text-ink placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Icon buttons */}
        <button
          type="button"
          aria-label="Notifikasi"
          className="rounded-md p-2 text-subink transition-colors hover:bg-muted hover:text-ink"
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          aria-label="Pengaturan"
          className="rounded-md p-2 text-subink transition-colors hover:bg-muted hover:text-ink"
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          aria-label="Profil pengguna"
          className="flex items-center gap-2 rounded-md border border-border bg-canvas px-2 py-1.5 text-subink transition-colors hover:bg-muted hover:text-ink"
        >
          <User size={16} />
          <span className="hidden text-xs font-medium md:inline">Admin</span>
        </button>
      </div>
    </header>
  );
}
