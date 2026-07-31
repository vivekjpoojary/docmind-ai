import React, { useEffect, useState } from 'react';
import { Shield, Trash2, AlertTriangle } from 'lucide-react';
import { adminApi } from '../services/api';
import { SystemAnalytics, AdminUserListItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [systemStats, setSystemStats] = useState<SystemAnalytics | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [stats, userList] = await Promise.all([
        adminApi.getSystemAnalytics(),
        adminApi.listUsers(),
      ]);
      setSystemStats(stats);
      setUsers(userList);
    } catch (err: any) {
      console.error('Failed to load admin panel data:', err);
      setError(err.response?.data?.detail || 'Failed to load admin panel data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (id: string, email: string) => {
    if (id === currentUser?.id) {
      alert("You cannot delete your own admin account from the moderation console.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${email}"? This will erase all their uploaded documents, FAISS vector indexes, and chat histories.`)) {
      return;
    }

    try {
      await adminApi.deleteUser(id);
      await fetchAdminData();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
          <Shield className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Administration Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Platform-wide governance, storage monitoring, and user management console.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase">Platform Users</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{systemStats?.total_users ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Documents</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{systemStats?.total_documents ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Passages</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{systemStats?.total_chunks ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase">Conversations</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{systemStats?.total_conversations ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Storage</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{formatBytes(systemStats?.total_storage_bytes ?? 0)}</p>
        </div>
      </div>

      {/* Registered Users Management Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">User Directory & Storage Footprint</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading user list...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Docs Count</th>
                  <th className="px-6 py-3.5">Storage Footprint</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{u.full_name || 'User'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_admin ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Standard User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {u.document_count} docs
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatBytes(u.storage_bytes)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Delete User & Clear Vectors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
