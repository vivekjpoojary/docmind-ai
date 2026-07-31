import React from 'react';
import {
  Brain,
  FileText,
  MessageSquare,
  Search,
  BarChart3,
  Shield,
  LayoutDashboard,
  LogOut,
  Command,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 'dashboard' | 'documents' | 'chat' | 'search' | 'analytics' | 'admin';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenCommandPalette }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'chat', label: 'Ask DocMind', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(user?.is_admin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#090D16]/95 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[4.25rem] py-2 gap-4">
            {/* Logo & Hardware Status LED */}
            <div
              className="flex items-center space-x-3 cursor-pointer select-none group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="relative p-2 bg-gradient-to-br from-royal-violet via-indigo-600 to-royal-sky rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-105 transition-transform shrink-0">
                <Brain className="w-5 h-5 text-white" />
                {/* Luminous Electric Sky Pulsing LED */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-royal-sky rounded-full animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-royal-sky rounded-full" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-2.5 whitespace-nowrap">
                  <span className="text-lg font-bold font-display text-gradient-royal tracking-tight leading-none whitespace-nowrap">
                    DocMind AI
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-royal-sky/10 text-royal-sky border border-royal-sky/30 whitespace-nowrap shrink-0">
                    ONLINE • 99.9%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase whitespace-nowrap leading-tight mt-0.5">
                  Document Intelligence Workstation
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1 bg-[#0E1422] p-1 rounded-2xl border border-white/[0.06] shrink-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as TabType)}
                      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-royal-violet/30 to-royal-sky/20 text-white font-semibold border border-royal-sky/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-royal-sky' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Right Section: Command Palette Trigger & User Avatar */}
            <div className="flex items-center space-x-3 shrink-0">
              {onOpenCommandPalette && (
                <button
                  onClick={onOpenCommandPalette}
                  className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0E1422] border border-white/10 text-slate-400 hover:text-slate-200 hover:border-royal-sky/40 text-xs font-mono transition-all shadow-inner whitespace-nowrap"
                  title="Open Command Palette (⌘K)"
                >
                  <Command className="w-3.5 h-3.5 text-royal-sky" />
                  <span>Search</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-sans font-semibold text-slate-300">
                    ⌘K
                  </kbd>
                </button>
              )}

              {user ? (
                <div className="flex items-center space-x-3 pl-3 border-l border-white/10 shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-royal-violet to-royal-sky text-white flex items-center justify-center text-xs font-bold shadow-[0_0_15px_rgba(79,70,229,0.35)] shrink-0">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden lg:block text-left whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-200 leading-tight">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for iOS & Android */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#090D16]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 md:hidden flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
                  isActive
                    ? 'text-royal-sky bg-royal-sky/15 border border-royal-sky/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
