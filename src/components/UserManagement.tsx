import React, { useEffect, useState } from 'react';
import { useAuthStore, UserProfile } from '../authStore';
import { Users, Shield, User, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { useStore } from '../store';

export function UserManagement() {
  const { profile } = useAuthStore();
  const { language } = useStore();
  const t = useTranslation(language);
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role !== 'superadmin') return;
    fetchUsers();
  }, [profile]);

  if (profile?.role !== 'superadmin') {
    return null;
  }

  const handleRoleChange = async (userId: string, newRole: 'user' | 'superadmin') => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await fetch(`/api/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      });
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-400" />
          {t('userManagement')}
        </h1>
        <p className="text-slate-400 mt-2">{t('manageUsersDesc')}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('loadingUsers')}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-700 text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">{t('user')}</th>
                <th className="px-4 py-3">{t('role')}</th>
                <th className="px-4 py-3">{t('joined')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-700/50 last:border-none hover:bg-slate-750">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-slate-600 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-200">{u.displayName || t('noName')}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                      className={`bg-slate-900 border rounded px-2 py-1 text-xs font-bold outline-none ${u.role === 'superadmin' ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-300'}`}
                    >
                      <option value="user">{t('user')}</option>
                      <option value="superadmin">{t('superAdmin')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                     <button onClick={() => setDeleteUserId(u.id)} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteUserId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete User?</h3>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this user's profile data? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteUserId(null)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={executeDeleteUser} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
