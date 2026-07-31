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
    ...(user?.is_admin ? [{ id: 'admin', label: 'Admin Console', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#05070B]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Hardware Status Indicator */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="relative p-2 bg-gradient-to-br from-cyber-indigo via-indigo-600 to-cyber-cyan rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-white" />
              {/* Pulsing Cyan Status LED */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyber-cyan rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyber-cyan rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold font-display text-gradient-cyan tracking-tight">
                  DocMind AI
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
                  ONLINE • 99.9%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Document Intelligence Workstation
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-2xl border border-white/[0.06]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyber-cyan/20 to-cyber-indigo/20 text-white font-semibold border border-cyber-cyan/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyber-cyan' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Section: Command Palette Trigger & User Avatar */}
          <div className="flex items-center space-x-3">
            {/* Command Palette Button (⌘K) */}
            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-cyber-cyan/40 text-xs font-mono transition-all shadow-inner"
                title="Open Command Palette (⌘K)"
              >
                <Command className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-sans font-semibold text-slate-300">
                  ⌘K
                </kbd>
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyber-indigo to-cyber-cyan text-white flex items-center justify-center text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
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
  );
};
