import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

export function ResetPasswordPage() {
  const { updatePassword, isConfigured } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await updatePassword(password);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed.');
    }
  };

  return (
    <AuthLayout title={t('resetPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">{t('password')}</span>
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" />
        </label>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button disabled={!isConfigured} className="primary-button w-full">{t('updatePassword')}</button>
      </form>
      <Link to="/login" className="mt-5 block text-sm font-bold text-slate-950 underline underline-offset-4">{t('back')}</Link>
    </AuthLayout>
  );
}
