import { Construction, Sparkles, ArrowLeft } from 'lucide-react';

export default function PlaceholderPage({ title, subtitle, onBack }) {
  return (
    <div className="animate-fade-in">
      <div className="card mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center md:p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700 ring-8 ring-primary-50/50">
          <Construction size={28} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <span className="chip bg-primary-50 text-primary-700 border-primary-200">
            <Sparkles size={10} strokeWidth={2.5} aria-hidden="true" /> Akan Datang
          </span>
          <h2 className="text-xl font-bold text-ink md:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto max-w-md text-sm text-subink">{subtitle}</p>
          )}
        </div>
        <div className="mt-2 h-px w-24 bg-border" aria-hidden="true" />
        <p className="text-xs text-subink">
          Modul ini sedang dalam tahap pengembangan. Pantau terus untuk pembaruan selanjutnya.
        </p>
        {onBack && (
          <button onClick={onBack} className="btn-secondary mt-2 text-xs">
            <ArrowLeft size={12} strokeWidth={2.5} aria-hidden="true" /> Kembali ke Dashboard
          </button>
        )}
      </div>
    </div>
  );
}