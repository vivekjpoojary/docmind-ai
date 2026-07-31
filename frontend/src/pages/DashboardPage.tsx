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
  Layers,
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
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-floor via-[#0F1422] to-slate-900 overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyber-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENTERPRISE DOCUMENT INTELLIGENCE WORKSTATION</span>
          </div>

          <h1 className="text-3xl font-extrabold font-display tracking-tight sm:text-4xl text-gradient-cyan">
            Document Intelligence Engine
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-sans">
            Transform multi-format documents (PDF, DOCX, TXT) into high-precision FAISS dense vector spaces with offline citation grounding and local model reasoning.
          </p>
          
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('documents')}
              className="px-5 py-2.5 bg-gradient-to-r from-cyber-cyan to-cyber-indigo hover:opacity-90 text-white font-semibold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center space-x-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Drop & Index Document</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs rounded-xl border border-white/15 flex items-center space-x-2 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-cyber-cyan" />
              <span>Launch 3-Column Workstation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Total Documents
            </span>
            <div className="p-2.5 bg-cyber-cyan/10 rounded-xl text-cyber-cyan border border-cyber-cyan/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : analytics?.total_documents ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">Indexed Knowledge Vault</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Vector Passages
            </span>
            <div className="p-2.5 bg-cyber-indigo/10 rounded-xl text-cyber-indigo border border-cyber-indigo/20">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : analytics?.total_chunks ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">FAISS Index Embeddings</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Recorded QA Sessions
            </span>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : analytics?.total_conversations ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">Grounded AI Dialogues</p>
        </div>

        <div className="glass-panel-interactive p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Storage Footprint
            </span>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold font-display text-white">
            {loading ? '...' : formatBytes(analytics?.storage_bytes ?? 0)}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">Raw Content + FAISS Files</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Documents */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyber-cyan" />
              <h3 className="text-base font-bold font-display text-slate-100">Recent Vault Documents</h3>
            </div>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-xs font-mono text-cyber-cyan hover:underline flex items-center space-x-1"
            >
              <span>Repository</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No documents uploaded yet.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyber-cyan/30 transition-all"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-cyber-cyan/10 rounded-lg text-cyber-cyan border border-cyber-cyan/20">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {doc.chunk_count} passages • {formatBytes(doc.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> READY
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-cyber-indigo" />
              <h3 className="text-base font-bold font-display text-slate-100">Recent Q&A Dialogues</h3>
            </div>
            <button
              onClick={() => setActiveTab('chat')}
              className="text-xs font-mono text-cyber-indigo hover:underline flex items-center space-x-1"
            >
              <span>Workstation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentChats.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>No active chat history.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyber-indigo/40 hover:bg-slate-900/90 cursor-pointer transition-all"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="p-2 bg-cyber-indigo/10 rounded-lg text-cyber-indigo border border-cyber-indigo/20">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {chat.title || 'Untitled Session'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 flex items-center mt-0.5">
                        <Clock className="w-3 h-3 mr-1 text-slate-500" />
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
