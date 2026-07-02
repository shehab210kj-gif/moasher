import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, UserRound } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

export function LoginPage() {
  const { signInWithPassword, signInWithGoogle, isConfigured } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/app/dashboard';
  const guestEmail = 'shehabhosny889@gmail.com';
  const guestPassword = 'admin123s';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await signInWithPassword(guestEmail, guestPassword);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <AuthLayout title={t('loginTitle')} subtitle={t('loginSubtitle')}>
      {!isConfigured && <ConfigWarning />}
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('email')} value={email} onChange={setEmail} type="email" />
        <Field label={t('password')} value={password} onChange={setPassword} type="password" />
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button disabled={loading || !isConfigured} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
          <Lock size={16} /> {loading ? '...' : t('loginTitle')}
        </button>
      </form>
      <button onClick={() => signInWithGoogle().catch((err) => setError(err.message))} disabled={!isConfigured} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-60">
        {t('googleLogin')}
      </button>
      <button onClick={loginAsGuest} disabled={!isConfigured || guestLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-950 disabled:opacity-60">
        <UserRound size={16} /> {guestLoading ? '...' : 'Login as guest admin'}
      </button>
      <div className="mt-5 flex justify-between text-sm font-bold">
        <Link to="/forgot-password" className="text-slate-600 underline underline-offset-4">{t('forgotPassword')}</Link>
        <Link to="/register" className="text-slate-950 underline underline-offset-4">{t('createAccount')}</Link>
      </div>
    </AuthLayout>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field-input" />
    </label>
  );
}

function ConfigWarning() {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
      Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication.
    </div>
  );
}
