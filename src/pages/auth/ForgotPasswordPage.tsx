import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

export function ForgotPasswordPage() {
  const { resetPassword, isConfigured } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await resetPassword(email);
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset request failed.');
    }
  };

  return (
    <AuthLayout title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">{t('email')}</span>
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" />
        </label>
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button disabled={!isConfigured} className="primary-button w-full">{t('sendReset')}</button>
      </form>
      <Link to="/login" className="mt-5 block text-sm font-bold text-slate-950 underline underline-offset-4">{t('back')}</Link>
    </AuthLayout>
  );
}
