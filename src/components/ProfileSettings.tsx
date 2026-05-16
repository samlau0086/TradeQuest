import React, { useState } from 'react';
import { useAuthStore } from '../authStore';
import { useStore } from '../store';
import { User, Lock, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

export function ProfileSettings() {
  const { profile, token, fetchProfile } = useAuthStore();
  const { language } = useStore();
  const t = useTranslation(language);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSaveProfile = async () => {
    if (!profile || !token) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, avatarUrl })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      await fetchProfile();
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!profile || !token || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'Password should be at least 6 characters', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update password');
      }
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ text: 'Password updated successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <User className="w-5 h-5 text-indigo-400" /> {t('myProfile')}
      </h2>
      
      {message.text && (
        <div className={`p-3 rounded border text-sm ${message.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold uppercase">{t('displayName')}</label>
            <input 
              type="text" 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold uppercase">{t('avatarUrl')}</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            {avatarUrl && (
              <div className="mt-2">
                <img src={avatarUrl} alt="Avatar Preview" className="w-12 h-12 rounded-full object-cover border border-slate-700" />
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('saveProfile')}
          </button>
        </div>

        <hr className="border-slate-700 my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300">{t('changePassword')}</h3>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold uppercase">{t('newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-bold uppercase">{t('confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <button 
            onClick={handleSavePassword}
            disabled={loading || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} {t('updatePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
