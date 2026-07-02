import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

export function RegisterPage() {
  const { signUpWithPassword, signInWithGoogle, isConfigured } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await signUpWithPassword(email, password, fullName);
      setMessage('Account created. Check your email if confirmation is enabled, then log in.');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('registerTitle')} subtitle={t('registerSubtitle')}>
      {!isConfigured && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Supabase credentials are missing.</div>}
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('fullName')} value={fullName} onChange={setFullName} type="text" />
        <Field label={t('email')} value={email} onChange={setEmail} type="email" />
        <Field label={t('password')} value={password} onChange={setPassword} type="password" />
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button disabled={loading || !isConfigured} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
          <UserPlus size={16} /> {loading ? '...' : t('createAccount')}
        </button>
      </form>
      <button onClick={() => signInWithGoogle().catch((err) => setError(err.message))} disabled={!isConfigured} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-60">
        {t('googleLogin')}
      </button>
      <p className="mt-5 text-sm font-bold text-slate-600">
        {t('alreadyHaveAccount')} <Link to="/login" className="text-slate-950 underline underline-offset-4">{t('loginTitle')}</Link>
      </p>
    </AuthLayout>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <input required={label !== 'Full name'} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field-input" />
    </label>
  );
}
