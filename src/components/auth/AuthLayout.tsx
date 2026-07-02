import React from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { t, dir } = useI18n();
  return (
    <div className="surface-page px-4 py-10 text-slate-950" dir={dir}>
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-lg shadow-emerald-900/20">
              <Target size={26} />
            </div>
            <h2 className="text-4xl font-black leading-tight text-slate-950">{t('heroTitle')}</h2>
            <p className="mt-5 text-lg font-bold leading-9 text-slate-600">{t('heroSubtitle')}</p>
          </div>
        </div>
        <div className="premium-shell p-6">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white"><Target size={20} /></span>
          <span className="text-lg font-black">{t('appName')}</span>
        </Link>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
