import React, { useState, useEffect } from 'react';
import { Search, FileText, MessageSquare, LayoutDashboard, BarChart3, Shield, X, ArrowRight } from 'lucide-react';
import { TabType } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: TabType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, setActiveTab }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { label: 'Go to Dashboard', tab: 'dashboard' as TabType, icon: LayoutDashboard, category: 'Navigation' },
    { label: 'Manage Document Repository', tab: 'documents' as TabType, icon: FileText, category: 'Navigation' },
    { label: 'Open RAG Q&A Workspace', tab: 'chat' as TabType, icon: MessageSquare, category: 'Navigation' },
    { label: 'Search Vector Passages', tab: 'search' as TabType, icon: Search, category: 'Navigation' },
    { label: 'View Usage Analytics', tab: 'analytics' as TabType, icon: BarChart3, category: 'Navigation' },
    ...(user?.is_admin ? [{ label: 'Admin Moderation Console', tab: 'admin' as TabType, icon: Shield, category: 'Admin' }] : []),
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[#0E1422] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 relative">
          <Search className="w-5 h-5 text-royal-sky mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to workspace..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none font-sans"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Options List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-mono">No matching workspace actions found</div>
          ) : (
            filtered.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTab(action.tab);
                    onClose();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-royal-sky/15 hover:border-royal-sky/30 border border-transparent transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-[#090D16] border border-white/10 text-royal-sky group-hover:bg-royal-sky/20">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {action.label}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 group-hover:text-royal-sky font-mono">
                    <span>Jump</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#090D16] border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Press ESC to dismiss</span>
          <span>DocMind Command Palette</span>
        </div>
      </div>
    </div>
  );
};
