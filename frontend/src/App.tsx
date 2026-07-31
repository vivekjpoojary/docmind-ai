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

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-void flex flex-col selection:bg-cyber-cyan selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
      />
      <main className="flex-1">
        {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
        {activeTab === 'documents' && <DocumentsPage />}
        {activeTab === 'chat' && <ChatPage />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'admin' && <AdminPage />}
      </main>
    </div>
  );
};
