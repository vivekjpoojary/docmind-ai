import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar, TabType } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { SearchPage } from './pages/SearchPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminPage } from './pages/AdminPage';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-3 bg-panel p-4 rounded-2xl border border-white/10 shadow-2xl">
          <div className="w-5 h-5 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
          <span>Initializing DocMind AI Workstation Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex flex-col selection:bg-cyber-cyan selection:text-white relative">
      {!user && (
        <div className="bg-gradient-to-r from-royal-violet/90 via-indigo-900/90 to-royal-sky/90 text-white text-xs font-mono py-2 px-4 border-b border-white/10 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">
              ⚡ <strong>Guest Workstation Mode</strong> — Exploring live AI Workstation. Sign in to upload private documents.
            </span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="ml-3 px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-sans text-xs font-bold transition-all shrink-0 border border-white/20"
          >
            Sign In / Register
          </button>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-white/10"
              title="Close Modal"
            >
              ✕
            </button>
            <AuthPage onSuccess={() => setIsAuthModalOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 pb-16 md:pb-0">
        {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
        {activeTab === 'documents' && <DocumentsPage />}
        {activeTab === 'chat' && <ChatPage />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'admin' && (user?.is_admin ? <AdminPage /> : <DashboardPage setActiveTab={setActiveTab} />)}
      </main>
    </div>
  );
};
