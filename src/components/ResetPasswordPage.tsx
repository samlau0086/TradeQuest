import React, { useState } from 'react';
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export function ResetPasswordPage({ resetToken }: { resetToken: string }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { language } = useStore();
  const t = useTranslation(language);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('resetPasswordFailed'));

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-2">{t('passwordResetSuccessful')}</h2>
          <p className="text-slate-400">{t('passwordResetSuccessDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-semibold text-slate-200 mb-6 text-center">
          {t('resetPasswordTitle')}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">{t('newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                placeholder="********"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('setNewPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
