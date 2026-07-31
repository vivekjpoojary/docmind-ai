import React, { useEffect, useState } from 'react';
import { HardDrive, FileText, MessageSquare, Sparkles, Layers, HelpCircle, BarChart3 } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-8">
      <div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-royal-sky" />
          <h1 className="text-2xl font-bold font-display text-white">Personal Usage & Index Analytics</h1>
        </div>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Detailed metrics on your indexed documents, FAISS vector embeddings, and conversation activity.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs">Loading analytics metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-royal-sky/10 rounded-xl text-royal-sky border border-royal-sky/20 w-fit mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Indexed Documents</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{stats?.total_documents ?? 0}</p>
          </div>

          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 w-fit mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Total Document Pages</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{stats?.total_pages ?? 0}</p>
          </div>

          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-royal-violet/10 rounded-xl text-royal-violet border border-royal-violet/20 w-fit mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Vector Chunks (FAISS)</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{stats?.total_chunks ?? 0}</p>
          </div>

          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20 w-fit mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Conversations Created</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{stats?.total_conversations ?? 0}</p>
          </div>

          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 w-fit mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Questions Asked</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{stats?.total_questions_asked ?? 0}</p>
          </div>

          <div className="glass-panel-interactive p-6 rounded-2xl">
            <div className="p-3 bg-royal-mint/10 rounded-xl text-royal-mint border border-royal-mint/20 w-fit mb-4">
              <HardDrive className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Storage Consumed</p>
            <p className="text-3xl font-extrabold font-display text-white mt-1">{formatBytes(stats?.storage_bytes ?? 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
