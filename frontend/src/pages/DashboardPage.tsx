import React, { useEffect, useState } from 'react';
import {
  FileText,
  MessageSquare,
  HardDrive,
  Sparkles,
  ArrowUpRight,
  UploadCloud,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { analyticsApi, documentApi, historyApi } from '../services/api';
import { UserAnalytics, Document, Conversation } from '../types';
import { TabType } from '../components/Navbar';

interface DashboardPageProps {
  setActiveTab: (tab: TabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [stats, docs, chats] = await Promise.all([
          analyticsApi.getUserAnalytics(),
          documentApi.list(),
          historyApi.list(),
        ]);

        setAnalytics(stats);
        setRecentDocs(docs.slice(0, 5));
        setRecentChats(chats.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Document Intelligence & RAG Pipeline</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Transform Documents into Conversational Knowledge
          </h1>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">
            Upload PDFs, Word docs, or plain text to perform hybrid vector search and generate verified responses with page-level citations.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('documents')}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm rounded-xl shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 flex items-center space-x-2 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>Start Q&A Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Documents
            </span>
            <div className="p-2 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-500">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '...' : analytics?.document_count ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Indexed & Ready for Query</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vector Chunks
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-500">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '...' : analytics?.chunk_count ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">FAISS Index Passages</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Conversations
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-500">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '...' : analytics?.conversation_count ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded QA Sessions</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Storage Used
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-500">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '...' : formatBytes(analytics?.total_storage_bytes ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Raw Files + Index Vector Storage</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Documents */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Documents</h3>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <span>No documents uploaded yet.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/40 rounded-lg text-sky-600 dark:text-sky-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {doc.chunk_count} chunks • {formatBytes(doc.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Chats</h3>
            <button
              onClick={() => setActiveTab('chat')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {recentChats.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <span>No active chat history.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {chat.title || 'Untitled Session'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
