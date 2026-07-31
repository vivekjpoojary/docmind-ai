import React, { useEffect, useState } from 'react';
import { HardDrive, FileText, MessageSquare, Sparkles, Layers, HelpCircle } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { UserAnalytics } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await analyticsApi.getUserAnalytics();
        setStats(data);
      } catch (err) {
        console.error('Failed to load user analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Personal Usage & Index Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed metrics on your indexed documents, FAISS vector embeddings, and conversation activity.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Loading analytics metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-sky-100 dark:bg-sky-950/60 rounded-xl text-sky-600 w-fit mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indexed Documents</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stats?.total_documents ?? 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 w-fit mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Document Pages</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stats?.total_pages ?? 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-600 w-fit mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vector Chunks (FAISS)</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stats?.total_chunks ?? 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600 w-fit mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversations Created</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stats?.total_conversations ?? 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 w-fit mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Questions Asked</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{stats?.total_questions_asked ?? 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 w-fit mb-4">
              <HardDrive className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Consumed</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{formatBytes(stats?.storage_bytes ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
