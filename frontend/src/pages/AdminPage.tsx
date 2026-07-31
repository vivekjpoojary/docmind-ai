import React, { useEffect, useState } from 'react';
import { Shield, Trash2, Users, FileText, HardDrive, HelpCircle } from 'lucide-react';
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
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h1 className="text-2xl font-bold font-display text-white">System Admin Moderation Console</h1>
        </div>
        <p className="text-xs font-mono text-slate-400 mt-1">
          System-wide governance, user account management, and platform resource telemetry.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Platform Users
            </span>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : systemStats?.total_users ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-400 font-semibold">Registered Accounts</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              System Documents
            </span>
            <div className="p-2.5 bg-royal-sky/10 rounded-xl text-royal-sky border border-royal-sky/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : systemStats?.total_documents ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-400 font-semibold">All User Files</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Messages
            </span>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : systemStats?.total_messages ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-400 font-semibold">RAG Inferences Executed</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              System Storage
            </span>
            <div className="p-2.5 bg-royal-mint/10 rounded-xl text-royal-mint border border-royal-mint/20">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : formatBytes(systemStats?.total_storage_bytes ?? 0)}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-400 font-semibold">Global FAISS + Files</p>
        </div>
      </div>

      {/* User Moderation Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0B0F1B]">
          <h3 className="font-bold font-display text-slate-200 text-xs uppercase tracking-wider font-mono">
            Platform Users ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Loading platform user list...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070A11] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Docs Count</th>
                  <th className="px-6 py-3.5">Storage Footprint</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-200 font-sans text-xs">{u.full_name || 'User'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_admin ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          System Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300">
                          Standard User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-royal-sky">
                      {u.document_count} docs
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatBytes(u.storage_bytes)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Purge User & Purge Vector Index"
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
